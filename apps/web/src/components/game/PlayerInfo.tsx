import { Crown, Books } from '@phosphor-icons/react'
import type { PlayerState } from '@tcg/shared'

const RANK_STYLES: Record<string, string> = {
  Initiate:   'text-stone-400  border-stone-600',
  Apprentice: 'text-emerald-400 border-emerald-700',
  Adept:      'text-blue-400   border-blue-700',
  Veteran:    'text-violet-400  border-violet-700',
  Champion:   'text-amber-400  border-amber-700',
  Legend:     'text-red-400    border-red-700',
}

interface PlayerInfoProps {
  player: PlayerState
  isOpponent?: boolean
  hasPendingPlay?: boolean
}

export default function PlayerInfo({ player, isOpponent = false, hasPendingPlay = false }: PlayerInfoProps) {
  const rankStyle = RANK_STYLES[player.rank] ?? RANK_STYLES.Initiate

  return (
    <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-stone-900/70 border border-stone-700/50">
      {/* Avatar */}
      <div className="shrink-0 w-9 h-9 rounded-full bg-stone-800 border border-stone-600/60 flex items-center justify-center text-lg select-none">
        {player.avatarEmoji}
      </div>

      {/* Name + rank */}
      <div className="flex-1 min-w-0 flex flex-col gap-0.5">
        <div className="flex items-center gap-2">
          <p className="text-stone-100 font-semibold truncate text-sm md:text-base">
            {isOpponent ? `⚔ ${player.displayName}` : player.displayName}
          </p>
          {player.hasPassed && (
            <span className="text-xs text-stone-600 italic">passed</span>
          )}
          {hasPendingPlay && !player.hasPassed && (
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse flex-shrink-0" title="Submitted play" />
          )}
        </div>
        <span className={`text-[10px] uppercase tracking-widest font-semibold border rounded-full px-1.5 py-px w-fit ${rankStyle}`}>
          {player.rank}
        </span>
      </div>

      {/* Round wins */}
      <div className="flex items-center gap-1.5">
        <Crown className="w-4 h-4 text-amber-400 flex-shrink-0" weight="fill" />
        <span className="text-stone-100 text-sm font-semibold">{player.roundWins}</span>
      </div>

      {/* Deck count */}
      <div className="flex items-center gap-1.5">
        <Books className="w-4 h-4 text-stone-400 flex-shrink-0" weight="duotone" />
        <span className="text-stone-300 text-sm">{player.deckCount}</span>
      </div>
    </div>
  )
}
