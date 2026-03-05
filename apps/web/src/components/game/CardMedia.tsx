import { useState } from 'react'
import type { Card } from '@tcg/shared'
import { cn } from '../../lib/cn.ts'

// ─── Simple looping video ─────────────────────────────────────────────────────
// Single element with the native `loop` attribute — zero JS overhead.
// The previous dual-video crossfade ran onTimeUpdate (~25×/s per element) and
// setTimeout callbacks — expensive with multiple cards on screen at once.

export function LoopingVideo({
  src,
  className,
  zoom = 1,
  objectPosition = 'center',
  onError,
}: {
  src: string
  className: string
  zoom?: number
  objectPosition?: string
  onError: () => void
}) {
  return (
    <video
      src={src}
      autoPlay
      loop
      muted
      playsInline
      className={cn(className)}
      style={{
        transform: zoom !== 1 ? `scale(${zoom})` : undefined,
        objectPosition,
        willChange: zoom !== 1 ? 'transform' : undefined,
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

export function CardMedia({ card, className, zoom = 1, objectPosition = 'center' }: { card: Card; className: string; zoom?: number; objectPosition?: string }) {
  const [videoFailed, setVideoFailed] = useState(false)
  const effectiveZoom = (CARD_ZOOM[card.definitionId] ?? 1) * zoom

  // Play video for legendary cards and transform targets (which have Veo 3 MP4s regardless of rarity)
  if ((card.rarity === 'legendary' || card.isTransformTarget || card.isTransformed) && card.imageUrl && !videoFailed) {
    const videoSrc = card.imageUrl.replace(/\.png$/i, '.mp4')
    return (
      <LoopingVideo
        src={videoSrc}
        className={className}
        zoom={effectiveZoom}
        objectPosition={objectPosition}
        onError={() => setVideoFailed(true)}
      />
    )
  }
  if (card.imageUrl) {
    return <img src={card.imageUrl} alt={card.name} draggable={false} className={className} style={{ objectPosition }} />
  }
  return null
}
