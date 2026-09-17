import assert from 'node:assert/strict'
import { before, test } from 'node:test'
import { ArenaEngine, ARENA_CARD_DATABASE, ARENA_STARTER_DECK } from '../packages/shared/src/index.ts'
import type { ArenaQuestReceipt, Room } from '../packages/shared/src/index.ts'
import { DAILY_QUESTS, SEASON_QUESTS, TOTAL_DAILY_GEMS, dailyQuestProgress, validQuestReceipt } from '../apps/web/src/lib/quests.ts'
import { CURRENT_SEASON } from '../apps/web/src/lib/seasonPass.ts'

const memory = new Map<string, string>()
Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
  getItem: (key: string) => memory.get(key) ?? null,
  setItem: (key: string, value: string) => { memory.set(key, value) },
  removeItem: (key: string) => { memory.delete(key) },
} })
Object.defineProperty(globalThis, 'window', { configurable: true, value: { localStorage: globalThis.localStorage } })
let useCollectionStore: typeof import('../apps/web/src/stores/useCollectionStore.ts').useCollectionStore
before(async () => { ({ useCollectionStore } = await import('../apps/web/src/stores/useCollectionStore.ts')) })
const during = CURRENT_SEASON.startsAt + 1000
const receipt = (id: string, finishedAt = during): ArenaQuestReceipt => ({ matchId: id, finishedAt,
  metrics: { unitsPlayed: 12, spellsPlayed: 4, aetherSpent: 20, arenasWon: 3, powerArenas: 1, matchesWon: 1 } })
const state = () => useCollectionStore.getState()
const reset = () => useCollectionStore.setState({ gems: 100, seasons: {}, dailyQuests: undefined, questMatches: {}, lastQuestReward: null })

function game(first = ['village_scout', 'temper', 'ashen_envoy', 'thorn_seeder']) {
  const deck = [...new Set([...first, ...ARENA_STARTER_DECK])].slice(0, 12)
  const room: Room = { id: 'quests', name: 'Quests', hostId: 'a', status: 'in_progress', maxPlayers: 2, isPrivate: true, createdAt: during,
    players: ['a', 'b'].map(id => ({ id, displayName: id, isReady: true, deckDefinitionIds: deck })) }
  return new ArenaEngine(room, { shuffle: false })
}
function turn(engine: ArenaEngine, cardId?: string) {
  for (const id of ['a', 'b']) {
    const view = engine.getStateFor(id)
    const card = cardId && id === 'a' ? view.hand!.find(card => card.definitionId === cardId)! : null
    const result = engine.processAction({ type: 'commit_turn', playerId: id, timestamp: 0,
      submission: { turn: view.turn, plays: card ? [{ cardInstanceId: card.instanceId, locationIndex: 0 }] : [] } })
    assert.equal(result.success, true, result.error)
  }
}
function finish(engine: ArenaEngine) { while (!engine.isGameOver().over) turn(engine) }

