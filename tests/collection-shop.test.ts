import assert from 'node:assert/strict'
import { before, test } from 'node:test'
import { CURRENT_SEASON } from '../apps/web/src/lib/seasonPass.ts'
import { ARENA_CARD_DATABASE } from '../packages/shared/src/index.ts'

// Store tests use isolated memory storage, never the browser's real collection.
const initialTime = Date.now()
const memory = new Map<string, string>([['tcg-collection', JSON.stringify({ version: 0, state: { cards: {}, shards: 0, gems: 50, tokens: 1, nextTokenAt: initialTime + 6 * 60 * 60 * 1000 } })]])
Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
  getItem: (key: string) => memory.get(key) ?? null,
  setItem: (key: string, value: string) => { memory.set(key, value) },
  removeItem: (key: string) => { memory.delete(key) },
} })
Object.defineProperty(globalThis, 'window', { configurable: true, value: { localStorage: globalThis.localStorage } })
let useCollectionStore: typeof import('../apps/web/src/stores/useCollectionStore.ts').useCollectionStore
let PACK_TOKEN_INTERVAL_MS: number
let MAX_PACK_TOKENS: number
before(async () => {
  ({ useCollectionStore, PACK_TOKEN_INTERVAL_MS, MAX_PACK_TOKENS } = await import('../apps/web/src/stores/useCollectionStore.ts'))
})

test('legacy free packs migrate to the weekly cadence without deleting ready packs', () => {
  const state = useCollectionStore.getState()
  assert.equal(state.tokens, 1)
  assert.equal(PACK_TOKEN_INTERVAL_MS, 3.5 * 86_400_000)
  assert.equal(MAX_PACK_TOKENS, 2)
  assert.ok(Math.abs(state.nextTokenAt! - initialTime - 42 * 60 * 60 * 1000) < 10000)
})
test('refills grant two free Core tokens per week and stop at capacity', context => {
  const now = CURRENT_SEASON.startsAt + 10000
  context.mock.method(Date, 'now', () => now)
  useCollectionStore.setState({ tokens: 2, nextTokenAt: null })
  useCollectionStore.getState().spendToken()
  assert.equal(useCollectionStore.getState().nextTokenAt, now + PACK_TOKEN_INTERVAL_MS)
  useCollectionStore.setState({ tokens: 0, nextTokenAt: now - PACK_TOKEN_INTERVAL_MS })
  useCollectionStore.getState().tickTokens()
  assert.equal(useCollectionStore.getState().tokens, 2)
  assert.equal(useCollectionStore.getState().nextTokenAt, null)
})
test('free season rewards are credited atomically once with no card or premium unlock', context => {
  let now = CURRENT_SEASON.startsAt + 10000
  context.mock.method(Date, 'now', () => now)
  useCollectionStore.setState({ seasons: {}, gems: 50, cards: {} })
  useCollectionStore.getState().claimSeasonLevel(2)
  assert.equal(useCollectionStore.getState().gems, 50)
  useCollectionStore.getState().claimSeasonLevel(1)
  useCollectionStore.getState().claimSeasonLevel(1)
  assert.equal(useCollectionStore.getState().gems, 70)
  const receipt = (id: string) => ({ matchId: id, finishedAt: Date.now(), metrics: { unitsPlayed: 10, spellsPlayed: 3, aetherSpent: 20, arenasWon: 3, powerArenas: 1, matchesWon: 1 } })
  for (let i = 0; i < 4; i++) useCollectionStore.getState().recordQuestMatch(receipt(`test-${i}`))
  useCollectionStore.getState().recordQuestMatch(receipt('test-0'))
  assert.equal(useCollectionStore.getState().seasons[CURRENT_SEASON.id].xp, 1200)
  useCollectionStore.getState().claimSeasonLevel(5)
  useCollectionStore.getState().claimSeasonLevel(5)
  assert.equal(useCollectionStore.getState().gems, 180)
  assert.deepEqual(useCollectionStore.getState().cards, {})
  assert.equal(useCollectionStore.getState().openPack('eternal'), undefined, 'the old price cannot buy an Eternal pack')
  assert.equal(useCollectionStore.getState().gems, 180)
  for (let day = 1; day <= 15; day++) {
    now += 86_400_000
    for (let match = 0; match < 4; match++) useCollectionStore.getState().recordQuestMatch(receipt(`saving-${day}-${match}`))
  }
  assert.equal(useCollectionStore.getState().gems, 1230)
  const reward = useCollectionStore.getState().openPack('eternal')!
  assert.ok(reward)
  assert.equal(useCollectionStore.getState().gems, 30, 'quest and pass gems fund the same pack purchase')
  assert.equal(useCollectionStore.getState().cards[reward.card.definitionId], 1)
})

test('legacy shards and excess-copy value convert once into gems without resetting progress', async context => {
  const now = CURRENT_SEASON.startsAt + 10000
  context.mock.method(Date, 'now', () => now)
  const progress = { xp: 800, claimed: [1, 5], matches: { finished: true } }
  const nextTokenAt = now + 100000
  memory.set('tcg-collection', JSON.stringify({ version: 1, state: {
    gems: 100, shards: 50, cards: { village_scout: 3 }, tokens: 1, nextTokenAt,
    seasons: { [CURRENT_SEASON.id]: progress }, questMatches: { finished: true },
    variants: { 'village-scout-lanternwood': true }, equippedVariants: { village_scout: 'village-scout-lanternwood' },
  } }))
  await useCollectionStore.persist.rehydrate()
  const state = useCollectionStore.getState()
  assert.equal(state.gems, 160, '100 gems + 50 shards + two old common duplicates worth 5 each')
  assert.deepEqual(state.cards, { village_scout: 1 })
  assert.equal(state.tokens, 1)
  assert.equal(state.nextTokenAt, nextTokenAt)
  assert.deepEqual(state.seasons[CURRENT_SEASON.id], progress)
  assert.deepEqual(state.questMatches, { finished: true })
  assert.equal(state.equippedVariants.village_scout, 'village-scout-lanternwood')
  for (const removed of ['shards', 'craftCard', 'refundCard', 'refundAllExcess']) assert.equal(removed in state, false)
  state.claimSeasonLevel(1)
  state.claimSeasonLevel(5)
  assert.equal(useCollectionStore.getState().gems, 160, 'already-claimed rewards cannot pay again')
  const saved = JSON.parse(memory.get('tcg-collection')!)
  assert.equal(saved.version, 2)
  assert.equal('shards' in saved.state, false)
  await useCollectionStore.persist.rehydrate()
  assert.equal(useCollectionStore.getState().gems, 160, 'reloading cannot repeat the conversion')
  useCollectionStore.getState().claimSeasonLevel(2)
  assert.equal(useCollectionStore.getState().gems, 180)
})

test('invalid legacy shard values cannot reduce or corrupt gems, and duplicate grants keep one card', async () => {
  for (const shards of [-100, null, '500']) {
    memory.set('tcg-collection', JSON.stringify({ version: 1, state: { gems: 80, shards, cards: {} } }))
    await useCollectionStore.persist.rehydrate()
    assert.equal(useCollectionStore.getState().gems, 80)
    assert.equal('shards' in useCollectionStore.getState(), false)
  }
  const card = ARENA_CARD_DATABASE.find(card => card.definitionId === 'village_scout')!
  useCollectionStore.getState().addCards([card, card])
  useCollectionStore.getState().addCards([card])
  assert.equal(useCollectionStore.getState().cards[card.definitionId], 1)
  assert.equal(useCollectionStore.getState().gems, 80)
})
