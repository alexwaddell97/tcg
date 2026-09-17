import assert from 'node:assert/strict'
import { test } from 'node:test'
import { ARENA_CARD_DATABASE, ARENA_LOCATIONS } from '../packages/shared/src/index.ts'
import type { ArenaArchetype, ArenaLocation, ArenaRevealEvent, Card } from '../packages/shared/src/index.ts'
import { createArenaArchetypeDemo } from '../apps/web/src/lib/arenaEffectsDemo.ts'
import { buildArenaPlayback, advanceArenaPlayback, createArenaPlayback, syncArenaPlayback } from '../apps/web/src/lib/arenaPlayback.ts'
import { getArenaController, getArenaControlChanges, getArenaEffectFamily, getConduitLinks } from '../apps/web/src/lib/arenaPresentation.ts'

function card(definitionId: string, instanceId = definitionId): Card {
  return { ...ARENA_CARD_DATABASE.find(card => card.definitionId === definitionId)!, instanceId, powerBonus: 0, questProgress: 0, isTransformed: false }
}
function location(a: number, b: number): ArenaLocation {
  return { ...ARENA_LOCATIONS[0], index: 0, revealed: true,
    cards: Object.fromEntries([['a', a], ['b', b]].map(([id, power]) => [id, [{ placedOnTurn: 1, card: { ...card('village_scout', String(id)), power: Number(power) } }]])) }
}

test('presentation follows resolved effects, including failed conditions and mixed abilities', () => {
  const event: ArenaRevealEvent = { id: 'effect', kind: 'card', locationIndex: 0, locations: [], card: card('mercury_scholar') }
  assert.equal(getArenaEffectFamily(event), 'power', 'printed abilities do not imply a successful transmutation')
  assert.equal(getArenaEffectFamily({ ...event, abilityTriggered: true, effects: ['draw'] }), 'arcane')
  assert.equal(getArenaEffectFamily({ ...event, abilityTriggered: true, effects: ['draw', 'transmute_deck'] }), 'transmutation')
  assert.equal(getArenaEffectFamily({ ...event, card: card('splinter_agent'), abilityTriggered: true, effects: ['plant', 'drain'] }), 'sabotage')
  assert.equal(getArenaEffectFamily({ ...event, card: card('candle_tender'), abilityTriggered: true, effects: ['boost'] }), 'conduits')
  assert.equal(getArenaEffectFamily({ ...event, card: card('candle_tender'), abilityTriggered: false, effects: [] }), 'power')
  assert.equal(getArenaEffectFamily({ ...event, kind: 'growth', effects: ['grow'] }), 'growth')
})

test('control transitions compare total power, handle negative scores and do not pulse on an unchanged lead', () => {
  assert.equal(getArenaController(location(-2, -5)), 'a')
  assert.equal(getArenaController(location(-5, -2)), 'b')
  assert.equal(getArenaController(location(-3, -3)), null)
  assert.deepEqual(getArenaControlChanges([location(0, 0)], [location(3, 0)]), [{ locationIndex: 0, from: null, to: 'a' }])
  assert.deepEqual(getArenaControlChanges([location(3, 0)], [location(3, 4)]), [{ locationIndex: 0, from: 'a', to: 'b' }])
  assert.deepEqual(getArenaControlChanges([location(3, 0)], [location(3, 3)]), [{ locationIndex: 0, from: 'a', to: null }])
  assert.deepEqual(getArenaControlChanges([location(3, 0)], [location(8, 2)]), [])
  const summit = { ...location(0, 6), rule: 'summit' as const }
  summit.cards.a = [{ card: card('thunder_hawk'), placedOnTurn: 4 }]
  assert.equal(getArenaController(summit), 'a', 'Summit bonus must count in control, not only printed power')
})

test('each archetype preview resolves real effects and keeps its result behind the complete playback', () => {
  for (const family of ['transmutation', 'affliction', 'sabotage', 'conduits'] as ArenaArchetype[]) {
    const { before, after } = createArenaArchetypeDemo(family)
    assert.equal(before.turn, 6)
    assert.equal(after.phase, 'game_over')
    const frames = buildArenaPlayback(before, after)
    assert.ok(frames.some(frame => frame.phase === 'effect' && getArenaEffectFamily(frame.event) === family))
    assert.ok(frames.filter(frame => frame.phase !== 'effect').every(frame => !frame.controlChanges?.length))
    let previous = after.arena!.lastReveal!.initialLocations
    for (const frame of frames.filter(frame => frame.phase === 'effect')) {
      assert.deepEqual(frame.controlChanges, getArenaControlChanges(previous, frame.event!.locations))
      previous = frame.event!.locations
    }
    assert.deepEqual(frames.slice(-4).map(frame => frame.phase), ['score-focus', 'score-focus', 'score-focus', 'score-summary'])
    let playback = syncArenaPlayback(createArenaPlayback(before), after)
    while (playback.frames.length) {
      assert.equal(playback.display.winner, undefined)
      assert.equal(playback.display.phase, 'reveal')
      playback = advanceArenaPlayback(playback, playback.frames[playback.index].id)
    }
    assert.equal(playback.display.phase, 'game_over')
    assert.equal(playback.display.winner, after.winner)
  }
})

test('Conduit threads use the actual donor for a transfer and the caster for an echo', () => {
  const { before, after } = createArenaArchetypeDemo('conduits')
  const effects = buildArenaPlayback(before, after).filter(frame => frame.phase === 'effect')
  const transfer = effects.find(frame => frame.event?.card?.definitionId === 'current_runner')!
  const donor = before.arena!.locations[1].cards.you.find(entry => entry.card.definitionId === 'mountain_hermit')!.card.instanceId
  const recipient = before.arena!.locations[0].cards.you[0].card.instanceId
  assert.deepEqual(getConduitLinks(transfer.event, transfer.changes), [{ from: donor, to: recipient }])
  assert.notEqual(donor, transfer.event!.card!.instanceId, 'the power leaves the Hermit, not the Runner')
  const echo = effects.find(frame => frame.event?.card?.definitionId === 'sunwell_keeper')!
  assert.deepEqual(getConduitLinks(echo.event, echo.changes), [{ from: echo.event!.card!.instanceId, to: recipient }])
  assert.deepEqual(getConduitLinks({ ...transfer.event!, abilityTriggered: false }, transfer.changes), [])
  assert.deepEqual(getConduitLinks(transfer.event, []), [])
})

test('private hand transmutation shows a source effect without inventing public recipients', () => {
  const { before, after } = createArenaArchetypeDemo('transmutation')
  const transmute = buildArenaPlayback(before, after).find(frame => frame.phase === 'effect' && frame.event?.card?.definitionId === 'mercury_scholar')!
  assert.equal(getArenaEffectFamily(transmute.event), 'transmutation')
  assert.deepEqual(transmute.changes, [])
  assert.deepEqual(getConduitLinks(transmute.event, transmute.changes), [])
  const unplayed = before.hand!.filter(card => !after.arena!.lastReveal!.events.some(event => event.card?.instanceId === card.instanceId))
  for (const hidden of unplayed) assert.equal(JSON.stringify(transmute.event).includes(hidden.instanceId), false)
})
