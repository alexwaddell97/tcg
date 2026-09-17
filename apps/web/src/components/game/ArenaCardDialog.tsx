import { useCallback, useEffect, useRef } from 'react'
import type { PointerEvent } from 'react'
import type { Card } from '@tcg/shared'
import { arenaCardSetName, getArenaRelicCounter } from '@tcg/shared'
import { CardMasteryControl } from './CardMasteryDialog.tsx'
import CardArtworkControl from './CardArtworkControl.tsx'
import ArenaCardFace from './ArenaCardFace.tsx'

export default function ArenaCardDialog({ card, onClose, onPrev, onNext, onReturnToHand, inMatch = false, scoreContribution }: { card: Card; onClose: () => void; onPrev?: () => void; onNext?: () => void; onReturnToHand?: () => void; inMatch?: boolean; scoreContribution?: number }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const cardStage = useRef<HTMLDivElement>(null)
  const heldPointer = useRef<number | null>(null)
  const tiltFrame = useRef<number | null>(null)
  const tiltAllowed = useRef<MediaQueryList | null>(null)
  const resetTilt = useCallback(() => {
    if (tiltFrame.current !== null) cancelAnimationFrame(tiltFrame.current)
    tiltFrame.current = null
    const pointerId = heldPointer.current
    heldPointer.current = null
    const node = cardStage.current
    if (node && pointerId !== null && node.hasPointerCapture(pointerId)) node.releasePointerCapture(pointerId)
    if (!node) return
    delete node.dataset.tilting
    for (const property of ['--ae-tilt-x', '--ae-tilt-y', '--ae-shine-x', '--ae-shine-y']) node.style.removeProperty(property)
  }, [])

  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: no-preference)')
    tiltAllowed.current = preference
    preference.addEventListener('change', resetTilt)
    window.addEventListener('blur', resetTilt)
    return () => {
      preference.removeEventListener('change', resetTilt)
      window.removeEventListener('blur', resetTilt)
      resetTilt()
    }
  }, [resetTilt])
  useEffect(resetTilt, [card.definitionId, card.imageUrl, resetTilt])

  const tiltCard = (event: PointerEvent<HTMLDivElement>) => {
    if (!tiltAllowed.current?.matches) { resetTilt(); return }
    if (event.pointerType === 'touch' && heldPointer.current !== event.pointerId) return
    if (heldPointer.current !== null && heldPointer.current !== event.pointerId) return
    const node = event.currentTarget
    // Measure the stationary stage so the card's rotation cannot feed back into its tilt.
    const bounds = node.getBoundingClientRect()
    if (!bounds.width || !bounds.height) return
    const x = Math.max(-1, Math.min(1, ((event.clientX - bounds.left) / bounds.width - 0.5) * 2))
    const y = Math.max(-1, Math.min(1, ((event.clientY - bounds.top) / bounds.height - 0.5) * 2))
    // Coalesce pointer events without rerendering the card or restarting its video.
    if (tiltFrame.current !== null) cancelAnimationFrame(tiltFrame.current)
    tiltFrame.current = requestAnimationFrame(() => {
      node.dataset.tilting = 'true'
      node.style.setProperty('--ae-tilt-x', `${-y * 8}deg`)
      node.style.setProperty('--ae-tilt-y', `${x * 10}deg`)
      node.style.setProperty('--ae-shine-x', `${(x + 1) * 50}%`)
      node.style.setProperty('--ae-shine-y', `${(y + 1) * 50}%`)
      tiltFrame.current = null
    })
  }
  const statuses = [card.arenaTransmuted ? 'Transmuted' : '', ...(card.arenaWither ?? []).filter(status => status.remaining > 0).map(status => `Wither: −${status.amount} for ${status.remaining} turn${status.remaining === 1 ? '' : 's'}`)].filter(Boolean)
  useEffect(() => { const node = dialog.current!; node.showModal(); return () => node.close() }, [])
  return <dialog ref={dialog} className="ae-card-dialog" aria-label={`${card.name} card details`} onCancel={onClose} onClick={event => { if (event.target === event.currentTarget) onClose() }} onKeyDown={event => { if (event.key === 'ArrowLeft') onPrev?.(); if (event.key === 'ArrowRight') onNext?.() }}>
    <div className="ae-card-dialog-content"><button className="ae-icon-button ae-dialog-close" onClick={onClose} aria-label="Close card details">×</button>
      <div ref={cardStage} className="ae-card-dialog-tilt" onPointerEnter={tiltCard} onPointerMove={tiltCard} onPointerLeave={() => { if (heldPointer.current === null) resetTilt() }}
        onPointerDown={event => {
          if (!event.isPrimary || event.button !== 0 || !tiltAllowed.current?.matches || heldPointer.current !== null) return
          if (event.pointerType !== 'mouse') {
            event.preventDefault()
            heldPointer.current = event.pointerId
            event.currentTarget.setPointerCapture(event.pointerId)
          }
          tiltCard(event)
        }}
        onPointerUp={event => { if (heldPointer.current === event.pointerId) resetTilt() }}
        onPointerCancel={event => { if (heldPointer.current === event.pointerId) resetTilt() }}
        onLostPointerCapture={event => { if (heldPointer.current === event.pointerId) resetTilt() }}>
        <div className="ae-card-dialog-surface">
          <ArenaCardFace card={card} power={card.power + (card.powerBonus ?? 0)} />
        </div>
      </div>
      {card.description && <p className="ae-card-rules">{card.description}</p>}
      {card.type === 'relic' && <p className="ae-card-rules ae-card-status">Relic · Occupies a position. Has no power.{inMatch && getArenaRelicCounter(card) ? ` ${getArenaRelicCounter(card)!.label}.` : ''}</p>}
      {scoreContribution !== undefined && <p className="ae-card-rules ae-card-status">Scores +{scoreContribution} at Mirror Reservoir.</p>}
      {statuses.length > 0 && <p className="ae-card-rules ae-card-status">{statuses.join(' · ')}</p>}
      {onReturnToHand && <button className="ae-button ae-card-return" onClick={onReturnToHand}>Return to hand</button>}
      <div className="ae-card-dialog-meta"><span>{card.rarity} · {card.type}{card.arenaSet && ` · ${arenaCardSetName(card)}`}</span>{card.flavourText && <p>“{card.flavourText}”</p>}</div>
      {!inMatch && card.cosmeticBorder === undefined && <><CardMasteryControl key={card.definitionId} card={card}/><CardArtworkControl card={card}/></>}
      {(onPrev || onNext) && <div className="ae-card-dialog-nav"><button className="ae-button" disabled={!onPrev} onClick={onPrev}>← Previous</button><button className="ae-button" disabled={!onNext} onClick={onNext}>Next →</button></div>}
    </div>
  </dialog>
}
