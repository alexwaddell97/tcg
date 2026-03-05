import type { GameState } from '../types/game.ts'
import type { Card } from '../types/card.ts'
import { MAX_LOCATION_SLOTS } from '../constants/game.ts'

export function canPlayCard(gameState: GameState, playerId: string, _card: Card): boolean {
  const player = gameState.players[playerId]
  if (!player) return false
  if (gameState.phase !== 'planning') return false
  if (player.hasPassed) return false
  return true
}

export function canPlaceAtLane(
  gameState: GameState,
  playerId: string,
  laneIndex: 0 | 1
): boolean {
  const lane = gameState.lanes[laneIndex]
  if (!lane) return false
  const half = lane.halves[playerId]
  if (!half) return false
  return half.placed.length < MAX_LOCATION_SLOTS
}

export function isValidDeckLocation(
  chosenLocationIds: [string, string],
  card: Card
): boolean {
  // Neutral cards are always valid
  if (card.affinity.length === 0) return true
  // Card must share affinity with at least one of the player's chosen locations
  return card.affinity.some(a => chosenLocationIds.includes(a))
}
