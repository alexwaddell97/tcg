import { Capacitor, registerPlugin, type PluginListenerHandle } from '@capacitor/core'
import { SOUND_EFFECTS, normalizeEffectsVolume, soundFileUrl, type SoundEffect, type SoundFileMap, type SoundOptions, type SoundPreferences } from './soundEffects.ts'

export interface NativeAudio {
  play(options: { id: string; path: string; volume: number; rate?: number }): Promise<void>
  pause(options: { id: string }): Promise<void>
  stop(options: { id: string }): Promise<void>
  volume(options: { id: string; volume: number }): Promise<void>
  addListener(event: 'ended', callback: (event: { id: string; success: boolean }) => void): Promise<PluginListenerHandle>
}
export const nativeAudio = registerPlugin<NativeAudio>('ArenaAudio')
export const usesNativeAudio = () => Capacitor.getPlatform() === 'ios'
const pathFor = (src: string) => decodeURIComponent(new URL(src, document.baseURI).pathname).replace(/^\/+/, '')
const warn = (error: unknown) => console.warn('Native audio:', error)

/** Media-like adapter keeps the existing playlist, saved volume and finale fades. */
export class NativeMusicElement extends EventTarget {
  src = ''
  preload: HTMLMediaElement['preload'] = 'metadata'
  paused = true
  private level = 1
  private silent = false
  private readonly id = `music-${crypto.randomUUID()}`
  private queue: Promise<unknown> = Promise.resolve()
  private disposed = false
  private listener: Promise<PluginListenerHandle>
  private backend: NativeAudio
  constructor(backend: NativeAudio = nativeAudio) {
    super()
    this.backend = backend
    this.listener = backend.addListener('ended', event => {
    if (event.id !== this.id || this.disposed) return
    this.paused = true
    this.dispatchEvent(new Event(event.success ? 'ended' : 'error'))
    })
  }
  get volume() { return this.level }
  set volume(value: number) { this.level = value; this.gain() }
  get muted() { return this.silent }
  set muted(value: boolean) { this.silent = value; this.gain() }
  private gain() { void this.enqueue(() => this.backend.volume({ id: this.id, volume: this.silent ? 0 : this.level })).catch(warn) }
  private enqueue(work: () => Promise<void>) {
    const result = this.queue.then(work)
    this.queue = result.catch(() => {})
    return result
  }
  play() {
    const path = pathFor(this.src)
    this.paused = false
    return this.enqueue(async () => {
      await this.listener
      await this.backend.play({ id: this.id, path, volume: this.silent ? 0 : this.level })
    }).catch(error => { this.paused = true; throw error })
  }
  pause() { this.paused = true; void this.enqueue(() => this.backend.pause({ id: this.id })).catch(warn) }
  load() { this.paused = true; void this.enqueue(() => this.backend.stop({ id: this.id })).catch(warn) }
  removeAttribute(name: string) { if (name === 'src') this.src = '' }
  destroy() {
    this.disposed = true
    this.load()
    void this.listener.then(handle => handle.remove()).catch(warn)
  }
}

/** Short native voices use the same event mapping and cancellation as web effects. */
export class NativeEffectsPlayer {
  private active = false
  private disposed = false
  private sources: SoundFileMap = { ...SOUND_EFFECTS }
  private voices = new Map<string, { cancel: () => void; gain: number }>()
  private listener: Promise<PluginListenerHandle>
  private base: string
  private preferences: SoundPreferences
  private backend: NativeAudio
  constructor(base: string, preferences: SoundPreferences, backend: NativeAudio = nativeAudio) {
    this.base = base
    this.preferences = preferences
    this.backend = backend
    this.listener = backend.addListener('ended', event => this.voices.get(event.id)?.cancel())
  }
  unlock() {} // AVAudioPlayer does not require a WebKit gesture.
  setActive(active: boolean) { this.active = active; if (!active) this.stopAll() }
  setSources(sources: SoundFileMap) { this.stopAll(); this.sources = { ...sources } }
  setPreferences(preferences: SoundPreferences) {
    this.preferences = preferences
    if (preferences.muted || preferences.volume === 0) this.stopAll()
    else for (const [id, voice] of this.voices) void this.backend.volume({ id, volume: normalizeEffectsVolume(preferences.volume) * voice.gain }).catch(warn)
  }
  play(sound: SoundEffect, options: SoundOptions = {}) {
    if (this.disposed || !this.active || this.preferences.muted || this.preferences.volume <= 0) { options.onFinish?.(); return () => {} }
    const id = `effect-${crypto.randomUUID()}`
    const gain = Number.isFinite(options.gain) ? Math.max(0, Math.min(1, options.gain!)) : 1
    let cancelled = false
    let requested = false
    const cancel = () => {
      if (cancelled) return
      cancelled = true
      clearTimeout(timer)
      this.voices.delete(id)
      if (requested) void this.backend.stop({ id }).catch(warn)
      options.onFinish?.()
    }
    const timer = setTimeout(() => {
      void this.listener.then(async () => {
        if (cancelled) return
        requested = true
        await this.backend.play({ id, path: pathFor(soundFileUrl(this.base, this.sources[sound])),
          volume: normalizeEffectsVolume(this.preferences.volume) * gain,
          rate: Number.isFinite(options.rate) ? Math.max(.5, Math.min(2, options.rate!)) : 1 })
        // A cancellation may have reached native before an asynchronous start.
        if (cancelled) await this.backend.stop({ id })
      }).catch(error => { warn(error); cancel() })
    }, Math.max(0, options.delayMs ?? 0))
    if (this.voices.size >= 12) this.voices.values().next().value?.cancel()
    this.voices.set(id, { cancel, gain })
    return cancel
  }
  private stopAll() { for (const voice of [...this.voices.values()]) voice.cancel() }
  destroy() { this.disposed = true; this.stopAll(); void this.listener.then(handle => handle.remove()).catch(warn) }
}
