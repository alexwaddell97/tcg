import assert from 'node:assert/strict'
import { test } from 'node:test'
import { existsSync } from 'node:fs'
import { ARENA_CARD_DATABASE, ARENA_RELIC_CARDS, ARENA_TOKEN_DATABASE, ARENA_STARTER_DECK, ArenaEngine,
  getArenaCardPower, getArenaLocationPower, getArenaPlanError, resolveArenaPlaySlots, getArenaFormation, getArenaRelicCounter, getArenaDeckError } from '../packages/shared/src/index.ts'
import type { ArenaIndex, ArenaPlay, ArenaRule, ArenaSlotIndex, Card, GameState, Room } from '../packages/shared/src/index.ts'
import { buildArenaPlayback } from '../apps/web/src/lib/arenaPlayback.ts'
import { getArenaDropPlan } from '../apps/web/src/lib/arenaDraft.ts'
import { getConduitLinks } from '../apps/web/src/lib/arenaPresentation.ts'
import { createArenaRelicDemo } from '../apps/web/src/lib/arenaRelicDemo.ts'

const instance = (id: string): Card => ({ ...structuredClone([...ARENA_CARD_DATABASE, ...ARENA_TOKEN_DATABASE].find(card => card.definitionId === id)!),
  instanceId: crypto.randomUUID(), powerBonus: 0, questProgress: 0, isTransformed: false })
function fixture(a: string[] = [], b: string[] = [], turn = 6, rule?: ArenaRule) {
  const deck = [...ARENA_RELIC_CARDS.map(card => card.definitionId), ...ARENA_STARTER_DECK].slice(0, 12)
  const room: Room = { id: crypto.randomUUID(), name: 'Relic tests', hostId: 'a', status: 'in_progress', maxPlayers: 2, isPrivate: true, createdAt: 0,
    players: ['a', 'b'].map(id => ({ id, displayName: id, isReady: true, deckDefinitionIds: deck })) }
  const engine = new ArenaEngine(room, { shuffle: false })
  const internal = engine as unknown as { state: GameState; hands: Map<string, Card[]>; decks: Map<string, Card[]> }
  const state = internal.state
  state.turn = turn; state.arena!.energy = turn
  state.arena!.locations.forEach((location, index) => { location.revealed = true; location.rule = index === 0 ? rule : undefined })
  for (const [owner, ids] of [['a', a], ['b', b]] as const) {
    internal.hands.set(owner, ids.map(instance)); internal.decks.set(owner, [])
    state.players[owner].handCount = ids.length; state.players[owner].deckCount = 0
  }
  const seed = (owner: string, id: string, slotIndex: ArenaSlotIndex, index: ArenaIndex = 0) => {
    const card = instance(id)
    state.arena!.locations[index].cards[owner].push({ card, slotIndex, placedOnTurn: 1 })
    return card
  }
  const play = (owner: string, id: string, slotIndex?: ArenaSlotIndex, locationIndex: ArenaIndex = 0): ArenaPlay => ({
    cardInstanceId: internal.hands.get(owner)!.find(card => card.definitionId === id)!.instanceId, slotIndex, locationIndex,
  })
  const resolve = (a: ArenaPlay[] = [], b: ArenaPlay[] = []) => {
    for (const [owner, plays] of [['a', a], ['b', b]] as const) {
      const result = engine.processAction({ type: 'commit_turn', playerId: owner, timestamp: 0, submission: { turn: state.turn, plays } })
      assert.equal(result.success, true, result.error)
    }
    return engine.getStateFor('a')
  }
  return { engine, internal, state, site: state.arena!.locations[0], seed, play, resolve }
}

test('original relics retain artwork and legal set membership; Emberling stays a token', () => {
  assert.equal(ARENA_RELIC_CARDS.length, 6)
  for (const card of ARENA_RELIC_CARDS) {
    assert.equal(card.type, 'relic'); assert.ok(['core', 'expanded'].includes(card.arenaSet!)); assert.equal(card.power, 0)
    assert.ok(card.description.length && existsSync(`apps/web/public/${card.imageUrl}`))
    assert.equal(getArenaDeckError([card.definitionId, ...ARENA_STARTER_DECK.slice(1)]), null)
  }
  assert.ok(getArenaDeckError(['emberling', ...ARENA_STARTER_DECK.slice(1)]))
})

