import type { GameState } from '@tcg/shared'
import CardZone from './CardZone.tsx'

interface GameBoardProps {
  gameState: GameState
  myPlayerId: string
}

export default function GameBoard({ gameState, myPlayerId }: GameBoardProps) {
  const myState = gameState.players[myPlayerId]
  const opponentState = Object.values(gameState.players).find((p) => p.id !== myPlayerId)

  return (
    <div className="flex-1 flex flex-col gap-2 rounded-2xl bg-slate-800/50 border border-slate-700/50 p-3 md:p-4">
      {/* Turn indicator */}
      <div className="text-center">
        <span
          className={`inline-block px-4 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${
            gameState.activePlayerId === myPlayerId
              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
              : 'bg-slate-700 text-slate-400'
          }`}
        >
          {gameState.activePlayerId === myPlayerId ? 'Your Turn' : "Opponent's Turn"} · Turn {gameState.turn} · {gameState.phase}
        </span>
      </div>

      {/* Opponent field */}
      {opponentState && (
        <CardZone
          creatures={opponentState.field}
          label={`${opponentState.displayName}'s field`}
          isOpponent
        />
      )}

      {/* Divider */}
      <div className="border-t border-slate-700/50 my-1" />

      {/* My field */}
      {myState && (
        <CardZone
          creatures={myState.field}
          label="Your field"
        />
      )}
    </div>
  )
}
