import assert from 'node:assert/strict'
import { test } from 'node:test'
import { existsSync } from 'node:fs'
import { ARENA_ARCHETYPE_DECKS, ARENA_CARD_DATABASE, ARENA_EXPANSION_CARDS, ARENA_STARTER_DECK, ARENA_TOKEN_DATABASE,
  ArenaEngine, getArenaAbilities, getArenaCardPower, getArenaDeckError, getArenaLocationPower, getArenaPlanError } from '../packages/shared/src/index.ts'
import type { ArenaIndex, Card, GameState, Room } from '../packages/shared/src/index.ts'
import { buildArenaPlayback } from '../apps/web/src/lib/arenaPlayback.ts'

function instance(id: string): Card {
  const definition = [...ARENA_CARD_DATABASE, ...ARENA_TOKEN_DATABASE].find(card => card.definitionId === id)
  assert.ok(definition, id)
  return { ...structuredClone(definition), instanceId: crypto.randomUUID(), powerBonus: 0, questProgress: 0, isTransformed: false }
}
function room(a = ARENA_STARTER_DECK, b = ARENA_STARTER_DECK): Room {
  return { id: crypto.randomUUID(), name: 'Expansion test', hostId: 'a', status: 'in_progress', maxPlayers: 2, isPrivate: true, createdAt: 0,
    players: [{ id: 'a', displayName: 'A', isReady: true, deckDefinitionIds: a }, { id: 'b', displayName: 'B', isReady: true, deckDefinitionIds: b }] }
}
type Entry = [string, ArenaIndex]
function commit(engine: ArenaEngine, owner: string, entries: Entry[] = []) {
  const state = engine.getStateFor(owner)
  return engine.processAction({ type: 'commit_turn', playerId: owner, timestamp: 0,
    submission: { turn: state.turn, plays: entries.map(([id, locationIndex]) => {
      const card = state.hand!.find(card => card.definitionId === id)
      assert.ok(card, `${id} in ${owner}'s hand`)
      return { cardInstanceId: card.instanceId, locationIndex }
    }) } })
}
function turn(engine: ArenaEngine, a: Entry[] = [], b: Entry[] = []) {
  for (const [owner, entries] of [['a', a], ['b', b]] as const) {
    const result = commit(engine, owner, entries)
    assert.equal(result.success, true, result.error)
  }
}

/** Fixed fixtures isolate interactions; every tested effect runs through public commit/reveal. */
function fixture(a: string[], b: string[] = [], turnNumber = 6) {
  const engine = new ArenaEngine(room(), { shuffle: false })
  const internal = engine as unknown as { state: GameState; hands: Map<string, Card[]>; decks: Map<string, Card[]> }
  internal.state.turn = turnNumber
  internal.state.arena!.energy = turnNumber
  for (const site of internal.state.arena!.locations) { site.revealed = true; delete site.rule }
  function hand(owner: string, ids: string[]) {
    internal.hands.set(owner, ids.map(instance)); internal.state.players[owner].handCount = ids.length
  }
  hand('a', a); hand('b', b)
  function seed(owner: string, id: string, index: ArenaIndex = 0, bonus = 0) {
    const card = instance(id); card.powerBonus = bonus
    internal.state.arena!.locations[index].cards[owner].push({ card, placedOnTurn: 1 })
    return card
  }
  function power(card: Card, owner: string, index: ArenaIndex = 0) { return getArenaCardPower(internal.state.arena!.locations[index], owner, card) }
  return { engine, internal, seed, hand, power }
}

test('48 distinct collectible cards have complete effects and art; generated units cannot enter decks', () => {
  assert.equal(ARENA_EXPANSION_CARDS.length, 48)
  assert.equal(new Set(ARENA_CARD_DATABASE.map(card => card.definitionId)).size, ARENA_CARD_DATABASE.length)
  for (const archetype of ARENA_ARCHETYPE_DECKS.filter(deck => ['transmutation', 'sabotage', 'affliction', 'conduits'].includes(deck.id))) {
    assert.equal(ARENA_EXPANSION_CARDS.filter(card => card.arenaArchetypes?.[0] === archetype.id).length, 12)
    assert.equal(getArenaDeckError(archetype.cards), null)
  }
  for (const card of ARENA_EXPANSION_CARDS) {
    assert.ok(card.description && getArenaAbilities(card).length, card.name)
    assert.ok(existsSync(`apps/web/public/${card.imageUrl}`), card.name)
    assert.ok(card.cost >= 1 && card.cost <= 6)
  }
  for (const token of ARENA_TOKEN_DATABASE) {
    assert.ok(!ARENA_CARD_DATABASE.some(card => card.definitionId === token.definitionId))
    assert.ok(getArenaDeckError([token.definitionId, ...ARENA_STARTER_DECK.slice(1)]))
  }
})

