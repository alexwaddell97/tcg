import type { GameState } from '../types/game.ts'
import type { Card } from '../types/card.ts'

export function canPlayCard(gameState: GameState, playerId: string, _card: Card): boolean {
  const player = gameState.players[playerId]
  if (!player) return false
  if (gameState.phase !== 'planning') return false
  if (gameState.activePlayerId !== playerId) return false
  if (player.hasPassed) return false
  return true
}

export function canPlaceAtLane(
  gameState: GameState,
  _playerId: string,
  laneIndex: 0 | 1
): boolean {
  // Backward-compatible helper name: laneIndex is interpreted as board column.
  return gameState.board?.some((cell, index) => cell == null && (index % 3) === laneIndex) ?? false
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
