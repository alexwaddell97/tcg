import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { before, test } from 'node:test'
import { ARENA_CARD_DATABASE, ARENA_STARTER_DECK, ArenaEngine, SHOP_CARD_VARIANTS, PACK_CARD_VARIANTS, SHOP_VARIANT_POOL, SHOP_ROTATION_INTERVAL_MS, getShopVariantRotation, applyCardVariant, getCardVariant, sanitizeCardVariants } from '../packages/shared/src/index.ts'
import type { Room } from '../packages/shared/src/index.ts'
import { PACK_PRICES } from '../apps/web/src/lib/packRewards.ts'
import { CURRENT_SEASON, SEASON_REWARD_TRACK } from '../apps/web/src/lib/seasonPass.ts'

// Purchases use isolated memory storage, never the user's browser wallet.
const memory = new Map<string, string>()
Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
  getItem: (key: string) => memory.get(key) ?? null,
  setItem: (key: string, value: string) => { memory.set(key, value) },
  removeItem: (key: string) => { memory.delete(key) },
} })
Object.defineProperty(globalThis, 'window', { configurable: true, value: { localStorage: globalThis.localStorage } })
let useCollectionStore: typeof import('../apps/web/src/stores/useCollectionStore.ts').useCollectionStore
let getDeckCardVariants: typeof import('../apps/web/src/stores/useCollectionStore.ts').getDeckCardVariants
before(async () => { ({ useCollectionStore, getDeckCardVariants } = await import('../apps/web/src/stores/useCollectionStore.ts')) })
const [frost, drake, guardian] = SHOP_CARD_VARIANTS
const state = () => useCollectionStore.getState()
const shopBudget = SHOP_CARD_VARIANTS.reduce((sum, variant) => sum + variant.gemCost, 0)
function reset() {
  useCollectionStore.setState({ gems: shopBudget, cards: { frost_sage: 1, chaos_drake: 1, ancient_guardian: 1 }, variants: {}, equippedVariants: {} })
}
function shopTimeFor(id: string) {
  for (let day = 0; day < SHOP_VARIANT_POOL.length; day++) {
    const now = CURRENT_SEASON.endsAt + day * SHOP_ROTATION_INTERVAL_MS
    if (getShopVariantRotation(now).variants.some(variant => variant.id === id)) return now
  }
  throw new Error(`No rotation contains ${id}`)
}

test('the shop contains three distinct assets and never sells season-pass artwork', () => {
  assert.equal(SHOP_CARD_VARIANTS.length, 3)
  assert.equal(new Set(SHOP_CARD_VARIANTS.map(variant => variant.imageUrl)).size, 3)
  for (const variant of SHOP_CARD_VARIANTS) {
    assert.ok(ARENA_CARD_DATABASE.some(card => card.definitionId === variant.definitionId))
    assert.ok(existsSync(`apps/web/public${variant.imageUrl}`))
    assert.equal(variant.gemCost, 1800)
  }
  reset()
  for (const tier of SEASON_REWARD_TRACK) {
    if (tier.premium.kind !== 'variant') continue
    assert.equal(getCardVariant(tier.premium.id)?.source, 'season')
    assert.equal(state().purchaseVariant(tier.premium.id), false)
    assert.ok(SHOP_CARD_VARIANTS.every(variant => variant.imageUrl !== tier.premium.imageUrl))
  }
  assert.equal(state().gems, shopBudget)
})

test('each purchase deducts once and never grants another base-card copy', t => {
  reset()
  let now = shopTimeFor(frost.id)
  t.mock.method(Date, 'now', () => now)
  const cards = { ...state().cards }
  for (const variant of SHOP_CARD_VARIANTS) {
    now = shopTimeFor(variant.id)
    const before = state().gems
    assert.equal(state().purchaseVariant(variant.id), true)
    assert.equal(state().gems, before - variant.gemCost)
    assert.equal(state().purchaseVariant(variant.id), false)
    assert.equal(state().gems, before - variant.gemCost)
    assert.equal(state().variants[variant.id], true)
  }
  assert.equal(state().gems, 0)
  assert.deepEqual(state().cards, cards)
  assert.deepEqual(state().equippedVariants, {}, 'buying does not replace the player’s chosen artwork')
})