test('relics reserve real positions, reject overlaps and full formations, and support queued relocation', () => {
  const f = fixture(['war_standard', 'spellfont', 'village_scout', 'temper'])
  f.seed('a', 'bone_knight', 0); f.seed('a', 'iron_golem', 1)
  const plays = [f.play('a', 'war_standard', 2), f.play('a', 'spellfont', 3)]
  assert.equal(getArenaPlanError(f.state, 'a', f.internal.hands.get('a')!, plays), null)
  assert.match(getArenaPlanError(f.state, 'a', f.internal.hands.get('a')!, [...plays, f.play('a', 'village_scout')])!, /four/)
  assert.match(getArenaPlanError(f.state, 'a', f.internal.hands.get('a')!, [f.play('a', 'war_standard', 0)])!, /occupied/)
  const resolved = resolveArenaPlaySlots(f.state.arena!.locations, 'a', f.internal.hands.get('a')!, [f.play('a', 'war_standard'), f.play('a', 'spellfont', 2)])
  assert.deepEqual(resolved.map(play => play.slotIndex), [3, 2])
  const view = f.engine.getStateFor('a'), relic = f.play('a', 'war_standard')
  const queued = getArenaDropPlan(view, 'a', [], relic.cardInstanceId, 0, 2)
  const moved = getArenaDropPlan(view, 'a', queued.plan, relic.cardInstanceId, 0, 3)
  assert.equal(moved.error, null); assert.equal(moved.plan.length, 1); assert.equal(moved.plan[0].slotIndex, 3)
  f.resolve([...plays, f.play('a', 'temper')])
  assert.equal(f.site.cards.a.length, 4)
})

test('pending relic positions remain private and protected from enemy token creation', () => {
  const f = fixture(['war_standard'], ['thorn_seeder'])
  f.state.arena!.revealFirstPlayerId = 'b'
  f.seed('a', 'village_scout', 0); f.seed('a', 'bone_knight', 1); f.seed('a', 'iron_golem', 2)
  f.engine.processAction({ type: 'commit_turn', playerId: 'a', timestamp: 0, submission: { turn: 6, plays: [f.play('a', 'war_standard', 3)] } })
  const enemy = f.engine.getStateFor('b')
  assert.deepEqual(enemy.arena!.committedPlays, [])
  assert.equal(enemy.arena!.locations[0].cards.a.length, 3)
  const result = f.engine.processAction({ type: 'commit_turn', playerId: 'b', timestamp: 0, submission: { turn: 6, plays: [f.play('b', 'thorn_seeder', 0)] } })
  assert.equal(result.success, true)
  assert.equal(getArenaFormation(f.site.cards.a)[3]!.card.definitionId, 'war_standard')
})

test('War Standard uses immediate friendly neighbours, supports Chainbridge and never gives relics power', () => {
  const f = fixture([], [], 6, 'chainbridge')
  const left = f.seed('a', 'village_scout', 0), standard = f.seed('a', 'war_standard', 1), right = f.seed('a', 'bone_knight', 2)
  const bell = f.seed('a', 'warding_bell', 3)
  f.seed('b', 'village_scout', 0)
  assert.equal(getArenaCardPower(f.site, 'a', left), 4)
  assert.equal(getArenaCardPower(f.site, 'a', right), 7, 'Standard +2 and two occupied neighbours +2')
  assert.equal(getArenaCardPower(f.site, 'a', standard), 0); assert.equal(getArenaCardPower(f.site, 'a', bell), 0)
  f.site.cards.a = f.site.cards.a.filter(placed => placed.card !== standard)
  assert.equal(getArenaCardPower(f.site, 'a', right), 3, 'both ongoing bonuses disappear when the gap opens')
  assert.equal(getArenaLocationPower(f.site, 'b'), 2)
})