test('negative units subtract from scores, and a less-negative arena wins', () => {
  const f = fixture([])
  f.seed('a', 'tainted_idol'); f.seed('b', 'ashen_envoy')
  assert.equal(getArenaLocationPower(f.engine.getStateFor('a').arena!.locations[0], 'a'), -2)
  turn(f.engine)
  assert.equal(f.engine.getStateFor('a').winner, 'a')
})

test('hand transmutation uses modified power, clamps cost, is private and cannot repeat', () => {
  const f = fixture(['lead_to_gold', 'silver_equation', 'mercury_scholar', 'glass_familiar', 'alloy_guardian'])
  const hiddenIds = f.internal.hands.get('a')!.filter(card => ['glass_familiar', 'alloy_guardian'].includes(card.definitionId)).map(card => card.instanceId)
  turn(f.engine, [['lead_to_gold', 0], ['silver_equation', 0], ['mercury_scholar', 0]])
  const hand = f.engine.getStateFor('a').hand!
  assert.equal(hand.find(card => card.definitionId === 'glass_familiar')!.cost, 0)
  assert.equal(hand.find(card => card.definitionId === 'glass_familiar')!.power, 3)
  assert.equal(hand.find(card => card.definitionId === 'alloy_guardian')!.cost, 2)
  assert.ok(hand.every(card => card.arenaTransmuted))
  hiddenIds.forEach(id => assert.equal(JSON.stringify(f.engine.getStateFor('b')).includes(id), false))
})

test('deck transmutation preserves order, skips spells and clamps high power to six', () => {
  const f = fixture(['paradox_regent'])
  const high = instance('ironclad_colossus'), low = instance('glass_familiar'), spell = instance('temper')
  f.internal.decks.set('a', [high, spell, low]); f.internal.state.players.a.deckCount = 3
  turn(f.engine, [['paradox_regent', 0]])
  assert.deepEqual(f.internal.decks.get('a')!.map(card => card.instanceId), [spell, low].map(card => card.instanceId))
  assert.equal(f.engine.getStateFor('a').hand![0].instanceId, high.instanceId)
  assert.deepEqual([high.cost, high.power, low.cost, low.power, spell.cost, spell.arenaTransmuted], [6, 6, 2, 3, 1, undefined])
  for (const card of [high, spell, low]) assert.equal(JSON.stringify(f.engine.getStateFor('b')).includes(card.instanceId), false)
})

test('prepared transmutation skips spells and already transmuted units and waits for an eligible draw', () => {
  const f = fixture(['chalk_apprentice'], [], 1)
  const already = instance('glass_familiar'); already.arenaTransmuted = true
  f.internal.decks.set('a', [instance('temper'), already, instance('philosopher_engine')])
  f.internal.state.players.a.deckCount = 3
  turn(f.engine, [['chalk_apprentice', 0]])
  assert.equal(f.engine.getStateFor('a').arena!.transmutesPending, 1)
  assert.equal(f.engine.getStateFor('b').arena!.transmutesPending, 0)
  turn(f.engine); turn(f.engine)
  const card = f.engine.getStateFor('a').hand!.find(card => card.definitionId === 'philosopher_engine')!
  assert.deepEqual([card.cost, card.power, card.arenaTransmuted], [2, 5, true])
  assert.equal(f.engine.getStateFor('a').arena!.transmutesPending, 0)
})

