import { CURRENT_SEASON, emptySeasonProgress, advanceSeasonQuests, claimFreeSeasonLevel } from '../lib/seasonPass.ts'
import type { SeasonProgress } from '../lib/seasonPass.ts'
import { DAILY_QUESTS, advanceQuests, dailyQuestProgress, utcDay, validQuestReceipt } from '../lib/quests.ts'
import type { DailyQuestProgress } from '../lib/quests.ts'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { ARENA_CARD_DATABASE as CARD_DATABASE, getShopVariantRotation, CARD_VARIANTS, getCardVariant, sanitizeCardVariants } from '@tcg/shared'
import type { ArenaQuestReceipt, CardDefinition, Rarity } from '@tcg/shared'
import { generatePackReward, PACK_PRICES } from '../lib/packRewards.ts'
import type { PackReward } from '../lib/packRewards.ts'

// Used only to preserve the value of excess copies from pre-single-copy saves.
const LEGACY_DUPLICATE_VALUE: Record<Rarity, number> = { common: 5, uncommon: 15, rare: 40, legendary: 100 }
const validBalance = (value: unknown) => typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0

// ─── Pack token system ────────────────────────────────────────────────────────

/** Maximum pack tokens that can be stored */
export const MAX_PACK_TOKENS = 2

/** Two free Core packs per week: one token every 84 hours. */
export const PACK_TOKEN_INTERVAL_MS = 84 * 60 * 60 * 1000

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
  dailyQuests?: DailyQuestProgress
  questMatches: Record<string, true>
  lastQuestReward: { matchId: string; gems: number; xp: number } | null
  recordQuestMatch: (receipt: ArenaQuestReceipt) => void
  variants: Record<string, true>
  equippedVariants: Record<string, string>
  purchaseVariant: (variantId: string) => boolean
  equipVariant: (definitionId: string, variantId?: string) => boolean
  openPack: (packId: string) => PackReward | undefined
  seasons: Record<string, SeasonProgress>
  claimSeasonLevel: (level: number) => void
  /** definitionId → copies owned */
  cards: Record<string, number>

  // ── Pack economy ──────────────────────────────────────────────────────────
  /** 0–MAX_PACK_TOKENS ready-to-use pack tokens */
  tokens: number
  /** Timestamp when the next token will be granted. null when tokens === MAX or timer not started. */
  nextTokenAt: number | null
  /** Shop currency earned from quests and season rewards */
  gems: number

  /** Catch up tokens that accumulated while the app was closed */
  tickTokens: () => void
  /** Spend 1 token (called when opening a pack) */
  spendToken: () => void
  /** Grant gems (called by the quest system) */
  addGems: (amount: number) => void
  /** Spend gems directly (called when opening gem-cost packs) */
  spendGems: (amount: number) => void

  /** Add one or more cards to the collection (called after pack open) */
  addCards: (defs: CardDefinition[]) => void

  /** DEV ONLY — flood the account with currency + all cards */
  devCheat: () => void
}

