import { create } from 'zustand'
import type { GameState, Card } from '@tcg/shared'

interface GameStoreState {
  gameState: GameState | null
  myHand: Card[]
  selectedCardId: string | null
  isGameOver: boolean
  winnerId: string | null
  setGameState: (state: GameState) => void
  setHand: (hand: Card[]) => void
  selectCard: (cardInstanceId: string | null) => void
  setGameOver: (winnerId: string) => void
  reset: () => void
}

export const useGameStore = create<GameStoreState>()((set) => ({
  gameState: null,
  myHand: [],
  selectedCardId: null,
  isGameOver: false,
  winnerId: null,
  setGameState: (gameState) =>
    set({ gameState, myHand: gameState.hand ?? [] }),
  setHand: (myHand) => set({ myHand }),
  selectCard: (selectedCardId) => set({ selectedCardId }),
  setGameOver: (winnerId) => set({ isGameOver: true, winnerId }),
  reset: () =>
    set({ gameState: null, myHand: [], selectedCardId: null, isGameOver: false, winnerId: null }),
}))
