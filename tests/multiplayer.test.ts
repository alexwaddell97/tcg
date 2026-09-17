import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { Card, HexCellState } from '../packages/shared/src/index.ts'
import { CARD_DATABASE, coordToKey, getAllHexCoords, getHexCaptures, getHexNeighbors, getHexValues, getOppositeDirection, hexToPixel, isValidHexCoord } from '../packages/shared/src/index.ts'
function card(id: string, values?: number[]): Card {
  return { ...CARD_DATABASE[0], instanceId: id, hexValues: values, questProgress: 0, isTransformed: false, powerBonus: 0 }
}

test('19 non-overlapping hexes use the same opposite sides as the capture rules', () => {
  const coords = getAllHexCoords()
  assert.equal(coords.length, 19)
  assert.equal(new Set(coords.map(coordToKey)).size, 19)
  for (const coord of coords) {
    assert.equal(isValidHexCoord(coord), true)
    const origin = hexToPixel(coord, 80)
    getHexNeighbors(coord).forEach((neighbor, direction) => {
      assert.deepEqual(getHexNeighbors(neighbor)[getOppositeDirection(direction)], coord)
      const point = hexToPixel(neighbor, 80)
      assert.ok(Math.abs(Math.hypot(point.x - origin.x, point.y - origin.y) - Math.sqrt(3) * 80) < 0.001)
    })
  }
  for (const invalid of [null, [], [0], [0, 0, 0], ['0', 0], [0.5, 0], [2, 2], [NaN, 0]]) assert.equal(isValidHexCoord(invalid), false)
})

test('catalog cards and partial overrides always have six playable values', () => {
  for (const def of CARD_DATABASE) {
    const values = getHexValues({ ...card('test'), ...def })
    assert.equal(values.length, 6)
    assert.ok(values.every((value) => value >= 1 && value <= 10))
  }
  assert.deepEqual(getHexValues(card('partial', [9, 8, 7])).slice(0, 3), [9, 8, 7])
})

test('captures compare facing sides in all six directions; equal values hold', () => {
  getHexNeighbors([0, 0]).forEach((coord, direction) => {
    const attacking = Array(6).fill(1); attacking[direction] = 8
    const defending = Array(6).fill(10); defending[getOppositeDirection(direction)] = 7
    const board = { [coordToKey(coord)]: { coord, ownerId: 'b', card: card('defender', defending) } }
    assert.deepEqual(getHexCaptures(board, 'a', card('attacker', attacking), [0, 0]), [coordToKey(coord)])
    defending[getOppositeDirection(direction)] = 8
    assert.deepEqual(getHexCaptures(board, 'a', card('attacker', attacking), [0, 0]), [])
  })
})

test('preview finds chain captures without mutating cards or ownership', () => {
  const board: Record<string, HexCellState> = {
    '1,0': { coord: [1, 0], ownerId: 'b', card: card('first', [8, 1, 1, 2, 1, 1]) },
    '2,0': { coord: [2, 0], ownerId: 'b', card: card('chain', [1, 1, 1, 3, 1, 1]) },
    '0,1': { coord: [0, 1], ownerId: 'a', card: card('friendly', [1, 1, 1, 1, 1, 1]) },
  }
  const original = structuredClone(board)
  assert.deepEqual(getHexCaptures(board, 'a', card('placed', [9, 1, 1, 1, 1, 9]), [0, 0]), ['1,0', '2,0'])
  assert.deepEqual(board, original)
})

