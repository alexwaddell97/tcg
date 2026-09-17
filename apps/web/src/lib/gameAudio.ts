import type { SoundEffectsPlayer } from './SoundEffectsPlayer.ts'
import type { SoundEffect, SoundOptions } from './soundEffects.ts'

type EffectsPlayer = Pick<SoundEffectsPlayer, 'play'>
let player: EffectsPlayer | undefined
export function attachSoundEffects(playerInstance: EffectsPlayer) {
  player = playerInstance
  return () => { if (player === playerInstance) player = undefined }
}
export function playSoundEffect(sound: SoundEffect, options?: SoundOptions): () => void {
  if (player) return player.play(sound, options)
  options?.onFinish?.()
  return () => {}
}
