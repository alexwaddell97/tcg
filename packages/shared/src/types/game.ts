import type { Card } from './card.ts'

export type GamePhase =
  | 'waiting'
  | 'draw'
  | 'main'
  | 'combat'
  | 'end'
  | 'game_over'

export interface BoardCreature {
  card: Card
  ownerId: string
  instanceId: string
  canAttack: boolean
  tapped: boolean
  currentPower: number
  currentToughness: number
}

export interface PlayerState {
  id: string
  displayName: string
  health: number
  maxHealth: number
  mana: number
  maxMana: number
  handCount: number
  deckCount: number
  graveyardCount: number
  field: BoardCreature[]
  isConnected: boolean
}

export interface GameState {
  roomId: string
  phase: GamePhase
  turn: number
  activePlayerId: string
  players: Record<string, PlayerState>
  hand?: Card[]
  lastAction?: GameAction
  log: GameLogEntry[]
  winner?: string
  startedAt: number
}

export interface GameAction {
  type: 'play_card' | 'attack' | 'end_turn' | 'surrender' | 'target_effect'
  playerId: string
  cardInstanceId?: string
  targetId?: string
  timestamp: number
}

export interface GameLogEntry {
  id: string
  timestamp: number
  message: string
  type: 'action' | 'system' | 'chat'
}
