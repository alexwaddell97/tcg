import assert from 'node:assert/strict'
import { test } from 'node:test'
import { ARENA_STARTER_DECK, ArenaEngine, getArenaLocationPower } from '../packages/shared/src/index.ts'
import type { ArenaIndex, GameState, Room } from '../packages/shared/src/index.ts'
import { createArenaArchetypeDemo, createArenaEffectsDemo, createArenaEndingDemo } from '../apps/web/src/lib/arenaEffectsDemo.ts'
import { advanceArenaPlayback, arenaEffectDuration, arenaFrameDuration, buildArenaPlayback, createArenaPlayback, syncArenaPlayback } from '../apps/web/src/lib/arenaPlayback.ts'
import { arenaDrawDuration, DRAW_STAGGER } from '../apps/web/src/lib/arenaDraw.ts'

function game() {
  const room: Room = { id: crypto.randomUUID(), name: 'Reveal test', hostId: 'a', status: 'in_progress', maxPlayers: 2, isPrivate: true, createdAt: 0,
    players: ['a', 'b'].map(id => ({ id, displayName: id, isReady: true, deckDefinitionIds: ARENA_STARTER_DECK })) }
  return new ArenaEngine(room, { shuffle: false })
}
function commit(engine: ArenaEngine, id: string, entries: [string, ArenaIndex][] = []) {
  const state = engine.getStateFor(id)
  const result = engine.processAction({ type: 'commit_turn', playerId: id, timestamp: 0,
    submission: { turn: state.turn, plays: entries.map(([definitionId, locationIndex]) => ({ cardInstanceId: state.hand!.find(card => card.definitionId === definitionId)!.instanceId, locationIndex })) } })
  assert.equal(result.success, true, result.error)
}
function finishPlayback(before: GameState, after: GameState) {
  let playback = syncArenaPlayback(createArenaPlayback(before), after)
  while (playback.frames.length) playback = advanceArenaPlayback(playback, playback.frames[playback.index].id)
  return playback
}

test('reveal snapshots stay private until both commits, hide future rules, and preserve alternating order', () => {
  const engine = game()
  const secretId = engine.getStateFor('a').hand![0].instanceId
  commit(engine, 'a', [['village_scout', 0]])
  assert.equal(engine.getStateFor('b').arena!.lastReveal, undefined)
  assert.equal(JSON.stringify(engine.getStateFor('b')).includes(secretId), false)
  commit(engine, 'b', [['spark_sprite', 0]])
  const reveal = engine.getStateFor('b').arena!.lastReveal!
  assert.deepEqual(reveal.events.filter(event => event.kind === 'card').map(event => event.playerId), ['a', 'b'])
  for (const locations of [reveal.initialLocations, ...reveal.events.flatMap(event => [event.arrival ?? [], event.locations])]) {
    for (const location of locations.filter(location => !location.revealed)) {
      assert.equal(location.rule, undefined)
      assert.equal(location.definitionId, 'unrevealed')
      assert.equal(location.name, 'Uncharted arena')
    }
  }
  assert.equal(reveal.initialLocations[1].revealed, false)
  assert.equal(reveal.events.at(-1)!.locations[1].revealed, true)
  const initial = structuredClone(reveal)
  commit(engine, 'a', [['wandering_blade', 0]])
  commit(engine, 'b', [['forge_apprentice', 0]])
  assert.deepEqual(engine.getStateFor('a').arena!.lastReveal!.events.filter(event => event.kind === 'card').map(event => event.playerId), ['b', 'a'])
  assert.deepEqual(reveal, initial, 'later effects cannot rewrite an earlier snapshot')
})

