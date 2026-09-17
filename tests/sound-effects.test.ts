import assert from 'node:assert/strict'
import { test, type TestContext } from 'node:test'
import { existsSync, readFileSync } from 'node:fs'
import { SoundEffectsPlayer } from '../apps/web/src/lib/SoundEffectsPlayer.ts'
import { SoundEffectScope } from '../apps/web/src/lib/SoundEffectScope.ts'
import { DRAW_STAGGER } from '../apps/web/src/lib/arenaDraw.ts'
import { SOUND_EFFECTS, normalizeEffectsVolume, resolveSoundFiles, soundFileUrl, loadSoundFiles } from '../apps/web/src/lib/soundEffects.ts'
import { arenaSoundCue, isArenaFinale } from '../apps/web/src/lib/arenaSounds.ts'
import { createArenaEffectsDemo, createArenaEndingDemo } from '../apps/web/src/lib/arenaEffectsDemo.ts'
import { advanceArenaPlayback, createArenaPlayback, syncArenaPlayback } from '../apps/web/src/lib/arenaPlayback.ts'

class FakeParam {
  value = 1
  setTargetAtTime(value: number) { this.value = value }
}
class FakeGain {
  gain = new FakeParam()
  connect() {}
  disconnect() {}
}
class FakeSource {
  buffer: AudioBuffer | null = null
  playbackRate = new FakeParam()
  onended: (() => void) | null = null
  started = false
  stopped = false
  connect() {}
  disconnect() {}
  start() { this.started = true }
  stop() { this.stopped = true }
}
class FakeContext {
  state: AudioContextState = 'suspended'
  currentTime = 0
  destination = {} as AudioDestinationNode
  gains: FakeGain[] = []
  sources: FakeSource[] = []
  blocked = false
  createGain() { const node = new FakeGain(); this.gains.push(node); return node as unknown as GainNode }
  createBufferSource() { const node = new FakeSource(); this.sources.push(node); return node as unknown as AudioBufferSourceNode }
  decodeAudioData() { return Promise.resolve({ duration: .7 } as AudioBuffer) }
  resume() {
    if (this.blocked) return Promise.reject(new Error('Blocked'))
    this.state = 'running'; return Promise.resolve()
  }
  suspend() { this.state = 'suspended'; return Promise.resolve() }
  close() { this.state = 'closed'; return Promise.resolve() }
}
const settle = async () => { for (let i = 0; i < 8; i++) await Promise.resolve() }
function setup(t: TestContext, load: (url: string, signal: AbortSignal) => Promise<ArrayBuffer> = async () => new ArrayBuffer(4)) {
  t.mock.timers.enable({ apis: ['setTimeout'] })
  const context = new FakeContext()
  let now = 0, created = 0
  const player = new SoundEffectsPlayer('/sounds/', { volume: .55, muted: false }, {
    createContext: () => { created++; return context }, load, now: () => now,
  })
  t.after(() => player.destroy())
  const tick = async (ms = 0) => { now += ms; t.mock.timers.tick(ms); await settle() }
  return { player, context, tick, created: () => created }
}

test('generated and prepared recordings are valid stereo PCM with headroom and faded ends', () => {
  const configured = resolveSoundFiles(JSON.parse(readFileSync('apps/web/public/sounds/manifest.json', 'utf8')))
  const filenames = new Set([...Object.values(SOUND_EFFECTS), ...Object.values(configured).filter(file => file.endsWith('.wav') && !file.startsWith('/'))])
  for (const filename of filenames) {
    const file = readFileSync(`apps/web/public/sounds/${filename}`)
    assert.equal(file.toString('ascii', 0, 4), 'RIFF')
    assert.equal(file.toString('ascii', 8, 12), 'WAVE')
    assert.equal(file.readUInt16LE(20), 1)
    assert.equal(file.readUInt16LE(22), 2)
    assert.equal(file.readUInt32LE(24), 44100)
    assert.equal(file.readUInt16LE(34), 16)
    let peak = 0, energy = 0
    for (let i = 44; i < file.length; i += 2) { const value = file.readInt16LE(i); peak = Math.max(peak, Math.abs(value)); energy += value * value }
    assert.ok(peak > 1000 && peak < 24000, filename)
    assert.ok(energy > 0, filename)
    assert.equal(file.readInt16LE(44), 0)
    assert.equal(file.readInt16LE(file.length - 2), 0)
  }
})

