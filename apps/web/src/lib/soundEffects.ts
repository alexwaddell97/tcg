/** Built-in fallbacks. Custom filenames belong in public/sounds/manifest.json. */
export const SOUND_EFFECTS = {
  ui: 'ui-click.wav',
  draw: 'card-draw.wav',
  place: 'card-place.wav',
  reveal: 'card-reveal.wav',
  spell: 'spell-cast.wav',
  power: 'power-rise.wav',
  curse: 'curse.wav',
  transmute: 'transmute.wav',
  arenaReveal: 'transmute.wav',
  score: 'score-reveal.wav',
  turn: 'turn-start.wav',
  victory: 'victory.wav',
  defeat: 'defeat.wav',
  tie: 'match-draw.wav',
} as const

export type SoundEffect = keyof typeof SOUND_EFFECTS
export type SoundFileMap = Record<SoundEffect, string>
export const SOUND_LABELS: Record<SoundEffect, { name: string; trigger: string; length: string }> = {
  ui: { name: 'UI click', trigger: 'Buttons, tabs and menu navigation', length: '0.1s' },
  draw: { name: 'Card draw', trigger: 'Opening hand, turn draws and ability draws', length: 'Up to 0.4s' },
  place: { name: 'Card placement', trigger: 'Dropping a card onto the board', length: 'Up to 0.3s' },
  reveal: { name: 'Card reveal', trigger: 'Each card landing during resolution', length: 'Up to 0.4s' },
  spell: { name: 'Spell', trigger: 'Spells and arcane effects', length: 'Up to 0.7s' },
  power: { name: 'Power / growth', trigger: 'Power increases, wards and growth', length: 'Up to 0.7s' },
  curse: { name: 'Affliction / sabotage', trigger: 'Negative power and sabotage', length: 'Up to 0.7s' },
  transmute: { name: 'Transmutation', trigger: 'Transmutation and conduits', length: 'Up to 0.7s' },
  arenaReveal: { name: 'Arena reveal', trigger: 'An arena turning face up', length: 'Full impact cue' },
  score: { name: 'Final score', trigger: 'Each location score spotlight', length: 'Up to 0.7s' },
  turn: { name: 'New turn', trigger: 'The turn announcement', length: 'Up to 2s' },
  victory: { name: 'Victory', trigger: 'Result music after final scoring, with BGM faded out', length: 'Full musical cue' },
  defeat: { name: 'Defeat', trigger: 'Result music after final scoring, with BGM faded out', length: 'Full musical cue' },
  tie: { name: 'Drawn match', trigger: 'Draw result music, with BGM faded out', length: '10s with a soft fade' },
}

export function resolveSoundFiles(value: unknown): SoundFileMap {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('manifest.json must contain a sound-to-filename object.')
  const entries = value as Record<string, unknown>
  const files: SoundFileMap = { ...SOUND_EFFECTS }
  for (const sound of Object.keys(files) as SoundEffect[]) {
    const file = entries[sound]
    if (file === undefined) continue
    if (typeof file !== 'string' || !file || file.startsWith('//') || file.includes('\\') || file.includes(':') || file.split('/').some(part => part === '..' || part === '.') || !/\.(wav|mp3|ogg|m4a|aac|flac|webm)$/i.test(file)) {
      throw new Error(`Check the filename for "${sound}" in manifest.json. Use a local audio file inside public.`)
    }
    files[sound] = file
  }
  return files
}

export const soundFileUrl = (base: string, file: string) => file.startsWith('/')
  ? base.replace(/sounds\/$/, '') + file.slice(1).split('/').map(encodeURIComponent).join('/')
  : base + file.split('/').map(encodeURIComponent).join('/')
export async function loadSoundFiles(base: string, signal?: AbortSignal): Promise<{ files: SoundFileMap; warning?: string }> {
  try {
    const response = await fetch(`${base}manifest.json`, { cache: 'no-store', signal })
    if (!response.ok) throw new Error(`Could not load manifest.json (${response.status}).`)
    return { files: resolveSoundFiles(await response.json()) }
  } catch (error) {
    return { files: { ...SOUND_EFFECTS }, warning: error instanceof Error ? error.message : 'Could not read manifest.json.' }
  }
}
export interface SoundPreferences { volume: number; muted: boolean }
export interface SoundOptions { delayMs?: number; rate?: number; gain?: number; onFinish?: () => void }
export const isResultSound = (sound: SoundEffect) => sound === 'victory' || sound === 'defeat' || sound === 'tie'
export const DEFAULT_EFFECTS_VOLUME = .55
export const normalizeEffectsVolume = (value: number) => Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : DEFAULT_EFFECTS_VOLUME
