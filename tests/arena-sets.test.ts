import assert from 'node:assert/strict'
import { test } from 'node:test'
import { ARENA_CARD_DATABASE, ARENA_CARD_SETS, ARENA_ETERNAL_CARD_IDS, ARENA_STARTER_DECK, ARENA_ARCHETYPE_DECKS } from '../packages/shared/src/index.ts'

test('every collectible has one valid set and every named Eternal card exists', () => {
  for (const card of ARENA_CARD_DATABASE) assert.ok(ARENA_CARD_SETS.some(set => set.id === card.arenaSet), card.definitionId)
  assert.equal(new Set(ARENA_ETERNAL_CARD_IDS).size, ARENA_ETERNAL_CARD_IDS.length)
  assert.deepEqual(ARENA_CARD_DATABASE.filter(card => card.arenaSet === 'eternal').map(card => card.definitionId).sort(), [...ARENA_ETERNAL_CARD_IDS].sort())
  assert.deepEqual(Object.fromEntries(ARENA_CARD_SETS.map(set => [set.id, ARENA_CARD_DATABASE.filter(card => card.arenaSet === set.id).length])), { core: 57, expanded: 72, eternal: 11 })
})
test('starter cards remain Core and archetype decks still reference valid cards across sets', () => {
  for (const id of ARENA_STARTER_DECK) assert.equal(ARENA_CARD_DATABASE.find(card => card.definitionId === id)?.arenaSet, 'core')
  for (const deck of ARENA_ARCHETYPE_DECKS) for (const id of deck.cards) assert.ok(ARENA_CARD_DATABASE.some(card => card.definitionId === id))
})