test('effects wait for an interaction, allow overlapping voices, and respect draw staggering', async t => {
  const { player, context, created, tick } = setup(t)
  player.setActive(true); player.play('draw'); await tick()
  assert.equal(created(), 0)
  player.unlock(); await settle()
  player.play('draw')
  player.play('draw', { delayMs: DRAW_STAGGER })
  await tick()
  assert.equal(context.sources.length, 1)
  await tick(DRAW_STAGGER - 1)
  assert.equal(context.sources.length, 1)
  await tick(1)
  assert.equal(context.sources.length, 2)
  assert.equal(context.sources[1].playbackRate.value, 1)
  assert.ok(context.sources.every(source => source.started && !source.stopped))
  player.unlock()
  assert.equal(created(), 1)
})

test('cancelled StrictMode mounts and repeated settings renders do not leave pending voices', async t => {
  const { player, context, tick } = setup(t)
  player.setActive(true); player.unlock(); await settle()
  const cancelFirstMount = player.play('turn')
  cancelFirstMount()
  const cancelSecondMount = player.play('turn')
  await tick()
  assert.equal(context.sources.length, 1)
  cancelSecondMount()
  assert.equal(context.sources[0].stopped, true)
  player.play('draw', { delayMs: 110 })()
  await tick(110)
  assert.equal(context.sources.length, 1)
})

test('board cue changes let sound tails finish, while leaving cancels unfinished and scheduled voices', async t => {
  const { player, context, tick } = setup(t)
  const sounds = new SoundEffectScope(player.play.bind(player))
  player.setActive(true); player.unlock(); await settle()
  let completed = 0
  sounds.play('arenaReveal', { onFinish: () => completed++ }); await tick()
  sounds.play('reveal'); await tick()
  assert.equal(context.sources.length, 2)
  assert.ok(context.sources.every(source => !source.stopped), 'the next cue must not cancel the previous recording')
  context.sources[0].onended!()
  assert.equal(completed, 1)
  sounds.play('draw', { delayMs: DRAW_STAGGER })
  sounds.stopAll(); await tick(DRAW_STAGGER)
  assert.equal(context.sources[0].stopped, false, 'finished voices are released, not retained until unmount')
  assert.equal(context.sources[1].stopped, true)
  assert.equal(context.sources.length, 2, 'a queued draw cannot play after leaving the board')
  sounds.stopAll()
  assert.equal(completed, 1)
})

test('board sound scopes can clean up and remount under StrictMode without duplicate audio', async t => {
  const { player, context, tick } = setup(t)
  const sounds = new SoundEffectScope(player.play.bind(player))
  player.setActive(true); player.unlock(); await settle()
  sounds.play('turn'); sounds.stopAll()
  sounds.play('turn'); await tick()
  assert.equal(context.sources.length, 1)
  sounds.stopAll()
  assert.equal(context.sources[0].stopped, true)
})

test('synchronous skipped audio releases its scope and result callback exactly once', () => {
  let finished = 0, cancelled = 0
  const sounds = new SoundEffectScope((_sound, options) => {
    options?.onFinish?.()
    return () => cancelled++
  })
  const cancel = sounds.play('victory', { onFinish: () => finished++ })
  sounds.stopAll(); cancel()
  assert.equal(finished, 1)
  assert.equal(cancelled, 0)
})

test('mute, zero volume and hidden pages cancel active and delayed sounds without replaying them', async t => {
  const { player, context, tick } = setup(t)
  player.setActive(true); player.unlock(); await settle()
  player.play('victory'); player.play('draw', { delayMs: 110 }); await tick()
  player.setPreferences({ muted: true, volume: .4 })
  assert.equal(context.gains[0].gain.value, 0)
  assert.equal(context.sources[0].stopped, true)
  await tick(110)
  player.setPreferences({ muted: false, volume: .4 }); await tick()
  assert.equal(context.sources.length, 1)
  assert.equal(context.gains[0].gain.value, .4)
  player.play('score'); player.play('draw', { delayMs: 110 }); await tick()
  player.setActive(false); await tick(110)
  assert.equal(context.sources[1].stopped, true)
  assert.equal(context.state, 'suspended')
  player.play('defeat'); player.setActive(true); await tick()
  assert.equal(context.sources.length, 2)
  player.setPreferences({ muted: false, volume: 0 }); player.play('score'); await tick()
  assert.equal(context.sources.length, 2)
})

