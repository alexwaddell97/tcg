import type { Card } from '@tcg/shared'
import ArenaCardFace from './ArenaCardFace.tsx'
import { useTilt } from '../../hooks/useTilt.ts'

interface CardProps {
  card: Card
  isSelected?: boolean
  isPlayable?: boolean
  onClick?: () => void
  size?: 'sm' | 'md' | 'lg'
}
export default function CardComponent({ card, isSelected = false, isPlayable = true, onClick, size = 'md' }: CardProps) {
  const tilt = useTilt(7, 1.03)
  // Collection tiles already own their interaction; avoid nesting buttons there.
  const face = <ArenaCardFace card={card} power={card.power + (card.powerBonus ?? 0)} variant={size === 'lg' ? 'full' : 'catalog'} />
  return <div ref={tilt.ref} onMouseMove={isPlayable ? tilt.onMouseMove : undefined} onMouseLeave={tilt.onMouseLeave} className={`ae-card-control ${isSelected ? 'selected' : ''}`}>
    {onClick ? <button className="ae-card-control" onClick={onClick} disabled={!isPlayable} aria-label={`Inspect ${card.name}`}>{face}</button> : face}
  </div>
}
