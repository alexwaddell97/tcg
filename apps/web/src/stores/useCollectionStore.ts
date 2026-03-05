import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { CARD_DATABASE, MAX_COPIES_PER_CARD, MAX_COPIES_LEGENDARY } from '@tcg/shared'
import type { CardDefinition, Rarity } from '@tcg/shared'

// ─── Shard economy ────────────────────────────────────────────────────────────
// Craft costs ~8× the refund value so the system is intentionally lossy —
// you can target-craft missing cards but can't loop refund→craft efficiently.

export const SHARD_REFUND: Record<Rarity, number> = {
  common:     5,
  uncommon:  15,
  rare:       40,
  legendary: 100,
}

export const SHARD_CRAFT: Record<Rarity, number> = {
  common:     40,
  uncommon:  120,
  rare:       320,
  legendary: 800,
}

/** Maximum copies of a card that are "useful" (can be used in any deck) */
export function maxUsefulCopies(rarity: Rarity): number {
  return rarity === 'legendary' ? MAX_COPIES_LEGENDARY : MAX_COPIES_PER_CARD
}

/** How many copies of this card are in excess of the deck limit */
export function excessCopies(cards: Record<string, number>, defId: string): number {
  const def = CARD_DATABASE.find(c => c.definitionId === defId)
  if (!def) return 0
  const owned = cards[defId] ?? 0
  const max = maxUsefulCopies(def.rarity)
  return Math.max(0, owned - max)
}

/** Total shards value of all excess cards in the collection */
export function totalExcessShards(cards: Record<string, number>): number {
  return Object.entries(cards).reduce((acc, [defId, count]) => {
    const def = CARD_DATABASE.find(c => c.definitionId === defId)
    if (!def || count <= 0) return acc
    const excess = Math.max(0, count - maxUsefulCopies(def.rarity))
    return acc + excess * SHARD_REFUND[def.rarity]
  }, 0)
}

// ─── Pack token system ────────────────────────────────────────────────────────

/** Maximum pack tokens that can be stored */
export const MAX_PACK_TOKENS = 2

/** One token generates every 12 hours */
export const PACK_TOKEN_INTERVAL_MS = 12 * 60 * 60 * 1000

/** Gem cost to instantly skip the cooldown and gain 1 token */
export const GEM_SPEEDUP_COST = 50

/**
 * Milliseconds until the next token is ready.
 * Returns 0 if `nextTokenAt` is null (timer paused / already at max).
 */
export function msUntilNextToken(nextTokenAt: number | null): number {
  if (nextTokenAt === null) return 0
  return Math.max(0, nextTokenAt - Date.now())
}

// ─── Store ────────────────────────────────────────────────────────────────────

interface CollectionStore {
  /** definitionId → copies owned */
  cards: Record<string, number>
  shards: number

  // ── Pack economy ──────────────────────────────────────────────────────────
  /** 0–MAX_PACK_TOKENS ready-to-use pack tokens */
  tokens: number
  /** Timestamp when the next token will be granted. null when tokens === MAX or timer not started. */
  nextTokenAt: number | null
  /** Premium/speedup currency earned from daily quests */
  gems: number

  /** Catch up tokens that accumulated while the app was closed */
  tickTokens: () => void
  /** Spend 1 token (called when opening a pack) */
  spendToken: () => void
  /** Grant gems (called by the quest system) */
  addGems: (amount: number) => void
  /** Spend 50 gems to instantly complete the active cooldown and add 1 token */
  speedUpPack: () => void
  /** Spend gems directly (called when opening gem-cost packs) */
  spendGems: (amount: number) => void

  /** Add one or more cards to the collection (called after pack open) */
  addCards: (defs: CardDefinition[]) => void

  /**
   * Refund `count` excess copies of a single card.
   * Clamps to the actual excess so you can never refund below max-useful.
   */
  refundCard: (defId: string, count?: number) => void

  /** Refund every excess copy across the whole collection in one click */
  refundAllExcess: () => void

  /** Craft one copy of a card — fails silently if not enough shards */
  craftCard: (defId: string) => void

  /** DEV ONLY — flood the account with currency + all cards */
  devCheat: () => void
}

