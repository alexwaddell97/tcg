import type { Card, Keyword } from '@tcg/shared'
import { Sword } from '@phosphor-icons/react'
import { cn } from '../../lib/cn.ts'
import { CardMedia } from './CardMedia.tsx'

const rarityBorderClass: Record<string, string> = {
  common:    'border-stone-500',
  uncommon:  'border-emerald-500',
  rare:      'border-blue-400 card-rare',
  legendary: 'border-amber-400 card-legendary',
}

const KEYWORD_ICONS: Record<Keyword, string> = {
  fleeting:   '💨',
  elusive:    '👻',
  overwhelm:  '🔥',
  challenger: '⚔️',
  resilient:  '🛡️',
  commander:  '👑',
  scorch:     '💀',
}

interface HandCardProps {
  card: Card
  isPlayable: boolean
  onInspect: () => void
}

export default function HandCard({ card, isPlayable, onInspect }: HandCardProps) {
  const totalPower = card.power + (card.powerBonus ?? 0)
  const hasPowerBonus = (card.powerBonus ?? 0) !== 0

  let spellLabel = ''
  if (card.type === 'spell' && card.spellEffect) {
    const { type, value } = card.spellEffect
    if (type === 'draw')        spellLabel = `DRAW ${value}`
    if (type === 'power_boost') spellLabel = `+${value}`
    if (type === 'power_drain') spellLabel = `-${value}`
  }
  const isSpellPower = card.type === 'spell' && card.spellEffect && card.spellEffect.type !== 'draw'

  return (
    <div
      onClick={onInspect}
      className={cn(
        'relative rounded-xl border-2 overflow-hidden select-none transition-all duration-150 aspect-2/3 cursor-pointer',
        rarityBorderClass[card.rarity],
        isPlayable
          ? 'hover:scale-105 hover:-translate-y-1 hover:shadow-xl hover:shadow-black/60'
          : 'opacity-40'
      )}
    >
      {/* Holographic sheen for rare/legendary */}
      {(card.rarity === 'rare' || card.rarity === 'legendary') && (
        <div className="card-holo-sheen absolute inset-0 z-10 rounded-xl pointer-events-none" />
      )}

      {/* Background image / video */}
      <div className="absolute inset-0 bg-stone-950 flex items-center justify-center">
        {card.imageUrl
          ? <CardMedia card={card} className="w-full h-full object-cover" objectPosition="top" />
          : <span className="text-2xl opacity-20">{card.type === 'unit' ? '⚔️' : '✨'}</span>
        }
      </div>

      {/* Gradient overlays */}
      <div className="absolute inset-0 pointer-events-none bg-linear-to-t from-black/80 via-transparent to-black/25" />
      {card.type === 'spell' && (
        <div className="absolute inset-0 pointer-events-none bg-violet-950/20" />
      )}

      {/* Transformed indicator */}
      {card.isTransformed && (
        <div className="absolute top-1.5 right-1.5 z-20 w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center text-[10px] font-bold pointer-events-none">
          ✦
        </div>
      )}

      {/* Bottom info overlay */}
      <div className="absolute bottom-0 inset-x-0 z-20 flex flex-col items-center pb-1 px-1 pointer-events-none">
        {card.keywords.length > 0 && (
          <div className="flex gap-0.5 mb-0.5">
            {card.keywords.slice(0, 2).map((kw) => (
              <span key={kw} className="text-[0.6rem] leading-none">{KEYWORD_ICONS[kw]}</span>
            ))}
          </div>
        )}

        {card.type === 'spell' && spellLabel ? (
          <span className="inline-flex items-center gap-0.5 font-black text-[0.6rem] font-ui px-1 py-px rounded-xs border leading-tight text-violet-200 bg-violet-900/80 border-violet-700/50">
            {isSpellPower && <Sword size={7} weight="fill" className="shrink-0" />}{spellLabel}
          </span>
        ) : card.type !== 'spell' ? (
          <span className={cn(
            'inline-flex items-center gap-0.5 font-black text-[0.6rem] font-ui px-1 py-px rounded-xs border shadow-sm leading-tight',
            hasPowerBonus
              ? 'bg-emerald-950/90 border-emerald-500/60 text-emerald-300'
              : 'bg-stone-950/90 border-stone-600/60 text-amber-200'
          )}>
            <Sword size={7} weight="fill" className="shrink-0" />{totalPower}
          </span>
        ) : null}
      </div>
    </div>
  )
}