test('blocked autoplay skips stale cues and retries on a later gesture', async t => {
  const { player, context, tick } = setup(t)
  context.blocked = true
  player.setActive(true); player.unlock(); await settle()
  player.play('turn'); await tick()
  assert.equal(context.sources.length, 0)
  context.blocked = false
  player.unlock(); await settle(); player.play('draw'); await tick()
  assert.equal(context.sources.length, 1)
})

test('a slow suspend cannot leave a newly visible page silent', async t => {
  const { player, context, tick } = setup(t)
  player.setActive(true); player.unlock(); await settle()
  let finish!: () => void
  context.suspend = () => new Promise<void>(resolve => { finish = () => { context.state = 'suspended'; resolve() } })
  player.setActive(false)
  player.setActive(true)
  finish(); await settle()
  assert.equal(context.state, 'running')
  player.play('draw'); await tick()
  assert.equal(context.sources.length, 1)
})

test('late file loads cannot play out of sync, and disposal aborts pending loads', async t => {
  let finish!: (value: ArrayBuffer) => void
  let signal: AbortSignal | undefined
  const pending = new Promise<ArrayBuffer>(resolve => { finish = resolve })
  const { player, context, tick } = setup(t, async (_url, nextSignal) => { signal = nextSignal; return pending })
  player.setActive(true); player.unlock(); player.play('score'); await tick()
  await tick(250); finish(new ArrayBuffer(4)); await settle()
  assert.equal(context.sources.length, 0)
  player.play('draw'); await tick()
  assert.equal(context.sources.length, 1, 'later cues can use the now-cached buffer')
  player.play('score', { delayMs: 110 }); player.destroy(); await tick(110)
  assert.equal(signal?.aborted, true)
  assert.equal(context.sources.length, 1)
  assert.equal(context.sources[0].stopped, true)
  assert.equal(context.state, 'closed')
})

test('missing assets fail quietly and concurrent voices are bounded', async t => {
  let fail = true
  const { player, context, tick } = setup(t, async () => {
    if (fail) throw new Error('Missing file')
    return new ArrayBuffer(4)
  })
  player.setActive(true); player.unlock(); await settle(); player.play('draw'); await tick()
  assert.equal(context.sources.length, 0)
  fail = false
  for (let i = 0; i < 20; i++) player.play('draw')
  await tick()
  assert.equal(context.sources.length, 12)
})

test('each outcome follows three increasingly weighted score flashes, without changing recording pitch', () => {
  for (const outcome of ['victory', 'defeat', 'draw'] as const) {
    const { before, after } = createArenaEndingDemo(outcome)
    let playback = syncArenaPlayback(createArenaPlayback(before), after)
    const cues = []
    while (playback.frames.length) {
      const frame = playback.frames[playback.index]
      const cue = arenaSoundCue(playback.display, frame, 'you')
      if (cue) { cues.push(cue); assert.equal(cue.sound, 'score') }
      playback = advanceArenaPlayback(playback, frame.id)
    }
    assert.deepEqual(cues.map(cue => cue.gain), [.78, .9, 1])
    assert.ok(cues.every(cue => !('rate' in cue)))
    assert.equal(new Set(cues.map(cue => cue.id)).size, 3)
    const result = arenaSoundCue(playback.display, undefined, 'you')!
    assert.equal(result.sound, outcome === 'draw' ? 'tie' : outcome)
    assert.deepEqual(arenaSoundCue(structuredClone(after), undefined, 'you'), result, 'duplicate state has the same effect dependency')
  }
})

test('card landing, cast and negative-power sounds follow actual reveal frames', () => {
  const { before, after } = createArenaEffectsDemo()
  let playback = syncArenaPlayback(createArenaPlayback(before), after)
  const sounds = []
  while (playback.frames.length) {
    const frame = playback.frames[playback.index]
    const cue = arenaSoundCue(playback.display, frame, 'you')
    if (cue) sounds.push(cue.sound)
    if (frame.phase === 'arrive') assert.equal(cue?.sound, 'reveal')
    playback = advanceArenaPlayback(playback, frame.id)
  }
  assert.ok(sounds.includes('curse'))
  assert.ok(sounds.includes('spell'))
  assert.equal(sounds.filter(sound => sound === 'reveal').length, 4)
  assert.ok(!sounds.includes('victory') && !sounds.includes('defeat'))
})

test('effects volume is finite and constrained', () => {
  assert.equal(normalizeEffectsVolume(-1), 0)
  assert.equal(normalizeEffectsVolume(2), 1)
  assert.equal(normalizeEffectsVolume(NaN), .55)
  assert.equal(normalizeEffectsVolume(Infinity), .55)
})

