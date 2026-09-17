/** Tearing is irreversible; backing up or cancelling never reseals the foil. */
export function advancePackTear(committed: number, startX: number, currentX: number, width: number) {
  if (width <= 0 || !Number.isFinite(width)) return committed
  const progress = Math.max(committed, Math.min(1, committed + (currentX - startX) / (width * .88)))
  return progress >= .96 ? 1 : progress
}
