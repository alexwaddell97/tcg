import type { GameState, BoardCreature } from '../types/game.ts'
import type { Card } from '../types/card.ts'

export function canPlayCard(gameState: GameState, playerId: string, card: Card): boolean {
  const player = gameState.players[playerId]
  if (!player) return false
  if (gameState.activePlayerId !== playerId) return false
  if (gameState.phase !== 'main') return false
  if (player.mana < card.cost) return false
  return true
}

export function canAttack(gameState: GameState, attacker: BoardCreature): boolean {
  if (gameState.phase !== 'combat') return false
  if (!attacker.canAttack) return false
  if (attacker.tapped) return false
  return true
}

export function isValidPlay(gameState: GameState, playerId: string): boolean {
  return gameState.activePlayerId === playerId && gameState.phase === 'main'
}
