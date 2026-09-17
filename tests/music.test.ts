import assert from 'node:assert/strict'
import { test } from 'node:test'
import { existsSync } from 'node:fs'
import { MusicPlayer } from '../apps/web/src/lib/MusicPlayer.ts'
import { MUSIC_TRACKS, normalizeMusicVolume, type MusicStatus } from '../apps/web/src/lib/music.ts'

class FakeAudio extends EventTarget {
  src = ''
  volume = 1
  muted = false
  paused = true
  preload = ''
  currentTime = 0
  playCalls = 0
  loads = 0
  playResult: (() => Promise<void>) | undefined
  play() { this.playCalls++; this.paused = false; return this.playResult?.() ?? Promise.resolve() }
  pause() { this.paused = true }
  load() { this.loads++; this.currentTime = 0 }
  removeAttribute(name: string) { if (name === 'src') this.src = '' }
}
const settle = async () => { await Promise.resolve(); await Promise.resolve(); await Promise.resolve() }
function setup(muted = false) {
  const audio = new FakeAudio()
  let snapshot = { status: 'idle' as MusicStatus, trackIndex: 0 }
  const player = new MusicPlayer(audio, ['one.mp3', 'two.mp3', 'three.mp3'], { volume: .25, muted }, next => { snapshot = next })
  return { audio, player, status: () => snapshot }
}

test('all playlist entries resolve to the supplied local MP3s', () => {
  assert.equal(MUSIC_TRACKS.length, 3)
  for (const track of MUSIC_TRACKS) assert.ok(existsSync(`apps/web/public/music/${track.file}`))
})

test('music waits for interaction and visibility; pause/resume preserves position', async () => {
  const { audio, player, status } = setup()
  player.setActive(true)
  assert.equal(audio.playCalls, 0)
  player.unlock()
  await settle()
  assert.equal(status().status, 'playing')
  audio.currentTime = 42
  player.unlock()
  assert.equal(audio.playCalls, 1, 'ordinary later clicks do not restart playback')
  player.setActive(false)
  assert.equal(audio.paused, true)
  player.setActive(true)
  await settle()
  assert.equal(audio.currentTime, 42)
  assert.equal(status().status, 'playing')
  player.destroy()
})

test('saved mute and zero volume prevent playback and unmute resumes the same track', async () => {
  const { audio, player } = setup(true)
  player.setActive(true)
  player.unlock()
  assert.equal(audio.playCalls, 0)
  player.setPreferences({ volume: .4, muted: false })
  await settle()
  assert.equal(audio.volume, .4)
  audio.currentTime = 20
  player.setPreferences({ volume: 0, muted: false })
  assert.equal(audio.paused, true)
  player.setPreferences({ volume: .7, muted: false })
  await settle()
  assert.equal(audio.currentTime, 20)
  assert.equal(audio.paused, false)
  player.destroy()
})

test('the playlist advances on end and loops through all three tracks', async () => {
  const { audio, player } = setup()
  player.setActive(true); player.unlock(); await settle()
  for (const expected of ['two.mp3', 'three.mp3', 'one.mp3']) {
    audio.dispatchEvent(new Event('ended')); await settle()
    assert.equal(audio.src, expected)
    assert.equal(audio.paused, false)
  }
  player.setPreferences({ muted: true, volume: .25 })
  player.next()
  assert.equal(audio.src, 'two.mp3')
  assert.equal(audio.paused, true, 'changing tracks must not unmute')
  player.destroy()
})

test('autoplay rejection is recoverable on the next interaction', async () => {
  const { audio, player, status } = setup()
  audio.playResult = () => { audio.paused = true; return Promise.reject(Object.assign(new Error('Blocked'), { name: 'NotAllowedError' })) }
  player.setActive(true); player.unlock(); await settle()
  assert.equal(status().status, 'blocked')
  audio.playResult = undefined
  player.unlock(); await settle()
  assert.equal(status().status, 'playing')
  player.destroy()
})

test('late play promises cannot undo mute, skip or disposal', async () => {
  const { audio, player, status } = setup()
  let resolve!: () => void
  audio.playResult = () => new Promise<void>(done => { resolve = done })
  player.setActive(true); player.unlock()
  player.setPreferences({ muted: true, volume: .25 })
  resolve(); await settle()
  assert.equal(status().status, 'paused')
  assert.equal(audio.paused, true)
  player.next()
  assert.equal(audio.src, 'two.mp3')
  player.destroy()
  audio.dispatchEvent(new Event('ended'))
  assert.equal(audio.src, '')
  assert.equal(audio.paused, true)
})

test('missing tracks are skipped with a bounded failure and explicit retry', async () => {
  const { audio, player, status } = setup()
  for (let index = 0; index < 3; index++) audio.dispatchEvent(new Event('error'))
  assert.equal(audio.loads, 3, 'do not loop failed network requests')
  assert.equal(status().status, 'error')
  player.setActive(true); player.unlock()
  assert.equal(audio.playCalls, 0)
  player.resume(); await settle()
  assert.equal(status().status, 'playing')
  player.destroy()
})

