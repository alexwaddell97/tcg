import { normalizeMusicVolume, type MusicPreferences, type MusicStatus } from './music.ts'

type AudioElement = Pick<HTMLAudioElement, 'src' | 'volume' | 'muted' | 'paused' | 'preload' | 'play' | 'pause' | 'load' | 'removeAttribute' | 'addEventListener' | 'removeEventListener'>
type Snapshot = { status: MusicStatus; trackIndex: number }

/** One player for the lifetime of the app, independent of route changes. */
export class MusicPlayer {
  private audio: AudioElement
  private sources: readonly string[]
  private update: (snapshot: Snapshot) => void
  private preferences: MusicPreferences
  private unlocked = false
  private active = false
  private disposed = false
  private pending = false
  private attempt = 0
  private trackIndex = 0
  private failed = new Set<number>()
  private mixLevel = 1
  private mixTarget = 1
  private fadeTimer?: ReturnType<typeof setTimeout>

  constructor(audio: AudioElement, sources: readonly string[], preferences: MusicPreferences, update: (snapshot: Snapshot) => void) {
    this.audio = audio
    this.sources = sources
    this.update = update
    this.preferences = preferences
    audio.preload = 'metadata'
    audio.addEventListener('ended', this.ended)
    audio.addEventListener('error', this.failedTrack)
    this.loadTrack(0)
    this.setPreferences(preferences)
  }

  private report(status: MusicStatus) {
    if (!this.disposed) this.update({ status, trackIndex: this.trackIndex })
  }

  private shouldPlay() {
    return !this.disposed && this.unlocked && this.active && !this.preferences.muted && this.preferences.volume > 0 && this.mixLevel > 0 && this.failed.size < this.sources.length
  }

  private pause() {
    this.attempt++
    this.pending = false
    this.audio.pause()
  }

  private loadTrack(index: number) {
    this.pause()
    this.trackIndex = index
    this.audio.src = this.sources[index]
    this.audio.load()
    this.report('idle')
  }

  private tryPlay() {
    if (!this.shouldPlay() || this.pending || !this.audio.paused) return
    const attempt = ++this.attempt
    this.pending = true
    this.report('loading')
    // Called directly in the first pointer/key handler to satisfy autoplay policy.
    this.audio.play().then(() => {
      if (this.disposed || attempt !== this.attempt) return
      this.pending = false
      if (this.shouldPlay()) this.report('playing')
      else this.pause()
    }).catch((error: unknown) => {
      if (this.disposed || attempt !== this.attempt) return
      this.pending = false
      if (error instanceof Error && error.name === 'NotAllowedError') this.report('blocked')
      else if (error instanceof Error && error.name === 'AbortError') this.report('paused')
      else this.failedTrack()
    })
  }

  private ended = () => {
    this.failed.clear()
    this.advance()
  }

  private advance() {
    let next = (this.trackIndex + 1) % this.sources.length
    while (this.failed.has(next)) next = (next + 1) % this.sources.length
    this.loadTrack(next)
    this.tryPlay()
  }

  private failedTrack = () => {
    if (this.disposed) return
    this.failed.add(this.trackIndex)
    this.pause()
    if (this.failed.size >= this.sources.length) this.report('error')
    else this.advance()
  }

  unlock() {
    if (this.disposed) return
    this.unlocked = true
    this.tryPlay()
  }

  resume() {
    if (this.disposed) return
    if (this.failed.size >= this.sources.length) {
      this.failed.clear()
      this.loadTrack(this.trackIndex)
    }
    this.unlock()
  }

  next() {
    if (this.disposed) return
    this.failed.clear()
    this.unlocked = true
    this.advance()
  }

  setActive(active: boolean) {
    this.active = active
    if (active) this.tryPlay()
    else { this.pause(); this.report('paused') }
  }

  setPreferences(preferences: MusicPreferences) {
    this.preferences = { muted: preferences.muted, volume: normalizeMusicVolume(preferences.volume) }
    this.audio.muted = this.preferences.muted
    this.applyVolume()
  }

  /** Temporary cinematic gain; never changes or persists the user's volume setting. */
  setMixLevel(level: number, durationMs: number) {
    if (this.disposed) return
    const target = Math.max(0, Math.min(1, Number.isFinite(level) ? level : 1))
    if (target === this.mixTarget && durationMs > 0) return
    clearTimeout(this.fadeTimer)
    this.mixTarget = target
    const startLevel = this.mixLevel
    const started = Date.now()
    const duration = Number.isFinite(durationMs) ? Math.max(0, durationMs) : 0
    const step = () => {
      if (this.disposed) return
      const progress = duration ? Math.min(1, Math.max(0, (Date.now() - started) / duration)) : 1
      const smooth = progress * progress * (3 - 2 * progress)
      this.mixLevel = startLevel + (target - startLevel) * smooth
      this.applyVolume()
      this.fadeTimer = progress < 1 ? setTimeout(step, 30) : undefined
    }
    step()
  }

  private applyVolume() {
    this.audio.volume = this.preferences.volume * this.mixLevel
    if (this.preferences.muted || this.preferences.volume === 0 || this.mixLevel === 0) { this.pause(); this.report('paused') }
    else this.tryPlay()
  }

  destroy() {
    this.disposed = true
    clearTimeout(this.fadeTimer)
    this.audio.removeEventListener('ended', this.ended)
    this.audio.removeEventListener('error', this.failedTrack)
    this.pause()
    this.audio.removeAttribute('src')
    this.audio.load()
  }
}
