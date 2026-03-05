import type { Card, Keyword } from '@tcg/shared'
import { Sword } from '@phosphor-icons/react'
import { cn } from '../../lib/cn.ts'
import { CardMedia } from './CardMedia.tsx'
import { useTilt } from '../../hooks/useTilt.ts'

// ─── Rarity config ────────────────────────────────────────────────────────────

const rarityBorderClass: Record<string, string> = {
  common:    'border-stone-500',
  uncommon:  'border-emerald-500',
  rare:      'border-blue-400',
  legendary: 'border-amber-400',
}

// Applied to the OUTER div (no overflow-hidden) so ::before glow isn't clipped
const rarityGlowClass: Record<string, string> = {
  common:    '',
  uncommon:  '',
  rare:      'card-rare',
  legendary: 'card-legendary',
}

const rarityDiamonds: Record<string, string> = {
  common:    '\u25c7',
  uncommon:  '\u25c7\u25c7',
  rare:      '\u25c7\u25c7\u25c7',
  legendary: '\u2726',
}

const rarityDiamondColor: Record<string, string> = {
  common:    'text-stone-400',
  uncommon:  'text-emerald-400',
  rare:      'text-blue-300',
  legendary: 'text-amber-300',
}

// ─── Keyword pills ────────────────────────────────────────────────────────────

const KEYWORD_ICONS: Record<Keyword, string> = {
  fleeting:   '\ud83d\udca8',
  elusive:    '\ud83d\udc7b',
  overwhelm:  '\ud83d\udd25',
  challenger: '\u2694\ufe0f',
  resilient:  '\ud83d\udee1\ufe0f',
  commander:  '\ud83d\udc51',
  scorch:     '\ud83d\udc80',
}

const KEYWORD_COLORS: Record<Keyword, string> = {
  fleeting:   'bg-sky-900/70 text-sky-200 border-sky-700/50',
  elusive:    'bg-purple-900/70 text-purple-200 border-purple-700/50',
  overwhelm:  'bg-orange-900/70 text-orange-200 border-orange-700/50',
  challenger: 'bg-red-900/70 text-red-200 border-red-700/50',
  resilient:  'bg-blue-900/70 text-blue-200 border-blue-700/50',
  commander:  'bg-amber-900/70 text-amber-200 border-amber-700/50',
  scorch:     'bg-rose-900/70 text-rose-200 border-rose-700/50',
}

// ─── Component ────────────────────────────────────────────────────────────────

interface CardProps {
  card: Card
  isSelected?: boolean
  isPlayable?: boolean
  onClick?: () => void
  size?: 'sm' | 'md' | 'lg'
}

