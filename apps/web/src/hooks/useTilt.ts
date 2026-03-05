import { useRef, useCallback } from 'react'

/**
 * 3-D perspective tilt on hover — no packages needed.
 * Returns { ref, onMouseMove, onMouseLeave } to spread onto the target element.
 *
 * @param maxDeg  Max tilt angle in either axis (default 12°)
 * @param scale   Scale factor applied while tilting (default 1.04)
 */
export function useTilt(maxDeg = 12, scale = 1.04) {
  const ref = useRef<HTMLDivElement>(null)
  const rafRef = useRef<number | null>(null)

  const onMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!ref.current) return
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      // Snapshot values before the rAF callback fires
      const { clientX, clientY } = e
      rafRef.current = requestAnimationFrame(() => {
        if (!ref.current) return
        const rect = ref.current.getBoundingClientRect()
        const px = (clientX - rect.left) / rect.width   // 0 → 1
        const py = (clientY - rect.top)  / rect.height  // 0 → 1
        const rotX = (0.5 - py) * maxDeg * 2            // tilt up/down
        const rotY = (px - 0.5) * maxDeg * 2            // tilt left/right
        ref.current.style.transform =
          `perspective(700px) rotateX(${rotX}deg) rotateY(${rotY}deg) scale(${scale})`
        ref.current.style.transition = 'transform 0.06s linear'
      })
    },
    [maxDeg, scale],
  )

  const onMouseLeave = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    if (!ref.current) return
    ref.current.style.transform = ''
    ref.current.style.transition = 'transform 0.35s cubic-bezier(0.23, 1, 0.32, 1)'
  }, [])

  return { ref, onMouseMove, onMouseLeave } as const
}
