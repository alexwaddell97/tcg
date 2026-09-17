import { SOUND_EFFECTS, normalizeEffectsVolume, soundFileUrl } from './soundEffects.ts'
import type { SoundEffect, SoundFileMap, SoundOptions, SoundPreferences } from './soundEffects.ts'

type SoundContext = Pick<AudioContext, 'state' | 'currentTime' | 'destination' | 'createGain' | 'createBufferSource' | 'decodeAudioData' | 'resume' | 'suspend' | 'close'>
interface Dependencies {
  createContext: () => SoundContext
  load: (url: string, signal: AbortSignal) => Promise<ArrayBuffer>
  now: () => number
  onPlay?: (sound: SoundEffect) => void
}
const defaults: Dependencies = {
  createContext: () => new AudioContext(),
  load: async (url, signal) => {
    const response = await fetch(url, { signal })
    if (!response.ok) throw new Error(`Sound unavailable: ${response.status}`)
    return response.arrayBuffer()
  },
  now: () => performance.now(),
}
const noop = () => {}

/** Short overlapping voices, independent of music. Never queue audio behind autoplay. */
export class SoundEffectsPlayer {
  private context?: SoundContext
  private master?: GainNode
  private buffers = new Map<SoundEffect, Promise<AudioBuffer | undefined>>()
  private requests = new Set<() => void>()
  private abort = new AbortController()
  private active = false
  private disposed = false
  private preferences: SoundPreferences
  private baseUrl: string
  private dependencies: Dependencies
  private sources: SoundFileMap = { ...SOUND_EFFECTS }

  constructor(baseUrl: string, preferences: SoundPreferences, dependencies: Partial<Dependencies> = {}) {
    this.baseUrl = baseUrl
    this.preferences = { ...preferences, volume: normalizeEffectsVolume(preferences.volume) }
    this.dependencies = { ...defaults, ...dependencies }
  }

  unlock() {
    if (this.disposed || !this.active) return
    try {
      if (!this.context) {
        this.context = this.dependencies.createContext()
        this.master = this.context.createGain()
        this.master.gain.value = this.preferences.muted ? 0 : this.preferences.volume
        this.master.connect(this.context.destination)
        for (const sound of Object.keys(SOUND_EFFECTS) as SoundEffect[]) void this.buffer(sound)
      }
      this.resume()
    } catch { /* Unsupported audio must never interrupt a match. */ }
  }

  setActive(active: boolean) {
    if (this.disposed) return
    this.active = active
    if (!active) {
      this.stopAll()
      this.suspend()
    } else this.resume()
  }

  setPreferences(preferences: SoundPreferences) {
    this.preferences = { ...preferences, volume: normalizeEffectsVolume(preferences.volume) }
    if (this.master && this.context) this.master.gain.setTargetAtTime(preferences.muted ? 0 : this.preferences.volume, this.context.currentTime, .015)
    if (preferences.muted || this.preferences.volume === 0) this.stopAll()
  }

  setSources(sources: SoundFileMap) {
    if (this.disposed || (Object.keys(SOUND_EFFECTS) as SoundEffect[]).every(key => sources[key] === this.sources[key])) return
    this.stopAll()
    this.sources = { ...sources }
    this.buffers.clear()
    if (this.context) for (const sound of Object.keys(SOUND_EFFECTS) as SoundEffect[]) void this.buffer(sound)
  }

  play(sound: SoundEffect, options: SoundOptions = {}): () => void {
    if (!this.canPlay() || !this.context) { options.onFinish?.(); return noop }
    let cancelled = false
    let source: AudioBufferSourceNode | undefined
    let gain: GainNode | undefined
    const delay = Math.max(0, options.delayMs ?? 0)
    const due = this.dependencies.now() + delay
    const cancel = () => {
      if (cancelled) return
      cancelled = true
      clearTimeout(timer)
      this.requests.delete(cancel)
      try { source?.stop() } catch { /* A failed start has no voice to stop. */ }
      source?.disconnect()
      gain?.disconnect()
      options.onFinish?.()
    }
    // Scheduling even immediate cues lets React's StrictMode cleanup cancel its first mount.
    const timer = setTimeout(() => {
      void this.buffer(sound).then(buffer => {
        if (cancelled) return
        // A slow load/blocked tab must not play old events after their visuals have passed.
        if (!buffer || !this.canPlay() || this.context?.state !== 'running' || this.dependencies.now() - due > 180) { cancel(); return }
        try {
          source = this.context.createBufferSource()
          gain = this.context.createGain()
          source.buffer = buffer
          source.playbackRate.value = Number.isFinite(options.rate) ? Math.max(.5, Math.min(2, options.rate!)) : 1
          gain.gain.value = Number.isFinite(options.gain) ? Math.max(0, Math.min(1, options.gain!)) : 1
          source.connect(gain)
          gain.connect(this.master!)
          source.onended = () => {
            if (cancelled) return
            cancelled = true; source?.disconnect(); gain?.disconnect(); this.requests.delete(cancel)
            options.onFinish?.()
          }
          source.start()
          this.dependencies.onPlay?.(sound)
        } catch { cancel() }
      })
    }, delay)
    // Bound overlap even when many draws/effects arrive together.
    if (this.requests.size >= 12) this.requests.values().next().value?.()
    this.requests.add(cancel)
    return cancel
  }

  destroy() {
    this.disposed = true
    this.stopAll()
    this.abort.abort()
    this.buffers.clear()
    void this.context?.close().catch(noop)
  }

  private canPlay() { return !this.disposed && this.active && !this.preferences.muted && this.preferences.volume > 0 }
  private stopAll() { for (const cancel of [...this.requests]) cancel() }
  private suspend() {
    const context = this.context
    if (!context || this.disposed) return
    void context.suspend().then(() => {
      // A rapid tab switch can finish suspending after the page is visible again.
      if (this.active && !this.disposed) this.resume()
    }).catch(noop)
  }
  private resume() {
    const context = this.context
    if (!context || !this.active || this.disposed || context.state === 'running') return
    void context.resume().then(() => {
      if (!this.active && !this.disposed) this.suspend()
    }).catch(noop)
  }
  private buffer(sound: SoundEffect) {
    if (!this.context || this.disposed) return Promise.resolve(undefined)
    const existing = this.buffers.get(sound)
    if (existing) return existing
    const context = this.context
    const result = this.dependencies.load(soundFileUrl(this.baseUrl, this.sources[sound]), this.abort.signal)
      .then(bytes => this.disposed ? undefined : context.decodeAudioData(bytes))
      .catch(() => { if (this.buffers.get(sound) === result) this.buffers.delete(sound); return undefined })
    this.buffers.set(sound, result)
    return result
  }
}
