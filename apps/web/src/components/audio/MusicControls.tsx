import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { SpeakerHigh, SpeakerSlash, SkipForward, Play, X } from '@phosphor-icons/react'
import { MUSIC_TRACKS } from '../../lib/music.ts'
import { useMusicStore } from '../../stores/useMusicStore.ts'
import { useSoundEffectsStore } from '../../stores/useSoundEffectsStore.ts'
import { playSoundEffect } from '../../lib/gameAudio.ts'
import './MusicControls.css'

export default function MusicControls({ compact = false }: { compact?: boolean }) {
  const [open, setOpen] = useState(false)
  const dialog = useRef<HTMLDialogElement>(null)
  const id = useId()
  const { volume, muted, status, trackIndex, ducked, setVolume, setMuted, nextTrack, play } = useMusicStore()
  const effects = useSoundEffectsStore()
  const silent = muted || volume === 0
  const effectsSilent = effects.muted || effects.volume === 0
  const track = MUSIC_TRACKS[trackIndex]
  const Icon = silent && effectsSilent ? SpeakerSlash : SpeakerHigh
  const MusicIcon = silent ? SpeakerSlash : SpeakerHigh
  const EffectsIcon = effectsSilent ? SpeakerSlash : SpeakerHigh
  const testSound = useRef<(() => void) | undefined>(undefined)
  useEffect(() => () => testSound.current?.(), [])
  useEffect(() => {
    if (open) dialog.current?.showModal()
    else dialog.current?.close()
  }, [open])

  return <>
    <button type="button" className={`music-trigger ${compact ? 'is-compact' : ''}`} aria-label="Audio settings" title="Audio settings" onClick={() => setOpen(true)}>
      <Icon size={18} weight="duotone"/>{!compact && <span>Audio</span>}
    </button>
    {createPortal(<dialog ref={dialog} className="music-dialog" aria-labelledby={`${id}-title`} onClose={() => setOpen(false)}
      onClick={event => { if (event.target === event.currentTarget) setOpen(false) }} onKeyDown={event => event.stopPropagation()}>
      <div className="music-panel">
        <header><h2 id={`${id}-title`}>Audio</h2><button type="button" aria-label="Close audio settings" onClick={() => setOpen(false)}><X size={19}/></button></header>
        <section className="audio-section" aria-labelledby={`${id}-effects-title`}>
          <h3 id={`${id}-effects-title`}>Sound effects</h3>
          <div className="music-volume-label"><label htmlFor={`${id}-effects-volume`}>Effects volume</label><output htmlFor={`${id}-effects-volume`}>{Math.round(effects.volume * 100)}%</output></div>
          <input id={`${id}-effects-volume`} type="range" min="0" max="100" step="1" value={Math.round(effects.volume * 100)} onChange={event => effects.setVolume(Number(event.target.value) / 100)}/>
          <div className="music-actions">
            <button type="button" aria-label={effectsSilent ? 'Unmute sound effects' : 'Mute sound effects'} onClick={() => effectsSilent ? effects.unmute() : effects.setMuted(true)}><EffectsIcon size={17}/>{effectsSilent ? 'Unmute' : 'Mute'}</button>
            <button type="button" data-ui-sound="off" disabled={effectsSilent} onClick={() => { testSound.current?.(); testSound.current = playSoundEffect('score') }}><Play size={17}/>Test sound</button>
          </div>
          {import.meta.env.DEV && <a className="audio-library-link" href={`${import.meta.env.BASE_URL}sound-library`} target="_blank" rel="noreferrer">Sound library ↗</a>}
        </section>
        <section className="audio-section" aria-labelledby={`${id}-music-title`}>
          <h3 id={`${id}-music-title`}>Music</h3>
          <div className="music-now-playing"><small>{silent ? 'Muted' : ducked ? 'Match finale' : status === 'playing' ? 'Now playing' : status === 'error' ? 'Music unavailable' : status === 'loading' ? 'Loading…' : status === 'blocked' ? 'Press play to start' : 'Background playlist'}</small><p>{track.title}</p></div>
          <div className="music-volume-label"><label htmlFor={`${id}-volume`}>Music volume</label><output htmlFor={`${id}-volume`}>{Math.round(volume * 100)}%</output></div>
          <input id={`${id}-volume`} type="range" min="0" max="100" step="1" value={Math.round(volume * 100)} onChange={event => setVolume(Number(event.target.value) / 100)}/>
          <div className="music-actions">
            <button type="button" aria-label={silent ? 'Unmute music' : 'Mute music'} onClick={() => silent ? play() : setMuted(true)}><MusicIcon size={17}/>{silent ? 'Unmute' : 'Mute'}</button>
            {!silent && !ducked && status !== 'playing' && status !== 'loading' && <button type="button" onClick={play}><Play size={17}/>Play</button>}
            <button type="button" onClick={nextTrack}><SkipForward size={17}/>Next track</button>
          </div>
        </section>
      </div>
    </dialog>, document.body)}
  </>
}