test('transmuted passives and conditional draw work when the unit actually reveals', () => {
  const f = fixture(['gilded_oracle', 'glass_familiar'])
  for (const card of f.internal.hands.get('a')!) { card.arenaTransmuted = true; card.power = card.cost; card.cost = 1 }
  turn(f.engine, [['gilded_oracle', 0], ['glass_familiar', 0]])
  const card = f.internal.state.arena!.locations[0].cards.a.find(entry => entry.card.definitionId === 'glass_familiar')!.card
  assert.equal(f.power(card, 'a'), 5)
  assert.equal(f.engine.getStateFor('a').hand!.length, 2)
})

test('Defect preserves identity and current modifiers; playback animates the ownership change', () => {
  const f = fixture(['ashen_envoy'])
  const envoy = f.internal.hands.get('a')![0]; envoy.powerBonus = -2
  const before = f.engine.getStateFor('a')
  turn(f.engine, [['ashen_envoy', 0]])
  const state = f.engine.getStateFor('a')
  assert.equal(state.arena!.locations[0].cards.a.length, 0)
  assert.equal(state.arena!.locations[0].cards.b[0].card.instanceId, envoy.instanceId)
  assert.equal(getArenaLocationPower(state.arena!.locations[0], 'b'), -7)
  const frame = buildArenaPlayback(before, state).find(frame => frame.phase === 'effect')!
  assert.ok(frame.changes.some(change => change.cardId === envoy.instanceId && change.fromOwner === 'a' && change.toOwner === 'b'))
})

test('enemy transfers and spawns reserve the other player’s committed slots', () => {
  for (const attacker of ['ashen_envoy', 'thorn_seeder']) {
    const f = fixture([attacker], ['village_scout'])
    for (let n = 0; n < 3; n++) f.seed('b', 'bone_knight')
    turn(f.engine, [[attacker, 0]], [['village_scout', 0]])
    const site = f.engine.getStateFor('a').arena!.locations[0]
    assert.equal(site.cards.b.length, 4)
    assert.ok(site.cards.b.some(entry => entry.card.definitionId === 'village_scout'))
    assert.ok(site.cards.a.some(entry => entry.card.definitionId === attacker))
    assert.ok(!site.cards.b.some(entry => entry.card.arenaToken))
  }
})

test('Exile chooses a nonpositive ally and does not send a positive card', () => {
  const f = fixture(['masked_ferryman', 'exile_ritual'])
  const idol = f.seed('a', 'tainted_idol'), scout = f.seed('a', 'village_scout')
  turn(f.engine, [['masked_ferryman', 0], ['exile_ritual', 0]])
  const site = f.engine.getStateFor('a').arena!.locations[0]
  assert.deepEqual(site.cards.b.map(entry => entry.card.instanceId), [idol.instanceId])
  assert.ok(site.cards.a.some(entry => entry.card.instanceId === scout.instanceId))
})

test('offerings disappear on the controller’s spell; full boards can still cast and purge', () => {
  const f = fixture(['thorn_seeder'], ['cleansing_flame'])
  const oldToken = f.seed('b', 'burden_token')
  f.seed('b', 'bone_knight'); f.seed('b', 'village_scout')
  turn(f.engine, [['thorn_seeder', 0]], [['cleansing_flame', 0]])
  const site = f.engine.getStateFor('b').arena!.locations[0]
  assert.equal(site.cards.b.length, 2)
  assert.ok(!site.cards.b.some(entry => entry.card.instanceId === oldToken.instanceId || entry.card.arenaToken))
  const g = fixture(['thorn_seeder'], ['temper'])
  turn(g.engine, [['thorn_seeder', 0]], [['temper', 0]])
  assert.equal(g.engine.getStateFor('b').arena!.locations[0].cards.b.length, 0)
})

test('Burden is private, respects the seven-card limit, and generated copies are playable', () => {
  const f = fixture(['hollow_gift', 'counterfeit_courier'], [], 5)
  turn(f.engine, [['hollow_gift', 0], ['counterfeit_courier', 0]])
  const burdens = f.engine.getStateFor('b').hand!.filter(card => card.arenaToken)
  assert.equal(burdens.length, 2)
  assert.notEqual(burdens[0].instanceId, burdens[1].instanceId)
  burdens.forEach(card => assert.equal(JSON.stringify(f.engine.getStateFor('a')).includes(card.instanceId), false))
  const state = f.engine.getStateFor('b')
  const plays = burdens.map(card => ({ cardInstanceId: card.instanceId, locationIndex: 0 as const }))
  assert.equal(getArenaPlanError(state, 'b', state.hand!, plays), null)
  const full = fixture(['hollow_gift'], ARENA_STARTER_DECK.slice(0, 7))
  turn(full.engine, [['hollow_gift', 0]])
  assert.equal(full.engine.getStateFor('b').hand!.length, 7)
  assert.ok(full.engine.getStateFor('b').hand!.every(card => !card.arenaToken))
})

