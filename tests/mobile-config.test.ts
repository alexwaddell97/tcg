import assert from 'node:assert/strict'
import { test } from 'node:test'
import { resolveServerEndpoint, validateMobileServerEndpoint } from '../apps/web/src/lib/serverEndpoint.ts'

test('native previews stay offline without a configured backend; web keeps its local dev server', () => {
  assert.equal(resolveServerEndpoint(undefined, true), undefined)
  assert.equal(resolveServerEndpoint('  ', true), undefined)
  assert.equal(resolveServerEndpoint(undefined, false), 'http://localhost:3001')
  assert.equal(resolveServerEndpoint(' https://game.example.com ', true), 'https://game.example.com')
})

test('mobile builds reject insecure, loopback and credential-bearing server URLs', () => {
  for (const value of ['http://192.168.1.2:3001', 'https://localhost:3001', 'https://127.0.0.1', 'https://[::1]', 'https://user:secret@example.com', 'https://example.com?token=secret', 'https://example.com#secret', 'not a URL']) {
    assert.throws(() => validateMobileServerEndpoint(value), value)
  }
  assert.doesNotThrow(() => validateMobileServerEndpoint('https://game.example.com'))
  assert.doesNotThrow(() => validateMobileServerEndpoint(''))
})
