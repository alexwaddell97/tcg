import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useRunStore } from '../stores/useRunStore.ts'
import type { SPCardDefinition } from '@tcg/shared'
import { cn } from '../lib/cn.ts'

const RARITY_STYLES: Record<string, { border: string; glow: string; badge: string }> = {
  basic:    { border: 'border-stone-700',    glow: '',                                badge: 'bg-stone-800 text-stone-400' },
  common:   { border: 'border-stone-600',    glow: '',                                badge: 'bg-stone-700 text-stone-300' },
  uncommon: { border: 'border-sky-700/80',   glow: 'hover:shadow-[0_0_18px_#0ea5e980]', badge: 'bg-sky-900/60 text-sky-300' },
  rare:     { border: 'border-amber-600/80', glow: 'hover:shadow-[0_0_22px_#d97706a0]', badge: 'bg-amber-900/60 text-amber-300' },
  special:  { border: 'border-violet-600',   glow: 'hover:shadow-[0_0_22px_#7c3aeda0]', badge: 'bg-violet-900/60 text-violet-300' },
}

function RewardCard({ card, onPick }: { card: SPCardDefinition; onPick: () => void }) {
  const rs = RARITY_STYLES[card.rarity] ?? RARITY_STYLES.common
  const typeColor =
    card.type === 'attack' ? 'text-red-400' : card.type === 'skill' ? 'text-sky-400' : 'text-violet-400'

  return (
    <button
      onClick={onPick}
      className={cn(
        'flex flex-col gap-3 p-4 rounded border-2 text-left transition-all duration-150',
        'bg-stone-950 hover:bg-stone-900/90 active:scale-95 cursor-pointer',
        rs.border, rs.glow,
        'hover:scale-[1.02] hover:-translate-y-0.5'
      )}
    >
      {/* Card header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-0.5 flex-1">
          <p className="text-stone-100 font-black text-base leading-tight">{card.name}</p>
          <p className={cn('text-[10px] font-semibold uppercase tracking-widest', typeColor)}>{card.type}</p>
        </div>
        {/* Energy cost */}
        <div className={cn(
          'shrink-0 w-8 h-8 rounded-full border-2 flex items-center justify-center',
          'font-black text-sm',
          card.type === 'attack' ? 'border-red-700 bg-red-950 text-red-300' :
          card.type === 'skill' ? 'border-sky-700 bg-sky-950 text-sky-300' :
          'border-violet-700 bg-violet-950 text-violet-300'
        )}>
          {card.energyCost}
        </div>
      </div>

      {/* Description */}
      <p className="text-stone-400 text-sm leading-relaxed">{card.description}</p>

      {/* Tags */}
      <div className="flex items-center gap-2 mt-auto">
        <span className={cn('px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest', rs.badge)}>
          {card.rarity}
        </span>
        {card.exhausts && (
          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest bg-stone-800/80 text-stone-500">
            Exhausts
          </span>
        )}
        {card.ethereal && (
          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest bg-stone-800/80 text-stone-500">
            Ethereal
          </span>
        )}
      </div>
    </button>
  )
}

export default function CardRewardPage() {
  const navigate = useNavigate()
  const run = useRunStore((s) => s.run)
  const selectCardReward = useRunStore((s) => s.selectCardReward)

  useEffect(() => {
    if (!run) { navigate('/run'); return }
    if (run.phase !== 'card_reward') { navigate('/run/map'); return }
  }, [run?.phase])

  if (!run || run.phase !== 'card_reward') return null

  const options = run.cardRewardOptions ?? []

  function pick(cardId: string | null) {
    selectCardReward(cardId)
    navigate('/run/map')
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 py-8 gap-8"
      style={{ background: 'radial-gradient(ellipse at 50% 20%, #1a1200 0%, #0a0806 100%)' }}
    >
      {/* Header */}
      <div className="text-center flex flex-col gap-2">
        <p className="font-cinzel text-stone-600 text-xs uppercase tracking-[0.4em]">Victory!</p>
        <h1 className="font-cinzel text-amber-200/90 text-3xl tracking-widest uppercase">Choose Your Reward</h1>
        <p className="text-stone-500 text-sm">Pick one card to add to your deck</p>
      </div>

      {/* Card options */}
      <div className="w-full max-w-2xl grid grid-cols-1 sm:grid-cols-3 gap-4">
        {options.map((card) => (
          <RewardCard key={card.id} card={card} onPick={() => pick(card.id)} />
        ))}
      </div>

      {/* Skip */}
      <button
        onClick={() => pick(null)}
        className="text-stone-600 hover:text-stone-400 text-sm uppercase tracking-widest transition-colors"
      >
        Skip reward
      </button>

      {/* Run stats strip */}
      <div className="flex items-center gap-5 text-sm text-stone-500 border-t border-stone-800/50 pt-4">
        <span className="flex items-center gap-1">
          <span className="font-cinzel text-[9px] uppercase tracking-wider">HP</span>
          <span className="text-stone-300 font-bold">{run.hp}</span>/{run.maxHp}
        </span>
        <span className="flex items-center gap-1">
          <span className="font-cinzel text-[9px] uppercase tracking-wider">Gold</span>
          <span className="text-amber-300 font-bold">{run.gold}</span>
        </span>
        <span className="flex items-center gap-1">
          <span className="font-cinzel text-[9px] uppercase tracking-wider">Deck</span>
          <span className="text-stone-300 font-bold">{run.deck.length}</span>
        </span>
      </div>
    </div>
  )
}
