import assert from 'node:assert/strict'
import { test } from 'node:test'
import { existsSync } from 'node:fs'
import { ARENA_CARD_DATABASE, ARENA_TOKEN_DATABASE, ARENA_ARCHETYPE_DECKS, ARENA_STARTER_DECK, CARD_VARIANTS,
  ArenaEngine, getArenaCardPower, getArenaFormation, getArenaDeckError, getArenaAbilities } from '../packages/shared/src/index.ts'
import type { ArenaIndex, ArenaPlay, ArenaSlotIndex, Card, GameState, Room } from '../packages/shared/src/index.ts'
import { buildArenaPlayback } from '../apps/web/src/lib/arenaPlayback.ts'
import { FOUNDATION_CURVES } from '../scripts/foundations-curves.ts'

const instance = (id: string): Card => {
  const definition = [...ARENA_CARD_DATABASE, ...ARENA_TOKEN_DATABASE].find(card => card.definitionId === id)
  assert.ok(definition, id)
  return { ...structuredClone(definition), instanceId: crypto.randomUUID(), powerBonus: 0, questProgress: 0, isTransformed: false }
}
function fixture(a: string[] = [], b: string[] = [], turn = 6) {
  const room: Room = { id: crypto.randomUUID(), name: 'Foundations', hostId: 'a', status: 'in_progress', maxPlayers: 2, isPrivate: true, createdAt: 0,
    players: ['a', 'b'].map(id => ({ id, displayName: id, isReady: true, deckDefinitionIds: ARENA_STARTER_DECK })) }
  const engine = new ArenaEngine(room, { shuffle: false })
  const internal = engine as unknown as { state: GameState; hands: Map<string, Card[]>; decks: Map<string, Card[]> }
  const state = internal.state
  state.turn = turn; state.arena!.energy = turn
  state.arena!.locations.forEach(site => { site.revealed = true; delete site.rule })
  for (const [owner, ids] of [['a', a], ['b', b]] as const) {
    internal.hands.set(owner, ids.map(instance)); internal.decks.set(owner, [])
    state.players[owner].handCount = ids.length; state.players[owner].deckCount = 0
  }
  const seed = (owner: string, id: string, slotIndex: ArenaSlotIndex, index: ArenaIndex = 0) => {
    const card = instance(id)
    state.arena!.locations[index].cards[owner].push({ card, slotIndex, placedOnTurn: 1 }); return card
  }
  const play = (owner: string, id: string, locationIndex: ArenaIndex = 0, slotIndex?: ArenaSlotIndex): ArenaPlay => ({
    cardInstanceId: internal.hands.get(owner)!.find(card => card.definitionId === id)!.instanceId, locationIndex, slotIndex,
  })
  const resolve = (a: ArenaPlay[] = [], b: ArenaPlay[] = []) => {
    for (const [owner, plays] of [['a', a], ['b', b]] as const) {
      const outcome = engine.processAction({ type: 'commit_turn', playerId: owner, timestamp: 0, submission: { turn: state.turn, plays } })
      assert.equal(outcome.success, true, outcome.error)
    }
    return engine.getStateFor('a')
  }
  return { engine, internal, state, site: state.arena!.locations[0], seed, play, resolve }
}

test('the complete set is exactly 140 base cards and 31 distinct cosmetic variants, with real art', () => {
  assert.equal(ARENA_CARD_DATABASE.length, 140)
  assert.equal(new Set(ARENA_CARD_DATABASE.map(card => card.definitionId)).size, 140)
  assert.deepEqual(Object.fromEntries(['unit', 'spell', 'relic'].map(type => [type, ARENA_CARD_DATABASE.filter(card => card.type === type).length])), { unit: 96, spell: 30, relic: 14 })
  assert.equal(CARD_VARIANTS.length, 31)
  assert.equal(new Set(CARD_VARIANTS.map(variant => variant.id)).size, 31)
  assert.equal(new Set(CARD_VARIANTS.map(variant => variant.imageUrl)).size, 31)
  for (const card of ARENA_CARD_DATABASE) {
    assert.ok(!card.arenaToken && !card.isTransformTarget, card.definitionId)
    assert.ok(card.description && !card.description.includes('undefined'), card.definitionId)
    assert.ok(card.arenaArchetypes?.length, card.definitionId)
    assert.ok(existsSync(`apps/web/public/${card.imageUrl.replace(/^\.?\//, '')}`), card.imageUrl)
    assert.ok(card.cost >= 0 && card.cost <= 6)
    if (card.type !== 'unit') assert.equal(card.power, 0)
  }
  for (const variant of CARD_VARIANTS) {
    assert.ok(ARENA_CARD_DATABASE.some(card => card.definitionId === variant.definitionId))
    assert.ok(existsSync(`apps/web/public${variant.imageUrl}`), variant.imageUrl)
  }
  assert.equal(ARENA_ARCHETYPE_DECKS.length, 8)
  for (const deck of ARENA_ARCHETYPE_DECKS) {
    assert.equal(getArenaDeckError(deck.cards), null)
    const cards = deck.cards.map(id => ARENA_CARD_DATABASE.find(card => card.definitionId === id)!)
    assert.ok(cards.filter(card => card.cost <= 2).length >= 4, deck.name)
    assert.ok(cards.some(card => card.type === 'spell'), deck.name)
    assert.ok(cards.some(card => card.cost >= 4), deck.name)
  }
})

