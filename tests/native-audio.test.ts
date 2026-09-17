import assert from 'node:assert/strict'
import { test } from 'node:test'
import { NativeMusicElement, NativeEffectsPlayer, type NativeAudio } from '../apps/web/src/lib/nativeAudio.ts'

function backend() {
  const calls: { method: string; data: any }[] = []
  let ended: (event: { id: string; success: boolean }) => void = () => {}
  const api: NativeAudio = {
    async play(data) { calls.push({ method: 'play', data }) },
    async pause(data) { calls.push({ method: 'pause', data }) },
    async stop(data) { calls.push({ method: 'stop', data }) },
    async volume(data) { calls.push({ method: 'volume', data }) },
    async addListener(_, callback) { ended = callback; return { async remove() {} } },
  }
  return { api, calls, end: (id: string) => ended({ id, success: true }) }
}
const settle = async () => { for (let i = 0; i < 25; i++) await Promise.resolve() }

test('native music applies actual gain and preserves pause/resume and track completion', async t => {
  Object.defineProperty(globalThis, 'document', { configurable: true, value: { baseURI: 'capacitor://localhost/' } })
  t.after(() => { Reflect.deleteProperty(globalThis, 'document') })
  const { api, calls, end } = backend()
  const music = new NativeMusicElement(api)
  t.after(() => music.destroy())
  music.src = 'music/test.mp3'; music.load(); music.volume = .2
  await music.play()
  assert.equal(calls.find(call => call.method === 'play')?.data.volume, .2)
  assert.equal(calls.find(call => call.method === 'play')?.data.path, 'music/test.mp3')
  music.volume = .8; await settle()
  assert.equal(calls.at(-1)?.data.volume, .8)
  music.pause(); await settle(); assert.equal(calls.at(-1)?.method, 'pause')
  await music.play(); assert.equal(music.paused, false)
  let finished = 0; music.addEventListener('ended', () => finished++)
  end(calls.find(call => call.method === 'play')!.data.id)
  assert.equal(finished, 1); assert.equal(music.paused, true)
})

test('native effects play without gesture unlock, update volume and cancel delayed/active voices', async t => {
  Object.defineProperty(globalThis, 'document', { configurable: true, value: { baseURI: 'capacitor://localhost/' } })
  t.after(() => { Reflect.deleteProperty(globalThis, 'document') })
  t.mock.timers.enable({ apis: ['setTimeout'] })
  const { api, calls, end } = backend()
  const effects = new NativeEffectsPlayer('/sounds/', { volume: .5, muted: false }, api)
  t.after(() => effects.destroy())
  effects.setActive(true)
  let finished = 0
  effects.play('score', { gain: .8, onFinish: () => finished++ })
  t.mock.timers.tick(0); await settle()
  const play = calls.find(call => call.method === 'play')!
  assert.equal(play.data.volume, .4)
  effects.setPreferences({ volume: .25, muted: false }); await settle()
  assert.equal(calls.at(-1)?.data.volume, .2)
  end(play.data.id); assert.equal(finished, 1)
  effects.play('draw', { delayMs: 100 }); effects.setActive(false)
  t.mock.timers.tick(100); await settle()
  assert.equal(calls.filter(call => call.method === 'play').length, 1)
  assert.equal(finished, 1)
})