test('Siphon honours Ward, gains only removed power, and can push enemies below zero', () => {
  const f = fixture(['famine_sovereign'])
  const ward = f.seed('b', 'alloy_guardian'), scout = f.seed('b', 'village_scout'), idol = f.seed('b', 'tainted_idol')
  turn(f.engine, [['famine_sovereign', 0]])
  assert.equal(f.power(ward, 'b'), 2)
  assert.equal(f.power(scout, 'b'), 1)
  assert.equal(f.power(idol, 'b'), -3)
  const famine = f.internal.state.arena!.locations[0].cards.a[0].card
  assert.equal(f.power(famine, 'a'), 7)
})

test('Wither ticks twice; Cleanse removes its remaining ticks and debuffs while preserving buffs', () => {
  const f = fixture(['rot_scribe'], ['pale_physician'], 5)
  const ally = f.seed('b', 'village_scout', 0, 3)
  turn(f.engine, [['rot_scribe', 0]])
  assert.equal(f.power(ally, 'b'), 3)
  assert.equal(ally.arenaWither![0].remaining, 1)
  turn(f.engine, [], [['pale_physician', 0]])
  assert.equal(f.power(ally, 'b'), 5)
  assert.equal(ally.arenaWither!.length, 0)
  const g = fixture(['rot_scribe'], [], 4)
  const target = g.seed('b', 'tainted_idol')
  turn(g.engine, [['rot_scribe', 0]]); turn(g.engine); turn(g.engine)
  assert.equal(g.power(target, 'b'), -6)
  assert.equal(target.arenaWither!.length, 0)
})

test('Cleanse preserves printed negative power; Invert converts the current negative value', () => {
  const f = fixture(['pale_physician', 'inversion_rite'])
  const idol = f.seed('a', 'tainted_idol', 0, -3); idol.arenaAffliction = 3
  turn(f.engine, [['pale_physician', 0], ['inversion_rite', 0]])
  assert.equal(f.power(idol, 'a'), 2)
})

test('hand buffs and live support are included in copy and doubling snapshots', () => {
  const f = fixture(['prism_titan'])
  f.internal.hands.get('a')![0].powerBonus = 2
  f.seed('a', 'apprentice_mage')
  turn(f.engine, [['prism_titan', 0]])
  const titan = f.internal.state.arena!.locations[0].cards.a.find(entry => entry.card.definitionId === 'prism_titan')!.card
  assert.equal(f.power(titan, 'a'), 14)
  const g = fixture(['vessel_of_echoes'])
  g.seed('a', 'iron_golem', 0, 3); g.seed('a', 'apprentice_mage')
  turn(g.engine, [['vessel_of_echoes', 0]])
  assert.equal(g.power(g.internal.state.arena!.locations[0].cards.a.at(-1)!.card, 'a'), 9)
})

test('transfer conserves current power and consume clears negative tokens without gaining negative power', () => {
  const f = fixture(['current_runner'])
  const strong = f.seed('a', 'iron_golem', 0, 3), weak = f.seed('a', 'spark_sprite', 1)
  turn(f.engine, [['current_runner', 0]])
  assert.equal(f.power(strong, 'a'), 6)
  assert.equal(f.power(weak, 'a', 1), 3)
  const g = fixture(['marrow_engine'])
  const token = g.seed('a', 'cursed_offering')
  turn(g.engine, [['marrow_engine', 0]])
  const site = g.engine.getStateFor('a').arena!.locations[0]
  assert.equal(site.cards.a.length, 1)
  assert.equal(site.cards.a[0].card.powerBonus, 0)
  assert.ok(!JSON.stringify(site).includes(token.instanceId))
})