test('quest definitions are gameplay-only and preserve the daily gem budget', () => {
  assert.equal(DAILY_QUESTS.length, 4)
  assert.equal(TOTAL_DAILY_GEMS, 70)
  assert.equal(SEASON_QUESTS.length, 6)
  assert.equal(SEASON_QUESTS.reduce((sum, quest) => sum + quest.reward, 0), 1200)
  assert.ok([...DAILY_QUESTS, ...SEASON_QUESTS].every(quest => ['unitsPlayed', 'spellsPlayed', 'aetherSpent', 'arenasWon', 'powerArenas', 'matchesWon'].includes(quest.metric)))
})
test('engine receipts count casts and paid aether, exclude spawned tokens, and attribute defectors to their player', context => {
  context.mock.method(Date, 'now', () => during)
  const engine = game()
  assert.equal(engine.getStateFor('a').arena!.questReceipt, undefined)
  for (const id of ['village_scout', 'temper', 'ashen_envoy', 'thorn_seeder']) turn(engine, id)
  assert.equal(engine.getStateFor('a').arena!.questReceipt, undefined)
  finish(engine)
  const a = engine.getStateFor('a').arena!.questReceipt!
  const b = engine.getStateFor('b').arena!.questReceipt!
  assert.equal(a.metrics.unitsPlayed, 3)
  assert.equal(a.metrics.spellsPlayed, 1)
  assert.equal(a.metrics.aetherSpent, ['village_scout', 'temper', 'ashen_envoy', 'thorn_seeder'].reduce((sum, id) => sum + ARENA_CARD_DATABASE.find(card => card.definitionId === id)!.cost, 0))
  assert.equal(b.metrics.unitsPlayed, 0)
  assert.equal(b.metrics.aetherSpent, 0)
  assert.equal(a.finishedAt, during)
  assert.equal(a.matchId, engine.getStateFor('a').arena!.masteryReward!.matchId)
  assert.notEqual(a.matchId, b.matchId)
  assert.equal(engine.getStateFor('observer').arena!.questReceipt, undefined)
  a.metrics.unitsPlayed = 900
  assert.equal(engine.getStateFor('a').arena!.questReceipt!.metrics.unitsPlayed, 3)
})
test('final score objectives use resolved power and ties do not count as arena or match wins', () => {
  const engine = game(['village_scout', 'wandering_blade', 'frost_sage', 'iron_golem', 'ancient_guardian', 'the_unbroken'])
  turn(engine, 'village_scout'); turn(engine, 'wandering_blade'); turn(engine, 'iron_golem'); turn(engine); turn(engine, 'ancient_guardian'); finish(engine)
  const metrics = engine.getStateFor('a').arena!.questReceipt!.metrics
  assert.equal(metrics.arenasWon, 1)
  assert.equal(metrics.powerArenas, 1)
  assert.equal(metrics.matchesWon, 1)
  const idle = game(); finish(idle)
  assert.deepEqual(idle.getStateFor('a').arena!.questReceipt!.metrics, { unitsPlayed: 0, spellsPlayed: 0, aetherSpent: 0, arenasWon: 0, powerArenas: 0, matchesWon: 0 })
})
test('retreats have no quest receipt, even after playing cards or on turn six', () => {
  const engine = game(); turn(engine, 'village_scout')
  while (engine.getStateFor('a').turn < 6) turn(engine)
  engine.processAction({ type: 'surrender', playerId: 'b', timestamp: 0 })
  for (const id of ['a', 'b']) assert.equal(engine.getStateFor(id).arena!.questReceipt, undefined)
})
test('completed objectives pay once, persist with their rewards and cannot be replayed after reload', async context => {
  context.mock.method(Date, 'now', () => during)
  reset()
  state().recordQuestMatch(receipt('one'))
  assert.equal(state().gems, 170)
  assert.equal(state().dailyQuests!.completed.length, 4)
  assert.equal(state().seasons[CURRENT_SEASON.id].xp, 0, 'partial season objectives do not grant XP')
  state().recordQuestMatch(receipt('one'))
  assert.equal(state().gems, 170)
  assert.equal(state().dailyQuests!.counts.daily_units, 12)
  for (const id of ['two', 'three', 'four']) state().recordQuestMatch(receipt(id))
  assert.equal(state().gems, 170)
  assert.equal(state().seasons[CURRENT_SEASON.id].xp, 1200)
  await useCollectionStore.persist.rehydrate()
  state().recordQuestMatch(receipt('four'))
  assert.equal(state().seasons[CURRENT_SEASON.id].xp, 1200)
  assert.equal(state().gems, 170)
})
test('daily reset permits new objectives but old receipts cannot earn a new day’s gems', context => {
  let now = during
  context.mock.method(Date, 'now', () => now)
  reset(); state().recordQuestMatch(receipt('old'))
  now += 86_400_000
  assert.deepEqual(dailyQuestProgress(state().dailyQuests, now).counts, {})
  state().recordQuestMatch(receipt('old'))
  state().recordQuestMatch(receipt('old-unseen'))
  assert.equal(state().gems, 170)
  state().recordQuestMatch(receipt('new', now))
  assert.equal(state().gems, 240)
  assert.equal(state().dailyQuests!.date, new Date(now).toISOString().slice(0, 10))
})
test('invalid or future receipts cannot change balances or objective progress', context => {
  context.mock.method(Date, 'now', () => during)
  reset()
  const inputs = [null, { ...receipt('bad'), matchId: '' }, receipt('future', during + 120000),
    ...[-1, .5, NaN, 10000].map(value => ({ ...receipt('bad'), metrics: { ...receipt('x').metrics, unitsPlayed: value } }))]
  for (const input of inputs) {
    assert.equal(validQuestReceipt(input, during), false)
    state().recordQuestMatch(input as ArenaQuestReceipt)
  }
  assert.equal(state().gems, 100)
  assert.deepEqual(state().seasons, {})
  assert.deepEqual(state().questMatches, {})
})
test('old saves retain XP, claimed rewards and gems; opening the store grants nothing', async context => {
  context.mock.method(Date, 'now', () => during)
  reset()
  memory.set('tcg-collection', JSON.stringify({ version: 1, state: { gems: 250, seasons: { [CURRENT_SEASON.id]: { xp: 800, claimed: [1, 3], matches: { old: true } } } } }))
  await useCollectionStore.persist.rehydrate()
  assert.equal(state().gems, 250)
  assert.equal(state().seasons[CURRENT_SEASON.id].xp, 800)
  assert.deepEqual(state().seasons[CURRENT_SEASON.id].claimed, [1, 3])
  assert.deepEqual(dailyQuestProgress(state().dailyQuests, during).counts, {})
  state().recordQuestMatch({ ...receipt('idle'), metrics: { unitsPlayed: 0, spellsPlayed: 0, aetherSpent: 0, arenasWon: 0, powerArenas: 0, matchesWon: 0 } })
  assert.equal(state().gems, 250)
  assert.equal(state().seasons[CURRENT_SEASON.id].xp, 800)
})
