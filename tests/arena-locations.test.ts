import assert from 'node:assert/strict'
import { test } from 'node:test'
import { existsSync } from 'node:fs'
import { ARENA_CARD_DATABASE, ARENA_TOKEN_DATABASE, ARENA_LOCATIONS, ARENA_ARCHETYPE_DECKS, ArenaEngine,
  getArenaCardPower, getArenaCardScore, getArenaLocationPower, getArenaFormation, getArenaPlanError } from '../packages/shared/src/index.ts'
import type { ArenaIndex, ArenaPlay, ArenaRule, ArenaSlotIndex, Card, GameState, Room } from '../packages/shared/src/index.ts'
import { buildArenaPlayback } from '../apps/web/src/lib/arenaPlayback.ts'
import { getArenaEffectFamily, getConduitLinks } from '../apps/web/src/lib/arenaPresentation.ts'
import { createArenaLocationsDemo } from '../apps/web/src/lib/arenaEffectsDemo.ts'

const room = (): Room => ({ id: crypto.randomUUID(), name: 'Locations test', hostId: 'a', status: 'in_progress', maxPlayers: 2, isPrivate: true, createdAt: 0,
  players: ['a', 'b'].map(id => ({ id, displayName: id, isReady: true })) })
const card = (id: string): Card => ({ ...structuredClone([...ARENA_CARD_DATABASE, ...ARENA_TOKEN_DATABASE].find(card => card.definitionId === id)!),
  instanceId: crypto.randomUUID(), powerBonus: 0, questProgress: 0, isTransformed: false })