test('relics ignore buffs, debuffs, power targets and every power-granting arena rule', () => {
  for (const rule of ['forge', 'sanctum', 'summit', 'chainbridge', 'ashen_orchard', 'mirror_reservoir'] as ArenaRule[]) {
    const f = fixture(['arcane_echo'], ['salt_hex'], 6, rule)
    const relic = f.seed('a', 'spellfont', 0), unit = f.seed('a', 'village_scout', 2)
    relic.powerBonus = 100; relic.cost = 6
    f.resolve([f.play('a', 'arcane_echo')], [f.play('b', 'salt_hex')])
    assert.equal(relic.powerBonus, 100, rule)
    assert.equal(getArenaCardPower(f.site, 'a', relic), 0, rule)
    assert.equal(relic.arenaAffliction, undefined, rule)
    assert.ok(unit.arenaAffliction, rule)
    assert.equal(getArenaLocationPower(f.site, 'a'), rule === 'mirror_reservoir' ? Math.abs(getArenaCardPower(f.site, 'a', unit)) : getArenaCardPower(f.site, 'a', unit))
  }
})

test('Orchard excludes relics from its minimum and buffs all tied units', () => {
  const f = fixture([], [], 6, 'ashen_orchard')
  const relic = f.seed('a', 'war_standard', 3), first = f.seed('a', 'village_scout', 0), second = f.seed('a', 'village_scout', 1)
  f.resolve()
  assert.equal(first.powerBonus, 1); assert.equal(second.powerBonus, 1); assert.equal(relic.powerBonus, 0)
})

test('playing a relic does not use Forge’s first-unit trigger and Leyline cannot take power from relics', () => {
  const forge = fixture(['warding_bell', 'village_scout'], [], 6, 'forge')
  forge.resolve([forge.play('a', 'warding_bell', 0), forge.play('a', 'village_scout', 1)])
  assert.equal(forge.site.cards.a[1].card.powerBonus, 1)
  const nexus = fixture(['bone_knight'], [], 6, 'leyline_nexus')
  const relic = nexus.seed('a', 'war_standard', 0)
  nexus.resolve([nexus.play('a', 'bone_knight', 1)])
  assert.equal(relic.powerBonus, 0); assert.equal(nexus.site.cards.a[1].card.powerBonus, 0)
})

test('Transmute, Exile and power-based Shift never treat relics as zero-power units', () => {
  const f = fixture(['silver_equation', 'aether_battery', 'bone_knight', 'exile_ritual', 'phase_walk'])
  const relic = f.seed('a', 'war_standard', 0), moving = f.seed('a', 'village_scout', 0, 1)
  f.resolve([f.play('a', 'silver_equation'), f.play('a', 'exile_ritual'), f.play('a', 'phase_walk')])
  assert.equal(f.engine.getStateFor('a').hand!.find(card => card.type === 'relic')!.arenaTransmuted, undefined)
  assert.equal(f.engine.getStateFor('a').hand!.find(card => card.type === 'unit')!.arenaTransmuted, true)
  assert.ok(f.site.cards.a.some(placed => placed.card === relic))
  assert.ok(f.site.cards.a.some(placed => placed.card === moving))
  assert.equal(f.site.cards.b.length, 0)
})

test('Spellfont reacts to each friendly spell and uses the lowest-power adjacent unit in track order', () => {
  const f = fixture(['mana_surge', 'arcane_echo'], ['temper'])
  const left = f.seed('a', 'village_scout', 0), font = f.seed('a', 'spellfont', 1), right = f.seed('a', 'village_scout', 2)
  const far = f.seed('a', 'burden_token', 3)
  const after = f.resolve([f.play('a', 'mana_surge'), f.play('a', 'arcane_echo')], [f.play('b', 'temper')])
  const reactions = after.arena!.lastReveal!.events.filter(event => event.effects?.includes('spellfont'))
  assert.equal(reactions.length, 2)
  assert.equal(reactions[0].locations[0].cards.a.find(placed => placed.card.instanceId === left.instanceId)!.card.powerBonus, 1)
  assert.equal(left.powerBonus, 3); assert.equal(right.powerBonus, 3); assert.equal(far.powerBonus, 2); assert.equal(font.powerBonus, 0)
})