test('Equalize snapshots both sides and does not reduce enemy Ward', () => {
  const f = fixture(['equal_measure'])
  const weak = f.seed('a', 'tainted_idol'), strong = f.seed('a', 'iron_golem'), enemy = f.seed('b', 'ironclad_colossus'), ward = f.seed('b', 'ancient_guardian')
  turn(f.engine, [['equal_measure', 0]])
  assert.deepEqual([f.power(weak, 'a'), f.power(strong, 'a'), f.power(enemy, 'b'), f.power(ward, 'b')], [3, 3, 3, 8])
})

test('cross-arena planting skips a full side without blocking the other token or firing Forge', () => {
  const f = fixture(['court_of_thorns'])
  for (let n = 0; n < 4; n++) f.seed('b', 'bone_knight', 1)
  f.internal.state.arena!.locations[2].rule = 'forge'
  const before = f.engine.getStateFor('a')
  turn(f.engine, [['court_of_thorns', 0]])
  const state = f.engine.getStateFor('a'), sites = state.arena!.locations
  assert.equal(sites[0].cards.b.length, 0)
  assert.equal(sites[1].cards.b.length, 4)
  assert.equal(sites[2].cards.b.length, 1)
  const token = sites[2].cards.b[0].card
  assert.equal(token.powerBonus, 0)
  assert.equal(getArenaCardPower(sites[2], 'b', token), -1)
  assert.ok(buildArenaPlayback(before, state).some(frame => frame.changes.some(change => change.cardId === token.instanceId && change.spawned && change.toOwner === 'b')))
})

test('generated-unit support updates live and Harvest counts negative current power at reveal', () => {
  const f = fixture(['debt_collector'], ['exile_ritual'])
  const standard = f.seed('b', 'false_standard'), token = f.seed('b', 'cursed_offering')
  const burden = f.seed('b', 'burden_token')
  f.seed('b', 'tainted_idol')
  assert.equal(f.power(token, 'b'), 0)
  assert.equal(f.power(burden, 'b'), 1)
  turn(f.engine, [['debt_collector', 0]], [['exile_ritual', 0]])
  const collector = f.internal.state.arena!.locations[0].cards.a.find(entry => entry.card.definitionId === 'debt_collector')!.card
  assert.equal(f.power(collector, 'a'), 6) // Only the Idol was negative on reveal.
  assert.equal(f.power(standard, 'b'), 3)
  assert.equal(f.power(burden, 'b'), 1)
  assert.ok(!f.internal.state.arena!.locations[0].cards.b.some(entry => entry.card.instanceId === token.instanceId))
})

test('hand targeting uses current power, then highest cost, and excludes committed cards', () => {
  const f = fixture(['prism_initiate', 'glass_familiar', 'gilded_oracle'])
  turn(f.engine, [['prism_initiate', 0], ['glass_familiar', 0]])
  const oracle = f.engine.getStateFor('a').hand!.find(card => card.definitionId === 'gilded_oracle')!
  assert.equal(oracle.powerBonus, 2)
  const g = fixture(['prism_initiate', 'glass_familiar', 'gilded_oracle'])
  turn(g.engine, [['prism_initiate', 0]])
  assert.equal(g.engine.getStateFor('a').hand!.find(card => card.definitionId === 'gilded_oracle')!.powerBonus, 2)
  assert.equal(g.engine.getStateFor('a').hand!.find(card => card.definitionId === 'glass_familiar')!.powerBonus, 0)
})

test('spell reactors trigger for their controller, and final distribution plays before score focus', () => {
  const f = fixture(['salt_hex'])
  const channel = f.seed('a', 'ember_conduit'), leech = f.seed('a', 'miasma_lantern'), beacon = f.seed('a', 'last_light_beacon', 1, 3)
  const far = f.seed('a', 'village_scout', 2), enemy = f.seed('b', 'iron_golem')
  const before = f.engine.getStateFor('a')
  turn(f.engine, [['salt_hex', 0]])
  assert.equal(f.power(channel, 'a'), 4)
  assert.equal(f.power(leech, 'a'), 8) // 2 + siphon 1 + five distributed power
  assert.equal(f.power(enemy, 'b'), 1)
  assert.equal(f.power(beacon, 'a', 1), 0)
  assert.equal(f.power(far, 'a', 2), 7)
  const frames = buildArenaPlayback(before, f.engine.getStateFor('a'))
  const distribution = frames.findIndex(frame => frame.event?.effects?.includes('distribute'))
  const score = frames.findIndex(frame => frame.phase === 'score-focus')
  assert.ok(distribution >= 0 && distribution < score)
  assert.ok(frames.every(frame => frame.state.phase === 'reveal' && frame.state.winner === undefined))
})