export const useCollectionStore = create<CollectionStore>()(
  persist(
    (set) => ({
      cards: {},
      shards: 0,
      tokens: 2,     // new players start with both tokens ready
      nextTokenAt: null,
      gems: 100,     // starter gems so players can experience the speed-up immediately

      tickTokens: () =>
        set((s) => {
          if (s.tokens >= MAX_PACK_TOKENS || s.nextTokenAt === null) return {}
          let tokens = s.tokens
          let nextTokenAt: number | null = s.nextTokenAt
          while (nextTokenAt !== null && Date.now() >= nextTokenAt) {
            tokens = Math.min(tokens + 1, MAX_PACK_TOKENS)
            nextTokenAt = tokens >= MAX_PACK_TOKENS ? null : nextTokenAt + PACK_TOKEN_INTERVAL_MS
          }
          if (tokens === s.tokens) return {}
          return { tokens, nextTokenAt }
        }),

      spendToken: () =>
        set((s) => {
          if (s.tokens <= 0) return {}
          const newTokens = s.tokens - 1
          // If we were at max (timer was paused), start the 12-h countdown now
          const nextTokenAt = s.nextTokenAt ?? Date.now() + PACK_TOKEN_INTERVAL_MS
          return {
            tokens: newTokens,
            nextTokenAt: newTokens < MAX_PACK_TOKENS ? nextTokenAt : null,
          }
        }),

      addGems: (amount) =>
        set((s) => ({ gems: s.gems + amount })),

      spendGems: (amount) =>
        set((s) => s.gems >= amount ? { gems: s.gems - amount } : {}),

      speedUpPack: () =>
        set((s) => {
          if (s.gems < GEM_SPEEDUP_COST) return {}
          if (s.tokens >= MAX_PACK_TOKENS || s.nextTokenAt === null) return {}
          const newTokens = Math.min(s.tokens + 1, MAX_PACK_TOKENS)
          // If still below cap after this bonus, start a fresh 12-h window from now
          const newNextTokenAt = newTokens >= MAX_PACK_TOKENS ? null : Date.now() + PACK_TOKEN_INTERVAL_MS
          return { gems: s.gems - GEM_SPEEDUP_COST, tokens: newTokens, nextTokenAt: newNextTokenAt }
        }),

      addCards: (defs) =>
        set((s) => {
          const next = { ...s.cards }
          for (const def of defs) {
            next[def.definitionId] = (next[def.definitionId] ?? 0) + 1
          }
          return { cards: next }
        }),

      refundCard: (defId, count) =>
        set((s) => {
          const def = CARD_DATABASE.find(c => c.definitionId === defId)
          if (!def) return {}
          const excess = excessCopies(s.cards, defId)
          if (excess <= 0) return {}
          const toRefund = Math.min(count ?? excess, excess)
          const next = { ...s.cards }
          next[defId] = (next[defId] ?? 0) - toRefund
          if (next[defId] <= 0) delete next[defId]
          return {
            cards: next,
            shards: s.shards + toRefund * SHARD_REFUND[def.rarity],
          }
        }),

      refundAllExcess: () =>
        set((s) => {
          const next = { ...s.cards }
          let gained = 0
          for (const [defId, count] of Object.entries(next)) {
            const def = CARD_DATABASE.find(c => c.definitionId === defId)
            if (!def || count <= 0) continue
            const max = maxUsefulCopies(def.rarity)
            const excess = Math.max(0, count - max)
            if (excess > 0) {
              gained += excess * SHARD_REFUND[def.rarity]
              next[defId] = count - excess
              if (next[defId] <= 0) delete next[defId]
            }
          }
          return { cards: next, shards: s.shards + gained }
        }),

      craftCard: (defId) =>
        set((s) => {
          const def = CARD_DATABASE.find(c => c.definitionId === defId)
          if (!def) return {}
          const cost = SHARD_CRAFT[def.rarity]
          if (s.shards < cost) return {}
          const owned = s.cards[defId] ?? 0
          const max = maxUsefulCopies(def.rarity)
          if (owned >= max) return {} // already at cap
          return {
            shards: s.shards - cost,
            cards: { ...s.cards, [defId]: owned + 1 },
          }
        }),

      // ── Dev helper ────────────────────────────────────────────────────────────
      _grantAll: () =>
        set(() => {
          const cards: Record<string, number> = {}
          for (const def of CARD_DATABASE) {
            cards[def.definitionId] = maxUsefulCopies(def.rarity)
          }
          return { cards, shards: 9999, gems: 9999 }
        }),

      devCheat: () =>
        set(() => {
          const cards: Record<string, number> = {}
          for (const def of CARD_DATABASE) {
            cards[def.definitionId] = maxUsefulCopies(def.rarity)
          }
          return { cards, shards: 99999, gems: 99999, tokens: MAX_PACK_TOKENS, nextTokenAt: null }
        }),
    }),
    { name: 'tcg-collection' },
  ),
)

/** Returns the number of additional copies needed to reach the deck cap */
export function neededCopies(cards: Record<string, number>, defId: string): number {
  const def = CARD_DATABASE.find(c => c.definitionId === defId)
  if (!def) return 0
  const owned = cards[defId] ?? 0
  return Math.max(0, maxUsefulCopies(def.rarity) - owned)
}
