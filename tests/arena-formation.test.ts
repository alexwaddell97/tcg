import assert from 'node:assert/strict'
import { test } from 'node:test'
import { ArenaEngine, ARENA_CARD_DATABASE, ARENA_TOKEN_DATABASE, ARENA_POSITIONS, getArenaFormation, getArenaNeighbours, getArenaPlanError, resolveArenaPlaySlots } from '../packages/shared/src/index.ts'
import type { ArenaIndex, ArenaPlay, ArenaSlotIndex, Card, GameState, Room } from '../packages/shared/src/index.ts'
import { getArenaDropPlan } from '../apps/web/src/lib/arenaDraft.ts'
import { buildArenaPlayback } from '../apps/web/src/lib/arenaPlayback.ts'

function card(id: string): Card {
  return { ...structuredClone([...ARENA_CARD_DATABASE, ...ARENA_TOKEN_DATABASE].find(card => card.definitionId === id)!), instanceId: crypto.randomUUID(), powerBonus: 0, questProgress: 0, isTransformed: false }
}
function fixture(a: string[], b: string[] = []) {
  const room: Room = { id: crypto.randomUUID(), name: 'Formation test', hostId: 'a', status: 'in_progress', maxPlayers: 2, isPrivate: true, createdAt: 0,
    players: ['a', 'b'].map(id => ({ id, displayName: id, isReady: true })) }
  const engine = new ArenaEngine(room, { shuffle: false })
  const internal = engine as unknown as { state: GameState; hands: Map<string, Card[]> }
  internal.state.turn = 6; internal.state.arena!.energy = 6
  for (const site of internal.state.arena!.locations) { site.revealed = true; delete site.rule }
  for (const [owner, ids] of [['a', a], ['b', b]] as const) { internal.hands.set(owner, ids.map(card)); internal.state.players[owner].handCount = ids.length }
  const seed = (owner: string, id: string, locationIndex: ArenaIndex, slotIndex: ArenaSlotIndex) => {
    const unit = card(id)
    internal.state.arena!.locations[locationIndex].cards[owner].push({ card: unit, placedOnTurn: 1, slotIndex })
    return unit
  }
  const play = (owner: string, definitionId: string, locationIndex: ArenaIndex, slotIndex?: ArenaSlotIndex): ArenaPlay => ({ cardInstanceId: internal.hands.get(owner)!.find(card => card.definitionId === definitionId)!.instanceId, locationIndex, slotIndex })
  const commit = (owner: string, plays: ArenaPlay[]) => engine.processAction({ type: 'commit_turn', playerId: owner, timestamp: 0, submission: { turn: 6, plays } })
  const reveal = (a: ArenaPlay[], b: ArenaPlay[] = []) => { assert.equal(commit('a', a).success, true); const result = commit('b', b); assert.equal(result.success, true, result.error); return engine.getStateFor('a') }
  return { engine, seed, play, commit, reveal }
}

test('formation neighbours follow a chain, with no wraparound, and snapshot gaps persist', () => {
  assert.deepEqual(ARENA_POSITIONS.map(getArenaNeighbours), [[1], [0, 2], [1, 3], [2]])
  const first = { card: card('village_scout'), placedOnTurn: 1, slotIndex: 3 as const }
  const second = { card: card('spark_sprite'), placedOnTurn: 1, slotIndex: 1 as const }
  const old = { card: card('bone_knight'), placedOnTurn: 1 }
  assert.deepEqual(getArenaFormation([first, second]), [undefined, second, undefined, first])
  assert.deepEqual(getArenaFormation([old, first, second]), [old, second, undefined, first])
  assert.equal('slotIndex' in old, false, 'reading a legacy snapshot never changes it')
})

test('exact positions stay private until reveal and survive public playback snapshots', () => {
  const f = fixture(['village_scout', 'spark_sprite'], ['village_scout'])
  const plan = [f.play('a', 'village_scout', 0, 3), f.play('a', 'spark_sprite', 0, 1)]
  assert.equal(f.commit('a', plan).success, true)
  assert.deepEqual(f.engine.getStateFor('a').arena!.committedPlays, plan)
  assert.deepEqual(f.engine.getStateFor('b').arena!.committedPlays, [])
  assert.ok(!JSON.stringify(f.engine.getStateFor('b')).includes(plan[0].cardInstanceId))
  plan[0].slotIndex = 0
  assert.equal(f.engine.getStateFor('a').arena!.committedPlays![0].slotIndex, 3, 'the caller cannot mutate a committed position')
  assert.equal(f.commit('b', [f.play('b', 'village_scout', 0, 3)]).success, true)
  const state = f.engine.getStateFor('a'), site = state.arena!.locations[0]
  assert.deepEqual(site.cards.a.map(placed => placed.slotIndex), [3, 1])
  assert.equal(site.cards.b[0].slotIndex, 3, 'each player has their own four positions')
  const arrivals = state.arena!.lastReveal!.events.filter(event => event.kind === 'card')
  assert.equal(arrivals[0].arrival![0].cards.a[0].slotIndex, 3)
  assert.deepEqual(arrivals[1].locations[0].cards.a.map(placed => placed.slotIndex), [3, 1])
})

test('invalid, duplicate and occupied position submissions fail atomically', () => {
  const f = fixture(['village_scout', 'spark_sprite'])
  f.seed('a', 'bone_knight', 0, 2)
  const before = f.engine.getStateFor('a'), valid = f.play('a', 'village_scout', 0, 0)
  const invalid: unknown[] = [-1, 4, 0.5, NaN, Infinity, '1', null, {}]
  const plans = invalid.map(slotIndex => [{ ...valid, slotIndex }] as ArenaPlay[])
  plans.push([{ ...valid, slotIndex: 2 }], [valid, f.play('a', 'spark_sprite', 0, 0)])
  for (const plan of plans) {
    const result = f.commit('a', plan)
    assert.equal(result.success, false)
    assert.match(result.error!, /position/)
    assert.deepEqual(f.engine.getStateFor('a'), before)
  }
})

