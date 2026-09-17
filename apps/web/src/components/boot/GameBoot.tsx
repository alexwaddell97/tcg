import { useEffect, useLayoutEffect, useRef, useState, type ComponentType } from 'react'
import './GameBoot.css'
import { useLocation } from 'react-router-dom'
import BackgroundMusic from '../audio/BackgroundMusic.tsx'
import { useMusicStore } from '../../stores/useMusicStore.ts'
import { warmArtwork } from '../../lib/artworkWarmup.ts'

const base = import.meta.env.BASE_URL
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

export default function GameBoot() {
  const location = useLocation()
  const [isHome] = useState(() => location.pathname === '/')
  const [phase, setPhase] = useState<'studio' | 'studio-out' | 'loading' | 'leaving' | 'done'>('studio')
  const [progress, setProgress] = useState(0)
  const [Game, setGame] = useState<ComponentType | null>(null)
  const [error, setError] = useState(false)
  const loadingLogo = useRef<HTMLImageElement>(null)
  useLayoutEffect(() => {
    if (!Game || phase === 'done') return
    // Follow the real menu layout, including font settling and viewport changes.
    // Keeping the menu mounted underneath also avoids a second layout at handoff.
    let frame = 0
    const align = () => {
      const homeLogo = document.querySelector<HTMLImageElement>('.ae-home-logo')
      const logo = loadingLogo.current
      if (homeLogo && logo) {
        const { x, y, width, height } = homeLogo.getBoundingClientRect()
        Object.assign(logo.style, { left: `${x}px`, top: `${y}px`, width: `${width}px`, height: `${height}px`, maxWidth: 'none', transform: 'none', filter: getComputedStyle(homeLogo).filter })
      }
      frame = requestAnimationFrame(align)
    }
    align()
    return () => cancelAnimationFrame(frame)
  }, [Game, phase])
  const musicBlocked = useMusicStore(state => state.status === 'blocked')
  useEffect(() => {
    let active = true
    const fractions = [0, 0, 0]
    const report = (index: number, value: number) => {
      fractions[index] = value
      if (active) setProgress(Math.round(fractions[0] * 20 + fractions[1] * 70 + fractions[2] * 10))
    }
    // Mount beneath the studio slate so the loading crest can use the final menu bounds.
    const game = import('../../App.tsx').then(module => {
      if (active && isHome) setGame(() => module.default)
      return module.default
    }).catch(() => null)
    void (async () => {
      await delay(1700)
      if (!active) return
      setPhase('studio-out')
      await delay(850)
      await game
      await Promise.race([document.fonts.ready, delay(6000)])
      await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))
      if (!active) return
      setPhase('loading')
      // Let the loading screen finish fading in before starting its measured work.
      // Otherwise a warm cache can complete the entire pass behind the studio slate.
      await delay(1000)
      if (!active) return
      report(0, 1)
      const images = import('../../lib/startupArtwork.ts').then(({ startupArtwork }) =>
        warmArtwork(startupArtwork(), fraction => report(1, fraction)))
      const ready = Promise.all([
        game,
        images.catch(() => report(1, 1)),
        Promise.race([document.fonts.ready, delay(6000)]).then(() => report(2, 1)),
      ]).catch(() => null)
      const [result] = await Promise.all([ready, delay(1300)])
      if (!active) return
      if (!result || !result[0]) { setError(true); return }
      if (!isHome) setGame(() => result[0])
      // Finish mounting and painting under the fully opaque loading screen.
      await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))
      await delay(400)
      if (!active) return
      setPhase('leaving')
      await delay(950)
      if (active) setPhase('done')
    })()
    return () => { active = false }
  }, [isHome])
  return <>
    <BackgroundMusic enabled={phase !== 'studio' && phase !== 'studio-out'} />
    {Game && <div style={{ display: 'contents' }} inert={phase !== 'done'} aria-hidden={phase !== 'done'}><Game /></div>}
    {phase !== 'done' && <section className={`game-boot is-${phase}`} aria-label="Starting Arena Eternal" aria-busy={!error}>
      <div className="game-boot-studio" aria-hidden={phase !== 'studio'}>
        <img src={`${base}ui/studio/midas-games-v2.png`} width="320" height="320" alt="Midas Games" />
      </div>
      <div className="game-boot-loading" aria-hidden={phase === 'studio' || phase === 'studio-out'}>
        <div className="game-boot-art" />
        <div className="game-boot-shade" />
        <img ref={loadingLogo} className="game-boot-logo" src={`${base}ui/arena-eternal-logo.png`} alt="Arena Eternal" />
        <div className="game-boot-footer">
          {musicBlocked && phase === 'loading' && <button className="game-boot-music" onClick={() => useMusicStore.setState(state => ({ playRequest: state.playRequest + 1 }))}>Enable music</button>}
          {error ? <><p role="alert">The game could not start.</p><button onClick={() => window.location.reload()}>Try again</button></> : <>
            <div className="game-boot-label"><span>{progress === 100 ? 'Ready' : 'Preparing the arena'}</span><span>{progress}%</span></div>
            <div className="game-boot-track" role="progressbar" aria-label="Loading game" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}><div style={{ width: `${progress}%` }} /></div>
          </>}
        </div>
      </div>
    </section>}
  </>
}