test('landing power precedes Forge and conditional effects without simulating the rules again', () => {
  const engine = game()
  const before = engine.getStateFor('a')
  commit(engine, 'a', [['village_scout', 0]])
  commit(engine, 'b', [['spark_sprite', 1]])
  const after = engine.getStateFor('a')
  const frames = buildArenaPlayback(before, after)
  const scout = frames.filter(frame => frame.event?.card?.definitionId === 'village_scout')
  assert.equal(scout[0].phase, 'arrive')
  assert.equal(getArenaLocationPower(scout[0].state.arena!.locations[0], 'a'), 2)
  assert.equal(getArenaLocationPower(scout[1].state.arena!.locations[0], 'a'), 3)
  assert.equal(scout[1].changes[0].delta, 1)
  assert.equal(getArenaLocationPower(scout[0].scoreSnapshot![0], 'a'), 0, 'the score holds while the card enters')
  assert.equal(scout[1].scoreSnapshot, undefined)
  assert.equal(scout[1].scores.find(score => score.playerId === 'a' && score.locationIndex === 0)!.delta, 3, 'the displayed gain includes placement and the Forge buff exactly once')
  assert.equal(scout.reduce((ms, frame) => ms + frame.duration, 0), 1500)
  assert.ok(frames.every(frame => frame.state.phase === 'reveal' && frame.state.turn === 1 && frame.state.winner === undefined))
  assert.ok(frames.every(frame => frame.state.arena!.revealFirstPlayerId === 'a'), 'profile priority stays with the current reveal until all its effects finish')
  assert.equal(frames.some(frame => frame.state.hand!.some(card => card.definitionId === 'mountain_hermit')), false, 'next-turn draw waits for the reveal')
  assert.equal(finishPlayback(before, after).display.turn, 2)
  assert.equal(finishPlayback(before, after).display.arena!.revealFirstPlayerId, 'b', 'the next player highlight switches only when the next turn opens')
})

test('spells, drain, movement and growth are all included in the final turn', () => {
  const { before, after } = createArenaEffectsDemo()
  const reveal = after.arena!.lastReveal!
  assert.equal(after.phase, 'game_over')
  assert.deepEqual(reveal.events.map(event => event.kind === 'card' ? event.card!.definitionId : event.kind),
    ['banshee_queen', 'temper', 'phase_walk', 'arcane_echo', 'growth', 'growth'])
  for (const event of reveal.events.filter(event => event.card?.type === 'spell')) {
    assert.ok(event.arrival)
    assert.equal(event.locations.flatMap(location => Object.values(location.cards).flat()).some(entry => entry.card.instanceId === event.card!.instanceId), false)
  }
  const frames = buildArenaPlayback(before, after)
  assert.ok(frames.find(frame => frame.event?.card?.definitionId === 'banshee_queen' && frame.phase === 'effect')!.changes.some(change => change.delta < 0))
  assert.ok(frames.find(frame => frame.event?.card?.definitionId === 'phase_walk' && frame.phase === 'effect')!.changes.some(change => change.from === 1 && change.to === 0))
  assert.deepEqual(frames.at(-1)!.state.arena!.locations, after.arena!.locations)
  assert.deepEqual(frames.slice(-5).map(frame => frame.phase), ['settle', 'score-focus', 'score-focus', 'score-focus', 'score-summary'])
})

test('the result stays hidden for every reveal, score spotlight and summary, including duplicate updates', () => {
  const { before, after } = createArenaEffectsDemo()
  let playback = syncArenaPlayback(createArenaPlayback(before), after)
  let elapsed = 0
  while (playback.frames.length) {
    const frame = playback.frames[playback.index]
    assert.equal(playback.display.phase, 'reveal')
    assert.equal(playback.display.winner, undefined)
    const duplicate = syncArenaPlayback(playback, structuredClone(after))
    assert.equal(duplicate.index, playback.index)
    assert.equal(duplicate.frames, playback.frames, 'a duplicate update must not restart the animation')
    assert.equal(advanceArenaPlayback(duplicate, 'stale-timer'), duplicate)
    elapsed += frame.duration
    playback = advanceArenaPlayback(duplicate, frame.id)
  }
  assert.equal(elapsed, 15500)
  assert.equal(playback.display.phase, 'game_over')
  assert.equal(playback.display.winner, after.winner)
  assert.deepEqual(playback.display.arena!.locations, after.arena!.locations)
  assert.equal(syncArenaPlayback(playback, structuredClone(after)).frames.length, 0, 'completed reveals must not replay')
})

