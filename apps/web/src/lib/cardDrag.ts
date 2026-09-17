export interface CardPointer { pointerId: number; cardId: string; x: number; y: number; pointerType: string }
export interface CardDragPoint { cardId: string; x: number; y: number }

/** One pointer owns a gesture. Small finger movements remain taps; a drag never inspects. */
export function createCardDragGesture(callbacks: { move: (point: CardDragPoint) => void; drop: (point: CardDragPoint) => void; cancel: () => void }) {
  let origin: CardPointer | null = null
  let dragging = false
  let suppressClick = false
  const move = (pointerId: number, x: number, y: number) => {
    if (!origin || origin.pointerId !== pointerId) return
    const threshold = origin.pointerType === 'touch' ? 10 : 7
    if (!dragging && Math.hypot(x - origin.x, y - origin.y) < threshold) return
    dragging = true
    callbacks.move({ cardId: origin.cardId, x, y })
  }
  return {
    begin(pointer: CardPointer) {
      if (origin) return false
      origin = pointer; dragging = false; suppressClick = false
      return true
    },
    move,
    end(pointerId: number, x: number, y: number) {
      if (!origin || origin.pointerId !== pointerId) return
      move(pointerId, x, y)
      const point = { cardId: origin.cardId, x, y }
      const wasDragging = dragging
      origin = null; dragging = false; suppressClick = wasDragging
      if (wasDragging) callbacks.drop(point)
    },
    cancel(pointerId?: number) {
      if (!origin || pointerId !== undefined && pointerId !== origin.pointerId) return
      suppressClick = true; origin = null; dragging = false
      callbacks.cancel()
    },
    canInspect(clickDetail: number) {
      const allowed = clickDetail === 0 || !suppressClick
      suppressClick = false
      return allowed
    },
  }
}
