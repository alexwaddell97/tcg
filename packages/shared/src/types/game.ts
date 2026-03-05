import type { Card } from './card.ts'
import type { LaneState } from './location.ts'

// Overall match lifecycle phase
export type GamePhase =
  | 'pre_game'    // location pool being determined, players confirmed
  | 'planning'    // both players secretly choose a card + location to play
  | 'reveal'      // plays revealed simultaneously, effects resolve
  | 'round_end'   // power tallied, round winner determined
  | 'game_over'

// What a player submits during the planning phase
export interface PendingPlay {
  cardInstanceId: string
  laneIndex: 0 | 1       // which lane (0 or 1) to play into
  slotIndex: number      // which slot (0–5) in the lane grid
}

export interface PlayerState {
  id: string
  displayName: string
  avatarEmoji: string
  rank: string
  handCount: number
  deckCount: number
  isConnected: boolean
  // Has this player passed for the remainder of the current round?
  hasPassed: boolean
  roundWins: number
  // The two location definitionIds that define this player's deck identity
  chosenLocationIds: [string, string]
}

export interface GameState {
  roomId: string
  phase: GamePhase
  round: 1 | 2 | 3
  turn: number // 1–TURNS_PER_ROUND within a round

  // The 2 lanes active this match, each with one half per player
  lanes: LaneState[]

  // What each player has queued to play this turn.
  // During 'planning' phase, a player only sees their own entry.
  // During 'reveal' phase, both entries are visible.
  pendingPlays: Record<string, PendingPlay | null>

  players: Record<string, PlayerState>

  // Only populated for the perspective of the requesting player
  hand?: Card[]

  log: GameLogEntry[]
  winner?: string
  startedAt: number
  // Sequential turns — whose turn it is to act right now
  activePlayerId: string
}

export interface GameAction {
  type:
    | 'place_card'   // queue a card+location play during planning phase
    | 'pass_turn'    // skip placing a card this turn (but stay active in round)
    | 'pass_round'   // forfeit remaining turns in this round (Gwent-style)
    | 'surrender'
  playerId: string
  // Required for place_card
  cardInstanceId?: string
  laneIndex?: 0 | 1      // which lane to play into
  slotIndex?: number     // which slot (0–5) to place into
  timestamp: number
}

export interface GameLogEntry {
  id: string
  timestamp: number
  message: string
  type: 'action' | 'system' | 'chat'
}
