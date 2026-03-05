import { useEffect, useState } from 'react'
import { X, Sword, CaretLeft, CaretRight } from '@phosphor-icons/react'
import type { Card, Keyword } from '@tcg/shared'
import { CARD_DATABASE } from '@tcg/shared'
import { cn } from '../../lib/cn.ts'
import { CardMedia } from './CardMedia.tsx'
import { useTilt } from '../../hooks/useTilt.ts'

// ─── Keyword glossary ──────────────────────────────────────────────────────

const KEYWORD_DEFS: Record<Keyword, { icon: string; name: string; description: string }> = {
  fleeting: {
    icon: '💨',
    name: 'Fleeting',
    description: 'Banished at round end — this card does not return to hand.',
  },
  elusive: {
    icon: '👻',
    name: 'Elusive',
    description: 'Can only be blocked by other Elusive units.',
  },
  overwhelm: {
    icon: '🔥',
    name: 'Overwhelm',
    description: 'Excess power beyond what is needed bleeds through to the location total.',
  },
  challenger: {
    icon: '⚔️',
    name: 'Challenger',
    description: "When played, automatically pulls the opponent's weakest non-Elusive unit to this location.",
  },
  resilient: {
    icon: '🛡️',
    name: 'Resilient',
    description: 'Persists on the board into the next round — survives the end-of-round board wipe.',
  },
  commander: {
    icon: '👑',
    name: 'Commander',
    description: 'Friendly units at the same location gain +1 power.',
  },
  scorch: {
    icon: '💀',
    name: 'Scorch',
    description: 'When this card leaves the board, deal 2 damage to the opponent\'s highest-power unit at this location.',
  },
}

const rarityAnimClass: Record<string, string> = {
  common:    '',
  uncommon:  '',
  rare:      'card-rare',
  legendary: 'card-legendary',
}

const rarityBorderClass: Record<string, string> = {
  common:    'border-stone-500',
  uncommon:  'border-emerald-500',
  rare:      'border-blue-400',
  legendary: 'border-amber-400',
}

const rarityDiamondColor: Record<string, string> = {
  common:    'text-stone-400',
  uncommon:  'text-emerald-400',
  rare:      'text-blue-300',
  legendary: 'text-amber-300',
}

const rarityDiamonds: Record<string, string> = {
  common:    '◇',
  uncommon:  '◇◇',
  rare:      '◇◇◇',
  legendary: '✦',
}

interface CardViewerProps {
  card: Card | null
  onClose: () => void
  isPreview?: boolean
  onPrev?: () => void
  onNext?: () => void
}

