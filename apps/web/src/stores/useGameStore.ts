import { create } from 'zustand'
import type { GameState, Card } from '@tcg/shared'

interface GameStoreState {
  gameState: GameState | null
  myHand: Card[]
  selectedCardId: string | null
  isDragging: boolean
  opponentDisconnected: boolean
  isGameOver: boolean
  winnerId: string | null
  commendedBy: string | null
  setGameState: (state: GameState) => void
  setHand: (hand: Card[]) => void
  selectCard: (cardInstanceId: string | null) => void
  setDragging: (dragging: boolean) => void
  setGameOver: (winnerId: string) => void
  setCommendedBy: (name: string) => void
  reset: () => void
}

export const useGameStore = create<GameStoreState>()((set) => ({
  gameState: null,
  myHand: [],
  selectedCardId: null,
  isDragging: false,
  opponentDisconnected: false,
  isGameOver: false,
  winnerId: null,
  commendedBy: null,
  setGameState: (gameState) =>
    set({ gameState, myHand: gameState.hand ?? [], isDragging: false }),
  setHand: (myHand) => set({ myHand }),
  selectCard: (selectedCardId) => set({ selectedCardId }),
  setDragging: (isDragging) => set({ isDragging }),
  setGameOver: (winnerId) => set({ isGameOver: true, winnerId }),
  setCommendedBy: (name) => set({ commendedBy: name }),
  reset: () =>
    set({ gameState: null, myHand: [], selectedCardId: null, isDragging: false, opponentDisconnected: false, isGameOver: false, winnerId: null, commendedBy: null }),
}))