test('Warding Bell blocks one enemy reduction across its neighbours and resets on the next turn', () => {
  const f = fixture([], ['salt_hex', 'unmaking'], 5)
  const left = f.seed('a', 'village_scout', 0), bell = f.seed('a', 'warding_bell', 1), right = f.seed('a', 'iron_golem', 2)
  f.resolve([], [f.play('b', 'salt_hex'), f.play('b', 'unmaking')])
  assert.equal(left.powerBonus, -2); assert.equal(right.powerBonus, -2); assert.equal(bell.arenaRelicUsedTurn, 5)
  f.internal.hands.set('b', [instance('salt_hex')]); f.state.players.b.handCount = 1
  const after = f.resolve([], [f.play('b', 'salt_hex')])
  assert.equal(left.powerBonus, -2); assert.equal(bell.arenaRelicUsedTurn, 6)
  assert.equal(after.arena!.lastReveal!.events.filter(event => event.effects?.includes('warding_bell')).length, 1)
})

test('Warding Bell blocks Wither ticks and denied Siphon gives no stolen power', () => {
  const f = fixture([], ['dusk_leech'], 6)
  const left = f.seed('a', 'village_scout', 0), bell = f.seed('a', 'warding_bell', 1)
  left.arenaWither = [{ sourcePlayerId: 'b', amount: 2, remaining: 1 }]
  f.resolve([], [f.play('b', 'dusk_leech', 0)])
  assert.equal(f.site.cards.b[0].card.powerBonus, 0, 'Siphon was blocked')
  assert.equal(left.powerBonus, -2, 'the later Wither tick is not protected again')
  assert.equal(bell.arenaRelicUsedTurn, 6)
  const ticks = fixture([], [], 6)
  const protectedUnit = ticks.seed('a', 'village_scout', 0)
  ticks.seed('a', 'warding_bell', 1)
  protectedUnit.arenaWither = [{ sourcePlayerId: 'b', amount: 2, remaining: 1 }]
  ticks.resolve(); assert.equal(protectedUnit.powerBonus, 0)
})

test('Battery stores only committed unspent aether and discharges before the adjacent unit’s ability', () => {
  const f = fixture(['aether_battery', 'prism_titan'], [], 4)
  f.resolve([f.play('a', 'aether_battery', 0)])
  const battery = f.site.cards.a[0].card
  assert.equal(battery.arenaRelicCharge, 3)
  f.resolve(); assert.equal(battery.arenaRelicCharge, 8)
  const before = f.engine.getStateFor('a'), after = f.resolve([f.play('a', 'prism_titan', 1)])
  const titan = f.site.cards.a[1].card
  assert.equal(getArenaCardPower(f.site, 'a', titan), 24, '(4 base + 8 stored) doubles')
  assert.equal(battery.arenaRelicCharge, 0)
  const frames = buildArenaPlayback(before, after), effect = frames.find(frame => frame.phase === 'effect' && frame.event?.kind === 'card')!
  assert.deepEqual(getConduitLinks(effect.event, effect.changes), [{ from: battery.instanceId, to: titan.instanceId }])
})

test('Battery ignores relics, opponents, gaps and movement; Incubator hatches in its own fixed position', () => {
  const f = fixture(['warding_bell', 'village_scout', 'phase_walk'], ['bone_knight'], 6)
  const battery = f.seed('a', 'aether_battery', 0); battery.arenaRelicCharge = 4
  f.seed('a', 'iron_golem', 0, 1)
  f.resolve([f.play('a', 'warding_bell', 1), f.play('a', 'village_scout', 3), f.play('a', 'phase_walk')], [f.play('b', 'bone_knight', 1)])
  assert.equal(battery.arenaRelicCharge, 7, '4 stored plus 3 unspent; no adjacent unit was revealed')
  const hatch = fixture(['ember_incubator'], [], 5)
  hatch.resolve([hatch.play('a', 'ember_incubator', 2)])
  const incubator = hatch.site.cards.a[0].card
  assert.equal(getArenaRelicCounter(incubator)!.value, 1)
  const before = hatch.engine.getStateFor('a'), after = hatch.resolve()
  const emberling = getArenaFormation(hatch.site.cards.a)[2]!.card
  assert.equal(emberling.definitionId, 'emberling'); assert.equal(emberling.power, 5)
  assert.notEqual(emberling.instanceId, incubator.instanceId)
  assert.ok(emberling.arenaToken)
  assert.equal(after.arena!.questReceipt!.metrics.unitsPlayed, 0, 'a spawn is not a played unit')
  const frames = buildArenaPlayback(before, after), hatchIndex = frames.findIndex(frame => frame.event?.effects?.includes('incubate'))
  assert.ok(hatchIndex < frames.findIndex(frame => frame.phase === 'score-focus'))
  assert.ok(frames[hatchIndex].changes.some(change => change.cardId === emberling.instanceId && change.spawned))
})