function fixture(rule: ArenaRule, turn = 6, a: string[] = [], b: string[] = []) {
  const engine = new ArenaEngine(room(), { shuffle: false, locationRules: [rule, ...ARENA_LOCATIONS.map(site => site.rule).filter(other => other !== rule).slice(0, 2)] })
  const internal = engine as unknown as { state: GameState; hands: Map<string, Card[]>; decks: Map<string, Card[]>; drawTransmutes: Map<string, number> }
  const state = internal.state
  state.turn = turn; state.arena!.energy = turn
  state.arena!.locations.forEach((site, i) => { site.revealed = true; if (i) delete site.rule })
  for (const [owner, ids] of [['a', a], ['b', b]] as const) {
    internal.hands.set(owner, ids.map(card)); internal.decks.set(owner, [])
    state.players[owner].handCount = ids.length; state.players[owner].deckCount = 0
  }
  const seed = (owner: string, id: string, slot: ArenaSlotIndex, index: ArenaIndex = 0, bonus = 0) => {
    const unit = card(id); unit.powerBonus = bonus
    state.arena!.locations[index].cards[owner].push({ card: unit, placedOnTurn: 1, slotIndex: slot })
    return unit
  }
  const play = (owner: string, id: string, slotIndex?: ArenaSlotIndex, locationIndex: ArenaIndex = 0): ArenaPlay => ({
    cardInstanceId: internal.hands.get(owner)!.find(unit => unit.definitionId === id)!.instanceId, locationIndex, slotIndex,
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

test('nine arenas have distinct rules and artwork; defaults pick exactly three without replacement', t => {
  let seed = 19281
  t.mock.method(Math, 'random', () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 2 ** 32))
  assert.equal(ARENA_LOCATIONS.length, 9)
  assert.equal(new Set(ARENA_LOCATIONS.map(site => site.rule)).size, 9)
  for (const site of ARENA_LOCATIONS.slice(3)) assert.ok(existsSync(`apps/web/public/ui/locations/${site.rule}-v1.jpg`))
  const seen = [new Set(), new Set(), new Set()]
  for (let i = 0; i < 60; i++) {
    const game = new ArenaEngine(room())
    const before = game.getStateFor('a')
    assert.equal(before.arena!.locations.length, 3)
    assert.deepEqual(before.arena!.locations.map(site => site.revealed), [true, false, false])
    const internal = game as unknown as { state: GameState }
    const rules = internal.state.arena!.locations.map(site => site.rule)
    assert.equal(new Set(rules).size, 3)
    rules.forEach((rule, index) => seen[index].add(rule))
    assert.deepEqual(game.getStateFor('b').arena!.locations, before.arena!.locations)
    assert.deepEqual(game.getStateFor('a').arena!.locations, before.arena!.locations, 'reads never reroll the pool')
  }
  seen.forEach(rules => assert.equal(rules.size, 9, 'every arena can appear in every position'))
  assert.equal(new ArenaEngine(room(), { shuffle: false }).getStateFor('a').arena!.locations.length, 3)
  assert.throws(() => new ArenaEngine(room(), { locationRules: ['forge', 'forge', 'bellmarsh'] }), /three different/)
})

test('new arenas remain hidden in both player views and reveal snapshots until their reveal turn', () => {
  const game = new ArenaEngine(room(), { shuffle: false, locationRules: ['chainbridge', 'bellmarsh', 'gilded_exchange'] })
  for (let turn = 1; turn <= 3; turn++) {
    for (const owner of ['a', 'b']) {
      const state = game.getStateFor(owner)
      for (const site of state.arena!.locations) {
        assert.equal(site.revealed, site.revealTurn <= turn)
        if (!site.revealed) { assert.equal(site.rule, undefined); assert.equal(site.name, 'Uncharted arena'); assert.equal(site.definitionId, 'unrevealed') }
      }
      assert.equal(game.processAction({ type: 'commit_turn', playerId: owner, timestamp: 0, submission: { turn, plays: [] } }).success, true)
    }
    const reveal = game.getStateFor('a').arena!.lastReveal!
    for (const site of [reveal.initialLocations, ...reveal.events.map(event => event.locations)].flat().filter(site => !site.revealed)) {
      assert.equal(site.rule, undefined); assert.equal(site.definitionId, 'unrevealed')
    }
  }
})

test('Chainbridge uses track neighbours, counts tokens and leaves endpoints unboosted', () => {
  const f = fixture('chainbridge')
  const left = f.seed('a', 'village_scout', 0), center = f.seed('a', 'village_scout', 1), token = f.seed('a', 'burden_token', 2), right = f.seed('a', 'village_scout', 3)
  assert.deepEqual([left, center, token, right].map(unit => getArenaCardPower(f.site, 'a', unit)), [2, 4, 1, 2])
  f.site.cards.a = f.site.cards.a.filter(placed => placed.card !== left)
  assert.equal(getArenaCardPower(f.site, 'a', center), 2)
  assert.equal(getArenaCardPower(f.site, 'a', token), 1)
  f.site.revealed = false
  assert.equal(getArenaCardPower(f.site, 'a', token), -1)
})

test('Chainbridge recalculates and animates power when a neighbour is removed', () => {
  const f = fixture('chainbridge', 6, ['cleansing_flame'])
  const center = f.seed('a', 'village_scout', 1)
  f.seed('a', 'burden_token', 0); f.seed('a', 'bone_knight', 2)
  const before = f.engine.getStateFor('a')
  const after = f.resolve([f.play('a', 'cleansing_flame')])
  assert.equal(getArenaCardPower(after.arena!.locations[0], 'a', center), 2)
  assert.ok(buildArenaPlayback(before, after).some(frame => frame.changes.some(change => change.cardId === center.instanceId && change.delta === -2)))
})

test('Leyline takes power before reveal abilities, supports negative donors, and emits a donor link', () => {
  const f = fixture('leyline_nexus', 6, ['prism_titan'])
  const donor = f.seed('a', 'burden_token', 0)
  const before = f.engine.getStateFor('a'), after = f.resolve([f.play('a', 'prism_titan', 1)])
  const titan = getArenaFormation(after.arena!.locations[0].cards.a)[1]!.card
  assert.equal(donor.powerBonus, -2)
  assert.equal(donor.arenaAffliction, undefined)
  assert.equal(getArenaCardPower(f.site, 'a', titan), 12, '(4 + 2) doubled')
  const transfer = buildArenaPlayback(before, after).find(frame => frame.phase === 'effect' && frame.event?.locationRule === 'leyline_nexus')!
  assert.equal(getArenaEffectFamily(transfer.event), 'conduits')
  assert.deepEqual(getConduitLinks(transfer.event, transfer.changes), [{ from: donor.instanceId, to: titan.instanceId }])
})

test('Leyline is sequential, never wraps, and does not take from the opponent or a gap', () => {
  const f = fixture('leyline_nexus', 6, ['village_scout', 'bone_knight', 'spark_sprite'])
  f.seed('a', 'burden_token', 3); f.seed('b', 'iron_golem', 1)
  f.resolve([f.play('a', 'village_scout', 0), f.play('a', 'spark_sprite', 2), f.play('a', 'bone_knight', 1)])
  const positions = getArenaFormation(f.site.cards.a)
  assert.equal(positions[0]!.card.powerBonus, -2)
  assert.equal(positions[1]!.card.powerBonus, 2)
  assert.equal(positions[2]!.card.powerBonus, 0, 'preceding position was empty when it revealed, and Parity did not trigger')
  assert.equal(positions[3]!.card.powerBonus, 0, 'no wraparound donor')
  assert.equal(f.site.cards.b[0].card.powerBonus, 0)
})

test('Leyline expenditure ignores friendly Ward and Cleanse does not refund it', () => {
  const f = fixture('leyline_nexus', 6, ['village_scout', 'censer_warden'])
  const ward = f.seed('a', 'ancient_guardian', 0)
  f.resolve([f.play('a', 'village_scout', 1), f.play('a', 'censer_warden', 3)])
  assert.equal(ward.powerBonus, -2)
})

test('moving a unit into Leyline does not trigger a transfer', () => {
  const f = fixture('leyline_nexus', 6, ['phase_walk'])
  const donor = f.seed('a', 'iron_golem', 0), moving = f.seed('a', 'village_scout', 0, 1)
  f.resolve([f.play('a', 'phase_walk')])
  assert.equal(donor.powerBonus, 0); assert.equal(moving.powerBonus, 0)
  assert.equal(getArenaFormation(f.site.cards.a)[1]!.card.instanceId, moving.instanceId)
})

test('Orchard resolves after Wither and Growth, buffing every unit tied for lowest current power', () => {
  const f = fixture('ashen_orchard')
  const later = f.seed('a', 'village_scout', 2), earlier = f.seed('a', 'village_scout', 0)
  const growing = f.seed('a', 'mountain_hermit', 1)
  f.seed('b', 'iron_golem', 3).arenaWither = [{ sourcePlayerId: 'a', amount: 4, remaining: 1 }]
  const before = f.engine.getStateFor('a'), after = f.resolve()
  assert.equal(earlier.powerBonus, 1); assert.equal(later.powerBonus, 1); assert.equal(growing.powerBonus, 2)
  assert.equal(f.site.cards.b[0].card.powerBonus, -3)
  const frames = buildArenaPlayback(before, after), orchard = frames.findIndex(frame => frame.event?.locationRule === 'ashen_orchard')
  assert.ok(orchard > frames.findIndex(frame => frame.event?.kind === 'growth'))
  assert.ok(orchard < frames.findIndex(frame => frame.phase === 'score-focus'))
  assert.equal(getArenaEffectFamily(frames[orchard].event), 'growth')
  assert.deepEqual(new Set(frames[orchard].changes.filter(change => change.delta === 1).map(change => change.cardId)),
    new Set([earlier.instanceId, later.instanceId, growing.instanceId, f.site.cards.b[0].card.instanceId]), 'all recipients animate together')
})

test('Orchard selects a new weakest unit each turn and its bonus stays after moving', () => {
  const f = fixture('ashen_orchard', 4, ['phase_walk'])
  const first = f.seed('a', 'burden_token', 0), second = f.seed('a', 'burden_token', 1, 0, 1)
  f.resolve(); assert.deepEqual([first.powerBonus, second.powerBonus], [1, 1], 'only the initially weakest unit gains power')
  f.resolve(); assert.deepEqual([first.powerBonus, second.powerBonus], [2, 2], 'both now share the minimum')
  f.resolve([f.play('a', 'phase_walk', undefined, 1)])
  assert.equal(getArenaFormation(f.state.arena!.locations[1].cards.a)[0]!.card.instanceId, first.instanceId)
  assert.equal(first.powerBonus, 2)
})

test('Orchard buffs an entire tied formation, with each player using their own minimum', () => {
  const f = fixture('ashen_orchard')
  const tied = ([0, 1, 2, 3] as const).map(slot => f.seed('a', 'burden_token', slot))
  const enemyLow = f.seed('b', 'village_scout', 0), enemyHigh = f.seed('b', 'iron_golem', 1)
  f.resolve()
  assert.deepEqual(tied.map(unit => unit.powerBonus), [1, 1, 1, 1])
  assert.equal(enemyLow.powerBonus, 1); assert.equal(enemyHigh.powerBonus, 0)
  const empty = fixture('ashen_orchard')
  assert.equal(empty.resolve().arena!.lastReveal!.events.some(event => event.locationRule === 'ashen_orchard'), false)
})

test('Bellmarsh returns only the first spell, preserves identity and does not consume a prepared draw', () => {
  const f = fixture('bellmarsh', 6, ['temper', 'arcane_echo'])
  f.seed('a', 'village_scout', 0)
  const original = f.internal.hands.get('a')![0]
  f.internal.drawTransmutes.set('a', 2)
  const before = f.engine.getStateFor('a'), after = f.resolve([f.play('a', 'temper'), f.play('a', 'arcane_echo')])
  assert.deepEqual(after.hand!.map(unit => unit.instanceId), [original.instanceId])
  assert.equal(after.hand![0].cost, original.cost); assert.equal(after.arena!.transmutesPending, 2)
  assert.equal(after.players.a.deckCount, 0)
  const frames = buildArenaPlayback(before, after), returned = frames.find(frame => frame.event?.returnToHand)!
  assert.deepEqual(returned.state.hand!.map(unit => unit.instanceId), [original.instanceId])
  assert.ok(frames.slice(0, frames.indexOf(returned)).every(frame => !frame.state.hand!.some(unit => unit.instanceId === original.instanceId)))
  assert.equal(returned.state.players.a.handCount, 1); assert.equal(returned.state.players.a.deckCount, 0)
})

test('Bellmarsh draw spells animate new draws, then the return, then the ordinary next-turn draw', () => {
  const f = fixture('bellmarsh', 3, ['mana_surge'], ['temper'])
  const draws = ['village_scout', 'bone_knight', 'iron_golem'].map(card)
  f.internal.decks.set('a', [...draws]); f.state.players.a.deckCount = draws.length
  const before = f.engine.getStateFor('a'), beforeB = f.engine.getStateFor('b'), spellId = before.hand![0].instanceId
  const after = f.resolve([f.play('a', 'mana_surge')], [f.play('b', 'temper')])
  const frames = buildArenaPlayback(before, after)
  const cast = frames.find(frame => frame.phase === 'effect' && frame.event?.kind === 'card' && frame.event.playerId === 'a')!
  assert.deepEqual(cast.state.hand!.map(unit => unit.instanceId), draws.slice(0, 2).map(unit => unit.instanceId))
  const returned = frames.find(frame => frame.event?.returnToHand && frame.event.playerId === 'a')!
  assert.deepEqual(returned.state.hand!.map(unit => unit.instanceId), [...draws.slice(0, 2).map(unit => unit.instanceId), spellId])
  assert.equal(returned.state.players.a.deckCount, 1)
  assert.deepEqual(after.hand!.map(unit => unit.instanceId), [...draws.slice(0, 2).map(unit => unit.instanceId), spellId, draws[2].instanceId])
  const opponentFrames = buildArenaPlayback(beforeB, f.engine.getStateFor('b'))
  assert.ok(opponentFrames.every(frame => !frame.state.hand!.some(unit => unit.instanceId === spellId)), 'never adds an enemy return to the viewer’s private hand')
})

test('Bellmarsh respects the hand cap and resets its first-spell choice next turn', () => {
  const f = fixture('bellmarsh', 4, ['mana_surge', 'temper', 'village_scout', 'bone_knight', 'iron_golem', 'spark_sprite', 'mountain_hermit'])
  f.internal.decks.set('a', ['village_scout', 'bone_knight'].map(card)); f.state.players.a.deckCount = 2
  const after = f.resolve([f.play('a', 'mana_surge')])
  assert.equal(after.hand!.length, 7)
  assert.equal(after.hand!.some(unit => unit.definitionId === 'mana_surge'), false)
  assert.equal(after.arena!.lastReveal!.events.some(event => event.returnToHand), false)
  f.resolve([f.play('a', 'temper')])
  assert.equal(f.engine.getStateFor('a').hand!.filter(unit => unit.definitionId === 'temper').length, 1)
})

test('Mirror changes scoring, leading and the winner while copies still use signed current power', () => {
  const f = fixture('mirror_reservoir', 6, ['mirror_squire'])
  const negative = f.seed('a', 'tainted_idol', 0)
  f.seed('b', 'iron_golem', 0)
  assert.equal(getArenaCardPower(f.site, 'a', negative), -2)
  assert.equal(getArenaCardScore(f.site, 'a', negative), 2)
  const after = f.resolve([f.play('a', 'mirror_squire', 1)])
  const squire = getArenaFormation(f.site.cards.a)[1]!.card
  assert.equal(getArenaCardPower(f.site, 'a', squire), -2)
  assert.equal(getArenaLocationPower(f.site, 'a'), 4)
  assert.equal(after.winner, 'b')
  const g = fixture('mirror_reservoir', 6, ['forge_apprentice'])
  g.seed('a', 'oathbreaker_duke', 0); g.seed('b', 'iron_golem', 0)
  const win = g.resolve([g.play('a', 'forge_apprentice', 1)])
  assert.equal(getArenaFormation(g.site.cards.a)[1]!.card.powerBonus, 2, 'Pressure sees the positive scoring lead')
  assert.equal(win.winner, 'a')
})

test('Mirror applies to each unit separately after auras, and switching sides recalculates the total', () => {
  const f = fixture('mirror_reservoir', 6, ['ashen_envoy'])
  const negative = f.seed('b', 'tainted_idol', 0)
  f.seed('b', 'apprentice_mage', 1)
  assert.equal(getArenaCardPower(f.site, 'b', negative), -1)
  assert.equal(getArenaLocationPower(f.site, 'b'), 2)
  const after = f.resolve([f.play('a', 'ashen_envoy', 0)])
  assert.equal(getArenaLocationPower(f.site, 'a'), 0)
  assert.equal(getArenaLocationPower(f.site, 'b'), 6)
  assert.equal(after.winner, 'b')
})

test('Gilded Exchange swaps a full board simultaneously, preserving identities and attachments', () => {
  const f = fixture('gilded_exchange', 4)
  for (const owner of ['a', 'b']) for (const slot of [0, 1, 2] as const) f.seed(owner, 'village_scout', slot)
  const mine = f.seed('a', 'prism_titan', 3, 0, 3), theirs = f.seed('b', 'oathbreaker_duke', 3)
  mine.cosmeticBorder = 'eternal'; mine.arenaWither = [{ sourcePlayerId: 'b', amount: 1, remaining: 2 }]
  const before = f.engine.getStateFor('a'), after = f.resolve()
  assert.equal(getArenaFormation(f.site.cards.a)[3]!.card.instanceId, theirs.instanceId)
  const received = getArenaFormation(f.site.cards.b)[3]!.card
  assert.equal(received.instanceId, mine.instanceId); assert.equal(received.powerBonus, 2)
  assert.equal(received.cosmeticBorder, 'eternal'); assert.equal(received.arenaWither![0].remaining, 1)
  assert.equal(f.site.exchangeResolved, true)
  assert.equal(f.site.cards.a.length, 4); assert.equal(f.site.cards.b.length, 4)
  const exchange = buildArenaPlayback(before, after).find(frame => frame.event?.locationRule === 'gilded_exchange')!
  assert.deepEqual(exchange.changes.filter(change => change.fromOwner !== change.toOwner).map(change => [change.fromSlot, change.toSlot]), [[3, 3], [3, 3]])
  assert.equal(getArenaEffectFamily(exchange.event), 'sabotage')
  f.resolve()
  assert.equal(getArenaFormation(f.site.cards.a)[3]!.card.instanceId, theirs.instanceId, 'only trades once')
})

test('Gilded Exchange handles one or both empty positions and never runs early', () => {
  const f = fixture('gilded_exchange', 3)
  const mine = f.seed('a', 'village_scout', 3)
  f.resolve(); assert.equal(getArenaFormation(f.site.cards.a)[3]!.card.instanceId, mine.instanceId)
  f.resolve(); assert.equal(getArenaFormation(f.site.cards.b)[3]!.card.instanceId, mine.instanceId)
  assert.equal(getArenaFormation(f.site.cards.a)[3], undefined)
  const empty = fixture('gilded_exchange', 4)
  empty.resolve(); assert.equal(empty.site.exchangeResolved, true)
  assert.equal(empty.site.cards.a.length + empty.site.cards.b.length, 0)
})

test('hidden new arena rules never trigger effects', () => {
  for (const rule of ['chainbridge', 'leyline_nexus', 'ashen_orchard', 'bellmarsh', 'mirror_reservoir', 'gilded_exchange'] as const) {
    const f = fixture(rule, 4, ['village_scout', 'temper'])
    f.site.revealed = false; f.site.revealTurn = 6
    const negative = f.seed('a', 'burden_token', 0), trade = f.seed('a', 'bone_knight', 3)
    const after = f.resolve([f.play('a', 'village_scout', 1), f.play('a', 'temper', undefined, 1)])
    assert.equal(negative.powerBonus, 0, rule)
    assert.equal(getArenaCardScore(f.site, 'a', negative), -1, rule)
    assert.equal(getArenaFormation(f.site.cards.a)[3]!.card.instanceId, trade.instanceId, rule)
    assert.equal(after.hand!.length, 0, rule)
    assert.equal(after.arena!.lastReveal!.events.some(event => event.kind === 'location-effect' || event.locationRule), false, rule)
  }
})

test('all 84 arena combinations complete legal six-turn matches with stable unique positions', () => {
  let matches = 0
  for (let i = 0; i < 7; i++) for (let j = i + 1; j < 8; j++) for (let k = j + 1; k < 9; k++) {
    const settings = room()
    settings.players.forEach((player, index) => { player.deckDefinitionIds = ARENA_ARCHETYPE_DECKS[(matches + index) % 4].cards })
    const engine = new ArenaEngine(settings, { shuffle: false, locationRules: [i, j, k].map(index => ARENA_LOCATIONS[index].rule) })
    for (let turn = 1; turn <= 6; turn++) for (const owner of ['a', 'b']) {
      const state = engine.getStateFor(owner), plays: ArenaPlay[] = []
      for (const unit of state.hand!) {
        for (let offset = 0; offset < 3; offset++) {
          const locationIndex = ((matches + turn + offset) % 3) as ArenaIndex
          const slotIndex = unit.type === 'unit' ? ([3, 1, 0, 2] as const).find(slot => !getArenaPlanError(state, owner, state.hand!, [...plays, { cardInstanceId: unit.instanceId, locationIndex, slotIndex: slot }])) : undefined
          const play = { cardInstanceId: unit.instanceId, locationIndex, slotIndex }
          if (!getArenaPlanError(state, owner, state.hand!, [...plays, play])) { plays.push(play); break }
        }
      }
      const result = engine.processAction({ type: 'commit_turn', playerId: owner, timestamp: 0, submission: { turn, plays } })
      assert.equal(result.success, true, result.error)
    }
    const final = engine.getStateFor('a')
    assert.equal(final.phase, 'game_over')
    assert.equal(final.arena!.locations.length, 3)
    for (const site of final.arena!.locations) for (const owner of ['a', 'b']) {
      assert.equal(new Set(site.cards[owner].map(placed => placed.slotIndex)).size, site.cards[owner].length)
      assert.ok(site.cards[owner].length <= 4)
      assert.ok(Number.isFinite(getArenaLocationPower(site, owner)))
    }
    matches++
  }
  assert.equal(matches, 84)
})

test('both arena previews demonstrate real effects and defer the next turn until effects finish', () => {
  for (const lineup of ['formation', 'tricks'] as const) {
    const { before, after } = createArenaLocationsDemo(lineup)
    assert.equal(before.turn, 4); assert.equal(after.turn, 5)
    assert.equal(after.arena!.masteryReward, undefined)
    const frames = buildArenaPlayback(before, after)
    assert.equal(frames.at(-1)!.phase, 'turn-intro')
    const effects = new Set(frames.map(frame => frame.event?.locationRule))
    if (lineup === 'formation') { assert.ok(effects.has('leyline_nexus')); assert.ok(effects.has('ashen_orchard')) }
    else { assert.ok(effects.has('bellmarsh')); assert.ok(effects.has('gilded_exchange')); assert.ok(before.arena!.locations[2].cards.you.some(placed => placed.slotIndex === 3)) }
  }
})
