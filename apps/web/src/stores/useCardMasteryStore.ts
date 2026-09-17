import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { ARENA_CARD_DATABASE, ARENA_DECK_SIZE, CARD_BORDERS, CARD_PLAY_XP, getEquippedCardBorder, isCardBorder, isBorderUnlocked, normalizeCardXP } from '@tcg/shared'
import type { CardBorderId, CardMastery, CardMasteryReward } from '@tcg/shared'

const eligible = new Set(ARENA_CARD_DATABASE.filter(card => !card.arenaToken).map(card => card.definitionId))
export interface MasteryReceipt {
  matchId: string
  cards: { definitionId: string; xp: number; unlocked: CardBorderId[] }[]
}
interface MasteryStore {
  /** Keyed by the base definition, so future alternate art shares the same mastery. */
  cards: Record<string, CardMastery>
  claimedMatches: Record<string, true>
  lastReward: MasteryReceipt | null
  equipBorder: (definitionId: string, border?: CardBorderId) => boolean
  claimReward: (reward: CardMasteryReward) => MasteryReceipt | null
}
const record = (value: unknown): Record<string, unknown> => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}

export const useCardMasteryStore = create<MasteryStore>()(persist((set, get) => ({
  cards: {}, claimedMatches: {}, lastReward: null,
  equipBorder: (definitionId, border) => {
    if (!eligible.has(definitionId)) return false
    const card = get().cards[definitionId] ?? { xp: 0 }
    if (border !== undefined && (!isCardBorder(border) || !isBorderUnlocked(card.xp, border))) return false
    set(state => ({ cards: { ...state.cards, [definitionId]: { ...card, equippedBorder: border } } }))
    return true
  },
  claimReward: reward => {
    if (!reward || typeof reward.matchId !== 'string' || !reward.matchId.length || reward.matchId.length > 200
      || !Array.isArray(reward.cards) || reward.cards.length > ARENA_DECK_SIZE
      || reward.cards.some(card => !card || !eligible.has(card.definitionId) || card.xp !== CARD_PLAY_XP)
      || new Set(reward.cards.map(card => card.definitionId)).size !== reward.cards.length) return null
    if (Object.hasOwn(get().claimedMatches, reward.matchId)) return null
    const cards = { ...get().cards }
    const receipt: MasteryReceipt = { matchId: reward.matchId, cards: reward.cards.map(award => {
      const old = cards[award.definitionId] ?? { xp: 0 }
      const xp = normalizeCardXP(old.xp + award.xp)
      cards[award.definitionId] = { ...old, xp }
      return { definitionId: award.definitionId, xp: xp - old.xp, unlocked: CARD_BORDERS.filter(border => border.xp > old.xp && border.xp <= xp).map(border => border.id) }
    }) }
    set(state => ({ cards, claimedMatches: { ...state.claimedMatches, [reward.matchId]: true }, lastReward: receipt }))
    return receipt
  },
}), {
  name: 'tcg-card-mastery', version: 1,
  partialize: ({ cards, claimedMatches }) => ({ cards, claimedMatches }),
  merge: (saved, current) => {
    const persisted = record(saved)
    const cards = Object.fromEntries(Object.entries(record(persisted.cards)).filter(([id]) => eligible.has(id)).map(([id, value]) => {
      const raw = record(value), xp = normalizeCardXP(raw.xp)
      return [id, { xp, ...(isCardBorder(raw.equippedBorder) && isBorderUnlocked(xp, raw.equippedBorder) ? { equippedBorder: raw.equippedBorder } : {}) }]
    }))
    const claimedMatches = Object.fromEntries(Object.entries(record(persisted.claimedMatches)).filter(([id, value]) => id.length > 0 && id.length <= 200 && value === true)) as Record<string, true>
    return { ...current, cards, claimedMatches, lastReward: null }
  },
}))

/** Snapshot only this deck's visible choices when joining a match. */
export function getDeckCardBorders(ids: readonly string[]): Record<string, CardBorderId> {
  const { cards } = useCardMasteryStore.getState()
  return Object.fromEntries(ids.map(id => [id, getEquippedCardBorder(cards[id])]))
}
