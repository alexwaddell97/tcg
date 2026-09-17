import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { test } from 'node:test'
import { CURRENT_SEASON, CARD_VARIANTS, PACK_CARD_VARIANTS, SHOP_VARIANT_POOL, SHOP_VARIANT_SLOTS, SHOP_ROTATION_INTERVAL_MS, SEASON_CARD_VARIANT, getShopVariantRotation } from '../packages/shared/src/index.ts'

const ids = (now: number) => getShopVariantRotation(now).variants.map(variant => variant.id)

test('three distinct daily offers stay fixed until midnight UTC, regardless of timezone', () => {
  const morning = Date.parse('2026-09-17T00:00:00Z')
  const first = getShopVariantRotation(morning)
  assert.equal(first.variants.length, 3)
  assert.equal(new Set(ids(morning)).size, 3)
  assert.equal(first.refreshesAt, morning + SHOP_ROTATION_INTERVAL_MS)
  assert.deepEqual(getShopVariantRotation(Date.parse('2026-09-17T01:00:00+01:00')), first)
  assert.deepEqual(getShopVariantRotation(first.refreshesAt - 1), first)
  assert.ok(ids(first.refreshesAt).every(id => !ids(morning).includes(id)))
  assert.equal(getShopVariantRotation(first.refreshesAt).refreshesAt, first.refreshesAt + SHOP_ROTATION_INTERVAL_MS)
})

test('the complete eligible catalog is offered within ten daily rotations, without duplicate slots', () => {
  for (const start of [CURRENT_SEASON.startsAt, CURRENT_SEASON.endsAt]) {
    const expected = SHOP_VARIANT_POOL.filter(variant => start >= CURRENT_SEASON.endsAt || variant.definitionId !== CURRENT_SEASON.secondCard)
    const seen = new Set<string>()
    let previous: string[] = []
    for (let day = 0; day < 10; day++) {
      const offers = ids(start + day * SHOP_ROTATION_INTERVAL_MS)
      assert.equal(offers.length, SHOP_VARIANT_SLOTS)
      assert.equal(new Set(offers).size, SHOP_VARIANT_SLOTS)
      assert.ok(offers.every(id => !previous.includes(id)))
      offers.forEach(id => seen.add(id))
      previous = offers
    }
    assert.deepEqual(seen, new Set(expected.map(variant => variant.id)))
  }
})

test('season art stays exclusive; alternate art of a season card enters only after release', () => {
  const titan = PACK_CARD_VARIANTS.find(variant => variant.definitionId === CURRENT_SEASON.secondCard)!
  for (let day = -30; day <= 60; day++) {
    const now = CURRENT_SEASON.startsAt + day * SHOP_ROTATION_INTERVAL_MS
    assert.ok(!ids(now).includes(SEASON_CARD_VARIANT.id))
    if (now < CURRENT_SEASON.endsAt) assert.ok(!ids(now).includes(titan.id))
  }
  assert.ok(Array.from({ length: 10 }, (_, day) => ids(CURRENT_SEASON.endsAt + day * SHOP_ROTATION_INTERVAL_MS)).flat().includes(titan.id))
})

test('rotation reuses the existing 30 non-season artworks at the balanced price', () => {
  assert.equal(CARD_VARIANTS.length, 31)
  assert.equal(SHOP_VARIANT_POOL.length, 30)
  assert.equal(new Set(SHOP_VARIANT_POOL.map(variant => variant.id)).size, 30)
  for (const variant of SHOP_VARIANT_POOL) {
    assert.ok(existsSync(`apps/web/public${variant.imageUrl}`))
    assert.equal(variant.gemCost, 1800)
    assert.notEqual(variant.source, 'season')
  }
})
