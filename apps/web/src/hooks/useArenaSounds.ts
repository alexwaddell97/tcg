import { useEffect, useRef } from 'react'
import type { GameState } from '@tcg/shared'
import type { ArenaPlaybackFrame } from '../lib/arenaPlayback.ts'
import { arenaSoundCue, isArenaFinale } from '../lib/arenaSounds.ts'
import { SoundEffectScope } from '../lib/SoundEffectScope.ts'
import { isResultSound } from '../lib/soundEffects.ts'
import { holdBackgroundMusic } from '../lib/musicMix.ts'

export function useArenaSounds(state: GameState, frame: ArenaPlaybackFrame | undefined, playerId: string) {
  const finale = isArenaFinale(state, frame)
  const releaseMusic = useRef<(() => void) | undefined>(undefined)
  const sounds = useRef(new SoundEffectScope())
  useEffect(() => () => sounds.current.stopAll(), [state.roomId])
  useEffect(() => {
    if (!finale) return
    const release = holdBackgroundMusic()
    releaseMusic.current = release
    return () => { release(); if (releaseMusic.current === release) releaseMusic.current = undefined }
  }, [finale, state.roomId])
  const cue = arenaSoundCue(state, frame, playerId)
  const id = cue?.id, sound = cue?.sound, gain = cue?.gain
  useEffect(() => {
    if (id && sound) sounds.current.play(sound, { gain, onFinish: isResultSound(sound) ? releaseMusic.current : undefined })
  }, [id, sound, gain])
}
