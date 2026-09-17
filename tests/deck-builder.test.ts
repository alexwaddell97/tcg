import assert from 'node:assert/strict'
import { test } from 'node:test'
import { ARENA_ARCHETYPE_DECKS, ARENA_CARD_DATABASE, ARENA_STARTER_DECK, getArenaDeckError } from '../packages/shared/src/index.ts'

// Exercise the real persisted store without touching the browser's saved decks.
const storage = new Map<string, string>()
Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => storage.set(key, value),
  removeItem: (key: string) => storage.delete(key),
} })
Object.defineProperty(globalThis, 'window', { configurable: true, value: { localStorage: globalThis.localStorage } })
const deckStore = import('../apps/web/src/stores/useDeckStore.ts')

test('every arena card can be added once, including common and legendary cards', async () => {
  const { addCard, canAddCard, removeCard } = await deckStore
  for (const card of ARENA_CARD_DATABASE) {
    const id = card.definitionId
    assert.equal(canAddCard({}, id), true, card.name)
    const cards = addCard({}, id)
    assert.deepEqual(cards, { [id]: 1 })
    assert.equal(canAddCard(cards, id), false, card.name)
    assert.equal(addCard(cards, id), cards, 'adding a second copy must leave the deck unchanged')
    assert.deepEqual(removeCard(cards, id), {})
  }
})

test('the twelve-card cap still allows replacing a card without allowing a duplicate', async () => {
  const { addCard, canAddCard, removeCard, deckCardCount } = await deckStore
  const full = Object.fromEntries(ARENA_STARTER_DECK.map(id => [id, 1]))
  const replacement = ARENA_CARD_DATABASE.find(card => !full[card.definitionId])!.definitionId
  assert.equal(canAddCard(full, replacement), false)
  const smaller = removeCard(full, ARENA_STARTER_DECK[0])
  assert.equal(canAddCard(smaller, ARENA_STARTER_DECK[1]), false)
  const replaced = addCard(smaller, replacement)
  assert.equal(deckCardCount(replaced), 12)
  assert.equal(getArenaDeckError(Object.keys(replaced)), null)
})

test('saving a deck clamps duplicate counts and removes invalid quantities', async () => {
  const { useDeckStore, deckCardCount } = await deckStore
  useDeckStore.setState({ decks: [], activeDeckId: null })
  const id = useDeckStore.getState().createDeck()
  useDeckStore.getState().saveDeck(id, { name: 'Singleton', cards: {
    village_scout: 8, the_unbroken: 3, iron_golem: 1,
    spark_sprite: 0, wandering_blade: -1, frost_sage: 0.5, temper: NaN,
  } })
  const saved = useDeckStore.getState().decks[0]
  assert.equal(saved.name, 'Singleton')
  assert.deepEqual(saved.cards, { village_scout: 1, the_unbroken: 1, iron_golem: 1 })
  assert.equal(deckCardCount(saved.cards), 3)
  const persisted = JSON.parse(storage.get('tcg-decks')!)
  assert.deepEqual(persisted.state.decks[0].cards, saved.cards)
  useDeckStore.getState().saveDeck(id, { name: 'Renamed' })
  assert.deepEqual(useDeckStore.getState().decks[0].cards, saved.cards)
})

test('legacy decks migrate to one copy while preserving deck identity and selection', async () => {
  const { useDeckStore } = await deckStore
  const oldDeck = { id: 'old-deck', name: 'Old favourite', locationIds: [],
    updatedAt: 123, cards: { village_scout: 3, the_unbroken: 2, iron_golem: 1 } }
  storage.set('tcg-decks', JSON.stringify({ version: 0, state: { decks: [oldDeck], activeDeckId: oldDeck.id } }))
  await useDeckStore.persist.rehydrate()
  const migrated = { ...oldDeck, cards: { village_scout: 1, the_unbroken: 1, iron_golem: 1 } }
  assert.deepEqual(useDeckStore.getState().decks, [migrated])
  assert.equal(useDeckStore.getState().activeDeckId, oldDeck.id)
  assert.deepEqual(JSON.parse(storage.get('tcg-decks')!), {
    version: 2, state: { decks: [migrated], activeDeckId: oldDeck.id },
  })
  await useDeckStore.persist.rehydrate()
  assert.deepEqual(useDeckStore.getState().decks, [migrated], 'reloading keeps the migrated deck')
})

test('rehydration also enforces the copy limit for current saved decks', async () => {
  const { useDeckStore, removeCard, canAddCard } = await deckStore
  storage.set('tcg-decks', JSON.stringify({ version: 1, state: { activeDeckId: 'current', decks: [
    { id: 'current', name: 'Current deck', locationIds: [], updatedAt: 456, cards: { village_scout: 2 } },
  ] } }))
  await useDeckStore.persist.rehydrate()
  const { cards } = useDeckStore.getState().decks[0]
  assert.deepEqual(cards, { village_scout: 1 })
  assert.deepEqual(removeCard(cards, 'village_scout'), {})
  assert.equal(canAddCard(cards, 'village_scout'), false)
})


test('the balance migration updates untouched starter copies but preserves customized and renamed decks', async () => {
  const { useDeckStore } = await deckStore
  const oldCards = Object.fromEntries(['chalk_apprentice', 'mercury_scholar', 'lead_to_gold', 'paradox_regent', 'crucible_seer', 'silver_equation', 'glass_familiar', 'gilded_oracle', 'alloy_guardian', 'philosopher_engine', 'vessel_of_echoes', 'prism_titan'].map(id => [id, 1]))
  const original = { id: 'starter-copy', name: 'Transmutation', cards: oldCards, locationIds: [], updatedAt: 123 }
  const renamed = { ...original, id: 'renamed', name: 'My experimental deck' }
  const edited = { ...original, id: 'edited', cards: { ...oldCards, village_scout: 1 } }
  delete edited.cards.lead_to_gold
  storage.set('tcg-decks', JSON.stringify({ version: 1, state: { decks: [original, renamed, edited], activeDeckId: original.id } }))
  await useDeckStore.persist.rehydrate()
  const decks = useDeckStore.getState().decks
  assert.deepEqual(decks[0], { ...original, cards: Object.fromEntries(ARENA_ARCHETYPE_DECKS.find(deck => deck.id === 'transmutation')!.cards.map(id => [id, 1])) })
  assert.deepEqual(decks.slice(1), [renamed, edited])
  assert.equal(useDeckStore.getState().activeDeckId, original.id)
  await useDeckStore.persist.rehydrate()
  assert.deepEqual(useDeckStore.getState().decks, decks)
})