test('a newer lock-in during playback is retained when the sequence ends', () => {
  const engine = game()
  const before = engine.getStateFor('a')
  commit(engine, 'a', [['village_scout', 0]]); commit(engine, 'b')
  let playback = syncArenaPlayback(createArenaPlayback(before), engine.getStateFor('a'))
  commit(engine, 'b')
  playback = syncArenaPlayback(playback, engine.getStateFor('a'))
  while (playback.frames.length) playback = advanceArenaPlayback(playback, playback.frames[playback.index].id)
  assert.equal(playback.display.turn, 2)
  assert.equal(playback.display.arena!.lockedIn.b, true)
  assert.equal(playback.display.arena!.lockedIn.a, false)
})

test('a new match cancels pending reveals; surrender and empty turns cannot get stuck', () => {
  const { before, after } = createArenaEffectsDemo()
  const running = syncArenaPlayback(createArenaPlayback(before), after)
  const engine = game()
  const fresh = engine.getStateFor('a')
  const reset = syncArenaPlayback(running, fresh)
  assert.equal(reset.frames.length, 1)
  assert.equal(reset.frames[0].nextTurn?.turn, 1)
  assert.equal(reset.display.roomId, fresh.roomId)
  engine.processAction({ type: 'surrender', playerId: 'a', timestamp: 0 })
  assert.equal(syncArenaPlayback(advanceArenaPlayback(reset, reset.frames[0].id), engine.getStateFor('a')).display.phase, 'game_over')
  const empty = game()
  while (empty.getStateFor('a').turn < 6) { commit(empty, 'a'); commit(empty, 'b') }
  const lastTurn = empty.getStateFor('a')
  commit(empty, 'a'); commit(empty, 'b')
  const final = syncArenaPlayback(createArenaPlayback(lastTurn), empty.getStateFor('a'))
  assert.equal(final.frames.length, 4)
  assert.equal(final.display.phase, 'reveal')
  assert.equal(finishPlayback(lastTurn, empty.getStateFor('a')).display.phase, 'game_over')
})

test('victory, defeat and draw focus all three final score pairs before exposing the outcome', () => {
  for (const outcome of ['victory', 'defeat', 'draw'] as const) {
    const { before, after } = createArenaEndingDemo(outcome)
    assert.equal(after.winner, outcome === 'victory' ? 'you' : outcome === 'defeat' ? 'bot' : undefined)
    const frames = buildArenaPlayback(before, after)
    assert.deepEqual(frames.map(frame => frame.phase), ['score-focus', 'score-focus', 'score-focus', 'score-summary'])
    assert.deepEqual(frames.slice(0, 3).map(frame => frame.focusIndex), [0, 1, 2])
    for (const frame of frames) {
      assert.equal(frame.state.phase, 'reveal')
      assert.equal(frame.state.winner, undefined)
      assert.deepEqual(frame.state.arena!.locations, after.arena!.locations)
      assert.equal(arenaFrameDuration(frame, true), frame.duration, 'reduced motion retains the complete score reading time')
    }
    assert.deepEqual(finishPlayback(before, after).display, after)
  }
})

test('a turn-six retreat does not replay an old turn as a scored finish', () => {
  const engine = game()
  while (engine.getStateFor('a').turn < 6) { commit(engine, 'a'); commit(engine, 'b') }
  const before = engine.getStateFor('a')
  engine.processAction({ type: 'surrender', playerId: 'a', timestamp: 0 })
  const playback = syncArenaPlayback(createArenaPlayback(before), engine.getStateFor('a'))
  assert.equal(playback.frames.length, 0)
  assert.equal(playback.display.phase, 'game_over')
})