test('editable manifest resolves local WAV/MP3 filenames, public SE paths and defaults for omissions', () => {
  const files = resolveSoundFiles({ draw: '/SE/paper slide.mp3', spell: 'custom/fire.wav' })
  assert.equal(soundFileUrl('/game/sounds/', files.draw), '/game/SE/paper%20slide.mp3')
  assert.equal(soundFileUrl('/game/sounds/', files.spell), '/game/sounds/custom/fire.wav')
  assert.equal(files.victory, SOUND_EFFECTS.victory)
  for (const file of ['../music/test.mp3', '/SE/../test.mp3', '//example.com/test.mp3', 'https://example.com/test.mp3', 'test.txt', 4]) {
    assert.throws(() => resolveSoundFiles({ draw: file }))
  }
  assert.throws(() => resolveSoundFiles([]))
  const configured = resolveSoundFiles(JSON.parse(readFileSync('apps/web/public/sounds/manifest.json', 'utf8')))
  for (const file of Object.values(configured)) {
    const relative = file.startsWith('/') ? file.slice(1) : `sounds/${file}`
    assert.ok(existsSync(`apps/web/public/${relative}`), file)
  }
})

test('manifest replacements reach the audio loader and cancel cached or pending old cues', async t => {
  const requests: string[] = []
  const { player, context, tick } = setup(t, async url => { requests.push(url); return new ArrayBuffer(4) })
  player.setActive(true); player.unlock(); await settle()
  player.play('draw', { delayMs: 100 })
  player.setSources(resolveSoundFiles({ draw: '/SE/new draw.mp3' })); await settle()
  await tick(100)
  assert.equal(context.sources.length, 0)
  assert.ok(requests.includes('/SE/new%20draw.mp3'))
  player.play('draw'); await tick()
  assert.equal(context.sources.length, 1)
  assert.equal(context.sources[0].playbackRate.value, 1)
})

test('manifest load errors fall back with a useful warning, while valid replacements are loaded uncached', async t => {
  let requestCache: RequestCache | undefined
  t.mock.method(globalThis, 'fetch', async (_url: string, options: RequestInit) => {
    requestCache = options.cache
    return new Response(JSON.stringify({ draw: '/SE/card-draw.mp3' }))
  })
  assert.equal((await loadSoundFiles('/sounds/')).files.draw, '/SE/card-draw.mp3')
  assert.equal(requestCache, 'no-store')
  t.mock.method(globalThis, 'fetch', async () => new Response('invalid json'))
  const fallback = await loadSoundFiles('/sounds/')
  assert.deepEqual(fallback.files, SOUND_EFFECTS)
  assert.ok(fallback.warning)
})

test('result completion fires once on natural end, cancellation or an unavailable cue', async t => {
  const { player, context, tick } = setup(t)
  let completions = 0
  const onFinish = () => completions++
  player.play('victory', { onFinish })
  assert.equal(completions, 1, 'blocked audio releases its music hold')
  player.setActive(true); player.unlock(); await settle()
  const cancel = player.play('victory', { onFinish }); await tick()
  context.sources[0].onended?.()
  cancel(); context.sources[0].onended?.()
  assert.equal(completions, 2)
  const cancelDefeat = player.play('defeat', { onFinish }); await tick()
  cancelDefeat(); context.sources[1].onended?.()
  assert.equal(completions, 3)
  player.play('victory', { onFinish }); await tick()
  player.setPreferences({ volume: .55, muted: true })
  assert.equal(completions, 4, 'muting a result releases the music hold')
  player.destroy()
  assert.equal(completions, 4)
})

test('missing result recordings release music instead of leaving it permanently silent', async t => {
  const { player, tick } = setup(t, async () => { throw new Error('Missing') })
  player.setActive(true); player.unlock(); await settle()
  let finished = 0
  player.play('victory', { onFinish: () => finished++ }); await tick()
  assert.equal(finished, 1)
})

test('BGM ducking begins with visible score counting, after all card effects, and continues into the result', () => {
  const { before, after } = createArenaEffectsDemo()
  let playback = syncArenaPlayback(createArenaPlayback(before), after)
  while (playback.frames.length) {
    const frame = playback.frames[playback.index]
    assert.equal(isArenaFinale(playback.display, frame), frame.phase === 'score-focus' || frame.phase === 'score-summary')
    playback = advanceArenaPlayback(playback, frame.id)
  }
  assert.equal(isArenaFinale(playback.display, undefined), true)
  assert.equal(isArenaFinale(before, undefined), false)
})
