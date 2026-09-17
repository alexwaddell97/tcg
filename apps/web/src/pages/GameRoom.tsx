import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { ArenaTurnSubmission } from '@tcg/shared'
import { useGameStore } from '../stores/useGameStore.ts'
import { getSocket } from '../lib/socket.ts'
import { useSocketEvent } from '../hooks/useSocket.ts'
import { useCardMasteryReward } from '../hooks/useCardMasteryReward.ts'
import ArenaBoard from '../components/game/ArenaBoard.tsx'

export default function GameRoom() {
  const navigate = useNavigate()
  const gameState = useGameStore((s) => s.gameState)
  const masteryReward = useCardMasteryReward(gameState)
  const [error, setError] = useState<string | null>(null)
  const [waiting, setWaiting] = useState(false)
  const [connectionLost, setConnectionLost] = useState(false)
  const pending = useRef(false)
  const playerId = gameState?.viewerPlayerId ?? ''
  const canAct = Boolean(gameState?.phase === 'planning' && !gameState.arena?.lockedIn[playerId] && !waiting && !connectionLost)

  useEffect(() => {
    const socket = getSocket()
    const onDisconnect = () => {
      pending.current = false
      setWaiting(false)
      setConnectionLost(true)
    }
    socket.on('disconnect', onDisconnect)
    return () => { socket.off('disconnect', onDisconnect) }
  }, [])

  useEffect(() => {
    pending.current = false
    setWaiting(false)
  }, [gameState])

  const handleActionResult = useCallback(({ success, error: message }: { success: boolean; error?: string }) => {
    if (!success) {
      pending.current = false
      setWaiting(false)
      setError(message ?? 'That plan could not be played. Review your cards and aether.')
    }
  }, [])
  useSocketEvent('game:action_result', handleActionResult)

  const submit = (send: () => void) => {
    if (pending.current) return
    if (!getSocket().connected) { setError('Connection lost. Return to the lobby to start a new match.'); return }
    pending.current = true
    setWaiting(true)
    setError(null)
    send()
  }

  const handleCommit = (submission: ArenaTurnSubmission) => {
    if (!canAct) return
    submit(() => getSocket().emit('game:commit_turn', submission))
  }

  if (!gameState?.arena || connectionLost) return <main className="multiplayer-room items-center justify-center gap-4">
    <h1 className="match-title">{connectionLost ? 'Connection lost' : 'No active match'}</h1><p className="text-sm text-stone-400">{connectionLost ? 'This match could not continue. Return to the lobby to play again.' : 'Find an opponent to enter the battlefield.'}</p>
    <button className="arena-button" onClick={() => { useGameStore.getState().reset(); navigate('/lobby') }}>Find a match</button>
  </main>

  return <ArenaBoard masteryReward={masteryReward} key={`${gameState.roomId}:${playerId}`} gameState={gameState} playerId={playerId} canAct={canAct} error={error}
    onCommit={handleCommit}
    onSurrender={() => {
      if (window.confirm('Surrender this match?')) submit(() => getSocket().emit('game:surrender'))
    }}
    onExit={() => { useGameStore.getState().reset(); navigate('/') }} />
}
