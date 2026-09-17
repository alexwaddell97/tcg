import assert from 'node:assert/strict'
import { test } from 'node:test'
import { advancePackTear } from '../apps/web/src/lib/packTear.ts'

test('tearing uses the displayed pack width on phones and desktops', () => {
  for (const width of [110, 230, 300]) {
    assert.equal(advancePackTear(0, 10, 10 + width * .44, width), .5)
    assert.equal(advancePackTear(0, 10, 10 + width * .88, width), 1)
  }
})
test('a partial tear can be picked up without losing progress', () => {
  const partial = advancePackTear(0, 100, 188, 200)
  assert.equal(partial, .5)
  assert.equal(advancePackTear(partial, 188, 150, 200), partial)
  assert.equal(advancePackTear(partial, 50, 138, 200), 1)
})
test('invalid layouts, backwards motion and overshoot cannot corrupt progress', () => {
  assert.equal(advancePackTear(0, 100, 0, 200), 0)
  assert.equal(advancePackTear(.2, 0, 200, 0), .2)
  assert.equal(advancePackTear(.2, 0, 200, Infinity), .2)
  assert.equal(advancePackTear(.8, 0, 500, 200), 1)
  assert.equal(advancePackTear(0, 0, 170, 200), 1, 'finish within a small tolerance of the edge')
})
