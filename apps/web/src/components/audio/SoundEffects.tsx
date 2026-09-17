import { NativeEffectsPlayer, usesNativeAudio } from '../../lib/nativeAudio.ts'
import { observeAppVisibility } from '../../lib/appVisibility.ts'
import { useEffect } from 'react'
import { SoundEffectsPlayer } from '../../lib/SoundEffectsPlayer.ts'
import { attachSoundEffects } from '../../lib/gameAudio.ts'
import { useSoundEffectsStore } from '../../stores/useSoundEffectsStore.ts'
import { loadSoundFiles } from '../../lib/soundEffects.ts'

export default function SoundEffects() {
  useEffect(() => {
    const debug = import.meta.env.DEV && new URLSearchParams(window.location.search).has('audio-debug')
    const player = usesNativeAudio()
      ? new NativeEffectsPlayer(`${import.meta.env.BASE_URL}sounds/`, useSoundEffectsStore.getState())
      : new SoundEffectsPlayer(`${import.meta.env.BASE_URL}sounds/`, useSoundEffectsStore.getState(), {
      onPlay: debug ? sound => console.debug(`[arena-audio] ${sound}`) : undefined,
    })
    const detach = attachSoundEffects(player)
    const manifestRequest = new AbortController()
    void loadSoundFiles(`${import.meta.env.BASE_URL}sounds/`, manifestRequest.signal).then(({ files, warning }) => {
      if (manifestRequest.signal.aborted) return
      player.setSources(files)
      if (warning && import.meta.env.DEV) console.warn(`[arena-audio] ${warning} Using default filenames.`)
    })
    const unsubscribe = useSoundEffectsStore.subscribe(state => player.setPreferences(state))
    const visibility = (visible: boolean) => player.setActive(visible)
    const unlock = () => player.unlock()
    const key = (event: KeyboardEvent) => { if (!event.repeat && !event.metaKey && !event.ctrlKey && !event.altKey) unlock() }
    let pointerStart: { x: number; y: number } | undefined
    let dragged = false
    const pointerDown = (event: PointerEvent) => {
      pointerStart = { x: event.clientX, y: event.clientY }; dragged = false
    }
    const pointerMove = (event: PointerEvent) => {
      if (pointerStart && Math.hypot(event.clientX - pointerStart.x, event.clientY - pointerStart.y) > 7) dragged = true
    }
    const click = (event: MouseEvent) => {
      if (event.button !== 0 || event.detail > 0 && dragged || !(event.target instanceof Element)) return
      const control = event.target.closest('button,a[href],[role="button"],[role="tab"],input[type="checkbox"],input[type="radio"],summary')
      if (!control || control.closest('[inert],[disabled],[aria-disabled="true"],[data-ui-sound="off"]')) return
      player.unlock()
      player.play('ui', { gain: .65 })
    }
    document.addEventListener('pointerdown', pointerDown, true)
    document.addEventListener('pointermove', pointerMove, true)
    document.addEventListener('click', click, true)
    const stopObservingVisibility = observeAppVisibility(visibility)
    document.addEventListener('pointerdown', unlock, true)
    // WebKit may only grant audio activation at the end of a touch gesture.
    document.addEventListener('touchend', unlock, true)
    document.addEventListener('pointerup', unlock, true)
    document.addEventListener('keydown', key, true)
    return () => {
      document.removeEventListener('pointerdown', pointerDown, true)
      document.removeEventListener('pointermove', pointerMove, true)
      document.removeEventListener('click', click, true)
      stopObservingVisibility()
      unsubscribe(); detach(); player.destroy()
      manifestRequest.abort()
      document.removeEventListener('pointerdown', unlock, true)
      document.removeEventListener('touchend', unlock, true)
      document.removeEventListener('pointerup', unlock, true)
      document.removeEventListener('keydown', key, true)
    }
  }, [])
  return null
}
