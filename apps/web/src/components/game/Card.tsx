import type { Card } from '@tcg/shared'
import { cn } from '../../lib/cn.ts'
import Badge from '../ui/Badge.tsx'

interface CardProps {
  card: Card
  isSelected?: boolean
  isPlayable?: boolean
  onClick?: () => void
  size?: 'sm' | 'md' | 'lg'
}

const rarityBorder = {
  common: 'border-slate-600',
  uncommon: 'border-emerald-500',
  rare: 'border-blue-500',
  legendary: 'border-amber-400',
}

const typeColor = {
  creature: 'bg-red-900/50',
  spell: 'bg-blue-900/50',
  artifact: 'bg-slate-700/50',
  enchantment: 'bg-purple-900/50',
}

export default function CardComponent({
  card,
  isSelected = false,
  isPlayable = true,
  onClick,
  size = 'md',
}: CardProps) {
  return (
    <div
      onClick={isPlayable ? onClick : undefined}
      className={cn(
        'relative flex flex-col rounded-xl border-2 overflow-hidden select-none transition-all duration-150',
        rarityBorder[card.rarity],
        typeColor[card.type],
        'aspect-[2/3]',
        {
          'cursor-pointer hover:scale-105 hover:-translate-y-1 hover:shadow-xl hover:shadow-black/50':
            isPlayable && onClick,
          'ring-2 ring-amber-400 ring-offset-2 ring-offset-slate-900 scale-105 -translate-y-1':
            isSelected,
          'opacity-50 cursor-not-allowed': !isPlayable,
          'text-xs': size === 'sm',
          'text-sm': size === 'md',
          'text-base': size === 'lg',
        }
      )}
    >
      {/* Cost bubble */}
      <div className="absolute top-1.5 left-1.5 w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm shadow">
        {card.cost}
      </div>

      {/* Card image area */}
      <div className="flex-1 bg-slate-900/40 flex items-center justify-center">
        {card.imageUrl ? (
          <img src={card.imageUrl} alt={card.name} className="w-full h-full object-cover" />
        ) : (
          <span className="text-3xl opacity-20">
            {card.type === 'creature' ? '⚔️' : card.type === 'spell' ? '✨' : '🔮'}
          </span>
        )}
      </div>

      {/* Card info */}
      <div className="px-2 py-1.5 bg-slate-900/80 flex flex-col gap-0.5">
        <p className="font-semibold text-white leading-tight truncate">{card.name}</p>
        <div className="flex items-center justify-between">
          <Badge label={card.type} variant={card.rarity} />
          {card.type === 'creature' && card.power !== undefined && card.toughness !== undefined && (
            <span className="text-white font-bold text-xs">
              {card.power}/{card.toughness}
            </span>
          )}
        </div>
        {card.description && (
          <p className="text-slate-400 text-xs leading-tight line-clamp-2">{card.description}</p>
        )}
        {card.keywords.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-0.5">
            {card.keywords.map((kw) => (
              <span key={kw} className="text-amber-400 text-xs italic">
                {kw}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