test('pack rewards and payment persist together; a variant keeps the single base copy and can be equipped', async t => {
  reset()
  t.mock.method(Math, 'random', () => 0)
  const cards = Object.fromEntries(ARENA_CARD_DATABASE.map(card => [card.definitionId, 1]))
  useCollectionStore.setState({ cards, tokens: 2, nextTokenAt: null })
  const reward = state().openPack('core')!
  assert.ok(reward.variantId)
  assert.ok(PACK_CARD_VARIANTS.some(variant => variant.id === reward.variantId))
  assert.deepEqual(state().cards, cards)
  assert.equal(state().tokens, 1)
  assert.ok(state().nextTokenAt! > Date.now())
  assert.equal(state().variants[reward.variantId], true)
  assert.equal(state().equipVariant(reward.card.definitionId, reward.variantId), true)
  const saved = JSON.parse(memory.get('tcg-collection')!).state
  assert.equal(saved.tokens, 1)
  assert.equal(saved.variants[reward.variantId], true)
  await useCollectionStore.persist.rehydrate()
  assert.equal(state().equippedVariants[reward.card.definitionId], reward.variantId)
  assert.equal(state().purchaseVariant(reward.variantId), false, 'art already obtained from a pack cannot be bought again')
  const second = state().openPack('core')!
  assert.notEqual(second.variantId, reward.variantId)
  assert.equal(state().tokens, 0)
  assert.equal(state().openPack('core'), undefined)
})

test('an exhausted or unaffordable pack cannot charge; a missing base card is granted exactly once', t => {
  reset()
  t.mock.method(Math, 'random', () => 0)
  const cards = Object.fromEntries(ARENA_CARD_DATABASE.map(card => [card.definitionId, 1]))
  const variants = Object.fromEntries(PACK_CARD_VARIANTS.map(variant => [variant.id, true as const]))
  useCollectionStore.setState({ cards, variants, tokens: 2, nextTokenAt: null })
  for (const pack of ['core', 'expanded', 'eternal', 'unknown']) assert.equal(state().openPack(pack), undefined)
  assert.equal(state().gems, shopBudget); assert.equal(state().tokens, 2); assert.equal(state().nextTokenAt, null)
  const missing = ARENA_CARD_DATABASE.find(card => card.arenaSet === 'expanded')!
  delete cards[missing.definitionId]
  useCollectionStore.setState({ cards: { ...cards } })
  for (const gems of [100, PACK_PRICES.expanded.cost - 1, -1, NaN, Infinity]) {
    useCollectionStore.setState({ gems })
    assert.equal(state().openPack('expanded'), undefined)
    assert.equal(state().gems, gems)
    assert.equal(state().cards[missing.definitionId], undefined)
  }
  useCollectionStore.setState({ gems: PACK_PRICES.expanded.cost })
  const reward = state().openPack('expanded')!
  assert.equal(reward.card.definitionId, missing.definitionId)
  assert.equal(reward.variantId, undefined)
  assert.equal(state().cards[missing.definitionId], 1); assert.equal(state().gems, 0)
})

test('exclusive season cards cannot charge for an empty Eternal pool; release unlocks pack rewards', t => {
  reset()
  const ids: string[] = [CURRENT_SEASON.featuredCard, CURRENT_SEASON.secondCard]
  const owned = Object.fromEntries(ARENA_CARD_DATABASE.filter(card => !ids.includes(card.definitionId)).map(card => [card.definitionId, 1]))
  const variants = Object.fromEntries(PACK_CARD_VARIANTS.map(art => [art.id, true as const]))
  let now = CURRENT_SEASON.endsAt - 1
  t.mock.method(Date, 'now', () => now)
  t.mock.method(Math, 'random', () => 0)
  useCollectionStore.setState({ cards: owned, variants, gems: 2 * PACK_PRICES.eternal.cost })
  assert.equal(state().openPack('eternal'), undefined)
  assert.equal(state().gems, 2 * PACK_PRICES.eternal.cost)
  assert.deepEqual(state().cards, owned)
  now = CURRENT_SEASON.endsAt
  assert.equal(state().openPack('eternal')?.card.definitionId, ids[0])
  assert.equal(state().cards[ids[0]], 1)
  assert.equal(state().openPack('eternal')?.card.definitionId, ids[1])
  assert.equal(state().cards[ids[1]], 1)
  assert.equal(state().gems, 0)
  assert.equal(state().openPack('eternal'), undefined)
  assert.equal(state().gems, 0)
})

