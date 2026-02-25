import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSocketEvent } from './useSocket.ts'
import { useGameStore } from '../stores/useGameStore.ts'
import { useLobbyStore } from '../stores/useLobbyStore.ts'
import { useAuthStore } from '../stores/useAuthStore.ts'
import type { GameState, Room } from '@tcg/shared'

export function useGameSync() {
  const navigate = useNavigate()
  const setGameState = useGameStore((s) => s.setGameState)
  const setGameOver = useGameStore((s) => s.setGameOver)
  const setCurrentRoom = useLobbyStore((s) => s.setCurrentRoom)
  const upsertRoom = useLobbyStore((s) => s.upsertRoom)
  const removeRoom = useLobbyStore((s) => s.removeRoom)
  const setRooms = useLobbyStore((s) => s.setRooms)
  const setConnected = useAuthStore((s) => s.setConnected)

  const handleGameStart = useCallback(
    (state: GameState) => {
      setGameState(state)
      navigate('/game')
    },
    [setGameState, navigate]
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

  const handleRoomList = useCallback(
    (rooms: Room[]) => {
      setRooms(rooms)
    },
    [setRooms]
  )

  const handleRoomUpdated = useCallback(
    (room: Room) => {
      upsertRoom(room)
      setCurrentRoom(room)
    },
    [upsertRoom, setCurrentRoom]
  )

  const handleRoomCreated = useCallback(
    (room: Room) => {
      upsertRoom(room)
      setCurrentRoom(room)
    },
    [upsertRoom, setCurrentRoom]
  )

  const handleRoomRemoved = useCallback(
    (roomId: string) => {
      removeRoom(roomId)
    },
    [removeRoom]
  )

  useSocketEvent('game:start', handleGameStart)
  useSocketEvent('game:state_update', handleGameUpdate)
  useSocketEvent('game:over', handleGameOver)
  useSocketEvent('lobby:room_list', handleRoomList)
  useSocketEvent('lobby:room_updated', handleRoomUpdated)
  useSocketEvent('lobby:room_created', handleRoomCreated)
  useSocketEvent('lobby:room_removed', handleRoomRemoved)
}
