import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { DEFAULT_AVATAR_ID, getProfileAvatar, getProfileTitle, ownsProfileCosmetic, restoreProfileCosmetics } from '@tcg/shared'

interface AuthState {
  playerId: string | null
  displayName: string
  avatarId: string
  titleId: string | null
  ownedAvatars: Record<string, true>
  ownedTitles: Record<string, true>
  rank: string
  isConnected: boolean
  setDisplayName: (name: string) => void
  setAvatar: (id: string) => void
  setTitle: (id: string | null) => void
  unlockProfileCosmetic: (kind: 'avatar' | 'title', id: string) => void
  setConnected: (connected: boolean) => void
  setPlayerId: (id: string) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      playerId: null,
      displayName: '',
      avatarId: DEFAULT_AVATAR_ID,
      titleId: 'initiate',
      ownedAvatars: {},
      ownedTitles: {},
      rank: 'Initiate',
      isConnected: false,
      setDisplayName: (displayName) => set({ displayName }),
      setAvatar: avatarId => set(state => ownsProfileCosmetic(getProfileAvatar(avatarId), state.ownedAvatars) ? { avatarId } : {}),
      setTitle: titleId => set(state => titleId === null || ownsProfileCosmetic(getProfileTitle(titleId), state.ownedTitles) ? { titleId } : {}),
      // Reward systems grant a known cosmetic once; equipping never grants ownership.
      unlockProfileCosmetic: (kind, id) => set(state => {
        if (kind === 'avatar' && getProfileAvatar(id)) return { ownedAvatars: { ...state.ownedAvatars, [id]: true } }
        if (kind === 'title' && getProfileTitle(id)) return { ownedTitles: { ...state.ownedTitles, [id]: true } }
        return {}
      }),
      setConnected: (isConnected) => set({ isConnected }),
      setPlayerId: (playerId) => set({ playerId }),
    }),
    { name: 'tcg-auth', version: 1,
      migrate: persisted => persisted as AuthState,
      merge: (persisted, current) => {
        const saved = (persisted ?? {}) as Partial<AuthState> & { avatarEmoji?: string }
        return { ...current, playerId: saved.playerId ?? null, displayName: saved.displayName ?? '', rank: saved.rank ?? 'Initiate', ...restoreProfileCosmetics(saved) }
      },
      partialize: ({ playerId, displayName, rank, avatarId, titleId, ownedAvatars, ownedTitles }) => ({ playerId, displayName, rank, avatarId, titleId, ownedAvatars, ownedTitles }),
    }
  )
)
