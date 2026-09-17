import assert from 'node:assert/strict'
import { test } from 'node:test'
import { ARENA_CARD_DATABASE, PACK_CARD_VARIANTS, SHOP_CARD_VARIANTS, SEASON_CARD_VARIANT, CURRENT_SEASON, ARENA_SEASONS, arenaCardSetName } from '../packages/shared/src/index.ts'
import { eligiblePackCards, generatePackCard, eligiblePackVariants, generatePackReward, hasPackRewards, PACK_VARIANT_CHANCE } from '../apps/web/src/lib/packRewards.ts'

test('packs award one unowned card exclusively from their own set', () => {
  const now = CURRENT_SEASON.endsAt
  for (const pack of ['core', 'expanded', 'eternal']) {
    const owned: Record<string, number> = {}
    let count = 0
    while (eligiblePackCards(pack, owned, now).length) {
      const card = generatePackCard(pack, owned, () => .5, now)!
      assert.equal(Array.isArray(card), false)
      assert.equal(owned[card.definitionId], undefined)
      assert.equal(card.arenaSet, pack)
      owned[card.definitionId] = 1
      count++
      assert.ok(count <= ARENA_CARD_DATABASE.length)
    }
    assert.equal(count, ARENA_CARD_DATABASE.filter(card => card.arenaSet === pack).length)
    assert.equal(generatePackCard(pack, owned, Math.random, now), undefined, 'an exhausted set cannot spill into another set')
  }
})
test('old pack names and invalid products cannot generate rewards', () => {
  for (const pack of ['standard', 'premium', 'faction', 'unknown']) assert.equal(generatePackCard(pack, {}), undefined)
})
test('Core rarity weights and remaining-card eligibility agree', () => {
  for (const [roll, rarity] of [[0, 'common'], [.6, 'uncommon'], [.85, 'rare'], [.98, 'legendary']] as const) {
    assert.equal(generatePackCard('core', {}, () => roll)?.rarity, rarity)
  }
  const remaining = ARENA_CARD_DATABASE.find(card => card.arenaSet === 'core' && card.rarity === 'common')!
  const owned = Object.fromEntries(ARENA_CARD_DATABASE.filter(card => card !== remaining).map(card => [card.definitionId, 1]))
  assert.equal(generatePackCard('core', owned, () => .99)?.definitionId, remaining.definitionId)
  assert.deepEqual(eligiblePackCards('eternal', owned), [])
})

test('alternate artwork can drop for owned cards without duplicating their base or changing rules', () => {
  const variant = PACK_CARD_VARIANTS[0]
  const base = ARENA_CARD_DATABASE.find(card => card.definitionId === variant.definitionId)!
  const owned = { [base.definitionId]: 1 }
  assert.ok(!eligiblePackVariants(base.arenaSet!, {}, {}).length)
  const reward = generatePackReward(base.arenaSet!, owned, {}, () => 0)!
  assert.equal(reward.variantId, variant.id)
  assert.deepEqual(reward.card, { ...base, imageUrl: variant.imageUrl })
  assert.deepEqual(owned, { [base.definitionId]: 1 })
  assert.equal(generatePackReward(base.arenaSet!, owned, {}, () => PACK_VARIANT_CHANCE)?.variantId, undefined)
  assert.equal(generatePackReward(base.arenaSet!, owned, { [variant.id]: true }, () => 0)?.variantId, undefined)
  assert.ok(PACK_VARIANT_CHANCE < .03)
})

test('completed base sets offer only remaining pack variants and exhausted pools cannot charge for duplicates', () => {
  const now = CURRENT_SEASON.endsAt
  const owned = Object.fromEntries(ARENA_CARD_DATABASE.map(card => [card.definitionId, 1]))
  const variants: Record<string, true> = {}
  let count = 0
  for (const set of ['core', 'expanded', 'eternal']) {
    while (hasPackRewards(set, owned, variants, now)) {
      const reward = generatePackReward(set, owned, variants, () => .8, now)!
      assert.ok(reward.variantId)
      assert.equal(variants[reward.variantId], undefined)
      assert.equal(reward.card.arenaSet, set)
      variants[reward.variantId] = true
      assert.ok(++count <= PACK_CARD_VARIANTS.length)
    }
    assert.equal(generatePackReward(set, owned, variants, Math.random, now), undefined)
  }
  assert.equal(count, 27)
  assert.ok(!variants[SEASON_CARD_VARIANT.id])
  for (const variant of SHOP_CARD_VARIANTS) assert.ok(!variants[variant.id])
  assert.equal(generatePackReward('invalid', owned, {}), undefined)
})

test('season cards enter only Eternal packs at their season-end boundary, with no exhausted-pool fallback', () => {
  for (const season of ARENA_SEASONS) {
    const ids: string[] = [season.featuredCard, season.secondCard]
    const owned = Object.fromEntries(ARENA_CARD_DATABASE.filter(card => !ids.includes(card.definitionId)).map(card => [card.definitionId, 1]))
    const variants = Object.fromEntries(PACK_CARD_VARIANTS.map(variant => [variant.id, true as const]))
    for (const now of [season.startsAt - 1, season.startsAt, season.endsAt - 1]) {
      for (const pack of ['core', 'expanded', 'eternal']) {
        assert.deepEqual(eligiblePackCards(pack, owned, now), [])
        assert.equal(hasPackRewards(pack, owned, variants, now), false)
        assert.equal(generatePackReward(pack, owned, variants, () => 0, now), undefined)
      }
      for (const id of ids) assert.equal(arenaCardSetName(ARENA_CARD_DATABASE.find(card => card.definitionId === id)!, now), 'Premium Season Pass')
    }
    for (const now of [season.endsAt, season.endsAt + 1]) {
      assert.deepEqual(new Set(eligiblePackCards('eternal', owned, now).map(card => card.definitionId)), new Set(ids))
      assert.ok(ids.includes(generatePackCard('eternal', owned, () => 0, now)!.definitionId))
      assert.ok(ids.includes(generatePackReward('eternal', owned, variants, () => .99, now)!.card.definitionId))
      assert.deepEqual(eligiblePackCards('core', owned, now), [])
      assert.deepEqual(eligiblePackCards('expanded', owned, now), [])
      for (const id of ids) assert.equal(arenaCardSetName(ARENA_CARD_DATABASE.find(card => card.definitionId === id)!, now), 'Eternal Set')
    }
  }
})

test('pack variants follow their base card release; season-exclusive artwork never joins packs', () => {
  const variant = PACK_CARD_VARIANTS.find(art => art.definitionId === CURRENT_SEASON.secondCard)!
  const owned = Object.fromEntries(ARENA_CARD_DATABASE.map(card => [card.definitionId, 1]))
  const variants = Object.fromEntries(PACK_CARD_VARIANTS.filter(art => art.id !== variant.id).map(art => [art.id, true as const]))
  assert.deepEqual(eligiblePackVariants('eternal', owned, variants, CURRENT_SEASON.endsAt - 1), [])
  assert.equal(generatePackReward('eternal', owned, variants, () => 0, CURRENT_SEASON.endsAt - 1), undefined)
  assert.equal(generatePackReward('eternal', owned, variants, () => 0, CURRENT_SEASON.endsAt)?.variantId, variant.id)
  assert.ok(!eligiblePackVariants('eternal', owned, {}, CURRENT_SEASON.endsAt).some(art => art.id === SEASON_CARD_VARIANT.id))
})
