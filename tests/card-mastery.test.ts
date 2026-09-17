import assert from 'node:assert/strict'
import { test } from 'node:test'
import { ArenaEngine, ARENA_CARD_DATABASE, ARENA_STARTER_DECK, CARD_BORDERS, CARD_PLAY_XP, MAX_CARD_XP, getCardMasteryTier, getEquippedCardBorder, normalizeCardXP, sanitizeCardBorders } from '../packages/shared/src/index.ts'
import type { CardBorderId, CardMasteryReward, Room } from '../packages/shared/src/index.ts'

const storage = new Map<string, string>()
Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => storage.set(key, value),
  removeItem: (key: string) => storage.delete(key),
} })
Object.defineProperty(globalThis, 'window', { configurable: true, value: { localStorage: globalThis.localStorage } })
const store = import('../apps/web/src/stores/useCardMasteryStore.ts')
const reward = (matchId: string, definitionId = 'village_scout'): CardMasteryReward => ({ matchId, cards: [{ definitionId, xp: CARD_PLAY_XP }] })

test('each level unlocks at its threshold, with safe XP bounds and cosmetic fallback', () => {
  for (const [index, border] of CARD_BORDERS.entries()) {
    assert.equal(getCardMasteryTier(border.xp).id, border.id)
    if (index) assert.equal(getCardMasteryTier(border.xp - 1).id, CARD_BORDERS[index - 1].id)
  }
  for (const value of [NaN, Infinity, -5, '700', null]) assert.equal(normalizeCardXP(value), 0)
  assert.equal(normalizeCardXP(999999), MAX_CARD_XP)
  assert.equal(getEquippedCardBorder({ xp: 20, equippedBorder: 'eternal' }), 'silver')
  assert.equal(getEquippedCardBorder({ xp: 80, equippedBorder: 'bronze' }), 'bronze')
})

test('played cards unlock automatically; explicit choices and XP survive reload without duplicate rewards', async () => {
  const { useCardMasteryStore, getDeckCardBorders } = await store
  useCardMasteryStore.setState({ cards: {}, claimedMatches: {}, lastReward: null })
  const state = () => useCardMasteryStore.getState()
  assert.equal(state().equipBorder('village_scout', 'eternal'), false)
  assert.deepEqual(state().claimReward(reward('played-1'))?.cards[0].unlocked, ['silver'])
  assert.equal(getEquippedCardBorder(state().cards.village_scout), 'silver')
  assert.equal(state().claimReward(reward('played-1')), null)
  assert.equal(state().cards.village_scout.xp, 20)
  assert.equal(state().equipBorder('village_scout', 'bronze'), true)
  for (let i = 2; i <= 4; i++) state().claimReward(reward(`played-${i}`))
  assert.deepEqual(state().cards.village_scout, { xp: 80, equippedBorder: 'bronze' })
  await useCardMasteryStore.persist.rehydrate()
  assert.deepEqual(state().cards.village_scout, { xp: 80, equippedBorder: 'bronze' })
  assert.equal(state().claimReward(reward('played-1')), null)
  state().equipBorder('village_scout')
  assert.equal(getEquippedCardBorder(state().cards.village_scout), 'jade')
  assert.deepEqual(getDeckCardBorders(['village_scout', 'temper']), { village_scout: 'jade', temper: 'bronze' })
  assert.equal(state().cards.temper, undefined, 'unplayed cards receive no XP')
  for (let i = 5; i <= 40; i++) state().claimReward(reward(`played-${i}`))
  assert.equal(state().cards.village_scout.xp, MAX_CARD_XP)
  assert.equal(getEquippedCardBorder(state().cards.village_scout), 'eternal')
})

test('invalid awards and locked equips cannot alter progression; tokens cannot level up', async () => {
  const { useCardMasteryStore } = await store
  useCardMasteryStore.setState({ cards: {}, claimedMatches: {}, lastReward: null })
  const state = () => useCardMasteryStore.getState()
  const invalid = [null, reward('unknown', 'unknown'), reward('token', 'cursed_offering'), { ...reward(''), cards: [] },
    { ...reward('duplicate'), cards: [...reward('x').cards, ...reward('x').cards] },
    { matchId: 'invalid-xp', cards: [{ definitionId: 'village_scout', xp: -20 }] },
    { matchId: 'invalid-xp', cards: [{ definitionId: 'village_scout', xp: 1e20 }] }]
  for (const value of invalid) assert.equal(state().claimReward(value as CardMasteryReward), null)
  assert.equal(state().equipBorder('village_scout', 'arcane'), false)
  assert.equal(state().equipBorder('cursed_offering', 'bronze'), false)
  assert.deepEqual(state().cards, {})
  assert.deepEqual(state().claimedMatches, {})
})

test('persisted values are sanitized without losing valid mastery or border preferences', async () => {
  const { useCardMasteryStore } = await store
  storage.set('tcg-card-mastery', JSON.stringify({ version: 1, state: { cards: {
    village_scout: { xp: 80, equippedBorder: 'silver' }, temper: { xp: 20, equippedBorder: 'eternal' },
    spark_sprite: { xp: -20 }, unknown: { xp: 700 }, cursed_offering: { xp: 700 },
  }, claimedMatches: { valid: true, invalid: 'yes' } } }))
  await useCardMasteryStore.persist.rehydrate()
  assert.deepEqual(useCardMasteryStore.getState().cards, { village_scout: { xp: 80, equippedBorder: 'silver' }, temper: { xp: 20 }, spark_sprite: { xp: 0 } })
  assert.deepEqual(useCardMasteryStore.getState().claimedMatches, { valid: true })
})

