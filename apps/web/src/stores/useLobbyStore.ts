import { create } from 'zustand'

type MatchmakingStatus = 'idle' | 'searching' | 'found'

interface MatchmakingState {
  status: MatchmakingStatus
  queueSize: number
  setStatus: (status: MatchmakingStatus) => void
  setQueueSize: (size: number) => void
}

export const useMatchmakingStore = create<MatchmakingState>()((set) => ({
  status: 'idle',
  queueSize: 0,
  setStatus: (status) => set({ status }),
  setQueueSize: (queueSize) => set({ queueSize }),
}))
