import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import path from 'node:path'
const { assetPath } = createRequire(import.meta.url)('../apps/web/electron/assets.cjs')
const root = path.resolve('/tmp/arena-dist')
test('desktop protocol resolves artwork, audio and app routes inside its bundle', () => {
  assert.equal(assetPath(root, 'arena://game/ui/logo.png'), path.join(root, 'ui/logo.png'))
  assert.equal(assetPath(root, 'arena://game/music/track%20one.mp3'), path.join(root, 'music/track one.mp3'))
  assert.equal(assetPath(root, 'arena://game/collection'), path.join(root, 'index.html'))
  assert.equal(assetPath(root, 'arena://game/'), path.join(root, 'index.html'))
})
test('desktop protocol rejects other hosts and encoded traversal', () => {
  for (const url of ['https://game/ui/logo.png', 'arena://evil/ui/logo.png', 'arena://game/..%2fsecret.txt', 'arena://game/%5csecret.txt', 'arena://game/%00secret']) assert.equal(assetPath(root, url), null)
})