test('automatic placement reserves explicit choices first; spells occupy no position', () => {
  const f = fixture(['village_scout', 'spark_sprite', 'temper'])
  f.seed('a', 'bone_knight', 0, 2)
  const plan = [f.play('a', 'village_scout', 0), f.play('a', 'temper', 0, 2), f.play('a', 'spark_sprite', 0, 0)]
  const view = f.engine.getStateFor('a')
  assert.equal(getArenaPlanError(view, 'a', view.hand!, plan), null)
  const resolved = resolveArenaPlaySlots(view.arena!.locations, 'a', view.hand!, plan)
  assert.deepEqual(resolved.map(play => play.slotIndex), [1, undefined, 0])
  const state = f.reveal(plan)
  assert.deepEqual(state.arena!.locations[0].cards.a.map(placed => placed.slotIndex), [2, 1, 0])
})

test('enemy token creation uses a free position without displacing committed cards', () => {
  const f = fixture(['thorn_seeder'], ['village_scout', 'spark_sprite'])
  const state = f.reveal([f.play('a', 'thorn_seeder', 0, 3)], [f.play('b', 'village_scout', 0, 0), f.play('b', 'spark_sprite', 0, 2)])
  const formation = getArenaFormation(state.arena!.locations[0].cards.b)
  assert.equal(formation[0]!.card.definitionId, 'village_scout')
  assert.equal(formation[1]!.card.definitionId, 'cursed_offering')
  assert.equal(formation[2]!.card.definitionId, 'spark_sprite')
  assert.equal(formation[3], undefined)
})

test('defection leaves a hole and respects the opponent’s specific reserved position', () => {
  const f = fixture(['ashen_envoy'], ['village_scout'])
  const ally = f.seed('a', 'bone_knight', 0, 1)
  f.seed('b', 'bone_knight', 0, 2)
  const state = f.reveal([f.play('a', 'ashen_envoy', 0, 3)], [f.play('b', 'village_scout', 0, 0)])
  const mine = getArenaFormation(state.arena!.locations[0].cards.a), theirs = getArenaFormation(state.arena!.locations[0].cards.b)
  assert.equal(mine[1]!.card.instanceId, ally.instanceId)
  assert.equal(mine[3], undefined)
  assert.equal(theirs[0]!.card.definitionId, 'village_scout')
  assert.equal(theirs[1]!.card.definitionId, 'ashen_envoy')
})

test('movement preserves the vacated gap and avoids a friendly queued position', () => {
  const f = fixture(['phase_walk', 'spark_sprite'])
  const moving = f.seed('a', 'village_scout', 1, 3)
  const stationary = f.seed('a', 'bone_knight', 1, 1)
  f.seed('a', 'bone_knight', 0, 2)
  const before = f.engine.getStateFor('a')
  const state = f.reveal([f.play('a', 'phase_walk', 0), f.play('a', 'spark_sprite', 0, 1)])
  const origin = getArenaFormation(state.arena!.locations[1].cards.a), destination = getArenaFormation(state.arena!.locations[0].cards.a)
  assert.equal(origin[1]!.card.instanceId, stationary.instanceId)
  assert.equal(origin[3], undefined)
  assert.equal(destination[0]!.card.instanceId, moving.instanceId)
  assert.equal(destination[1]!.card.definitionId, 'spark_sprite')
  const motion = buildArenaPlayback(before, state).flatMap(frame => frame.changes).find(change => change.cardId === moving.instanceId)!
  assert.deepEqual([motion.from, motion.to, motion.fromSlot, motion.toSlot], [1, 0, 3, 0])
})

test('clearing an offering leaves other positions unchanged', () => {
  const f = fixture(['temper'])
  f.seed('a', 'cursed_offering', 0, 0)
  const survivor = f.seed('a', 'village_scout', 0, 3)
  const formation = getArenaFormation(f.reveal([f.play('a', 'temper', 0)]).arena!.locations[0].cards.a)
  assert.deepEqual(formation.slice(0, 3), [undefined, undefined, undefined])
  assert.equal(formation[3]!.card.instanceId, survivor.instanceId)
})

test('queued cards can move to a different position without changing reveal order or other reservations', () => {
  const f = fixture(['village_scout', 'spark_sprite'])
  const state = f.engine.getStateFor('a'), scout = state.hand![0], sprite = state.hand![1]
  const first = getArenaDropPlan(state, 'a', [], scout.instanceId, 0, 3)
  const second = getArenaDropPlan(state, 'a', first.plan, sprite.instanceId, 0, 0)
  const moved = getArenaDropPlan(state, 'a', second.plan, scout.instanceId, 0, 2)
  assert.equal(moved.error, null)
  assert.deepEqual(moved.plan.map(play => [play.cardInstanceId, play.slotIndex]), [[scout.instanceId, 2], [sprite.instanceId, 0]])
  const invalid = getArenaDropPlan(state, 'a', moved.plan, scout.instanceId, 0, 0)
  assert.match(invalid.error!, /occupied/)
  assert.equal(invalid.plan, moved.plan)
  assert.equal(moved.plan.filter(play => play.cardInstanceId !== sprite.instanceId)[0].slotIndex, 2, 'undoing another card keeps this position')
})