test('all sixteen archetype matchups complete six turns without overfilling or leaking hands', () => {
  for (const a of ARENA_ARCHETYPE_DECKS) for (const b of ARENA_ARCHETYPE_DECKS) {
    const engine = new ArenaEngine(room(a.cards, b.cards), { shuffle: false })
    for (let turnNumber = 1; turnNumber <= 6; turnNumber++) {
      for (const owner of ['a', 'b']) {
        const state = engine.getStateFor(owner), plays: { cardInstanceId: string; locationIndex: ArenaIndex }[] = []
        for (const card of state.hand!) for (const site of state.arena!.locations) {
          const candidate = { cardInstanceId: card.instanceId, locationIndex: site.index }
          if (!getArenaPlanError(state, owner, state.hand!, [...plays, candidate])) { plays.push(candidate); break }
        }
        const result = engine.processAction({ type: 'commit_turn', playerId: owner, timestamp: 0, submission: { turn: turnNumber, plays } })
        assert.equal(result.success, true, `${a.name} / ${b.name}: ${result.error}`)
      }
      for (const owner of ['a', 'b']) {
        const state = engine.getStateFor(owner), other = engine.getStateFor(owner === 'a' ? 'b' : 'a')
        assert.ok(state.hand!.length <= 7)
        const boardIds = state.arena!.locations.flatMap(site => Object.values(site.cards).flatMap(cards => {
          assert.ok(cards.length <= 4)
          return cards.map(entry => entry.card.instanceId)
        }))
        assert.equal(new Set(boardIds).size, boardIds.length)
        assert.ok(state.hand!.every(card => !boardIds.includes(card.instanceId)))
        for (const card of state.hand!) assert.ok(!JSON.stringify(other).includes(card.instanceId), 'private hand leaked')
      }
    }
    assert.equal(engine.getStateFor('a').phase, 'game_over')
  }
})

test('False Standard supplies its own fodder, which can be supported or sent next turn', () => {
  const f = fixture(['false_standard', 'exile_ritual'], [], 2)
  turn(f.engine, [['false_standard', 0]])
  const burden = f.engine.getStateFor('a').hand!.find(card => card.definitionId === 'burden_token')!
  assert.ok(burden)
  assert.ok(!JSON.stringify(f.engine.getStateFor('b')).includes(burden.instanceId))
  turn(f.engine, [['burden_token', 1], ['exile_ritual', 1]])
  const sent = f.engine.getStateFor('a').arena!.locations[1].cards.b[0].card
  assert.equal(sent.instanceId, burden.instanceId)
  assert.equal(getArenaLocationPower(f.engine.getStateFor('a').arena!.locations[1], 'b'), -1)
  const g = fixture(['false_standard'], [], 2)
  turn(g.engine, [['false_standard', 0]])
  turn(g.engine, [['burden_token', 0]])
  assert.equal(getArenaLocationPower(g.engine.getStateFor('a').arena!.locations[0], 'a'), 4)
})

test('cheap Cleanse repairs one afflicted ally; the dedicated Warden can repair the whole arena', () => {
  for (const cleanser of ['pale_physician', 'cleansing_flame', 'censer_warden']) {
    const f = fixture([cleanser])
    const weak = f.seed('a', 'village_scout', 0, -3), strong = f.seed('a', 'iron_golem', 0, -2)
    weak.arenaAffliction = 3; strong.arenaAffliction = 2
    turn(f.engine, [[cleanser, 0]])
    assert.equal(f.power(weak, 'a'), 2)
    assert.equal(f.power(strong, 'a'), cleanser === 'censer_warden' ? 5 : 3)
  }
})

