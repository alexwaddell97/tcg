import type { Card, HexCoord } from '../types/card.ts'
import type { HexCellState } from '../types/game.ts'
import { getTriadValues } from './triad.ts'

/**
 * Get all 19 hex coordinates for a 3-ring hex board
 * Uses axial coordinates [q, r] centered at [0, 0]
 */
export function getAllHexCoords(): HexCoord[] {
  const coords: HexCoord[] = []
  const radius = 2 // rings: 0 (center) + 2 outer rings = 19 total hexes

  for (let q = -radius; q <= radius; q++) {
    for (let r = Math.max(-radius, -q - radius); r <= Math.min(radius, -q + radius); r++) {
      coords.push([q, r])
    }
  }

  return coords
}

/**
 * Convert hex coordinate to string key for object storage
 */
export function coordToKey(coord: HexCoord): string {
  return `${coord[0]},${coord[1]}`
}

/**
 * Parse coordinate key back to HexCoord
 */
export function keyToCoord(key: string): HexCoord {
  const [q, r] = key.split(',').map(Number)
  return [q, r]
}

/**
 * Get the 6 neighboring hex coordinates
 * Pointy-top layout, in order: E, NE, NW, W, SW, SE.
 */
export function getHexNeighbors(coord: HexCoord): HexCoord[] {
  const [q, r] = coord
  // In axial coordinates, the 6 neighbors are:
  return [
    [q + 1, r],      // E
    [q + 1, r - 1],  // NE
    [q, r - 1],      // NW
    [q - 1, r],      // W
    [q - 1, r + 1],  // SW
    [q, r + 1],      // SE
  ]
}

/**
 * Get directional index (0-5) of a neighbor relative to center
 * Used to determine which card value to compare
 * Order: E, NE, NW, W, SW, SE
 */
export function getNeighborDirection(center: HexCoord, neighbor: HexCoord): number {
  const neighbors = getHexNeighbors(center)
  for (let i = 0; i < neighbors.length; i++) {
    if (neighbors[i][0] === neighbor[0] && neighbors[i][1] === neighbor[1]) {
      return i
    }
  }
  return -1 // not a neighbor
}

/**
 * Get the opposite direction index (180 degrees)
 */
export function getOppositeDirection(dir: number): number {
  return (dir + 3) % 6
}

export function isValidHexCoord(value: unknown): value is HexCoord {
  return Array.isArray(value) && value.length === 2 && value.every(Number.isInteger)
    && Math.max(Math.abs(value[0]), Math.abs(value[1]), Math.abs(value[0] + value[1])) <= 2
}

export function hexToPixel([q, r]: HexCoord, size: number): { x: number; y: number } {
  return { x: Math.sqrt(3) * size * (q + r / 2), y: 1.5 * size * r }
}

/** Six values shared by the board, previews, and authoritative capture rules. */
export function getHexValues(card: Card): number[] {
  const { top, right, bottom, left } = getTriadValues(card)
  const fallback = [right, top, Math.round((top + left) / 2), left, bottom, Math.round((bottom + right) / 2)]
  return fallback.map((value, index) => card.hexValues?.[index] ?? value)
}

/** Resolve direct and chain captures without changing the supplied board. Ties hold. */
export function getHexCaptures(
  board: Record<string, HexCellState>, playerId: string, card: Card, coord: HexCoord,
): string[] {
  const captured = new Set<string>()
  const queue = [{ card, coord }]
  for (let index = 0; index < queue.length; index++) {
    const source = queue[index]
    const values = getHexValues(source.card)
    getHexNeighbors(source.coord).forEach((neighbor, direction) => {
      const key = coordToKey(neighbor)
      const target = board[key]
      if (!target?.card || target.ownerId === playerId || captured.has(key)) return
      if (values[direction] <= getHexValues(target.card)[getOppositeDirection(direction)]) return
      captured.add(key)
      queue.push({ card: target.card, coord: neighbor })
    })
  }
  return [...captured]
}
