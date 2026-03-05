import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  DECK_SIZE,
  MAX_COPIES_PER_CARD,
  MAX_COPIES_LEGENDARY,
  GOLD_BUDGET,
  CARD_DATABASE,
} from '@tcg/shared'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SavedDeck {
  id: string
  name: string
  /** 0–2 location definitionIds chosen for this deck */
  locationIds: string[]
  /** definitionId → copy count */
  cards: Record<string, number>
  updatedAt: number
}

interface DeckStore {
  decks: SavedDeck[]
  activeDeckId: string | null

  createDeck: () => string
  deleteDeck: (id: string) => void
  renameDeck: (id: string, name: string) => void
  saveDeck: (id: string, patch: Partial<Omit<SavedDeck, 'id' | 'updatedAt'>>) => void
  setActiveDeck: (id: string | null) => void
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useDeckStore = create<DeckStore>()(
  persist(
    (set) => ({
      decks: [],
      activeDeckId: null,

      createDeck: () => {
        const id = crypto.randomUUID()
        const deck: SavedDeck = {
          id,
          name: 'New Deck',
          locationIds: [],
          cards: {},
          updatedAt: Date.now(),
        }
        set(s => ({ decks: [...s.decks, deck], activeDeckId: id }))
        return id
      },

      deleteDeck: (id) =>
        set(s => ({
          decks: s.decks.filter(d => d.id !== id),
          activeDeckId: s.activeDeckId === id ? (s.decks.find(d => d.id !== id)?.id ?? null) : s.activeDeckId,
        })),

      renameDeck: (id, name) =>
        set(s => ({
          decks: s.decks.map(d => d.id === id ? { ...d, name, updatedAt: Date.now() } : d),
        })),

      saveDeck: (id, patch) =>
        set(s => ({
          decks: s.decks.map(d =>
            d.id === id ? { ...d, ...patch, updatedAt: Date.now() } : d,
          ),
        })),

      setActiveDeck: (activeDeckId) => set({ activeDeckId }),
    }),
    { name: 'tcg-decks' },
  ),
)

// ─── Pure helpers (no side-effects) ──────────────────────────────────────────

export function deckCardCount(cards: Record<string, number>): number {
  return Object.values(cards).reduce((s, n) => s + n, 0)
}

export function deckGoldCount(cards: Record<string, number>): number {
  return Object.entries(cards).reduce((sum, [defId, count]) => {
    const def = CARD_DATABASE.find(c => c.definitionId === defId)
    return sum + (def ? def.cost * count : 0)
  }, 0)
}

export function canAddCard(cards: Record<string, number>, definitionId: string): boolean {
  const total = deckCardCount(cards)
  if (total >= DECK_SIZE) return false
  const def = CARD_DATABASE.find(c => c.definitionId === definitionId)
  if (!def) return false
  const limit = def.rarity === 'legendary' ? MAX_COPIES_LEGENDARY : MAX_COPIES_PER_CARD
  if ((cards[definitionId] ?? 0) >= limit) return false
  if (deckGoldCount(cards) + def.cost > GOLD_BUDGET) return false
  return true
}

export function canRemoveCard(cards: Record<string, number>, definitionId: string): boolean {
  return (cards[definitionId] ?? 0) > 0
}

export function addCard(cards: Record<string, number>, definitionId: string): Record<string, number> {
  if (!canAddCard(cards, definitionId)) return cards
  return { ...cards, [definitionId]: (cards[definitionId] ?? 0) + 1 }
}

export function removeCard(cards: Record<string, number>, definitionId: string): Record<string, number> {
  const count = (cards[definitionId] ?? 0) - 1
  if (count <= 0) {
    const { [definitionId]: _removed, ...rest } = cards
    return rest
  }
  return { ...cards, [definitionId]: count }
}
