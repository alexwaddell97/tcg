import { useLayoutEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'
import type { GameState } from '@tcg/shared'

import { DRAW_DURATION, DRAW_STAGGER } from '../lib/arenaDraw.ts'
import { SoundEffectScope } from '../lib/SoundEffectScope.ts'

/** Animate additions by instance ID, so lock-in updates and hand buffs never redeal cards. */
export function useArenaDrawAnimation(board: RefObject<HTMLElement | null>, state: GameState, reducedMotion: boolean) {
  const seen = useRef<{ room: string; ids: Set<string> } | null>(null)
  const running = useRef(new Map<string, Animation[]>())
  const sounds = useRef(new SoundEffectScope())
  const [isDrawing, setIsDrawing] = useState(false)
  useLayoutEffect(() => () => {
    for (const animations of running.current.values()) animations.forEach(animation => animation.cancel())
    running.current.clear()
    sounds.current.stopAll()
    seen.current = null
  }, [])
  useLayoutEffect(() => {
    const hand = state.hand ?? []
    const previous = seen.current
    const freshMatch = previous?.room !== state.roomId
    if (freshMatch) {
      for (const animations of running.current.values()) animations.forEach(animation => animation.cancel())
      running.current.clear()
      sounds.current.stopAll()
    }
    const additions = hand.filter(card => freshMatch ? state.turn === 1 && state.phase === 'planning' : !previous.ids.has(card.instanceId))
    seen.current = { room: state.roomId, ids: new Set(hand.map(card => card.instanceId)) }
    const nodes = [...(board.current?.querySelectorAll<HTMLElement>('[data-hand-card-id]') ?? [])]
    additions.forEach((card, index) => {
      const node = nodes.find(node => node.dataset.handCardId === card.instanceId)
      if (!node || state.phase === 'game_over') return
      const rect = node.getBoundingClientRect()
      const root = board.current!.getBoundingClientRect()
      const dx = root.right - rect.left + rect.width * .5
      const dy = Math.min(root.bottom - rect.top, 120)
      const delay = index * DRAW_STAGGER
      sounds.current.play('draw', { delayMs: delay })
      const timing = { duration: DRAW_DURATION, delay, fill: 'both' as const, easing: 'cubic-bezier(.22,1,.36,1)' }
      // Reduced motion changes the movement, not the deal's rhythm or reading time.
      const flight = node.animate(reducedMotion ? [{ opacity: 0 }, { offset: .3, opacity: 1 }, { opacity: 1 }] : [
        { offset: 0, transform: `translate(${dx}px,${dy}px) scale(.65) rotate(18deg) rotateY(0deg)`, opacity: 0 },
        { offset: .12, opacity: 1 },
        { offset: .42, transform: `translate(${dx * .22}px,-22px) scale(1.08) rotate(-7deg) rotateY(90deg)`, opacity: 1 },
        { offset: .72, transform: 'translate(-3px,-10px) scale(1.04) rotate(-2deg) rotateY(0deg)' },
        { offset: 1, transform: 'translate(0,0) scale(1) rotate(0deg) rotateY(0deg)', opacity: 1 },
      ], timing)
      const back = node.querySelector<HTMLElement>('.clash-draw-back')
      const animations = [flight]
      if (back && !reducedMotion) animations.push(back.animate([
        { offset: 0, opacity: 1 }, { offset: .419, opacity: 1 }, { offset: .42, opacity: 0 }, { offset: 1, opacity: 0 },
      ], timing))
      node.dataset.drawing = 'true'
      running.current.set(card.instanceId, animations)
      void flight.finished.then(() => {
        if (running.current.get(card.instanceId) !== animations) return
        delete node.dataset.drawing
        animations.forEach(animation => animation.cancel())
        running.current.delete(card.instanceId)
        setIsDrawing(running.current.size > 0)
      }).catch(() => {})
    })
    setIsDrawing(running.current.size > 0)
  }, [board, state.roomId, state.hand, state.turn, state.phase, reducedMotion])
  return isDrawing
}
