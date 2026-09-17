import { useEffect, useReducer, useState } from 'react'
import type { GameState } from '@tcg/shared'
import { advanceArenaPlayback, arenaFrameDuration, createArenaPlayback, syncArenaPlayback } from '../lib/arenaPlayback.ts'
import type { ArenaPlaybackState } from '../lib/arenaPlayback.ts'

type Action = { type: 'sync'; state: GameState } | { type: 'advance'; frameId: string }
function reduce(state: ArenaPlaybackState, action: Action) {
  return action.type === 'sync' ? syncArenaPlayback(state, action.state) : advanceArenaPlayback(state, action.frameId)
}
export function useArenaPlayback(incoming: GameState) {
  const [playback, dispatch] = useReducer(reduce, incoming, createArenaPlayback)
  const [reducedMotion, setReducedMotion] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReducedMotion(query.matches)
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])
  useEffect(() => { dispatch({ type: 'sync', state: incoming }) }, [incoming])
  const active = playback.frames[playback.index]
  const duration = active ? arenaFrameDuration(active, reducedMotion) : 0
  useEffect(() => {
    if (!active) return
    const timer = window.setTimeout(() => dispatch({ type: 'advance', frameId: active.id }), duration)
    return () => window.clearTimeout(timer)
  }, [active, duration])
  // Gate the first render too: a final server update must never flash the result dialog.
  const visible = incoming === playback.latest ? playback : syncArenaPlayback(playback, incoming)
  return { gameState: visible.display, frame: visible.frames[visible.index], isRevealing: visible.frames.length > 0, reducedMotion }
}