test('missing cards, unknown variants and insufficient or invalid balances cannot be charged', t => {
  reset()
  t.mock.method(Date, 'now', () => shopTimeFor(frost.id))
  assert.equal(state().purchaseVariant('unknown'), false)
  useCollectionStore.setState({ cards: {} })
  assert.equal(state().purchaseVariant(frost.id), false)
  assert.equal(state().gems, shopBudget)
  useCollectionStore.setState({ cards: { frost_sage: 1 } })
  for (const gems of [200, frost.gemCost - 1, 0, -1, NaN, Infinity]) {
    useCollectionStore.setState({ gems })
    assert.equal(state().purchaseVariant(frost.id), false)
    assert.equal(state().gems, gems)
    assert.deepEqual(state().variants, {})
  }
})

test('only owned, matching artwork can be equipped; original and ownership persist across reload', async t => {
  reset()
  let now = shopTimeFor(frost.id)
  t.mock.method(Date, 'now', () => now)
  assert.equal(state().equipVariant(frost.definitionId, frost.id), false)
  state().purchaseVariant(frost.id)
  assert.equal(state().equipVariant(drake.definitionId, frost.id), false)
  assert.equal(state().equipVariant(frost.definitionId, 'unknown'), false)
  assert.equal(state().equipVariant(frost.definitionId, frost.id), true)
  assert.deepEqual(getDeckCardVariants([frost.definitionId]), { frost_sage: frost.id })
  assert.deepEqual(getDeckCardVariants([drake.definitionId]), {})
  await useCollectionStore.persist.rehydrate()
  assert.equal(state().variants[frost.id], true)
  assert.equal(state().equippedVariants.frost_sage, frost.id)
  assert.equal(state().gems, shopBudget - frost.gemCost)
  assert.equal(state().equipVariant(frost.definitionId), true)
  await useCollectionStore.persist.rehydrate()
  assert.deepEqual(state().equippedVariants, {})
  assert.equal(state().variants[frost.id], true)
  assert.equal(state().gems, shopBudget - frost.gemCost)
  now += SHOP_ROTATION_INTERVAL_MS
  assert.ok(!getShopVariantRotation().variants.some(variant => variant.id === frost.id))
  assert.equal(state().equipVariant(frost.definitionId, frost.id), true, 'owned artwork remains equipable after the shop rotates')
})

test('expired or off-rotation offers never charge, including a preview kept open over midnight', t => {
  reset()
  const day = shopTimeFor(frost.id)
  let now = day + SHOP_ROTATION_INTERVAL_MS - 1
  t.mock.method(Date, 'now', () => now)
  assert.ok(getShopVariantRotation().variants.some(variant => variant.id === frost.id))
  now++
  assert.ok(!getShopVariantRotation().variants.some(variant => variant.id === frost.id))
  assert.equal(state().purchaseVariant(frost.id), false)
  assert.equal(state().gems, shopBudget)
  assert.deepEqual(state().variants, {})
  now = day
  const offers = getShopVariantRotation().variants.map(variant => variant.id)
  assert.equal(state().purchaseVariant(frost.id), true)
  assert.deepEqual(getShopVariantRotation().variants.map(variant => variant.id), offers, 'purchases cannot reroll stock')
  now = day + SHOP_ROTATION_INTERVAL_MS
  assert.equal(state().purchaseVariant(frost.id), false)
  assert.equal(state().gems, shopBudget - frost.gemCost)
})

test('a pack variant can be bought in rotation once; ownership persists and removes it from pack rewards', async t => {
  reset()
  const variant = PACK_CARD_VARIANTS[0]
  t.mock.method(Date, 'now', () => shopTimeFor(variant.id))
  useCollectionStore.setState({ cards: { [variant.definitionId]: 1 } })
  const offers = getShopVariantRotation()
  assert.equal(state().purchaseVariant(variant.id), true)
  assert.equal(state().gems, shopBudget - 1800)
  assert.equal(state().cards[variant.definitionId], 1)
  assert.equal(state().equipVariant(variant.definitionId, variant.id), true)
  await useCollectionStore.persist.rehydrate()
  assert.equal(state().variants[variant.id], true)
  assert.equal(state().equippedVariants[variant.definitionId], variant.id)
  assert.deepEqual(getShopVariantRotation(), offers, 'reloading cannot reroll stock')
  const { eligiblePackVariants } = await import('../apps/web/src/lib/packRewards.ts')
  for (const pack of ['core', 'expanded', 'eternal']) assert.ok(!eligiblePackVariants(pack, state().cards, state().variants).some(art => art.id === variant.id))
  assert.equal(state().purchaseVariant(variant.id), false)
  assert.equal(state().gems, shopBudget - 1800)
})