test('Harvest rewards reductions before zero and counts an afflicted negative enemy only once', () => {
  const f = fixture(['debt_collector'])
  const positive = f.seed('b', 'iron_golem', 0, -1), negative = f.seed('b', 'tainted_idol', 0, -1)
  positive.arenaAffliction = 1; negative.arenaAffliction = 1
  f.seed('b', 'bone_knight')
  turn(f.engine, [['debt_collector', 0]])
  assert.equal(f.power(f.internal.state.arena!.locations[0].cards.a[0].card, 'a'), 7)
})

test('spell reactions fire once per turn, reset next turn, and consume the first cast even without targets', () => {
  const f = fixture(['temper', 'salt_hex', 'phase_walk'], [], 5)
  const channel = f.seed('a', 'ember_conduit'), leech = f.seed('a', 'miasma_lantern')
  f.seed('b', 'iron_golem')
  turn(f.engine, [['temper', 1], ['salt_hex', 0], ['phase_walk', 0]])
  assert.equal(f.power(channel, 'a'), 4)
  assert.equal(f.power(leech, 'a'), 3)
  f.hand('a', ['salt_hex'])
  turn(f.engine, [['salt_hex', 0]])
  assert.equal(f.power(channel, 'a'), 6)
  assert.equal(f.power(leech, 'a'), 4)
  const g = fixture(['temper', 'thorn_seeder', 'phase_walk'])
  const idle = g.seed('a', 'miasma_lantern')
  turn(g.engine, [['temper', 0], ['thorn_seeder', 0], ['phase_walk', 0]])
  assert.equal(g.power(idle, 'a'), 5)
  const triggerEvents = g.engine.getStateFor('a').arena!.lastReveal!.events.filter(event => event.kind === 'trigger' && event.effects?.includes('siphon'))
  assert.equal(triggerEvents.length, 0)
})

test('Famine has a bounded 13-power swing against four unwarded units, before location bonuses', () => {
  const f = fixture(['famine_sovereign'])
  for (let i = 0; i < 4; i++) f.seed('b', 'bone_knight')
  const before = getArenaLocationPower(f.engine.getStateFor('a').arena!.locations[0], 'b')
  turn(f.engine, [['famine_sovereign', 0]])
  const site = f.engine.getStateFor('a').arena!.locations[0]
  assert.equal(getArenaLocationPower(site, 'a') + before - getArenaLocationPower(site, 'b'), 13)
})

test('Imbue strengthens a power source in hand instead of the smaller card that will copy it', () => {
  const f = fixture(['prism_initiate', 'sunwell_keeper', 'mirror_squire'])
  turn(f.engine, [['prism_initiate', 0]])
  const hand = f.engine.getStateFor('a').hand!
  assert.equal(hand.find(card => card.definitionId === 'sunwell_keeper')!.powerBonus, 2)
  assert.equal(hand.find(card => card.definitionId === 'mirror_squire')!.powerBonus, 0)
})