test('draw effects expose the number drawn without leaking the drawn cards', () => {
  const room: Room = { id: crypto.randomUUID(), name: 'Draw preview', hostId: 'a', status: 'in_progress', maxPlayers: 2, isPrivate: true, createdAt: 0,
    players: ['a', 'b'].map(id => ({ id, displayName: id, isReady: true, deckDefinitionIds: ['mana_surge', ...ARENA_STARTER_DECK.slice(0, 11)] })) }
  const engine = new ArenaEngine(room, { shuffle: false })
  const beforeIds = new Set(engine.getStateFor('a').hand!.map(card => card.instanceId))
  commit(engine, 'a', [['mana_surge', 0]]); commit(engine, 'b')
  const publicReveal = engine.getStateFor('b').arena!.lastReveal!
  const draw = publicReveal.events.find(event => event.card?.definitionId === 'mana_surge')!
  assert.equal(draw.drawCount, 2)
  assert.equal(draw.abilityTriggered, true)
  for (const card of engine.getStateFor('a').hand!.filter(card => !beforeIds.has(card.instanceId))) {
    assert.equal(JSON.stringify(publicReveal).includes(card.instanceId), false)
  }
})

test('ability draws arrive during their own effect; the next-turn draw and opponent identities stay private', () => {
  const room: Room = { id: crypto.randomUUID(), name: 'Draw timing', hostId: 'a', status: 'in_progress', maxPlayers: 2, isPrivate: true, createdAt: 0,
    players: ['a', 'b'].map(id => ({ id, displayName: id, isReady: true,
      deckDefinitionIds: ['mana_surge', ...ARENA_STARTER_DECK.filter(id => id !== 'mana_surge').slice(0, 11)] })) }
  const engine = new ArenaEngine(room, { shuffle: false })
  const before = engine.getStateFor('a')
  commit(engine, 'a', [['mana_surge', 0]])
  commit(engine, 'b', [['mana_surge', 0]])
  const after = engine.getStateFor('a')
  const additions = after.hand!.filter(card => !before.hand!.some(old => old.instanceId === card.instanceId))
  assert.equal(additions.length, 3)
  const frames = buildArenaPlayback(before, after)
  const ownArrival = frames.find(frame => frame.phase === 'arrive' && frame.event?.playerId === 'a')!
  const ownEffect = frames.find(frame => frame.phase === 'effect' && frame.event?.playerId === 'a')!
  assert.ok(additions.every(card => !ownArrival.state.hand!.some(entry => entry.instanceId === card.instanceId)))
  assert.ok(additions.slice(0, 2).every(card => ownEffect.state.hand!.some(entry => entry.instanceId === card.instanceId)))
  assert.equal(DRAW_STAGGER, 250)
  assert.ok(ownEffect.duration >= arenaDrawDuration(2) + 100, 'both staggered draw flights finish before the next event')
  const enemyFrames = buildArenaPlayback({ ...before, viewerPlayerId: 'b', hand: [] }, engine.getStateFor('b'))
  assert.deepEqual(enemyFrames.map(frame => frame.duration), frames.map(frame => frame.duration), 'private hand identities do not change either player’s pacing')
  assert.equal(ownEffect.state.players.a.deckCount, before.players.a.deckCount - 2)
  assert.ok(frames.every(frame => !frame.state.hand!.some(card => card.instanceId === additions[2].instanceId)), 'normal draw waits until next turn')
  const enemyHand = engine.getStateFor('b').hand!
  assert.ok(enemyHand.every(card => !JSON.stringify(frames).includes(card.instanceId)))
  assert.deepEqual(finishPlayback(before, after).display.hand, after.hand)
})

