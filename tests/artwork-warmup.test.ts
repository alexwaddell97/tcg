import { test } from 'node:test'
import assert from 'node:assert/strict'
import { warmArtwork } from '../apps/web/src/lib/artworkWarmup.ts'

test('artwork warmup deduplicates URLs and limits concurrent preparation', async () => {
  let running = 0, peak = 0
  const seen: string[] = [], progress: number[] = []
  await warmArtwork(['a', 'b', 'a', 'c', 'd'], n => progress.push(n), async url => {
    seen.push(url); running++; peak = Math.max(peak, running)
    await new Promise(resolve => setTimeout(resolve, 3))
    running--
  }, { concurrency: 2, deadlineMs: 1000 })
  assert.equal(peak, 2)
  assert.equal(seen.length, 4)
  assert.equal(progress.at(-1), 1)
  assert.ok(progress.every((n, i) => i === 0 || n >= progress[i - 1]))
})
test('optional image failure or an expired budget does not prevent boot', async () => {
  await assert.doesNotReject(warmArtwork(['missing'], () => {}, async () => { throw new Error('404') }))
  const seen: string[] = []
  await warmArtwork(['a', 'b'], () => {}, async url => { seen.push(url) }, { concurrency: 2, deadlineMs: 0 })
  assert.deepEqual(seen, [])
})