export default function CardComponent({
  card,
  isSelected = false,
  isPlayable = true,
  onClick,
  size = 'md',
}: CardProps) {
  const totalPower = card.power + (card.powerBonus ?? 0)
  const hasPowerBonus = (card.powerBonus ?? 0) !== 0
  const isFullArt = card.rarity === 'rare' || card.rarity === 'legendary'
  const tilt = useTilt(10, 1.05)

  let spellLabel = ''
  if (card.type === 'spell' && card.spellEffect) {
    const { type, value } = card.spellEffect
    if (type === 'draw')        spellLabel = `DRAW ${value}`
    if (type === 'power_boost') spellLabel = `+${value} PWR`
    if (type === 'power_drain') spellLabel = `-${value} PWR`
  }

  return (
    /* Outer: tilt + click — no overflow-hidden so tilt doesn't clip edges */
    <div
      ref={tilt.ref}
      onMouseMove={isPlayable ? tilt.onMouseMove : undefined}
      onMouseLeave={isPlayable ? tilt.onMouseLeave : undefined}
      onClick={isPlayable ? onClick : undefined}
      className={cn(
        'relative aspect-2/3 select-none',
        rarityGlowClass[card.rarity],
        {
          'cursor-pointer hover:shadow-xl hover:shadow-black/60': isPlayable && !!onClick,
          'opacity-40 cursor-not-allowed': !isPlayable,
          'text-xs': size === 'sm',
          'text-sm': size === 'md',
          'text-base': size === 'lg',
        }
      )}
    >
      {/* Inner: owns the visual border, radius, and overflow clipping */}
      <div className={cn(
        'absolute inset-0 rounded-xs border-2 overflow-hidden',
        isSelected ? 'border-amber-400' : rarityBorderClass[card.rarity],
      )}>
      {/* Holographic sheen for rare/legendary */}
      {isFullArt && <div className="card-holo-sheen absolute inset-0 z-10 rounded-xs pointer-events-none" />}

      {size === 'sm' ? (
        /* ── Minimal preview layout — cost + image + power only ── */
        <>
          <div className="absolute inset-0 bg-stone-950">
            <CardMedia card={card} className="w-full h-full object-cover" />
            {!card.imageUrl && (
              <div className="w-full h-full flex items-center justify-center">
                <span className="text-3xl opacity-15">{card.type === 'unit' ? '⚔️' : '✨'}</span>
              </div>
            )}
          </div>
          {/* Subtle gradient so pips are readable */}
          <div className="absolute inset-0 bg-linear-to-t from-black/70 via-transparent to-black/40" />

          {/* Cost — top left */}
          <div className="absolute top-1 left-1 z-20 w-5 h-5 rounded-full border border-amber-600 flex items-center justify-center" style={{ background: 'radial-gradient(circle at 35% 30%, #fde68a, #f59e0b 55%, #92400e)', boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.45), inset 0 -1px 2px rgba(0,0,0,0.35), 0 1px 3px rgba(0,0,0,0.5)' }}>
            <span className="font-black text-[0.6rem] font-ui leading-none" style={{ color: '#7c2d12', textShadow: '0 0.5px 0 rgba(255,220,120,0.5)' }}>{card.cost}</span>
          </div>

          {/* Power — bottom centre (units only) */}
          {card.type !== 'spell' && (
            <div className={cn(
              'absolute bottom-1 left-1/2 -translate-x-1/2 z-20 flex items-center gap-0.5 px-1.5 py-0.5 rounded-xs font-black text-[0.65rem] font-ui shadow-md border',
              hasPowerBonus
                ? 'bg-emerald-950/90 border-emerald-500/60 text-emerald-300'
                : 'bg-stone-950/90 border-stone-600/60 text-amber-200',
            )}>
              <Sword size={8} weight="fill" className="shrink-0" />{totalPower}
            </div>
          )}
        </>
      ) : isFullArt ? (
        /* ── Full-art layout (rare / legendary) ── */
        <>
          <div className="absolute inset-0 bg-stone-950">
            <CardMedia card={card} className="w-full h-full object-cover" />
            {!card.imageUrl && (
              <div className="w-full h-full flex items-center justify-center"><span className="text-4xl opacity-15">{card.type === 'unit' ? '\u2694\ufe0f' : '\u2728'}</span></div>
            )}
          </div>
          <div className="absolute inset-0 bg-linear-to-t from-black/90 via-black/20 to-black/30" />

          <div className="absolute top-1.5 left-1.5 z-20 w-6 h-6 rounded-full border border-amber-600 flex items-center justify-center" style={{ background: 'radial-gradient(circle at 35% 30%, #fde68a, #f59e0b 55%, #92400e)', boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.45), inset 0 -1px 2px rgba(0,0,0,0.35), 0 1px 4px rgba(0,0,0,0.5)' }}>
            <span className="font-black text-[0.7rem] font-ui leading-none" style={{ color: '#7c2d12', textShadow: '0 0.5px 0 rgba(255,220,120,0.5)' }}>{card.cost}</span>
          </div>
          {card.isTransformed && (
            <div className="absolute top-1.5 right-1.5 z-20 w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center text-[10px] font-bold" title="Transformed">✦</div>
          )}

          <div className="absolute bottom-0 left-0 right-0 z-20 px-2 pb-1.5 pt-1">
            <p className="font-semibold text-white leading-tight truncate text-[0.7rem] drop-shadow-md">{card.name}</p>
            {card.keywords.length > 0 && (
              <div className="flex flex-wrap gap-0.5 my-0.5">
                {card.keywords.map(kw => (
                  <span key={kw} className={cn('inline-flex items-center gap-0.5 px-1 py-px rounded-xs text-[0.55rem] leading-none border', KEYWORD_COLORS[kw])}>
                    {KEYWORD_ICONS[kw]} {kw}
                  </span>
                ))}
              </div>
            )}
            {card.quest && !card.isTransformed && (
              <div className="flex items-center gap-0.5 my-0.5">
                {Array.from({ length: card.quest.threshold }).map((_, i) => (
                  <div key={i} className={cn('flex-1 h-0.5 rounded-full', i < card.questProgress ? 'bg-amber-400' : 'bg-stone-700')} />
                ))}
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className={cn('text-[0.6rem] font-semibold uppercase tracking-wide', card.type === 'spell' ? 'text-violet-300' : 'text-stone-400')}>{card.type}</span>
              {card.type === 'spell' && spellLabel
                ? <span className="text-violet-200 font-bold text-[0.6rem] bg-violet-900/80 px-1 rounded-xs">{spellLabel}</span>
                : null}
            </div>
            {card.type !== 'spell' && (
              <div className="flex justify-center">
                <span className={cn('inline-flex items-center gap-0.5 font-black text-[0.65rem] font-ui px-1.5 py-0.5 rounded-xs border shadow-md', hasPowerBonus ? 'bg-emerald-950/90 border-emerald-500/60 text-emerald-300' : 'bg-stone-950/90 border-stone-600/60 text-amber-200')}><Sword size={8} weight="fill" className="shrink-0" />{totalPower}</span>
              </div>
            )}
            <div className={cn('text-center leading-none mt-0.5', rarityDiamondColor[card.rarity], 'text-[0.55rem]')}>
              {rarityDiamonds[card.rarity]}
            </div>
          </div>
        </>
      ) : (
        /* ── Standard layout (common / uncommon) ── */
        <div className="flex flex-col h-full">
          <div className="relative flex-[.56] bg-stone-950/60 overflow-hidden">
            <CardMedia card={card} className="w-full h-full object-cover" />
            {!card.imageUrl && (
              <div className="w-full h-full flex items-center justify-center"><span className="text-3xl opacity-20">{card.type === 'unit' ? '\u2694\ufe0f' : '\u2728'}</span></div>
            )}
            <div className="absolute top-1 left-1 w-5 h-5 rounded-full border border-amber-600 flex items-center justify-center" style={{ background: 'radial-gradient(circle at 35% 30%, #fde68a, #f59e0b 55%, #92400e)', boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.45), inset 0 -1px 2px rgba(0,0,0,0.35), 0 1px 3px rgba(0,0,0,0.5)' }}>
              <span className="font-black text-[0.6rem] font-ui leading-none" style={{ color: '#7c2d12', textShadow: '0 0.5px 0 rgba(255,220,120,0.5)' }}>{card.cost}</span>
            </div>
            {card.isTransformed && (
              <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center text-[0.6rem] font-bold" title="Transformed">✦</div>
            )}
          </div>

          <div className={cn('relative flex-[.44] px-2 py-1 flex flex-col gap-0.5', card.type === 'spell' ? 'bg-violet-950/90' : 'bg-stone-950/90')}>
            <p className="font-semibold text-white leading-tight truncate text-[0.68rem]">{card.name}</p>
            <div className="flex items-center justify-between">
              <span className={cn('text-[0.55rem] uppercase tracking-wide font-medium', card.type === 'spell' ? 'text-violet-400' : 'text-stone-500')}>{card.type}</span>
              {card.type === 'spell' && spellLabel && (
                <span className="text-violet-200 font-bold text-[0.6rem] bg-violet-800/70 px-1 rounded-xs">{spellLabel}</span>
              )}
            </div>
            {card.type !== 'spell' && (
              <div className="flex justify-center">
                <span className={cn('inline-flex items-center gap-0.5 font-black text-[0.65rem] font-ui px-1.5 py-0.5 rounded-xs border shadow-md', hasPowerBonus ? 'bg-emerald-950/90 border-emerald-500/60 text-emerald-300' : 'bg-stone-950/90 border-stone-600/60 text-amber-200')}><Sword size={8} weight="fill" className="shrink-0" />{totalPower}</span>
              </div>
            )}
            {card.keywords.length > 0 && (
              <div className="flex flex-wrap gap-0.5">
                {card.keywords.map(kw => (
                  <span key={kw} className={cn('inline-flex items-center gap-0.5 px-0.5 py-px rounded-xs text-[0.5rem] leading-none border', KEYWORD_COLORS[kw])}>
                    {KEYWORD_ICONS[kw]} {kw}
                  </span>
                ))}
              </div>
            )}
            {card.quest && !card.isTransformed && (
              <div className="flex items-center gap-0.5">
                {Array.from({ length: card.quest.threshold }).map((_, i) => (
                  <div key={i} className={cn('flex-1 h-0.5 rounded-full', i < card.questProgress ? 'bg-amber-400' : 'bg-stone-700')} />
                ))}
              </div>
            )}
            <div className={cn('mt-auto text-center leading-none', rarityDiamondColor[card.rarity], 'text-[0.5rem]')}>
              {rarityDiamonds[card.rarity]}
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  )
}