const curveCases: { id: string; order: string[]; plans: Entry[][] }[] = [
  { id: 'transmutation', order: ['chalk_apprentice', 'mercury_scholar', 'glass_familiar', 'village_scout', 'philosopher_engine', 'wandering_blade', 'paradox_regent', 'gilded_oracle', 'alloy_guardian', 'censer_warden', 'silver_equation', 'prism_titan'],
    plans: [[['chalk_apprentice', 0]], [['mercury_scholar', 1]], [['glass_familiar', 1], ['village_scout', 0]], [['paradox_regent', 2]], [['philosopher_engine', 0], ['alloy_guardian', 2]], [['gilded_oracle', 1], ['censer_warden', 2]]] },
  { id: 'sabotage', order: ['tainted_idol', 'village_scout', 'exile_ritual', 'false_standard', 'contraband_cache', 'inversion_rite', 'ashen_envoy', 'thorn_seeder', 'court_of_thorns', 'debt_collector', 'oathbreaker_duke', 'splinter_agent'],
    plans: [[['tainted_idol', 1]], [['false_standard', 0]], [['contraband_cache', 2]], [['burden_token', 2], ['exile_ritual', 2], ['ashen_envoy', 1]], [['court_of_thorns', 0]], [['debt_collector', 0], ['inversion_rite', 1]]] },
  { id: 'affliction', order: ['village_scout', 'dusk_leech', 'blight_acolyte', 'rot_scribe', 'miasma_lantern', 'salt_hex', 'unmaking', 'hollow_choir', 'famine_sovereign', 'plague_cartographer', 'debt_collector', 'cleansing_flame'],
    plans: [[['village_scout', 0]], [['dusk_leech', 1]], [['rot_scribe', 1]], [['miasma_lantern', 1], ['salt_hex', 1], ['blight_acolyte', 1]], [['hollow_choir', 0], ['unmaking', 0]], [['famine_sovereign', 2]]] },
  { id: 'conduits', order: ['candle_tender', 'prism_initiate', 'temper', 'sunwell_keeper', 'current_runner', 'marrow_engine', 'vessel_of_echoes', 'last_light_beacon', 'prism_titan', 'ember_conduit', 'arcane_echo', 'village_scout'],
    plans: [[['candle_tender', 0]], [['prism_initiate', 1]], [['current_runner', 1], ['temper', 0]], [['sunwell_keeper', 1]], [['last_light_beacon', 2]], [['prism_titan', 2]]] },
]
for (const example of curveCases) test(`${example.id} legacy package retains a legal six-turn curve with natural draws`, () => {
  assert.equal(getArenaDeckError(example.order), null)
  const opponentOrder = ['village_scout', 'wandering_blade', 'iron_golem', 'thunder_hawk', 'ancient_guardian', 'the_unbroken', 'spark_sprite', 'forge_apprentice', 'mountain_hermit', 'temper', 'frost_sage', 'chaos_drake']
  const opponentPlans: Entry[][] = [[['village_scout', 1]], [['wandering_blade', 0]], [['iron_golem', 0]], [['thunder_hawk', 2]], [['ancient_guardian', 0]], [['the_unbroken', 2]]]
  const engine = new ArenaEngine(room(example.order, opponentOrder), { shuffle: false })
  let spent = 0
  for (let n = 0; n < 6; n++) {
    const state = engine.getStateFor('a')
    spent += example.plans[n].reduce((total, [id]) => total + state.hand!.find(card => card.definitionId === id)!.cost, 0)
    turn(engine, example.plans[n], example.id === 'sabotage' && n === 5 ? [['the_unbroken', 1]] : opponentPlans[n])
    for (const site of engine.getStateFor('a').arena!.locations) for (const units of Object.values(site.cards)) assert.ok(units.length <= 4)
  }
  assert.equal(engine.getStateFor('a').phase, 'game_over')
  assert.ok(spent >= 19 && spent <= 21, `curve spent ${spent} of 21 energy`)
  if (example.id === 'conduits') {
    const cards = engine.getStateFor('a').arena!.locations.flatMap(site => site.cards.a)
    assert.equal(cards.find(entry => entry.card.definitionId === 'prism_titan')!.card.powerBonus, 6)
  }
})

test('Court creates persistent Burdens; ordinary spells do not clear them, but Purge does', () => {
  const f = fixture(['court_of_thorns'], ['mana_surge', 'cleansing_flame'], 5)
  turn(f.engine, [['court_of_thorns', 0]], [['mana_surge', 1]])
  const state = f.engine.getStateFor('b')
  assert.equal(state.arena!.locations[1].cards.b[0].card.definitionId, 'burden_token')
  assert.equal(getArenaLocationPower(state.arena!.locations[1], 'b'), -1)
  turn(f.engine, [], [['cleansing_flame', 1]])
  const final = f.engine.getStateFor('b')
  assert.equal(final.arena!.locations[1].cards.b.length, 0)
  assert.equal(final.arena!.locations[2].cards.b.length, 1)
})

test('Transmutation has useful natural-cost plays when its enablers are absent', () => {
  const f = fixture(['glass_familiar'], [], 3)
  turn(f.engine, [['glass_familiar', 0]])
  turn(f.engine); turn(f.engine); turn(f.engine)
  assert.equal(getArenaLocationPower(f.engine.getStateFor('a').arena!.locations[0], 'a'), 5)
  const g = fixture(['gilded_oracle'])
  turn(g.engine, [['gilded_oracle', 0]])
  assert.equal(g.engine.getStateFor('a').hand!.length, 1)
  assert.equal(getArenaLocationPower(g.engine.getStateFor('a').arena!.locations[0], 'a'), 2)
})