export default function CardViewer({ card, onClose, isPreview, onPrev, onNext }: CardViewerProps) {
  // Close on Escape, navigate on arrow keys
  useEffect(() => {
    if (!card) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft' && onPrev) { e.preventDefault(); onPrev() }
      if (e.key === 'ArrowRight' && onNext) { e.preventDefault(); onNext() }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [card, onClose, onPrev, onNext])

  const [previewCard, setPreviewCard] = useState<Card | null>(null)

  // Must be called unconditionally before any early return
  const tilt = useTilt(8, 1.02)

  if (!card) return null

  const totalPower = card.power + (card.powerBonus ?? 0)
  const hasPowerBonus = (card.powerBonus ?? 0) !== 0
  const questFull = card.quest && card.questProgress >= card.quest.threshold
  const isFullArt = card.rarity === 'rare' || card.rarity === 'legendary'

  // Show full-art backdrop for any card that has one (legendaries and transformed cards)
  const backdropUrl = (card.rarity === 'legendary' || card.isTransformed)
    ? `./cards/full/${card.definitionId.replace(/_/g, '-')}.jpeg`
    : null

  return (
    <>
    <div className="fixed inset-0 z-100 overflow-hidden">
      {/* Backdrop */}
      {!isPreview && (backdropUrl ? (
        <>
          <img
            src={backdropUrl}
            className="absolute inset-0 w-full h-full object-cover z-0"
            style={{ animation: 'legendary-bg-fade-in 0.7s ease-out forwards' }}
          />
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-0" />
        </>
      ) : (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-0" />
      ))}
      {/* Prev arrow */}
      {!isPreview && onPrev && (
        <button
          onClick={(e) => { e.stopPropagation(); onPrev() }}
          className="absolute left-3 top-1/2 -translate-y-1/2 z-20 p-3 rounded-full bg-stone-900/80 border border-stone-700 text-stone-300 hover:text-stone-100 hover:bg-stone-800 transition-colors"
        >
          <CaretLeft className="w-5 h-5" weight="bold" />
        </button>
      )}
      {/* Next arrow */}
      {!isPreview && onNext && (
        <button
          onClick={(e) => { e.stopPropagation(); onNext() }}
          className="absolute right-3 top-1/2 -translate-y-1/2 z-20 p-3 rounded-full bg-stone-900/80 border border-stone-700 text-stone-300 hover:text-stone-100 hover:bg-stone-800 transition-colors"
        >
          <CaretRight className="w-5 h-5" weight="bold" />
        </button>
      )}
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-2.5 rounded-full bg-stone-900 border border-stone-700 text-stone-400 hover:text-stone-100 transition-colors z-20"
      >
        <X className="w-6 h-6" weight="bold" />
      </button>

      {/* Scrollable click-to-close layer */}
      <div
        className="absolute inset-0 z-10 flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
        onClick={onClose}
      >
      <div
        className={cn("relative flex flex-col md:flex-row gap-4 md:gap-8 items-center md:items-start w-full max-w-3xl my-auto", previewCard && "invisible")}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Card art ── */}
        <div
          ref={tilt.ref}
          onMouseMove={tilt.onMouseMove}
          onMouseLeave={tilt.onMouseLeave}
          className="shrink-0 w-48 sm:w-44 md:w-60 shadow-2xl"
          style={{ aspectRatio: '2/3' }}
        >
          {/* Inner div owns border, radius & overflow clipping */}
          <div
            className={cn(
              'relative w-full h-full rounded-xs border-2 overflow-hidden',
              rarityBorderClass[card.rarity],
              rarityAnimClass[card.rarity]
            )}
          >
          {/* Image / Video */}
          <div className="relative w-full h-full bg-stone-950">
            <CardMedia card={card} className="w-full h-full object-cover" zoom={1.2} />
            {!card.imageUrl && (
              <div className="w-full h-full flex items-center justify-center text-6xl opacity-20">
                {card.type === 'unit' ? '⚔️' : '✨'}
              </div>
            )}

            {/* Gold cost — top left */}
            <div className="absolute top-2 left-2 w-7 h-7 sm:w-10 sm:h-10 rounded-full border-2 border-amber-600 flex items-center justify-center" style={{ background: 'radial-gradient(circle at 35% 30%, #fde68a, #f59e0b 55%, #92400e)', boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.45), inset 0 -2px 4px rgba(0,0,0,0.35), 0 2px 6px rgba(0,0,0,0.55)' }}>
              <span className="font-black text-base sm:text-xl font-ui leading-none" style={{ color: '#7c2d12', textShadow: '0 1px 0 rgba(255,220,120,0.5)' }}>{card.cost}</span>
            </div>

            {/* Transformed badge */}
            {card.isTransformed && (
              <div className="absolute top-3 right-3 w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center text-sm font-bold" title="Transformed">
                ✦
              </div>
            )}

            {/* Power / spell effect — bottom */}
            <div className="absolute bottom-0 inset-x-0 bg-linear-to-t from-black/90 to-transparent pt-8 pb-3 flex flex-col items-center gap-1">
              {card.type === 'spell' ? (
                card.spellEffect ? (
                  <span className="inline-flex items-center gap-1.5 text-violet-200 font-black text-xl bg-violet-900/80 border border-violet-700/50 px-3 py-1 rounded-xs font-ui">
                    {card.spellEffect.type === 'draw' && `DRAW ${card.spellEffect.value}`}
                    {card.spellEffect.type === 'power_boost' && <><Sword size={16} weight="fill" className="shrink-0" />+{card.spellEffect.value}</>}
                    {card.spellEffect.type === 'power_drain' && <><Sword size={16} weight="fill" className="shrink-0" />-{card.spellEffect.value}</>}
                  </span>
                ) : null
              ) : (
                <span className={cn(
                  'inline-flex items-center gap-1.5 font-black text-2xl font-ui px-3 py-1 rounded-xs border shadow-md',
                  hasPowerBonus
                    ? 'bg-emerald-950/90 border-emerald-500/60 text-emerald-300'
                    : 'bg-stone-950/90 border-stone-600/60 text-amber-200'
                )}>
                  <Sword size={20} weight="fill" className="shrink-0" />{totalPower}{hasPowerBonus ? ` (+${card.powerBonus})` : ''}
                </span>
              )}
              {/* Rarity diamonds */}
              {isFullArt && (
                <span className={cn('text-sm leading-none', rarityDiamondColor[card.rarity])}>
                  {rarityDiamonds[card.rarity]}
                </span>
              )}
            </div>
          </div>
          </div>
        </div>

        {/* ── Details panel ── */}
        <div className="flex-1 min-w-0 w-full flex flex-col gap-2 sm:gap-5 items-center md:items-start text-center md:text-left">
          {/* Name + meta */}
          <div>
            <h2 className="text-xl sm:text-3xl font-bold text-amber-100 leading-tight">{card.name}</h2>
            <div className="flex items-center gap-1.5 sm:gap-2 mt-1 flex-wrap justify-center md:justify-start">
              <span className={cn('text-xs sm:text-sm font-semibold uppercase tracking-wider', rarityDiamondColor[card.rarity])}>
                {rarityDiamonds[card.rarity]} {card.rarity}
              </span>
              <span className="text-stone-600 text-xs sm:text-sm">·</span>
              <span className="text-stone-400 text-xs sm:text-sm capitalize">{card.type}</span>
              {card.affinity.length > 0 && (
                <>
                  <span className="text-stone-600 text-xs sm:text-sm">·</span>
                  <span className="text-stone-500 text-xs sm:text-sm">{card.affinity.join(', ')}</span>
                </>
              )}
            </div>
          </div>

          {/* Spell effect */}
          {card.type === 'spell' && card.spellEffect && (
            <div className="rounded-lg bg-violet-950/40 border border-violet-800/30 p-3 sm:p-4">
              <p className="text-violet-400 text-xs font-semibold uppercase tracking-wider mb-1">Spell Effect</p>
              <p className="text-stone-300 text-sm sm:text-base">
                {card.spellEffect.type === 'draw' && `Draw ${card.spellEffect.value} card${card.spellEffect.value > 1 ? 's' : ''} from your deck.`}
                {card.spellEffect.type === 'power_boost' && `Boost your highest-power unit here by +${card.spellEffect.value} power this round.`}
                {card.spellEffect.type === 'power_drain' && `Drain the opponent's highest-power unit here by ${card.spellEffect.value} power this round.`}
              </p>
            </div>
          )}

          {/* Description / ability text */}
          {card.description && (
            <p className="text-stone-300 text-sm sm:text-base leading-relaxed">
              {card.description}
            </p>
          )}

          {/* Flavour text — hidden on mobile */}
          {card.flavourText && (
            <p className="hidden sm:block text-stone-500 text-xs sm:text-sm leading-relaxed italic border-l-2 border-stone-700 pl-3">
              &ldquo;{card.flavourText}&rdquo;
            </p>
          )}

          {/* Quest */}
          {card.quest && !card.isTransformed && (() => {
            const targetDef = CARD_DATABASE.find(d => d.definitionId === card.quest!.transformsToId)
            return (
              <div className="rounded-lg bg-amber-950/40 border border-amber-800/30 p-3 sm:p-4 flex flex-col gap-2">
                <p className="text-amber-300 text-xs font-semibold uppercase tracking-wider">Quest</p>
                <p className="text-stone-300 text-sm sm:text-base leading-snug">{card.quest.description}</p>
                {/* Progress bar — compact on mobile */}
                <div className="flex items-center gap-1.5 sm:gap-2">
                  {Array.from({ length: card.quest.threshold }).map((_, i) => (
                    <div
                      key={i}
                      className={cn(
                        'flex-1 h-1.5 sm:h-2 rounded-full transition-colors',
                        i < card.questProgress ? 'bg-amber-400' : 'bg-stone-700'
                      )}
                    />
                  ))}
                  <span className="text-sm text-stone-500 ml-1">
                    {card.questProgress}/{card.quest.threshold}
                  </span>
                </div>
                {questFull && (
                  <p className="text-amber-400 text-sm font-semibold">✦ Quest complete — will transform!</p>
                )}
                {targetDef && (
                  <button
                    onClick={() => setPreviewCard({ ...targetDef, instanceId: 'preview', questProgress: 0, isTransformed: false, powerBonus: 0 })}
                    className="flex items-center gap-2 pt-1 border-t border-amber-800/30 mt-0.5 w-full text-left group cursor-pointer"
                  >
                    <span className="text-stone-500 text-xs uppercase tracking-widest">Transforms into</span>
                    <span className="text-amber-200 text-sm font-bold group-hover:text-amber-100 transition-colors underline underline-offset-2 decoration-amber-700 group-hover:decoration-amber-400">{targetDef.name}</span>
                  </button>
                )}
              </div>
            )
          })()}

          {/* Keywords */}
          {card.keywords.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-stone-500 text-xs font-semibold uppercase tracking-wider">Keywords</p>
              {card.keywords.map((kw) => {
                const def = KEYWORD_DEFS[kw]
                if (!def) return null
                return (
                  <div key={kw} className="flex items-start gap-2.5 rounded-lg bg-stone-900 border border-stone-800 px-3 py-2">
                    <span className="text-base sm:text-lg leading-none mt-0.5">{def.icon}</span>
                    <div>
                      <span className="inline-block text-xs font-bold uppercase tracking-widest px-1.5 py-px rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 mb-0.5">{def.name}</span>
                      <p className="text-stone-300 text-xs sm:text-sm leading-snug">{def.description}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
      </div>
    </div>
    {previewCard && <CardViewer card={previewCard} onClose={() => setPreviewCard(null)} isPreview />}
    </>
  )
}
