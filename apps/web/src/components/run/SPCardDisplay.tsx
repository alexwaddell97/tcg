/**
 * SPCardDisplay — Slay the Spire-style card component for the singleplayer roguelike.
 * Desktop-focused. No emoji — uses type abbreviations and CSS art areas.
 * Cormorant Garamond font for card names. Rarity-bordered portrait cards.
 */
import type { SPCardInstance } from '@tcg/shared'
import { cn } from '../../lib/cn.ts'
import { useTilt } from '../../hooks/useTilt.ts'

// ─── Type config (no emoji) ──────────────────────────────────────────────────

const TYPE_CONFIG: Record<string, {
  artBg: string          // art area CSS background
  watermarkColor: string // large watermark text color
  abbr: string           // 3-letter abbreviation
  accentBorder: string   // thin bottom bar on art area
  textCls: string        // type label color
}> = {
  attack: {
    artBg: 'linear-gradient(160deg, #220808 0%, #130404 100%)',
    watermarkColor: 'rgba(210, 40, 40, 0.22)',
    abbr: 'ATK',
    accentBorder: '#6b1818',
    textCls: 'text-red-500',
  },
  skill: {
    artBg: 'linear-gradient(160deg, #08141e 0%, #040c14 100%)',
    watermarkColor: 'rgba(30, 120, 180, 0.22)',
    abbr: 'SKL',
    accentBorder: '#164860',
    textCls: 'text-sky-500',
  },
  power: {
    artBg: 'linear-gradient(160deg, #10081c 0%, #08040e 100%)',
    watermarkColor: 'rgba(130, 40, 200, 0.22)',
    abbr: 'PWR',
    accentBorder: '#3c1060',
    textCls: 'text-violet-500',
  },
}

// ─── Rarity config ───────────────────────────────────────────────────────────

const RARITY_CONFIG: Record<string, {
  borderColor: string
  glowCls: string
  pips: number   // number of pip marks shown
}> = {
  basic:    { borderColor: '#2a2018', glowCls: '',         pips: 0 },
  common:   { borderColor: '#3e3428', glowCls: '',         pips: 1 },
  uncommon: { borderColor: '#1a5040', glowCls: '',         pips: 2 },
  rare:     { borderColor: '#a06818', glowCls: 'card-rare',pips: 3 },
  special:  { borderColor: '#5a18a8', glowCls: 'card-rare',pips: 4 },
}

// ─── Component ───────────────────────────────────────────────────────────────

interface SPCardDisplayProps {
  card: SPCardInstance
  isSelected?: boolean
  canPlay?: boolean
  tilt?: boolean
  onClick?: () => void
  className?: string
}

export default function SPCardDisplay({
  card,
  isSelected = false,
  canPlay = true,
  tilt = false,
  onClick,
  className,
}: SPCardDisplayProps) {
  const { ref, onMouseMove, onMouseLeave } = useTilt(6, 1.03)

  const isWound = card.id === 'wound'
  const type = TYPE_CONFIG[card.type] ?? TYPE_CONFIG.attack
  const rarity = RARITY_CONFIG[card.rarity] ?? RARITY_CONFIG.common
  const hasHolo = card.rarity === 'rare' || card.rarity === 'special'
  const interactive = !isWound && !!onClick && canPlay

  return (
    <div
      ref={tilt ? ref : undefined}
      onMouseMove={tilt ? onMouseMove : undefined}
      onMouseLeave={tilt ? onMouseLeave : undefined}
      onClick={interactive ? onClick : undefined}
      className={cn(
        'relative flex flex-col rounded border-2 overflow-hidden select-none transition-all duration-150',
        rarity.glowCls,
        isSelected && 'scale-110 -translate-y-5 shadow-[0_0_32px_rgba(200,120,20,0.55)]',
        !isSelected && !canPlay && 'opacity-40 saturate-0',
        !isSelected && interactive && 'hover:scale-105 hover:-translate-y-2 cursor-pointer',
        !interactive && 'cursor-default',
        className,
      )}
      style={{
        background: '#0d0a08',
        borderColor: isSelected ? '#d08020' : rarity.borderColor,
      }}
    >
      {/* Holographic sheen */}
      {hasHolo && <div className="card-holo-sheen absolute inset-0 pointer-events-none z-10" />}

      {/* ── Cost Orb ─────────────────────────────────────────────────── */}
      <div
        className="absolute -top-2 -left-2 w-7 h-7 rounded-full border-2 border-stone-700 z-20 flex items-center justify-center text-xs font-black text-stone-100"
        style={{
          background: card.energyCost === 0
            ? 'radial-gradient(circle at 35% 30%, #9ca3af, #4b5563 55%, #1f2937)'
            : 'radial-gradient(circle at 35% 30%, #fde68a, #f59e0b 55%, #92400e)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.3), 0 2px 4px rgba(0,0,0,0.7)',
        }}
      >
        {card.energyCost}
      </div>

      {/* ── Upgraded pip ──────────────────────────────────────────────── */}
      {card.isUpgraded && (
        <div className="absolute top-0.5 right-1 z-20 text-amber-400 text-[9px] font-black leading-none">+</div>
      )}

      {/* ── Art Area ──────────────────────────────────────────────────── */}
      <div
        className="w-full relative shrink-0 overflow-hidden flex items-center justify-center"
        style={{ height: '50%', minHeight: 52, background: type.artBg }}
      >
        {/* Large type watermark */}
        <span
          className="font-cinzel font-black text-[1.6rem] tracking-[0.2em] select-none pointer-events-none"
          style={{ color: type.watermarkColor }}
        >
          {type.abbr}
        </span>

        {/* Rarity pip row */}
        {rarity.pips > 0 && (
          <div className="absolute bottom-1.5 inset-x-0 flex justify-center gap-0.5">
            {Array.from({ length: rarity.pips }).map((_, i) => (
              <div
                key={i}
                className="w-1 h-1 rounded-full"
                style={{ background: rarity.borderColor, opacity: 0.8 }}
              />
            ))}
          </div>
        )}

        {/* Type accent bar */}
        <div
          className="absolute bottom-0 inset-x-0 h-[2px]"
          style={{ background: type.accentBorder, opacity: 0.7 }}
        />
      </div>

      {/* ── Text Area ─────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col px-2 pt-1.5 pb-1.5 gap-0.5" style={{ background: '#110d0a' }}>
        {/* Card name */}
        <p className="font-cinzel text-stone-100 font-bold text-[10px] leading-tight truncate">
          {card.name}
        </p>

        {/* Type label */}
        <p className={cn('text-[8px] font-bold uppercase tracking-widest', type.textCls)}>
          {card.type}
        </p>

        {/* Divider */}
        <div className="h-px my-0.5" style={{ background: 'linear-gradient(90deg, transparent, #3a2d1f, transparent)' }} />

        {/* Description */}
        <p className="text-stone-400 text-[9px] leading-snug flex-1 line-clamp-3">
          {card.description}
        </p>

        {/* Tags */}
        {(card.exhausts || card.ethereal) && (
          <div className="flex gap-1 mt-0.5 flex-wrap">
            {card.exhausts && (
              <span className="text-stone-600 text-[8px] uppercase tracking-wide border border-stone-800/80 rounded-sm px-1 leading-tight">Exhaust</span>
            )}
            {card.ethereal && (
              <span className="text-stone-600 text-[8px] uppercase tracking-wide border border-stone-800/80 rounded-sm px-1 leading-tight">Ethereal</span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
