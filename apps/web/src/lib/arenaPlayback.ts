import { getArenaCardPower, getArenaLocationPower } from '@tcg/shared'
import type { ArenaIndex, ArenaLocation, ArenaRevealEvent, ArenaSlotIndex, GameState } from '@tcg/shared'
import { arenaDrawDuration } from './arenaDraw.ts'
import { getArenaControlChanges } from './arenaPresentation.ts'
import type { ArenaControlChange } from './arenaPresentation.ts'

export interface CardPowerChange {
  cardId: string
  delta: number
  from: ArenaIndex
  to: ArenaIndex
  fromOwner: string
  toOwner: string
  fromSlot?: ArenaSlotIndex
  toSlot?: ArenaSlotIndex
  spawned?: boolean
}
export interface ArenaPlaybackFrame {
  id: string
  phase: 'arrive' | 'effect' | 'settle' | 'score-focus' | 'score-summary' | 'turn-intro'
  duration: number
  state: GameState
  /** Hold totals during the card entrance, then show its complete score impact. */
  scoreSnapshot?: ArenaLocation[]
  event?: ArenaRevealEvent
  nextTurn?: { turn: number; totalTurns: number; energy: number }
  focusIndex?: ArenaIndex
  changes: CardPowerChange[]
  scores: { locationIndex: ArenaIndex; playerId: string; delta: number }[]
  controlChanges?: ArenaControlChange[]
}

export const ARENA_PLAYBACK_TIMING = {
  arrival: 500, ordinary: 1500, complex: 2000, wide: 2500,
  settle: 400, score: 1000, summary: 1100, turnIntro: 2500,
} as const

/** Pace observed effects, not printed abilities whose conditions may have failed. */
export function arenaEffectDuration(event: ArenaRevealEvent, changes: CardPowerChange[]) {
  const timing = ARENA_PLAYBACK_TIMING
  const effects = event.abilityTriggered ? [...new Set(event.effects ?? [])] : []
  const affectedLocations = new Set(changes.flatMap(change => [change.from, change.to]))
  const movement = changes.some(change => change.spawned || change.from !== change.to || change.fromOwner !== change.toOwner || change.fromSlot !== change.toSlot)
  const complex = changes.length > 1 || movement || (event.drawCount ?? 0) > 0 || event.returnToHand
    || effects.some(type => ['transmute_hand', 'transmute_deck', 'transmute_draw', 'copy_power', 'transfer', 'consume', 'equalize', 'echo_power', 'distribute', 'purge', 'dispel', 'salvage'].includes(type))
  const wide = changes.length >= 3 || affectedLocations.size > 1 || effects.length > 1 || (event.drawCount ?? 0) > 2
  const total = wide ? timing.wide : complex || event.kind === 'location' ? timing.complex : timing.ordinary
  const arrival = event.kind === 'card' ? timing.arrival : 0
  // Use public counts so both players receive the same pacing without private identities.
  const drawTime = arenaDrawDuration((event.drawCount ?? 0) + (event.returnToHand ? 1 : 0))
  return Math.max(total - arrival, drawTime ? drawTime + 100 : 0)
}

function powers(locations: ArenaLocation[]) {
  return new Map(locations.flatMap(location => Object.entries(location.cards).flatMap(([owner, cards]) =>
    cards.map(({ card, slotIndex }) => [card.instanceId, { power: getArenaCardPower(location, owner, card), location: location.index, owner, slotIndex }] as const))))
}

