import { playSoundEffect } from './gameAudio.ts'
import type { SoundEffect, SoundOptions } from './soundEffects.ts'

/** Keep voices alive between cues, but cancel them when their board is left. */
export class SoundEffectScope {
  private voices = new Set<() => void>()
  private playEffect: typeof playSoundEffect
  constructor(playEffect = playSoundEffect) { this.playEffect = playEffect }

  play(sound: SoundEffect, options: SoundOptions = {}) {
    let stop = () => {}
    let finished = false
    const finish = () => {
      if (finished) return
      finished = true
      this.voices.delete(cancel)
      options.onFinish?.()
    }
    const cancel = () => {
      if (finished) return
      stop()
      finish()
    }
    // Register before playing: muted/missing audio can finish synchronously.
    this.voices.add(cancel)
    stop = this.playEffect(sound, { ...options, onFinish: finish })
    return cancel
  }

  stopAll() {
    for (const cancel of this.voices) cancel()
  }
}
