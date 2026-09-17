import { NativeMusicElement, usesNativeAudio } from '../../lib/nativeAudio.ts'
import { observeAppVisibility } from '../../lib/appVisibility.ts'
import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { MUSIC_TRACKS } from '../../lib/music.ts'
import { MusicPlayer } from '../../lib/MusicPlayer.ts'
import { useMusicStore } from '../../stores/useMusicStore.ts'

export default function BackgroundMusic({ enabled = true }: { enabled?: boolean }) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const playerRef = useRef<MusicPlayer | null>(null)
  const visibleRef = useRef(!document.hidden)
  const auditioning = useLocation().pathname === '/sound-library'
  const enabledRef = useRef(enabled)
  enabledRef.current = enabled
  const auditionRef = useRef(auditioning)
  auditionRef.current = auditioning
  useEffect(() => {
    const player = playerRef.current
    player?.setActive(enabled && visibleRef.current && !auditioning)
    if (enabled) player?.unlock()
  }, [auditioning, enabled])
  useEffect(() => {
    if (!audioRef.current) return
    const nativeElement = usesNativeAudio() ? new NativeMusicElement() : undefined
    const player = new MusicPlayer(nativeElement ?? audioRef.current,
      MUSIC_TRACKS.map(track => `${import.meta.env.BASE_URL}music/${track.file}`),
      useMusicStore.getState(), snapshot => useMusicStore.setState(snapshot))
    playerRef.current = player
    player.setMixLevel(useMusicStore.getState().ducked ? 0 : 1, 0)
    const visibility = (visible: boolean) => { visibleRef.current = visible; player.setActive(enabledRef.current && visible && !auditionRef.current) }
    const unlock = () => player.unlock()
    const key = (event: KeyboardEvent) => { if (!event.repeat && !event.metaKey && !event.ctrlKey && !event.altKey) unlock() }
    const unsubscribe = useMusicStore.subscribe((state, previous) => {
      if (state.volume !== previous.volume || state.muted !== previous.muted) player.setPreferences(state)
      if (state.nextRequest !== previous.nextRequest) player.next()
      if (state.playRequest !== previous.playRequest) player.resume()
      if (state.ducked !== previous.ducked) player.setMixLevel(state.ducked ? 0 : 1, state.ducked ? 1500 : 1800)
    })
    const stopObservingVisibility = observeAppVisibility(visibility)
    document.addEventListener('pointerdown', unlock, true)
    document.addEventListener('keydown', key, true)
    return () => {
      stopObservingVisibility()
      unsubscribe()
      document.removeEventListener('pointerdown', unlock, true)
      document.removeEventListener('keydown', key, true)
      player.destroy()
      nativeElement?.destroy()
      playerRef.current = null
    }
  }, [])
  return <audio ref={audioRef} data-background-music hidden aria-hidden="true"/>
}
