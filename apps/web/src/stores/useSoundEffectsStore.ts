import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { DEFAULT_EFFECTS_VOLUME, normalizeEffectsVolume } from '../lib/soundEffects.ts'
import type { SoundPreferences } from '../lib/soundEffects.ts'

interface SoundEffectsState extends SoundPreferences {
  setVolume: (volume: number) => void
  setMuted: (muted: boolean) => void
  unmute: () => void
}
export const useSoundEffectsStore = create<SoundEffectsState>()(persist(set => ({
  volume: DEFAULT_EFFECTS_VOLUME,
  muted: false,
  setVolume: volume => set({ volume: normalizeEffectsVolume(volume) }),
  setMuted: muted => set({ muted }),
  unmute: () => set(state => ({ muted: false, volume: state.volume || DEFAULT_EFFECTS_VOLUME })),
}), {
  name: 'tcg-sound-effects',
  partialize: ({ volume, muted }) => ({ volume, muted }),
  merge: (persisted, current) => {
    const saved = (persisted ?? {}) as Partial<SoundPreferences>
    return { ...current, volume: normalizeEffectsVolume(typeof saved.volume === 'number' ? saved.volume : DEFAULT_EFFECTS_VOLUME), muted: saved.muted === true }
  },
}))