test('Gilded Exchange trades relics with their charge and new owner’s adjacency', () => {
  const f = fixture([], [], 4, 'gilded_exchange')
  const battery = f.seed('a', 'aether_battery', 3); battery.arenaRelicCharge = 2
  const standard = f.seed('b', 'war_standard', 3), unit = f.seed('a', 'village_scout', 2)
  f.resolve()
  assert.equal(getArenaFormation(f.site.cards.b)[3]!.card, battery)
  assert.equal(battery.arenaRelicCharge, 6)
  assert.equal(getArenaFormation(f.site.cards.a)[3]!.card, standard)
  assert.equal(getArenaCardPower(f.site, 'a', unit), 4)
  assert.equal(getArenaCardPower(f.site, 'b', battery), 0)
})

test('relic demo plays on curve and finishes all relic effects before the result ceremony', () => {
  const { before, after } = createArenaRelicDemo()
  assert.equal(before.arena!.locations.flatMap(location => location.cards.you).filter(placed => placed.card.type === 'relic').length, 5)
  assert.equal(after.phase, 'game_over')
  const effects = new Set(after.arena!.lastReveal!.events.flatMap(event => event.effects ?? []))
  for (const type of ['aether_battery', 'spellfont', 'warding_bell', 'incubate']) assert.ok(effects.has(type as never))
  const frames = buildArenaPlayback(before, after)
  assert.ok(frames.findLastIndex(frame => frame.phase === 'effect') < frames.findIndex(frame => frame.phase === 'score-focus'))
  assert.ok(frames.every(frame => frame.state.winner === undefined))
})

test('Contraband Cache waits for a friendly local spell, triggers once, and refreshes next turn', () => {
  const f = fixture(['contraband_cache', 'temper'], ['temper'], 4)
  f.resolve([f.play('a', 'temper'), f.play('a', 'contraband_cache', 0)], [f.play('b', 'temper')])
  assert.equal(f.site.cards.b.length, 0, 'earlier and enemy spells do not trigger the cache')
  f.internal.hands.set('a', [instance('temper'), instance('inversion_rite'), instance('mana_surge')])
  f.state.players.a.handCount = 3
  const after = f.resolve([f.play('a', 'mana_surge', undefined, 1), f.play('a', 'temper'), f.play('a', 'inversion_rite')])
  assert.equal(f.site.cards.b.length, 1)
  assert.equal(f.site.cards.b[0].card.definitionId, 'burden_token')
  assert.equal(after.arena!.lastReveal!.events.filter(event => event.effects?.includes('plant')).length, 1)
  f.internal.hands.set('a', [instance('temper')]); f.state.players.a.handCount = 1
  const final = f.resolve([f.play('a', 'temper')])
  assert.equal(f.site.cards.b.length, 2)
  assert.equal(getArenaLocationPower(f.site, 'b'), -2)
  assert.equal(final.phase, 'game_over')
  assert.ok(final.arena!.lastReveal!.events.some(event => event.effects?.includes('plant')), 'final-turn planting is included in reveal playback')
})

test('Contraband Cache cannot steal a queued enemy position', () => {
  const f = fixture(['temper'], ['war_standard'])
  f.seed('a', 'contraband_cache', 0)
  for (const slot of [0, 1, 2] as const) f.seed('b', 'bone_knight', slot)
  f.state.arena!.revealFirstPlayerId = 'a'
  f.resolve([f.play('a', 'temper')], [f.play('b', 'war_standard', 3)])
  assert.equal(f.site.cards.b.length, 4)
  assert.equal(getArenaFormation(f.site.cards.b)[3]!.card.definitionId, 'war_standard')
  assert.equal(f.site.cards.b.filter(entry => entry.card.definitionId === 'burden_token').length, 0)
})
