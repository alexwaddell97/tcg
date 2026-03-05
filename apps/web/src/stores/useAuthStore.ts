import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AuthState {
  playerId: string | null
  displayName: string
  avatarEmoji: string
  rank: string
  isConnected: boolean
  setDisplayName: (name: string) => void
  setAvatarEmoji: (emoji: string) => void
  setConnected: (connected: boolean) => void
  setPlayerId: (id: string) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      playerId: null,
      displayName: '',
      avatarEmoji: '🧙',
      rank: 'Initiate',
      isConnected: false,
      setDisplayName: (displayName) => set({ displayName }),
      setAvatarEmoji: (avatarEmoji) => set({ avatarEmoji }),
      setConnected: (isConnected) => set({ isConnected }),
      setPlayerId: (playerId) => set({ playerId }),
    }),
    { name: 'tcg-auth' }
  )
)
