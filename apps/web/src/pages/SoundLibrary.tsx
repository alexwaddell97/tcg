import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { loadSoundFiles, SOUND_LABELS, soundFileUrl } from '../lib/soundEffects.ts'
import type { SoundEffect, SoundFileMap } from '../lib/soundEffects.ts'
import './SoundLibrary.css'

/** Local-development asset audition page. Native controls don't affect saved audio settings. */
export default function SoundLibrary() {
  const [files, setFiles] = useState<SoundFileMap | null>(null)
  const [warning, setWarning] = useState<string>()
  const [failed, setFailed] = useState<Set<string>>(new Set())
  const active = useRef<HTMLAudioElement | null>(null)
  const base = `${import.meta.env.BASE_URL}sounds/`
  useEffect(() => {
    const controller = new AbortController()
    void loadSoundFiles(base, controller.signal).then(result => {
      if (controller.signal.aborted) return
      setFiles(result.files); setWarning(result.warning)
    })
    return () => { controller.abort(); active.current?.pause() }
  }, [base])
  return <main className="sound-library">
    <header><div><small>DEVELOPMENT</small><h1>Sound library</h1></div><Link to="/">Main menu</Link></header>
    <section className="sound-library-guide">
      <h2>Replace a sound</h2>
      <ol>
        <li>Put your recording in <code>apps/web/public/SE</code> or <code>apps/web/public/sounds</code>.</li>
        <li>Replace the file below, or change its filename in <a href={`${base}manifest.json`} target="_blank" rel="noreferrer">manifest.json</a>. For example: <code>"draw": "/SE/paper-slide.mp3"</code>.</li>
        <li>Refresh the game and this page. No application code changes needed.</li>
      </ol>
      <p>WAV and MP3 recommended. Use short, tightly trimmed clips. Recordings play at their original pitch.</p>
      <p>Files under <code>recorded/</code> are trimmed copies of your SE recordings. The original MP3s are unchanged.</p>
      <a href={`${base}README.md`} target="_blank" rel="noreferrer">Replacement guide ↗</a>
    </section>
    {warning && <p className="sound-library-error" role="alert">{warning} Showing default filenames.</p>}
    {!files && <p role="status">Loading sounds…</p>}
    <section className="sound-library-list" aria-label="Sound previews">
      {files && (Object.keys(SOUND_LABELS) as SoundEffect[]).map(key => <article key={key}>
        <div><h2>{SOUND_LABELS[key].name}</h2><p>{SOUND_LABELS[key].trigger}</p><code>{key}</code><span> · {SOUND_LABELS[key].length}</span></div>
        <div><a href={soundFileUrl(base, files[key])} download>{files[key]}</a>
          <audio controls preload="metadata" aria-label={`Preview ${SOUND_LABELS[key].name}`} src={soundFileUrl(base, files[key])}
            ref={node => { if (node) node.volume = .55 }}
            onPlay={event => { if (active.current !== event.currentTarget) active.current?.pause(); active.current = event.currentTarget }}
            onError={() => setFailed(current => new Set([...current, key]))}/>
          {failed.has(key) && <p className="sound-library-error">Unable to load this file. Check its name and audio format.</p>}
        </div>
      </article>)}
    </section>
  </main>
}