/** All powers and destinations come from the engine; playback never reruns abilities. */
export function buildArenaPlayback(before: GameState, after: GameState): ArenaPlaybackFrame[] {
  const reveal = after.arena?.lastReveal
  if (!reveal) return []
  const finalTurn = after.phase === 'game_over' && reveal.turn === after.arena!.totalTurns
  const changingTurn = after.phase !== 'game_over' && after.turn > reveal.turn
  if (!reveal.events.length && !finalTurn && !changingTurn) return []
  const played = new Set(reveal.events.filter(event => event.kind === 'card').map(event => event.card!.instanceId))
  let hand = (before.hand ?? []).filter(card => !played.has(card.instanceId))
  const spent = (before.hand ?? []).filter(card => played.has(card.instanceId)).reduce((total, card) => total + card.cost, 0)
  const base: GameState = { ...before, turn: reveal.turn, phase: 'reveal', winner: undefined, hand,
    arena: { ...before.arena!, energy: Math.max(0, reveal.turn - spent), lockedIn: Object.fromEntries(Object.keys(before.players).map(id => [id, true])), committedPlays: [] } }
  const knownCards = new Set((before.hand ?? []).map(card => card.instanceId))
  const returnedIds = new Set(reveal.events.filter(event => event.returnToHand).map(event => event.card?.instanceId))
  const drawnCards = (after.hand ?? []).filter(card => !knownCards.has(card.instanceId) && !returnedIds.has(card.instanceId))
  const viewer = before.viewerPlayerId
  let players = Object.fromEntries(Object.entries(before.players).map(([id, player]) => [id, { ...player,
    handCount: Math.max(0, player.handCount - reveal.events.filter(event => event.kind === 'card' && event.playerId === id).length),
  }]))
  const stateAt = (locations: ArenaLocation[]): GameState => ({ ...base, hand: [...hand], players, arena: { ...base.arena!, locations } })
  const frames: ArenaPlaybackFrame[] = []
  let previous = reveal.initialLocations
  for (const event of reveal.events) {
    if (event.kind === 'card') frames.push({ id: `${event.id}:arrive`, phase: 'arrive', duration: ARENA_PLAYBACK_TIMING.arrival,
      state: stateAt(event.arrival!), scoreSnapshot: previous, event, changes: [], scores: [] })
    const oldPowers = powers(previous)
    // New units compare against their arrival power; other units include ongoing changes.
    for (const [id, value] of powers(event.arrival ?? previous)) if (!oldPowers.has(id)) oldPowers.set(id, value)
    const changes = [...powers(event.locations)].flatMap<CardPowerChange>(([cardId, value]) => {
      const old = oldPowers.get(cardId)
      if (!old) return [{ cardId, delta: 0, from: value.location, to: value.location, fromOwner: value.owner, toOwner: value.owner, fromSlot: value.slotIndex, toSlot: value.slotIndex, spawned: true }]
      return old && (old.power !== value.power || old.location !== value.location || old.owner !== value.owner || old.slotIndex !== value.slotIndex)
        ? [{ cardId, delta: value.power - old.power, from: old.location, to: value.location, fromOwner: old.owner, toOwner: value.owner, fromSlot: old.slotIndex, toSlot: value.slotIndex }] : []
    })
    const scores = event.locations.flatMap(location => Object.keys(location.cards).flatMap(playerId => {
      const delta = getArenaLocationPower(location, playerId) - getArenaLocationPower(previous[location.index], playerId)
      return delta ? [{ locationIndex: location.index, playerId, delta }] : []
    }))
    // The final private hand is ordered by draw. Release only this viewer's additions
    // at the corresponding public draw event; the ordinary turn draw stays deferred.
    const draws = event.playerId === viewer ? drawnCards.splice(0, event.drawCount ?? 0) : []
    const returned = event.returnToHand && event.playerId === viewer
      ? (after.hand ?? []).filter(card => card.instanceId === event.card?.instanceId) : []
    hand = [...hand, ...draws, ...returned]
    if (event.playerId && event.drawCount && players[event.playerId]) {
      const player = players[event.playerId]
      players = { ...players, [event.playerId]: { ...player, handCount: player.handCount + event.drawCount, deckCount: Math.max(0, player.deckCount - event.drawCount) } }
    }
    if (event.playerId && event.returnToHand && players[event.playerId]) {
      const player = players[event.playerId]
      players = { ...players, [event.playerId]: { ...player, handCount: player.handCount + 1 } }
    }
    frames.push({ id: `${event.id}:effect`, phase: 'effect', duration: arenaEffectDuration(event, changes), state: stateAt(event.locations), event, changes, scores,
      controlChanges: getArenaControlChanges(previous, event.locations) })
    previous = event.locations
  }
  // Let the last impact settle before advancing the turn or exposing a winner.
  if (frames.length) frames.push({ id: `${after.roomId}:${reveal.turn}:settle`, phase: 'settle', duration: ARENA_PLAYBACK_TIMING.settle,
    state: stateAt(previous), changes: [], scores: [] })
  if (finalTurn) {
    const finalState = stateAt(after.arena!.locations)
    for (const location of after.arena!.locations) frames.push({ id: `${after.roomId}:score:${location.index}`,
      phase: 'score-focus', focusIndex: location.index, duration: ARENA_PLAYBACK_TIMING.score, state: finalState, changes: [], scores: [] })
    frames.push({ id: `${after.roomId}:score-summary`, phase: 'score-summary', duration: ARENA_PLAYBACK_TIMING.summary,
      state: finalState, changes: [], scores: [] })
  }
  if (changingTurn) frames.push({ id: `${after.roomId}:turn:${after.turn}`, phase: 'turn-intro', duration: ARENA_PLAYBACK_TIMING.turnIntro,
    state: stateAt(previous), nextTurn: { turn: after.turn, totalTurns: after.arena!.totalTurns, energy: after.arena!.energy }, changes: [], scores: [] })
  return frames
}

export function arenaFrameDuration(frame: ArenaPlaybackFrame, _reducedMotion: boolean) {
  return frame.duration
}

export interface ArenaPlaybackState {
  display: GameState
  latest: GameState
  target: GameState
  seenTurn: number
  frames: ArenaPlaybackFrame[]
  index: number
}
export function createArenaPlayback(state: GameState): ArenaPlaybackState {
  const opening = state.phase === 'planning' && state.turn === 1 && state.arena && !state.arena.lastRevealTurn
  const display: GameState = opening ? { ...state, phase: 'reveal', hand: [] } : state
  const frames: ArenaPlaybackFrame[] = opening ? [{ id: `${state.roomId}:turn:1`, phase: 'turn-intro', duration: ARENA_PLAYBACK_TIMING.turnIntro,
    state: display, nextTurn: { turn: 1, totalTurns: state.arena!.totalTurns, energy: state.arena!.energy }, changes: [], scores: [] }] : []
  return { display, latest: state, target: state, seenTurn: state.arena?.lastRevealTurn ?? 0, frames, index: 0 }
}
export function syncArenaPlayback(current: ArenaPlaybackState, incoming: GameState): ArenaPlaybackState {
  if (incoming.roomId !== current.display.roomId) return createArenaPlayback(incoming)
  if (current.frames.length) return { ...current, latest: incoming }
  const turn = incoming.arena?.lastReveal?.turn ?? 0
  if (turn > current.seenTurn) {
    const frames = buildArenaPlayback(current.display, incoming)
    return { display: frames[0]?.state ?? incoming, latest: incoming, target: incoming, seenTurn: turn, frames, index: 0 }
  }
  return { ...current, display: incoming, latest: incoming, target: incoming }
}
export function advanceArenaPlayback(current: ArenaPlaybackState, frameId: string): ArenaPlaybackState {
  if (current.frames[current.index]?.id !== frameId) return current
  const index = current.index + 1
  if (index < current.frames.length) return { ...current, index, display: current.frames[index].state }
  return syncArenaPlayback({ ...current, display: current.target, frames: [], index: 0 }, current.latest)
}
