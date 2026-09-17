import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { DEFAULT_MUSIC_VOLUME, normalizeMusicVolume, type MusicPreferences, type MusicStatus } from '../lib/music.ts'

interface MusicState extends MusicPreferences {
  status: MusicStatus
  trackIndex: number
  nextRequest: number
  playRequest: number
  ducked: boolean
  setVolume: (volume: number) => void
  setMuted: (muted: boolean) => void
  nextTrack: () => void
  play: () => void
  setDucked: (ducked: boolean) => void
}

export const useMusicStore = create<MusicState>()(persist(set => ({
  volume: DEFAULT_MUSIC_VOLUME,
  muted: false,
  status: 'idle',
  trackIndex: 0,
  nextRequest: 0,
  playRequest: 0,
  ducked: false,
  setDucked: ducked => set({ ducked }),
  setVolume: volume => set({ volume: normalizeMusicVolume(volume) }),
  setMuted: muted => set({ muted }),
  nextTrack: () => set(state => ({ nextRequest: state.nextRequest + 1 })),
  play: () => set(state => ({ muted: false, volume: state.volume || DEFAULT_MUSIC_VOLUME, playRequest: state.playRequest + 1 })),
}), {
  name: 'tcg-music',
  partialize: ({ volume, muted }) => ({ volume, muted }),
  merge: (persisted, current) => {
    const saved = (persisted ?? {}) as Partial<MusicPreferences>
    return { ...current, volume: normalizeMusicVolume(typeof saved.volume === 'number' ? saved.volume : DEFAULT_MUSIC_VOLUME), muted: saved.muted === true }
  },
}))
