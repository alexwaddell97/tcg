import { useEffect, useRef, useState } from 'react'
import type { CardDefinition } from '@tcg/shared'
import { observeAppVisibility } from '../../lib/appVisibility.ts'
import { cn } from '../../lib/cn.ts'

// ─── Simple looping video ─────────────────────────────────────────────────────
// Single native loop, loaded only while visible and active.
// The previous dual-video crossfade ran onTimeUpdate (~25×/s per element) and
// setTimeout callbacks — expensive with multiple cards on screen at once.

export function LoopingVideo({
  src,
  poster,
  className,
  zoom = 1,
  objectPosition = 'center',
  onError,
}: {
  src: string
  poster?: string
  className: string
  zoom?: number
  objectPosition?: string
  onError: () => void
}) {
  const ref = useRef<HTMLVideoElement>(null)
  const [visible, setVisible] = useState(false)
  const [appActive, setAppActive] = useState(!document.hidden)
  const [reducedMotion, setReducedMotion] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  useEffect(() => {
    const element = ref.current
    if (!element) return
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0.01 })
    observer.observe(element)
    const stopVisibility = observeAppVisibility(setAppActive)
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)')
    const changed = () => setReducedMotion(preference.matches)
    preference.addEventListener('change', changed)
    return () => { observer.disconnect(); stopVisibility(); preference.removeEventListener('change', changed) }
  }, [])
  const active = visible && appActive && !reducedMotion
  useEffect(() => {
    if (!active && ref.current) {
      ref.current.pause()
      // Removing src alone can leave the previous decoder/resource alive.
      ref.current.load()
    }
  }, [active])
  return (
    <video
      ref={ref}
      src={active ? src : undefined}
      preload="none"
      poster={poster}
      autoPlay={active}
      loop
      muted
      playsInline
      className={cn(className)}
      style={{
        transform: zoom !== 1 ? `scale(${zoom})` : undefined,
        objectPosition,
      }}
      onError={onError}
    />
  )
}

// ─── Per-card zoom overrides ──────────────────────────────────────────────────
// Add entries here to override zoom for specific cards in CardViewer.
const CARD_ZOOM: Record<string, number> = {
  // e.g. some_card: 1.5,
}

// ─── CardMedia ────────────────────────────────────────────────────────────────
// Renders a looping video for legendaries (falling back to image on error),
// a plain image for all other rarities, or nothing when imageUrl is absent.

export function CardMedia({ card, className, zoom = 1, objectPosition = 'center' }: { card: CardDefinition & { isTransformed?: boolean }; className: string; zoom?: number; objectPosition?: string }) {
  const [failedVideo, setFailedVideo] = useState<string | null>(null)
  const effectiveZoom = (CARD_ZOOM[card.definitionId] ?? 1) * zoom

  // Legacy PNG artwork has matching animated variants. WebP artwork is static.
  const videoSrc = /\.png$/i.test(card.imageUrl ?? '') ? card.imageUrl.replace(/\.png$/i, '.mp4') : null
  if ((card.rarity === 'legendary' || card.isTransformTarget || card.isTransformed) && videoSrc && failedVideo !== card.imageUrl) {
    return (
      <LoopingVideo
        src={videoSrc}
        poster={card.imageUrl}
        className={className}
        zoom={effectiveZoom}
        objectPosition={objectPosition}
        onError={() => setFailedVideo(card.imageUrl!)}
      />
    )
  }
  if (card.imageUrl) {
    return <img decoding="async" src={card.imageUrl} alt={card.name} draggable={false} className={className} style={{ objectPosition }} />
  }
  return null
}
