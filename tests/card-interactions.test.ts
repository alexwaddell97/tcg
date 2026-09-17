import assert from 'node:assert/strict'
import { test } from 'node:test'
import { ArenaEngine, ARENA_CARD_DATABASE, ARENA_STARTER_DECK } from '../packages/shared/src/index.ts'
import type { ArenaPlay, Room } from '../packages/shared/src/index.ts'
import { createCardDragGesture } from '../apps/web/src/lib/cardDrag.ts'
import { getArenaDropPlan } from '../apps/web/src/lib/arenaDraft.ts'

function gesture() {
  const moves: unknown[] = [], drops: unknown[] = [], cancels: boolean[] = []
  return { moves, drops, cancels, input: createCardDragGesture({ move: point => moves.push(point), drop: point => drops.push(point), cancel: () => cancels.push(true) }) }
}
test('mouse clicks and small finger movements inspect without playing a card', () => {
  for (const pointerType of ['mouse', 'touch', 'pen']) {
    const { input, drops, moves } = gesture()
    input.begin({ pointerId: 1, cardId: 'scout', x: 100, y: 500, pointerType })
    input.move(1, 103, 503)
    input.end(1, 103, 503)
    assert.deepEqual(drops, [])
    assert.deepEqual(moves, [])
    assert.equal(input.canInspect(1), true)
  }
})

test('mouse and touch drags drop once at release, and suppress the synthetic click', () => {
  for (const pointerType of ['mouse', 'touch', 'pen']) {
    const { input, drops } = gesture()
    input.begin({ pointerId: 1, cardId: 'scout', x: 100, y: 500, pointerType })
    input.move(1, 120, 470)
    input.move(1, 200, 200)
    assert.deepEqual(drops, [], 'moving over an arena never plays early')
    input.end(1, 250, 190)
    input.end(1, 250, 190)
    assert.deepEqual(drops, [{ cardId: 'scout', x: 250, y: 190 }])
    assert.equal(input.canInspect(1), false)
    input.begin({ pointerId: 2, cardId: 'scout', x: 100, y: 500, pointerType })
    input.end(2, 100, 500)
    assert.equal(input.canInspect(1), true, 'the next deliberate tap still inspects')
  }
})

test('a second finger cannot hijack or finish a drag; cancellation never plays', () => {
  const { input, drops, cancels } = gesture()
  input.begin({ pointerId: 1, cardId: 'scout', x: 0, y: 0, pointerType: 'touch' })
  assert.equal(input.begin({ pointerId: 2, cardId: 'other', x: 0, y: 0, pointerType: 'touch' }), false)
  input.move(1, 20, 20)
  input.end(2, 200, 200)
  input.cancel(2)
  assert.deepEqual(cancels, [])
  input.cancel(1)
  input.end(1, 200, 200)
  assert.deepEqual(drops, [])
  assert.deepEqual(cancels, [true])
  assert.equal(input.canInspect(1), false)
  assert.equal(input.canInspect(0), true, 'keyboard inspection is never consumed by a canceled gesture')
})

test('dragging back to the starting point still counts as a drag, not an inspection', () => {
  const { input, drops } = gesture()
  input.begin({ pointerId: 1, cardId: 'scout', x: 0, y: 0, pointerType: 'mouse' })
  input.move(1, 50, 50)
  input.end(1, 0, 0)
  assert.equal(drops.length, 1)
  assert.equal(input.canInspect(1), false)
})

function fixture() {
  const deck = ['village_scout', 'spark_sprite', 'temper', ...ARENA_STARTER_DECK.filter(id => !['village_scout', 'spark_sprite', 'temper'].includes(id))]
  const room: Room = { id: 'drag-test', name: 'Drag test', hostId: 'you', status: 'in_progress', maxPlayers: 2, isPrivate: true, createdAt: 0,
    players: ['you', 'opponent'].map(id => ({ id, displayName: id, isReady: true, deckDefinitionIds: deck })) }
  return new ArenaEngine(room, { shuffle: false }).getStateFor('you')
}
test('drag placement and relocation validate energy and preserve queued reveal order', () => {
  const state = fixture()
  state.arena!.energy = 2
  const [scout, sprite] = state.hand!
  const first = getArenaDropPlan(state, 'you', [], scout.instanceId, 0)
  assert.equal(first.error, null)
  const second = getArenaDropPlan(state, 'you', first.plan, sprite.instanceId, 1)
  const moved = getArenaDropPlan(state, 'you', second.plan, scout.instanceId, 2)
  assert.equal(moved.error, null)
  assert.deepEqual(moved.plan, [{ cardInstanceId: scout.instanceId, locationIndex: 2, slotIndex: 0 }, { cardInstanceId: sprite.instanceId, locationIndex: 1, slotIndex: 0 }])
  assert.equal(first.plan[0].locationIndex, 0, 'previous plans remain unchanged')
  state.arena!.energy = 1
  const invalid = getArenaDropPlan(state, 'you', first.plan, sprite.instanceId, 1)
  assert.match(invalid.error!, /enough aether/)
  assert.equal(invalid.plan, first.plan, 'an invalid drop leaves the original plan intact')
})

test('full arenas reject units but accept spells; stale, unknown and locked drops are rejected', () => {
  const state = fixture(), hand = state.hand!
  state.arena!.locations[0].cards.you = Array.from({ length: 4 }, (_, index) => ({ card: { ...hand[0], instanceId: `board-${index}` }, placedOnTurn: 1 }))
  const plan: ArenaPlay[] = []
  assert.match(getArenaDropPlan(state, 'you', plan, hand[0].instanceId, 0).error!, /four/)
  const spell = hand.find(card => card.type === 'spell')!
  assert.equal(getArenaDropPlan(state, 'you', plan, spell.instanceId, 0).error, null)
  assert.match(getArenaDropPlan(state, 'you', plan, 'unknown', 1).error!, /not in your hand/)
  state.arena!.lockedIn.you = true
  assert.match(getArenaDropPlan(state, 'you', plan, spell.instanceId, 0).error!, /locked/)
  state.phase = 'reveal'
  assert.match(getArenaDropPlan(state, 'you', plan, spell.instanceId, 0).error!, /no longer open/)
  assert.equal(ARENA_CARD_DATABASE.find(card => card.definitionId === spell.definitionId)!.cost, spell.cost)
})
