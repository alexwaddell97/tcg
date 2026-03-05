import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSocketEvent } from './useSocket.ts'
import { useGameStore } from '../stores/useGameStore.ts'
import { useMatchmakingStore } from '../stores/useLobbyStore.ts'
import type { GameState } from '@tcg/shared'

export function useGameSync() {
  const navigate = useNavigate()
  const setGameState = useGameStore((s) => s.setGameState)
  const setGameOver = useGameStore((s) => s.setGameOver)
  const setCommendedBy = useGameStore((s) => s.setCommendedBy)
  const setStatus = useMatchmakingStore((s) => s.setStatus)
  const setQueueSize = useMatchmakingStore((s) => s.setQueueSize)

  const handleGameStart = useCallback(
    (state: GameState) => {
      setStatus('found')
      setGameState(state)
      navigate('/game')
    },
    [setGameState, navigate, setStatus]
  )

  const handleGameUpdate = useCallback(
    (state: GameState) => {
      setGameState(state)
    },
    [setGameState]
  )

  const handleGameOver = useCallback(
    ({ winnerId }: { winnerId: string; reason: string }) => {
      setGameOver(winnerId)
    },
    [setGameOver]
  )

  const handleMatchmakingStatus = useCallback(
    ({ status, queueSize }: { status: 'idle' | 'searching' | 'found'; queueSize?: number }) => {
      setStatus(status)
      if (queueSize !== undefined) setQueueSize(queueSize)
    },
    [setStatus, setQueueSize]
  )

  const handlePlayerDisconnected = useCallback(
    (_playerId: string) => {
      useGameStore.setState({ opponentDisconnected: true })
    },
    []
  )

  const handleCommended = useCallback(
    ({ fromDisplayName }: { fromDisplayName: string }) => {
      setCommendedBy(fromDisplayName)
    },
    [setCommendedBy]
  )

  useSocketEvent('game:start', handleGameStart)
  useSocketEvent('game:state_update', handleGameUpdate)
  useSocketEvent('game:over', handleGameOver)
  useSocketEvent('game:player_disconnected', handlePlayerDisconnected)
  useSocketEvent('game:commended', handleCommended)
  useSocketEvent('matchmaking:status', handleMatchmakingStatus)
}