export const useCollectionStore = create<CollectionStore>()(
  persist(
    (set) => ({
      dailyQuests: undefined,
      questMatches: {},
      lastQuestReward: null,
      recordQuestMatch: receipt => set(state => {
        const now = Date.now()
        if (!validQuestReceipt(receipt, now) || Object.hasOwn(state.questMatches, receipt.matchId)) return {}
        const daily = dailyQuestProgress(state.dailyQuests, now)
        const result = utcDay(receipt.finishedAt) === daily.date ? advanceQuests(daily, DAILY_QUESTS, receipt.metrics) : { progress: daily, reward: 0 }
        const season = advanceSeasonQuests(state.seasons[CURRENT_SEASON.id] ?? emptySeasonProgress(), receipt, now)
        // Save objectives, receipts, gems and season XP together so a replay cannot grant twice.
        return { dailyQuests: { ...result.progress, date: daily.date }, gems: state.gems + result.reward,
          seasons: { ...state.seasons, [CURRENT_SEASON.id]: season.progress },
          questMatches: { ...state.questMatches, [receipt.matchId]: true },
          lastQuestReward: { matchId: receipt.matchId, gems: result.reward, xp: season.earnedXP } }
      }),
      variants: {},
      equippedVariants: {},
      openPack: packId => {
        let reward: PackReward | undefined
        set(state => {
          const price = PACK_PRICES[packId]
          if (!price || !Number.isFinite(state[price.currency]) || state[price.currency] < price.cost) return {}
          reward = generatePackReward(packId, state.cards, state.variants)
          if (!reward) return {}
          return {
            [price.currency]: state[price.currency] - price.cost,
            ...(price.currency === 'tokens' ? { nextTokenAt: state.nextTokenAt ?? Date.now() + PACK_TOKEN_INTERVAL_MS } : {}),
            ...(reward.variantId ? { variants: { ...state.variants, [reward.variantId]: true } }
              : { cards: { ...state.cards, [reward.card.definitionId]: 1 } }),
          }
        })
        return reward
      },
      purchaseVariant: variantId => {
        let purchased = false
        set(state => {
          // Recheck at payment time: a preview opened before midnight cannot buy expired stock.
          const variant = getShopVariantRotation().variants.find(variant => variant.id === variantId)
          if (!variant || state.variants[variant.id] || !(state.cards[variant.definitionId] > 0) || !Number.isFinite(state.gems) || state.gems < variant.gemCost) return {}
          purchased = true
          return { gems: state.gems - variant.gemCost, variants: { ...state.variants, [variant.id]: true } }
        })
        return purchased
      },
      equipVariant: (definitionId, variantId) => {
        let equipped = false
        set(state => {
          if (!(state.cards[definitionId] > 0)) return {}
          if (variantId !== undefined && (!getCardVariant(variantId, definitionId) || state.variants[variantId] !== true)) return {}
          const equippedVariants = { ...state.equippedVariants }
          if (variantId) equippedVariants[definitionId] = variantId
          else delete equippedVariants[definitionId]
          equipped = true
          return { equippedVariants }
        })
        return equipped
      },
      seasons: {},
      claimSeasonLevel: level => set(state => {
        const claim = claimFreeSeasonLevel(state.seasons[CURRENT_SEASON.id] ?? emptySeasonProgress(), level)
        if (!claim) return {}
        return { seasons: { ...state.seasons, [CURRENT_SEASON.id]: claim.progress },
          [claim.reward.kind]: state[claim.reward.kind] + claim.reward.amount }
      }),
      cards: {},
      tokens: 2,     // new players start with both tokens ready
      nextTokenAt: null,
      gems: 100,     // one-off starting balance; recurring income comes from quests

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
          // If we were at max (timer was paused), start the 84-h countdown now
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

      addCards: (defs) =>
        set((s) => {
          const next = { ...s.cards }
          for (const def of defs) {
            if (CARD_DATABASE.some(card => card.definitionId === def.definitionId)) next[def.definitionId] = 1
          }
          return { cards: next }
        }),

      // ── Dev helper ────────────────────────────────────────────────────────────
      _grantAll: () =>
        set(() => {
          const cards: Record<string, number> = {}
          for (const def of CARD_DATABASE) {
            cards[def.definitionId] = 1
          }
          return { cards, gems: 9999 }
        }),

      devCheat: () =>
        set(() => {
          const cards: Record<string, number> = {}
          for (const def of CARD_DATABASE) {
            cards[def.definitionId] = 1
          }
          return { cards, gems: 99999, tokens: MAX_PACK_TOKENS, nextTokenAt: null }
        }),
    }),
    { name: 'tcg-collection', version: 2,
      merge: (saved, current) => {
        const persisted = saved && typeof saved === 'object' ? { ...saved } as Partial<CollectionStore> & { shards?: unknown } : {}
        delete persisted.shards
        const variants = Object.fromEntries(CARD_VARIANTS.filter(variant => persisted.variants?.[variant.id] === true).map(variant => [variant.id, true as const]))
        const cards = persisted.cards ?? current.cards
        const equippedVariants = Object.fromEntries(Object.entries(sanitizeCardVariants(persisted.equippedVariants, Object.keys(cards)))
          .filter(([id, variant]) => cards[id] > 0 && variants[variant] === true))
        return { ...current, ...persisted, variants, equippedVariants }
      },
      migrate: (saved, version) => {
        const state = saved && typeof saved === 'object' ? { ...saved } as Record<string, unknown> : {}
        const now = Date.now()
        // Preserve ready packs and the fractional progress of the old 12-hour refill.
        if (version < 1 && typeof state.nextTokenAt === 'number' && state.nextTokenAt > now) {
          state.nextTokenAt = now + Math.min(1, (state.nextTokenAt - now) / (12 * 60 * 60 * 1000)) * PACK_TOKEN_INTERVAL_MS
        }
        if (version < 2) {
          let gems = (state.gems === undefined ? 100 : validBalance(state.gems)) + validBalance(state.shards)
          const cards = state.cards && typeof state.cards === 'object' ? { ...state.cards } as Record<string, number> : {}
          for (const card of CARD_DATABASE) {
            const count = validBalance(cards[card.definitionId])
            if (count > 1) {
              gems += (count - 1) * LEGACY_DUPLICATE_VALUE[card.rarity]
              cards[card.definitionId] = 1
            }
          }
          state.cards = cards
          state.gems = gems
          delete state.shards
        }
        return state
      },
    },
  ),
)

/** Snapshot owned artwork when joining a match; later changes affect the next match. */
export function getDeckCardVariants(ids: readonly string[]): Record<string, string> {
  const state = useCollectionStore.getState()
  return Object.fromEntries(Object.entries(sanitizeCardVariants(state.equippedVariants, ids))
    .filter(([definitionId, variantId]) => state.cards[definitionId] > 0 && state.variants[variantId] === true))
}