function game(border: CardBorderId = 'eternal') {
  const first = ['village_scout', 'temper', 'ashen_envoy', 'thorn_seeder']
  const deck = [...new Set([...first, ...ARENA_STARTER_DECK])].slice(0, 12)
  const room: Room = { id: 'reusable-room', name: 'Mastery test', hostId: 'a', status: 'in_progress', maxPlayers: 2, isPrivate: true, createdAt: 0,
    players: ['a', 'b'].map(id => ({ id, displayName: id, isReady: true, deckDefinitionIds: deck, cardBorders: Object.fromEntries(deck.map(card => [card, id === 'a' ? border : 'silver'])) })) }
  return new ArenaEngine(room, { shuffle: false })
}
function turn(engine: ArenaEngine, a: string[] = [], b: string[] = []) {
  for (const [id, entries] of [['a', a], ['b', b]] as const) {
    const state = engine.getStateFor(id)
    const result = engine.processAction({ type: 'commit_turn', playerId: id, timestamp: 0,
      submission: { turn: state.turn, plays: entries.map(definitionId => ({ cardInstanceId: state.hand!.find(card => card.definitionId === definitionId)!.instanceId, locationIndex: 0 })) } })
    assert.equal(result.success, true, result.error)
  }
}

test('only revealed cards earn XP, including spells and defectors, after the final resolution', () => {
  const engine = game()
  assert.equal(engine.getStateFor('a').arena!.masteryReward, undefined)
  turn(engine, ['village_scout'])
  turn(engine, ['temper'])
  turn(engine, ['ashen_envoy'])
  assert.equal(engine.getStateFor('a').arena!.locations[0].cards.b.find(entry => entry.card.definitionId === 'ashen_envoy')!.card.cosmeticBorder, 'eternal')
  turn(engine, ['thorn_seeder'])
  turn(engine)
  assert.equal(engine.getStateFor('a').arena!.masteryReward, undefined)
  turn(engine)
  const awarded = engine.getStateFor('a').arena!.masteryReward!
  assert.deepEqual(awarded.cards, ['village_scout', 'temper', 'ashen_envoy', 'thorn_seeder'].map(definitionId => ({ definitionId, xp: CARD_PLAY_XP })))
  assert.deepEqual(engine.getStateFor('b').arena!.masteryReward!.cards, [], 'receiving an enemy card gives no mastery')
  assert.equal(engine.getStateFor('observer').arena!.masteryReward, undefined)
  assert.equal(engine.getStateFor('a').arena!.masteryReward!.matchId, awarded.matchId)
  const token = engine.getStateFor('a').arena!.locations[0].cards.b.find(entry => entry.card.arenaToken)
  assert.ok(token)
  assert.equal(token.card.cosmeticBorder, 'bronze')
  awarded.cards[0].xp = 999
  assert.equal(engine.getStateFor('a').arena!.masteryReward!.cards[0].xp, CARD_PLAY_XP)
})

test('retreats, including before the final reveal, award no mastery', () => {
  const engine = game()
  turn(engine, ['village_scout'])
  while (engine.getStateFor('a').turn < 6) turn(engine)
  engine.processAction({ type: 'surrender', playerId: 'a', timestamp: 0 })
  for (const id of ['a', 'b']) assert.equal(engine.getStateFor(id).arena!.masteryReward, undefined)
})

test('cosmetics are private until revealed, preserve stats, and use only known border identifiers', () => {
  const engine = game()
  const hand = engine.getStateFor('a').hand!
  assert.equal(hand[0].cosmeticBorder, 'eternal')
  assert.equal(hand[0].power, ARENA_CARD_DATABASE.find(card => card.definitionId === hand[0].definitionId)!.power)
  assert.equal(JSON.stringify(engine.getStateFor('b')).includes('eternal'), false)
  turn(engine, ['village_scout'], ['village_scout'])
  const state = engine.getStateFor('b')
  assert.equal(state.arena!.locations[0].cards.a[0].card.cosmeticBorder, 'eternal')
  assert.equal(state.arena!.locations[0].cards.b[0].card.cosmeticBorder, 'silver')
  assert.equal(state.arena!.lastReveal!.events.find(event => event.playerId === 'a')!.card!.cosmeticBorder, 'eternal')
  assert.deepEqual(sanitizeCardBorders({ village_scout: 'url(https://bad)', temper: 'arcane', hidden: 'eternal' }, ['village_scout', 'temper']), { village_scout: 'bronze', temper: 'arcane' })
  const another = game()
  while (!engine.isGameOver().over) turn(engine)
  while (!another.isGameOver().over) turn(another)
  assert.notEqual(engine.getStateFor('a').arena!.masteryReward!.matchId, another.getStateFor('a').arena!.masteryReward!.matchId, 'rematches in the same room have unique claims')
})
