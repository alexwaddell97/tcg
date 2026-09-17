export const DRAW_DURATION = 660
export const DRAW_STAGGER = 250
export const arenaDrawDuration = (count: number) => count > 0 ? DRAW_DURATION + (count - 1) * DRAW_STAGGER : 0
