import { useNavigate } from 'react-router-dom'
import { useGameStore } from '../stores/useGameStore.ts'
import { useAuthStore } from '../stores/useAuthStore.ts'
import { getSocket } from '../lib/socket.ts'
import GameBoard from '../components/game/GameBoard.tsx'
import PlayerHand from '../components/game/PlayerHand.tsx'
import PlayerInfo from '../components/game/PlayerInfo.tsx'
import ActionBar from '../components/game/ActionBar.tsx'
import GameLog from '../components/game/GameLog.tsx'

export default function GameRoom() {
  const navigate = useNavigate()
  const gameState = useGameStore((s) => s.gameState)
  const myHand = useGameStore((s) => s.myHand)
  const isGameOver = useGameStore((s) => s.isGameOver)
  const winnerId = useGameStore((s) => s.winnerId)
  const reset = useGameStore((s) => s.reset)
  const playerId = useAuthStore((s) => s.playerId)
  const displayName = useAuthStore((s) => s.displayName)

  if (!gameState) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <p className="text-slate-400">No active game. Redirecting…</p>
      </div>
    )
  }

  const myState = playerId
    ? gameState.players[playerId]
    : Object.values(gameState.players).find((p) => p.displayName === displayName)

  const opponentState = Object.values(gameState.players).find(
    (p) => p.id !== myState?.id
  )

  const isMyTurn = gameState.activePlayerId === myState?.id

  const handleEndTurn = () => getSocket().emit('game:end_turn')
  const handleSurrender = () => getSocket().emit('game:surrender')

  const handlePlayCard = (cardInstanceId: string) => {
    getSocket().emit('game:play_card', { cardInstanceId })
  }

  if (isGameOver) {
    const didWin = winnerId === myState?.id
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center gap-6">
        <h2 className={`text-4xl font-bold ${didWin ? 'text-amber-400' : 'text-red-400'}`}>
          {didWin ? 'Victory!' : 'Defeat'}
        </h2>
        <button
          onClick={() => { reset(); navigate('/lobby') }}
          className="px-6 py-3 rounded-lg bg-slate-700 text-white hover:bg-slate-600 transition-colors"
        >
          Back to Lobby
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      {/* Opponent area */}
      {opponentState && (
        <div className="p-2 md:p-4">
          <PlayerInfo player={opponentState} isOpponent />
        </div>
      )}

      {/* Main layout */}
      <div className="flex-1 flex flex-col lg:flex-row gap-2 p-2 md:p-4 min-h-0">
        {/* Board */}
        <div className="flex-1 flex flex-col gap-2">
          <GameBoard
            gameState={gameState}
            myPlayerId={myState?.id ?? ''}
          />
        </div>

        {/* Game log (desktop only) */}
        <div className="hidden lg:block w-64 xl:w-72">
          <GameLog entries={gameState.log} />
        </div>
      </div>

      {/* My area */}
      {myState && (
        <div className="p-2 md:p-4 flex flex-col gap-2">
          <PlayerInfo player={myState} />
          <ActionBar
            isMyTurn={isMyTurn}
            phase={gameState.phase}
            onEndTurn={handleEndTurn}
            onSurrender={handleSurrender}
          />
          <PlayerHand
            cards={myHand}
            isMyTurn={isMyTurn}
            playerMana={myState.mana}
            onPlayCard={handlePlayCard}
          />
        </div>
      )}
    </div>
  )
}
