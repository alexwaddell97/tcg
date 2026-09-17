import { useCallback, useEffect, useRef, useState } from 'react'
import type { PointerEvent, RefObject } from 'react'
import type { ArenaIndex, ArenaSlotIndex } from '@tcg/shared'
import { createCardDragGesture } from '../lib/cardDrag.ts'
import type { CardDragPoint } from '../lib/cardDrag.ts'

type DropTarget = { kind: 'arena'; index: ArenaIndex; slotIndex?: ArenaSlotIndex } | { kind: 'hand' } | null
interface DragPreview { cardId: string; left: number; top: number; width: number; target: DropTarget }

export function useCardDrag({ board, enabled, turn, onDrop, onBegin }: {
  board: RefObject<HTMLElement | null>; enabled: boolean; turn: number
  onDrop: (cardId: string, target: DropTarget) => void; onBegin: () => void
}) {
  const [drag, setDrag] = useState<DragPreview | null>(null)
  const live = useRef({ enabled, onDrop, onBegin })
  live.current = { enabled, onDrop, onBegin }
  const capture = useRef<{ node: HTMLElement; pointerId: number; width: number; boardWidth: number; originY: number; travel: number; offsetX: number; offsetY: number; lift: number } | null>(null)
  const frame = useRef<number | null>(null)
  const targetAt = (x: number, y: number): DropTarget => {
    const node = document.elementFromPoint(x, y)
    if (!node || !board.current?.contains(node)) return null
    const arena = node.closest<HTMLElement>('[data-arena-index]')
    const index = Number(arena?.dataset.arenaIndex)
    if (arena && (index === 0 || index === 1 || index === 2)) {
      const formation = node.closest<HTMLElement>('[data-formation-owner]')
      if (formation?.dataset.formationOwner === 'opponent') return null
      // Gaps in the track belong to the nearest position on your side.
      const position = formation ? [...formation.querySelectorAll<HTMLElement>('[data-slot-index]')].sort((a, b) => {
        const distance = (slot: HTMLElement) => { const rect = slot.getBoundingClientRect(); return Math.hypot(x - rect.x - rect.width / 2, y - rect.y - rect.height / 2) }
        return distance(a) - distance(b)
      })[0] : undefined
      return { kind: 'arena', index, slotIndex: position ? Number(position.dataset.slotIndex) as ArenaSlotIndex : undefined }
    }
    return node.closest('[data-card-hand]') ? { kind: 'hand' } : null
  }
  const clear = () => {
    if (frame.current !== null) cancelAnimationFrame(frame.current)
    frame.current = null
    setDrag(null)
  }
  const gesture = useRef<ReturnType<typeof createCardDragGesture> | null>(null)
  if (!gesture.current) gesture.current = createCardDragGesture({
    move: (point: CardDragPoint) => {
      if (!capture.current) return
      const captured = capture.current
      if (frame.current !== null) cancelAnimationFrame(frame.current)
      frame.current = requestAnimationFrame(() => {
        frame.current = null
        const progress = Math.max(0, Math.min(1, (captured.originY - point.y) / captured.travel))
        const eased = progress * progress * (3 - 2 * progress)
        const width = captured.width + (captured.boardWidth - captured.width) * eased
        setDrag({ cardId: point.cardId, left: point.x - captured.offsetX * width, top: point.y - captured.offsetY * width * 1.5 - captured.lift, width, target: targetAt(point.x, point.y) })
      })
    },
    drop: point => { clear(); if (live.current.enabled) live.current.onDrop(point.cardId, targetAt(point.x, point.y)) },
    cancel: clear,
  })
  const release = useCallback(() => {
    const captured = capture.current
    capture.current = null
    if (captured?.node.hasPointerCapture(captured.pointerId)) captured.node.releasePointerCapture(captured.pointerId)
  }, [])
  const cancel = useCallback(() => { gesture.current!.cancel(); release() }, [release])
  useEffect(() => { cancel() }, [enabled, turn, cancel])
  useEffect(() => {
    const hidden = () => { if (document.hidden) cancel() }
    window.addEventListener('blur', cancel)
    document.addEventListener('visibilitychange', hidden)
    return () => { cancel(); window.removeEventListener('blur', cancel); document.removeEventListener('visibilitychange', hidden) }
  }, [cancel])

  return {
    drag, cancel,
    canInspect: (detail: number) => gesture.current!.canInspect(detail),
    bind: (cardId: string) => ({
      onPointerDown: (event: PointerEvent<HTMLButtonElement>) => {
        if (!live.current.enabled || !event.isPrimary || event.button !== 0) return
        if (!gesture.current!.begin({ pointerId: event.pointerId, cardId, x: event.clientX, y: event.clientY, pointerType: event.pointerType })) return
        live.current.onBegin()
        const bounds = event.currentTarget.getBoundingClientRect()
        const width = bounds.width
        const slot = board.current?.querySelector<HTMLElement>('[data-formation-owner=you] [data-slot-index]')
          ?? board.current?.querySelector<HTMLElement>('[data-slot-index]')
        const boardWidth = slot?.getBoundingClientRect().width || width
        capture.current = { node: event.currentTarget, pointerId: event.pointerId, width, boardWidth, originY: event.clientY, travel: Math.max(40, bounds.height),
          offsetX: (event.clientX - bounds.left) / bounds.width,
          offsetY: (event.clientY - bounds.top) / bounds.height, lift: event.pointerType === 'touch' ? 18 : 0 }
        event.currentTarget.setPointerCapture(event.pointerId)
      },
      onPointerMove: (event: PointerEvent<HTMLButtonElement>) => gesture.current!.move(event.pointerId, event.clientX, event.clientY),
      onPointerUp: (event: PointerEvent<HTMLButtonElement>) => {
        gesture.current!.end(event.pointerId, event.clientX, event.clientY)
        if (capture.current?.pointerId === event.pointerId) release()
      },
      onPointerCancel: (event: PointerEvent<HTMLButtonElement>) => { gesture.current!.cancel(event.pointerId); if (capture.current?.pointerId === event.pointerId) release() },
      onLostPointerCapture: (event: PointerEvent<HTMLButtonElement>) => gesture.current!.cancel(event.pointerId),
    }),
  }
}