test('volume validation and saved preferences survive reload without persisting playback state', async () => {
  assert.equal(normalizeMusicVolume(NaN), .25)
  assert.equal(normalizeMusicVolume(-1), 0)
  assert.equal(normalizeMusicVolume(2), 1)
  const memory = new Map<string, string>([['tcg-music', JSON.stringify({ version: 0, state: { volume: .6, muted: true, status: 'playing', nextRequest: 99, ducked: true } })]])
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: (key: string) => memory.get(key) ?? null,
    setItem: (key: string, value: string) => memory.set(key, value),
    removeItem: (key: string) => memory.delete(key),
  } })
  Object.defineProperty(globalThis, 'window', { configurable: true, value: { localStorage: globalThis.localStorage } })
  const { useMusicStore } = await import('../apps/web/src/stores/useMusicStore.ts')
  assert.equal(useMusicStore.getState().volume, .6)
  assert.equal(useMusicStore.getState().muted, true)
  assert.equal(useMusicStore.getState().status, 'idle')
  assert.equal(useMusicStore.getState().nextRequest, 0)
  assert.equal(useMusicStore.getState().ducked, false, 'a previous session cannot leave music ducked')
  useMusicStore.getState().setVolume(.32)
  useMusicStore.getState().setMuted(false)
  await useMusicStore.persist.rehydrate()
  assert.deepEqual(JSON.parse(memory.get('tcg-music')!).state, { volume: .32, muted: false })
})

test('finale gain fades smoothly to silence and resumes the same playlist position', async t => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'] })
  const { audio, player } = setup()
  t.after(() => player.destroy())
  player.setActive(true); player.unlock(); await settle()
  audio.currentTime = 42
  player.setMixLevel(0, 1500)
  assert.equal(audio.volume, .25)
  t.mock.timers.tick(750)
  assert.ok(audio.volume > 0 && audio.volume < .25)
  assert.equal(audio.paused, false)
  t.mock.timers.tick(750)
  assert.equal(audio.volume, 0)
  assert.equal(audio.paused, true)
  assert.equal(audio.currentTime, 42)
  player.setMixLevel(1, 1800)
  t.mock.timers.tick(900); await settle()
  assert.equal(audio.paused, false)
  assert.ok(audio.volume > 0 && audio.volume < .25)
  t.mock.timers.tick(900)
  assert.equal(audio.volume, .25)
  assert.equal(audio.src, 'one.mp3')
  assert.equal(audio.currentTime, 42)
})

test('volume changes, mute and next-track cannot bypass the finale mix', async t => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'] })
  const { audio, player } = setup()
  t.after(() => player.destroy())
  player.setActive(true); player.unlock(); await settle()
  player.setMixLevel(0, 1500); t.mock.timers.tick(750)
  player.setPreferences({ volume: .6, muted: false })
  assert.ok(audio.volume > 0 && audio.volume < .6)
  t.mock.timers.tick(750)
  player.next(); player.resume(); await settle()
  assert.equal(audio.volume, 0)
  assert.equal(audio.paused, true)
  player.setPreferences({ volume: .6, muted: true })
  player.setMixLevel(1, 1800); t.mock.timers.tick(1800); await settle()
  assert.equal(audio.paused, true)
  assert.equal(audio.muted, true)
  player.setPreferences({ volume: .6, muted: false }); await settle()
  assert.equal(audio.volume, .6)
  assert.equal(audio.paused, false)
})

test('leaving midway reverses the current fade without a volume jump; disposal cancels timers', async t => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'] })
  const { audio, player } = setup()
  player.setActive(true); player.unlock(); await settle()
  player.setMixLevel(0, 1500); t.mock.timers.tick(600)
  const current = audio.volume
  player.setMixLevel(1, 1800)
  assert.equal(audio.volume, current)
  t.mock.timers.tick(900)
  assert.ok(audio.volume > current && audio.volume < .25)
  player.destroy()
  const disposedVolume = audio.volume
  t.mock.timers.tick(5000)
  assert.equal(audio.volume, disposedVolume)
  assert.equal(audio.paused, true)
})

test('old result cleanup cannot release a newer finale and music ducking is not saved', async () => {
  const { holdBackgroundMusic } = await import('../apps/web/src/lib/musicMix.ts')
  const { useMusicStore } = await import('../apps/web/src/stores/useMusicStore.ts')
  const first = holdBackgroundMusic(), second = holdBackgroundMusic()
  assert.equal(useMusicStore.getState().ducked, true)
  first(); first()
  assert.equal(useMusicStore.getState().ducked, true)
  assert.equal(JSON.parse(localStorage.getItem('tcg-music')!).state.ducked, undefined)
  second()
  assert.equal(useMusicStore.getState().ducked, false)
})