test('Flank and Linked use the same ordered track regardless of insertion order or display shape', () => {
  const f = fixture()
  const outer = f.seed('a', 'iron_flanker', 3), linked = f.seed('a', 'chain_sentinel', 1)
  const anchor = f.seed('a', 'warding_bell', 0), neighbour = f.seed('a', 'bone_knight', 2)
  assert.equal(getArenaCardPower(f.site, 'a', outer), 3)
  assert.equal(getArenaCardPower(f.site, 'a', linked), 4)
  assert.equal(getArenaCardPower(f.site, 'a', anchor), 0)
  f.site.cards.a = f.site.cards.a.filter(placed => placed.card !== neighbour)
  assert.equal(getArenaCardPower(f.site, 'a', linked), 3)
  f.site.cards.a.find(placed => placed.card === outer)!.slotIndex = 2
  assert.equal(getArenaCardPower(f.site, 'a', outer), 1)
})

test('Journey activates on successful movement, never repeats on reveal or stacks with repeated moves', () => {
  const f = fixture(['phase_walk', 'wayward_current'])
  const moving = f.seed('a', 'trail_wisp', 0)
  moving.arenaAffliction = 1; moving.powerBonus = -1
  f.seed('a', 'pilgrim_compass', 1, 1)
  const before = f.engine.getStateFor('a')
  const after = f.resolve([f.play('a', 'phase_walk', 1), f.play('a', 'wayward_current', 1)])
  assert.equal(f.site.cards.a.length, 0)
  const destination = after.arena!.locations[2]
  assert.equal(destination.cards.a[0].card.instanceId, moving.instanceId)
  assert.equal(destination.cards.a[0].placedOnTurn, 1)
  assert.equal(moving.arenaMoved, true)
  assert.equal(moving.arenaAffliction, 1)
  assert.equal(getArenaCardPower(destination, 'a', moving), 3, 'one Journey bonus and no departed compass aura')
  assert.deepEqual(after.arena!.lastReveal!.events.filter(event => event.kind === 'card').map(event => event.card?.definitionId), ['phase_walk', 'wayward_current'])
  assert.ok(buildArenaPlayback(before, after).length > 0)
})

test('movement cannot enter a reserved final space or set Journey when no move occurs', () => {
  const f = fixture(['wayward_current', 'bone_knight'])
  const moving = f.seed('a', 'trail_wisp', 0)
  for (const slot of [0, 1, 2] as ArenaSlotIndex[]) f.seed('a', 'warding_bell', slot, 1)
  f.resolve([f.play('a', 'wayward_current'), f.play('a', 'bone_knight', 1, 3)])
  assert.equal(moving.arenaMoved, undefined)
  assert.equal(f.site.cards.a[0].card.instanceId, moving.instanceId)
  assert.equal(getArenaFormation(f.state.arena!.locations[1].cards.a)[3]?.card.definitionId, 'bone_knight')
})

test('ownership transfers do not count as a Journey and March wraps from right to left', () => {
  const f = fixture(['exile_ritual', 'wayward_current'])
  const gift = f.seed('a', 'trail_wisp', 0); gift.powerBonus = -2
  const traveller = f.seed('a', 'crossing_guard', 0, 2)
  f.resolve([f.play('a', 'exile_ritual'), f.play('a', 'wayward_current', 2)])
  assert.equal(gift.arenaMoved, undefined)
  assert.equal(f.site.cards.b[0].card.instanceId, gift.instanceId)
  assert.equal(traveller.arenaMoved, true)
  assert.ok(f.site.cards.a.some(placed => placed.card === traveller))
})

test('Dispel removes the cheapest relic in position order and updates all ongoing bonuses', () => {
  const f = fixture(['break_standard'])
  const later = f.seed('b', 'warding_bell', 3), earlier = f.seed('b', 'chain_anchor', 1)
  const custodian = f.seed('b', 'scrap_custodian', 0)
  assert.equal(getArenaCardPower(f.site, 'b', custodian), 6)
  const after = f.resolve([f.play('a', 'break_standard')])
  assert.ok(f.site.cards.b.some(placed => placed.card === later))
  assert.ok(!f.site.cards.b.some(placed => placed.card === earlier))
  assert.equal(getArenaCardPower(f.site, 'b', custodian), 3)
  assert.ok(after.arena!.lastReveal!.events.some(event => event.effects?.includes('dispel')))
})

