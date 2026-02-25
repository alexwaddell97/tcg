import { Heart, Zap, Library } from 'lucide-react'
import type { PlayerState } from '@tcg/shared'

interface PlayerInfoProps {
  player: PlayerState
  isOpponent?: boolean
}

export default function PlayerInfo({ player, isOpponent = false }: PlayerInfoProps) {
  const healthPct = (player.health / player.maxHealth) * 100

  return (
    <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-slate-800/60 border border-slate-700/50">
      {/* Name */}
      <div className="flex-1 min-w-0">
        <p className="text-white font-semibold truncate text-sm md:text-base">
          {isOpponent ? `⚔ ${player.displayName}` : player.displayName}
        </p>
      </div>

      {/* Health */}
      <div className="flex items-center gap-1.5">
        <Heart className="w-4 h-4 text-red-400 flex-shrink-0" />
        <div className="flex flex-col gap-0.5 min-w-12">
          <span className="text-white text-sm font-semibold leading-none">
            {player.health}/{player.maxHealth}
          </span>
          <div className="h-1 bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-red-500 rounded-full transition-all"
              style={{ width: `${healthPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Mana */}
      {!isOpponent && (
        <div className="flex items-center gap-1.5">
          <Zap className="w-4 h-4 text-blue-400 flex-shrink-0" />
          <span className="text-white text-sm font-semibold">
            {player.mana}/{player.maxMana}
          </span>
        </div>
      )}

      {/* Deck count */}
      <div className="flex items-center gap-1.5">
        <Library className="w-4 h-4 text-slate-400 flex-shrink-0" />
        <span className="text-slate-300 text-sm">{player.deckCount}</span>
      </div>
    </div>
  )
}
