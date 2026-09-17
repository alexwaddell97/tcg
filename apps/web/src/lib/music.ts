export const MUSIC_TRACKS = [
  { title: 'Sanctum Overture', file: '40173586-magical-wizard-school-orchestral-fantasy-488126.mp3' },
  { title: 'Beyond the Rift', file: 'ob-lix-island-of-the-lost-dark-fantasy-background-music-110368.mp3' },
  { title: 'Graveyard Vigil', file: 'denis-pavlov-music-mysterious-esoteric-magical-shadowy-dark-fairytale-music-369257.mp3' },
] as const

export const DEFAULT_MUSIC_VOLUME = .25
export type MusicStatus = 'idle' | 'loading' | 'playing' | 'paused' | 'blocked' | 'error'
export interface MusicPreferences { volume: number; muted: boolean }
export function normalizeMusicVolume(value: number) {
  return Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : DEFAULT_MUSIC_VOLUME
}
