import type { Card } from '@tcg/shared'
import { getTriadValues } from '@tcg/shared'
import { cn } from '../../lib/cn.ts'
import { CardMedia } from './CardMedia.tsx'

const rarityBorderClass: Record<string, string> = {
  common:    'border-stone-500',
  uncommon:  'border-emerald-500',
  rare:      'border-blue-400 card-rare',
  legendary: 'border-amber-400 card-legendary',
}

interface HandCardProps {
  card: Card
  isPlayable: boolean
  isSelected?: boolean
  onInspect: () => void
}

function FaceValue({ value, className }: { value: number; className: string }) {
  return (
    <span
      className={cn(
        'absolute z-30 min-w-6 h-6 px-1.5 rounded bg-black/80 border border-stone-700 text-[1.08rem] font-black tabular-nums text-amber-200 flex items-center justify-center pointer-events-none select-none',
        className
      )}
    >
      {value}
    </span>
  )
}

export default function HandCard({ card, isPlayable, isSelected = false, onInspect, mobile }: HandCardProps & { mobile?: boolean }) {
  const values = getTriadValues(card)

  // Mobile: larger touch targets, clearer selection, much bigger face values
  const base = 'relative rounded-xl border-2 overflow-hidden select-none transition-all duration-150 aspect-2/3 cursor-pointer bg-stone-950'
  const mobileCard = mobile
    ? 'w-full h-full max-w-[96px] max-h-[144px] min-w-[72px] min-h-[108px] text-[1.45rem]'
    : 'w-full h-full text-[1.45rem]'
  const selected = isSelected
    ? 'ring-4 ring-amber-400/90 shadow-[0_0_20px_rgba(245,158,11,0.45)] -translate-y-1 scale-105 z-20'
    : ''
  const hoverable = isPlayable && !mobile ? 'hover:-translate-y-1 hover:shadow-xl hover:shadow-black/60' : ''
  const opacity = isPlayable ? '' : 'opacity-55'

  return (
    <div
      onClick={onInspect}
      className={cn(base, rarityBorderClass[card.rarity], mobileCard, hoverable, opacity, selected)}
      style={{ touchAction: 'manipulation' }}
    >
      {/* Holographic sheen for rare/legendary */}
      {(card.rarity === 'rare' || card.rarity === 'legendary') && (
        <div className="card-holo-sheen absolute inset-0 z-10 rounded-xl pointer-events-none" />
      )}

      {/* Background image / video */}
      <div className="absolute inset-0 flex items-center justify-center">
        {card.imageUrl
          ? <CardMedia card={card} className="w-full h-full object-cover" objectPosition="top" />
          : <span className="text-2xl opacity-20">{card.type === 'unit' ? '⚔️' : '✨'}</span>
        }
      </div>

      {/* Gradient overlays */}
      <div className="absolute inset-0 pointer-events-none bg-linear-to-t from-black/80 via-transparent to-black/25" />

      {/* Triad face values (much bigger, always visible) */}
      <FaceValue value={values.top} className={mobile ? 'left-1/2 top-2 -translate-x-1/2' : 'left-1/2 top-2 -translate-x-1/2'} />
      <FaceValue value={values.right} className={mobile ? 'right-2 top-1/2 -translate-y-1/2' : 'right-2 top-1/2 -translate-y-1/2'} />
      <FaceValue value={values.bottom} className={mobile ? 'left-1/2 bottom-2 -translate-x-1/2' : 'left-1/2 bottom-2 -translate-x-1/2'} />
      <FaceValue value={values.left} className={mobile ? 'left-2 top-1/2 -translate-y-1/2' : 'left-2 top-1/2 -translate-y-1/2'} />

      {/* Transformed indicator */}
      {card.isTransformed && (
        <div className="absolute top-1.5 right-1.5 z-20 w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center text-[10px] font-bold pointer-events-none">
          ✦
        </div>
      )}

      {/* No name label for hand cards */}
    </div>
  )
}