test('legacy saves keep collection value and invalid appearance selections are discarded', async () => {
  memory.set('tcg-collection', JSON.stringify({ version: 1, state: { gems: 75, shards: 123, cards: { frost_sage: 2 }, tokens: 1, nextTokenAt: null } }))
  await useCollectionStore.persist.rehydrate()
  assert.deepEqual(state().variants, {})
  assert.deepEqual(state().equippedVariants, {})
  assert.equal(state().cards.frost_sage, 1)
  assert.equal(state().gems, 213)
  assert.equal('shards' in state(), false)
  memory.set('tcg-collection', JSON.stringify({ version: 1, state: {
    cards: { frost_sage: 1, chaos_drake: 1 }, variants: { [frost.id]: true, [drake.id]: 'yes', unknown: true },
    equippedVariants: { frost_sage: frost.id, chaos_drake: drake.id, ancient_guardian: guardian.id },
  } }))
  await useCollectionStore.persist.rehydrate()
  assert.deepEqual(state().variants, { [frost.id]: true })
  assert.deepEqual(state().equippedVariants, { frost_sage: frost.id })
  useCollectionStore.setState({ equippedVariants: { chaos_drake: drake.id, frost_sage: frost.id } })
  assert.deepEqual(getDeckCardVariants(['frost_sage', 'chaos_drake']), { frost_sage: frost.id })
})

test('appearance IDs are matched to base cards and cannot supply custom URLs or change stats', () => {
  const card = ARENA_CARD_DATABASE.find(card => card.definitionId === frost.definitionId)!
  assert.deepEqual(applyCardVariant(card, frost.id), { ...card, imageUrl: frost.imageUrl })
  assert.equal(applyCardVariant(card, drake.id), card)
  assert.equal(applyCardVariant(card, 'https://untrusted/image.webp'), card)
  for (const input of [null, [], { frost_sage: 'https://untrusted/image.webp' }, { frost_sage: drake.id }, Object.create({ frost_sage: frost.id })]) {
    assert.deepEqual(sanitizeCardVariants(input, [frost.definitionId]), {})
  }
  assert.deepEqual(sanitizeCardVariants({ frost_sage: frost.id, chaos_drake: drake.id }, ['frost_sage']), { frost_sage: frost.id })
})

function commit(engine: ArenaEngine, playFrost = false) {
  for (const id of ['a', 'b']) {
    const view = engine.getStateFor(id)
    const result = engine.processAction({ type: 'commit_turn', playerId: id, timestamp: 0, submission: {
      turn: view.turn, plays: playFrost ? [{ cardInstanceId: view.hand!.find(card => card.definitionId === 'frost_sage')!.instanceId, locationIndex: 0 }] : [],
    } })
    assert.equal(result.success, true, result.error)
  }
}
test('match art stays private until revealed, follows its owner, and shares base-card mastery', () => {
  const deck = [...new Set(['frost_sage', ...ARENA_STARTER_DECK])].slice(0, 12)
  const room: Room = { id: 'variant-test', name: 'Variants', hostId: 'a', status: 'in_progress', maxPlayers: 2, isPrivate: true, createdAt: 0,
    players: ['a', 'b'].map(id => ({ id, displayName: id, isReady: true, deckDefinitionIds: deck, cardVariants: id === 'a' ? { frost_sage: frost.id } : {} })) }
  const engine = new ArenaEngine(room, { shuffle: false })
  const original = ARENA_CARD_DATABASE.find(card => card.definitionId === 'frost_sage')!
  assert.equal(engine.getStateFor('a').hand![0].imageUrl, frost.imageUrl)
  assert.equal(engine.getStateFor('b').hand![0].imageUrl, original.imageUrl)
  assert.equal(JSON.stringify(engine.getStateFor('b')).includes(frost.imageUrl), false)
  room.players[0].cardVariants = {}
  assert.equal(engine.getStateFor('a').hand![0].imageUrl, frost.imageUrl, 'match art is snapshotted')
  while (engine.getStateFor('a').turn < original.cost) commit(engine)
  commit(engine, true)
  const view = engine.getStateFor('b')
  assert.equal(view.arena!.locations[0].cards.a[0].card.imageUrl, frost.imageUrl)
  assert.equal(view.arena!.locations[0].cards.b[0].card.imageUrl, original.imageUrl)
  assert.equal(view.arena!.locations[0].cards.a[0].card.description, original.description)
  assert.equal(view.arena!.lastReveal!.events.find(event => event.playerId === 'a' && event.card)?.card?.imageUrl, frost.imageUrl)
  while (!engine.isGameOver().over) commit(engine)
  assert.deepEqual(engine.getStateFor('a').arena!.masteryReward!.cards.map(card => card.definitionId), ['frost_sage'])
})
