import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from 'react'
import { useReducedMotion } from 'framer-motion'
import PackArt from './PackArt.tsx'
import { advancePackTear } from '../../lib/packTear.ts'

const INTRO_DURATION_MS = 2400

interface Props {
  packId: string
  onBurst: () => void
  onComplete: () => void
}

export default function PackTear({ packId, onBurst, onComplete }: Props) {
  const [progress, setProgress] = useState(0)
  const [dragging, setDragging] = useState(false)
  const [opening, setOpening] = useState(false)
  const [introComplete, setIntroComplete] = useState(false)
  const reducedMotion = useReducedMotion()
  const arriving = !introComplete && !reducedMotion
  const progressRef = useRef(0)
  const started = useRef(false)
  const gesture = useRef<{ pointerId: number; startX: number; committed: number; width: number } | null>(null)
  const completeRef = useRef(onComplete)
  completeRef.current = onComplete

  useEffect(() => {
    if (reducedMotion) {
      setIntroComplete(true)
      return
    }
    const timer = window.setTimeout(() => setIntroComplete(true), INTRO_DURATION_MS)
    return () => window.clearTimeout(timer)
  }, [reducedMotion])

  // The only transition into opening. Multiple pointer/keyboard events cannot replay it.
  const open = () => {
    if (arriving || started.current) return
    started.current = true
    gesture.current = null
    setDragging(false)
    setProgress(1)
    setOpening(true)
    onBurst()
  }

  useEffect(() => {
    if (!opening) return
    const timer = window.setTimeout(() => completeRef.current(), reducedMotion ? 100 : 1150)
    return () => window.clearTimeout(timer)
  }, [opening, reducedMotion])

  const start = (event: PointerEvent<HTMLDivElement>) => {
    if (arriving || started.current || gesture.current || !event.isPrimary || event.button !== 0) return
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    gesture.current = {
      pointerId: event.pointerId, startX: event.clientX,
      committed: progressRef.current, width: event.currentTarget.getBoundingClientRect().width,
    }
    setDragging(true)
  }
  const move = (event: PointerEvent<HTMLDivElement>) => {
    const active = gesture.current
    if (!active || active.pointerId !== event.pointerId) return
    const next = Math.max(progressRef.current, advancePackTear(active.committed, active.startX, event.clientX, active.width))
    progressRef.current = next
    setProgress(next)
    if (next === 1) open()
  }
  const release = (event: PointerEvent<HTMLDivElement>) => {
    if (gesture.current?.pointerId !== event.pointerId) return
    gesture.current = null
    setDragging(false)
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
  }

  return <div className={`pack-tear ${arriving ? 'is-arriving' : 'is-ready'} ${opening ? 'is-opening' : ''} ${dragging ? 'is-dragging' : ''}`}
    data-phase={arriving ? 'intro' : opening ? 'opening' : 'ready'}
    aria-busy={arriving}
    style={{ '--tear': progress, '--tear-percent': `${progress * 100}%`, '--pack-intro-duration': `${INTRO_DURATION_MS}ms` } as CSSProperties}>
    {arriving && <>
      <span className="sr-only" role="status">Your pack is arriving</span>
      <div className="pack-intro-effects" aria-hidden="true">
        <div className="pack-intro-beam"/>
        <div className="pack-intro-aura"/>
        <div className="pack-intro-impact"/>
        <div className="pack-intro-wave"/>
        {Array.from({ length: 12 }, (_, index) => <i className="pack-intro-mote" key={index} style={{
          '--drift-x': `${(index - 5.5) * 29}px`, '--drift-y': `${-45 - index % 4 * 33}px`,
          '--mote-delay': `${780 + index % 3 * 65}ms`,
        } as CSSProperties}/>)}
      </div>
    </>}
    <div className="pack-tear-shadow" aria-hidden="true"/>
    <div className="pack-arrival">
      <div className="pack-tear-wrapper" aria-hidden="true">
        <div className="pack-tear-body"><PackArt packId={packId}/></div>
        <div className="pack-tear-attached"><PackArt packId={packId}/></div>
        <div className="pack-tear-strip"><div className="pack-tear-loose"><PackArt packId={packId}/></div></div>
        <div className="pack-tear-light"/>
        {opening && <div className="pack-tear-burst">
          <div className="pack-tear-ring"/>
          {Array.from({ length: 18 }, (_, index) => <i key={index} style={{
            '--angle': `${index * 137.5}deg`, '--travel': `${90 + index % 5 * 27}px`, '--delay': `${index % 4 * 30}ms`,
          } as CSSProperties}/>)}
        </div>}
      </div>
      {arriving && <div className="pack-intro-sheen" aria-hidden="true"/>}
    </div>
    {!arriving && !opening && <>
      <div className="pack-tear-target" onPointerDown={start} onPointerMove={move}
        onPointerUp={event => { move(event); release(event) }} onPointerCancel={release} onLostPointerCapture={release}
        aria-hidden="true">
        <span className="pack-tear-guide"/>
        <span className="pack-tear-grip">›</span>
      </div>
      <div className="pack-tear-instructions">
        <p id="pack-tear-hint">{progress > 0 ? 'Keep pulling to open' : 'Drag across the seal to tear'}</p>
        <button type="button" className="pack-tear-open-button" onClick={open} aria-describedby="pack-tear-hint">Open pack</button>
      </div>
    </>}
  </div>
}