test('Salvage draws only after consuming a relic, and a salvaged reactor cannot trigger', () => {
  const f = fixture(['salvage_rite'])
  f.seed('a', 'codex_of_ages', 1)
  const unit = f.seed('a', 'bone_knight', 0)
  f.internal.decks.set('a', [instance('iron_flanker'), instance('chain_sentinel')]); f.state.players.a.deckCount = 2
  const after = f.resolve([f.play('a', 'salvage_rite')])
  assert.equal(after.players.a.deckCount, 1)
  assert.equal(unit.powerBonus, 2)
  assert.equal(after.arena!.lastReveal!.events[0].drawCount, 1)
  assert.equal(after.arena!.lastReveal!.events.filter(event => event.kind === 'trigger').length, 0)
  const none = fixture(['salvage_rite'])
  none.internal.decks.set('a', [instance('iron_flanker')]); none.state.players.a.deckCount = 1
  none.resolve([none.play('a', 'salvage_rite')])
  assert.equal(none.state.players.a.deckCount, 1)
})

test('spell draw reactors fire once per turn, animate the draw and reset on the final turn', () => {
  const f = fixture(['hold_the_line', 'cinder_script'], [], 5)
  f.seed('a', 'glyph_scholar', 0)
  f.internal.decks.set('a', ['bone_knight', 'iron_golem', 'iron_flanker', 'trail_wisp'].map(instance)); f.state.players.a.deckCount = 4
  const after = f.resolve([f.play('a', 'hold_the_line'), f.play('a', 'cinder_script')])
  const triggers = after.arena!.lastReveal!.events.filter(event => event.kind === 'trigger' && event.effects?.includes('draw'))
  assert.equal(triggers.length, 1); assert.equal(triggers[0].drawCount, 1)
  assert.equal(after.players.a.deckCount, 2, 'one reaction plus the next turn draw')
  f.internal.hands.get('a')!.push(instance('hold_the_line'))
  const final = f.resolve([f.play('a', 'hold_the_line')])
  assert.equal(final.phase, 'game_over')
  assert.equal(final.arena!.lastReveal!.events.filter(event => event.effects?.includes('draw')).length, 1)
})

test('Formation buffs use occupied neighbours and cannot give relics power; Wither obeys Ward', () => {
  const f = fixture(['hold_the_line'], ['lingering_curse'])
  const unit = f.seed('a', 'ancient_guardian', 0), relic = f.seed('a', 'warding_bell', 1), isolated = f.seed('a', 'bone_knight', 3)
  f.resolve([f.play('a', 'hold_the_line')], [f.play('b', 'lingering_curse')])
  assert.equal(unit.powerBonus, 1); assert.equal(relic.powerBonus, 0)
  assert.equal(getArenaCardPower(f.site, 'a', relic), 0)
  assert.equal(isolated.powerBonus, -2)
  assert.equal(unit.arenaWither, undefined)
  assert.ok(getArenaAbilities(unit).some(effect => effect.type === 'ward'))
})

for (const curve of FOUNDATION_CURVES) test(`${curve.id}: the shipped starter plays a complete support curve using natural draws`, () => {
  const deck = ARENA_ARCHETYPE_DECKS.find(deck => deck.id === curve.id)!
  assert.deepEqual([...curve.order].sort(), [...deck.cards].sort())
  const room: Room = { id: 'curve', name: curve.id, hostId: 'a', status: 'in_progress', maxPlayers: 2, isPrivate: true, createdAt: 0,
    players: [{ id: 'a', displayName: 'A', isReady: true, deckDefinitionIds: curve.order }, { id: 'b', displayName: 'B', isReady: true, deckDefinitionIds: ARENA_STARTER_DECK }] }
  const engine = new ArenaEngine(room, { shuffle: false, locationRules: ['forge', 'sanctum', 'summit'] })
  let spent = 0
  for (const entries of curve.turns) {
    const view = engine.getStateFor('a')
    const plays = entries.map(([id, locationIndex, slotIndex]) => {
      const card = view.hand!.find(card => card.definitionId === id)
      assert.ok(card, `${curve.id}, turn ${view.turn}: ${id} must have been drawn`)
      spent += card.cost
      return { cardInstanceId: card.instanceId, locationIndex, slotIndex }
    })
    for (const owner of ['a', 'b']) {
      const state = engine.getStateFor(owner)
      const outcome = engine.processAction({ type: 'commit_turn', playerId: owner, timestamp: 0, submission: { turn: state.turn, plays: owner === 'a' ? plays : [] } })
      assert.equal(outcome.success, true, `${curve.id}, turn ${view.turn}: ${outcome.error}`)
    }
    for (const site of engine.getStateFor('a').arena!.locations) for (const cards of Object.values(site.cards)) assert.ok(cards.length <= 4)
  }
  assert.equal(engine.getStateFor('a').phase, 'game_over')
  assert.ok(spent >= 16 && spent <= 21, `${curve.id}: ${spent} aether used; transmutation discounts can leave aether unspent`)
})
