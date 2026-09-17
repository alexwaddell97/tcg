import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  DECK_SIZE,
  ARENA_ARCHETYPE_DECKS,
  MAX_COPIES_PER_CARD,
  MAX_COPIES_LEGENDARY,
  ARENA_CARD_DATABASE as CARD_DATABASE,
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

type PersistedDecks = Pick<DeckStore, 'decks' | 'activeDeckId'>

function cardCopyLimit(definitionId: string): number {
  const card = CARD_DATABASE.find(card => card.definitionId === definitionId)
  return card?.rarity === 'legendary' ? MAX_COPIES_LEGENDARY : MAX_COPIES_PER_CARD
}

function normalizeDeckCards(cards: Record<string, number>): Record<string, number> {
  return Object.fromEntries(Object.entries(cards)
    .filter(([, count]) => Number.isFinite(count) && count >= 1)
    .map(([id, count]) => [id, Math.min(Math.floor(count), cardCopyLimit(id))]))
}

function normalizeSavedDecks(state: PersistedDecks): PersistedDecks {
  return { ...state, decks: state.decks.map(deck => ({ ...deck, cards: normalizeDeckCards(deck.cards) })) }
}

// Upgrade only untouched copies of the first expansion starters, once on migration.
const FIRST_STARTERS: Record<string, string[]> = {
  'Transmutation': ['chalk_apprentice', 'mercury_scholar', 'lead_to_gold', 'paradox_regent', 'crucible_seer', 'silver_equation', 'glass_familiar', 'gilded_oracle', 'alloy_guardian', 'philosopher_engine', 'vessel_of_echoes', 'prism_titan'],
  'Sabotage': ['tainted_idol', 'hollow_gift', 'thorn_seeder', 'ashen_envoy', 'masked_ferryman', 'exile_ritual', 'counterfeit_courier', 'splinter_agent', 'court_of_thorns', 'oathbreaker_duke', 'debt_collector', 'inversion_rite'],
  'Affliction': ['salt_hex', 'dusk_leech', 'blight_acolyte', 'miasma_lantern', 'rot_scribe', 'hollow_choir', 'unmaking', 'plague_cartographer', 'debt_collector', 'famine_sovereign', 'pale_physician', 'cleansing_flame'],
  'Conduits': ['candle_tender', 'prism_initiate', 'mirror_squire', 'ember_conduit', 'current_runner', 'temper', 'vessel_of_echoes', 'sunwell_keeper', 'last_light_beacon', 'prism_titan', 'marrow_engine', 'cleansing_flame'],
}
function upgradeStarterCopies(state: PersistedDecks): PersistedDecks {
  return { ...state, decks: state.decks.map(deck => {
    const previous = FIRST_STARTERS[deck.name]
    const template = ARENA_ARCHETYPE_DECKS.find(item => item.name === deck.name)
    if (!previous || !template || Object.keys(deck.cards).length !== previous.length || !previous.every(id => deck.cards[id] === 1)) return deck
    return { ...deck, cards: Object.fromEntries(template.cards.map(id => [id, 1])) }
  }) }
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
            d.id === id ? { ...d, ...patch, cards: normalizeDeckCards(patch.cards ?? d.cards), updatedAt: Date.now() } : d,
          ),
        })),

      setActiveDeck: (activeDeckId) => set({ activeDeckId }),
    }),
    {
      name: 'tcg-decks',
      version: 2,
      // Persist the one-copy rule for decks saved before Arena's deck rules.
      migrate: state => upgradeStarterCopies(normalizeSavedDecks(state as PersistedDecks)),
      merge: (persisted, current) => persisted
        ? { ...current, ...normalizeSavedDecks(persisted as PersistedDecks) }
        : current,
    },
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
  const limit = cardCopyLimit(definitionId)
  if ((cards[definitionId] ?? 0) >= limit) return false
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