test('turn announcement follows reveals for 2.5 seconds, defers the draw, and does not repeat', () => {
  const engine = game()
  const before = engine.getStateFor('a')
  commit(engine, 'a'); commit(engine, 'b')
  const after = engine.getStateFor('a')
  const frames = buildArenaPlayback(before, after)
  const intro = frames.at(-1)!
  assert.equal(intro.phase, 'turn-intro')
  assert.deepEqual(intro.nextTurn, { turn: 2, totalTurns: 6, energy: 2 })
  assert.equal(arenaFrameDuration(intro, false), 2500)
  assert.equal(arenaFrameDuration(intro, true), 2500)
  assert.deepEqual(intro.state.hand, before.hand)
  assert.equal(intro.state.phase, 'reveal')
  const done = finishPlayback(before, after)
  assert.deepEqual(done.display.hand, after.hand)
  assert.equal(syncArenaPlayback(done, structuredClone(after)).frames.length, 0)
  // Later empty turns still announce even when there are no reveal events.
  while (engine.getStateFor('a').turn < 5) { commit(engine, 'a'); commit(engine, 'b') }
  const fifth = engine.getStateFor('a')
  commit(engine, 'a'); commit(engine, 'b')
  const finalIntro = buildArenaPlayback(fifth, engine.getStateFor('a'))
  assert.deepEqual(finalIntro.map(frame => frame.phase), ['turn-intro'])
  assert.equal(finalIntro[0].nextTurn!.turn, 6)
})

test('turn one announces before the opening deal and duplicate updates do not restart it', () => {
  const initial = game().getStateFor('a')
  const playback = createArenaPlayback(initial)
  assert.equal(playback.frames[0].nextTurn?.turn, 1)
  assert.equal(playback.frames[0].duration, 2500)
  assert.deepEqual(playback.display.hand, [])
  const duplicate = syncArenaPlayback(playback, structuredClone(initial))
  assert.equal(duplicate.frames, playback.frames)
  const dealt = advanceArenaPlayback(duplicate, playback.frames[0].id)
  assert.deepEqual(dealt.display.hand, initial.hand)
  assert.equal(dealt.display.phase, 'planning')
  assert.equal(dealt.frames.length, 0)
  assert.equal(syncArenaPlayback(dealt, structuredClone(initial)).frames.length, 0)
})

test('ordinary cards, busy effects and hidden-hand effects get distinct readable budgets', () => {
  const { before, after } = createArenaEffectsDemo()
  const frames = buildArenaPlayback(before, after)
  const cardTime = (id: string) => frames.filter(frame => frame.event?.card?.definitionId === id).reduce((ms, frame) => ms + frame.duration, 0)
  assert.equal(cardTime('temper'), 1500)
  assert.equal(cardTime('banshee_queen'), 2000)
  assert.equal(cardTime('phase_walk'), 2500)
  const transmute = createArenaArchetypeDemo('transmutation')
  const handFrames = buildArenaPlayback(transmute.before, transmute.after).filter(frame => frame.event?.card?.definitionId === 'mercury_scholar')
  assert.equal(handFrames.reduce((ms, frame) => ms + frame.duration, 0), 2000, 'hand effects deserve time even without a public board target')
  const event = handFrames[1].event!
  assert.equal(arenaEffectDuration({ ...event, abilityTriggered: false }, []), 1000, 'failed conditions do not add a complex-effect pause')
  assert.ok(arenaEffectDuration({ ...event, drawCount: 7 }, []) >= arenaDrawDuration(7) + 100, 'large deals finish before playback advances')
})

test('reduced motion preserves every reveal and result gate at the same pace', () => {
  const { before, after } = createArenaEffectsDemo()
  let normal = syncArenaPlayback(createArenaPlayback(before), after)
  let reduced = syncArenaPlayback(createArenaPlayback(before), after)
  while (normal.frames.length) {
    const frame = normal.frames[normal.index], reducedFrame = reduced.frames[reduced.index]
    assert.equal(arenaFrameDuration(frame, false), arenaFrameDuration(reducedFrame, true))
    assert.equal(reduced.display.winner, undefined)
    assert.equal(reduced.display.phase, 'reveal')
    normal = advanceArenaPlayback(normal, frame.id)
    reduced = advanceArenaPlayback(reduced, reducedFrame.id)
  }
  assert.deepEqual(reduced.display, normal.display)
})
