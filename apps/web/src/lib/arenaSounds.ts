import type { GameState } from '@tcg/shared'
import type { ArenaPlaybackFrame } from './arenaPlayback.ts'
import { getArenaEffectFamily } from './arenaPresentation.ts'
import type { SoundEffect } from './soundEffects.ts'

export interface ArenaSoundCue { id: string; sound: SoundEffect; gain?: number }

export function isArenaFinale(state: GameState, frame: ArenaPlaybackFrame | undefined) {
  return state.phase === 'game_over' || frame?.phase === 'score-focus' || frame?.phase === 'score-summary'
}

/** Read the displayed animation, never the server's already-completed match. */
export function arenaSoundCue(state: GameState, frame: ArenaPlaybackFrame | undefined, playerId: string): ArenaSoundCue | undefined {
  if (!frame) return state.phase === 'game_over'
    ? { id: `${state.roomId}:result`, sound: state.winner === playerId ? 'victory' : state.winner ? 'defeat' : 'tie' }
    : undefined
  const id = `${state.roomId}:${frame.id}`
  if (frame.phase === 'score-focus') return { id, sound: 'score', gain: [.78, .9, 1][frame.focusIndex ?? 0] }
  if (frame.phase === 'turn-intro') return { id, sound: 'turn' }
  if (frame.phase === 'arrive') return { id, sound: 'reveal' }
  if (frame.phase !== 'effect' || !frame.event) return undefined
  const event = frame.event
  if (event.kind === 'location') return { id, sound: 'arenaReveal' }
  if (!event.abilityTriggered && !frame.changes.length) return undefined
  const family = getArenaEffectFamily(event)
  const sound: SoundEffect = family === 'affliction' || family === 'sabotage' ? 'curse'
    : family === 'transmutation' || family === 'conduits' ? 'transmute'
      : family === 'arcane' || event.card?.type === 'spell' ? 'spell' : 'power'
  return { id, sound }
}
