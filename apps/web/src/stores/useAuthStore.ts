import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AuthState {
  playerId: string | null
  displayName: string
  isConnected: boolean
  setDisplayName: (name: string) => void
  setConnected: (connected: boolean) => void
  setPlayerId: (id: string) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      playerId: null,
      displayName: '',
      isConnected: false,
      setDisplayName: (displayName) => set({ displayName }),
      setConnected: (isConnected) => set({ isConnected }),
      setPlayerId: (playerId) => set({ playerId }),
    }),
    { name: 'tcg-auth' }
  )
)
