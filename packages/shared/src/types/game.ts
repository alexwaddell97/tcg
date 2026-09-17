import type { Card, HexCoord } from './card.ts'
import type { ArenaState, ArenaTurnSubmission } from './arena.ts'

// Overall match lifecycle phase
export type GamePhase =
  | 'pre_game'    // location pool being determined, players confirmed
  | 'planning'    // active player chooses a card and a board cell
  | 'reveal'      // reserved for future rules variants
  | 'round_end'   // reserved for future rules variants
  | 'game_over'

export interface TriadCellState {
  index: number
  ownerId: string
  card: Card
}

// Hex board cell representation
export interface HexCellState {
  coord: HexCoord  // [q, r] axial coordinates
  ownerId?: string  // undefined if empty
  card?: Card
}

// What a player submits during the planning phase
export interface PendingPlay {
  cardInstanceId: string
  cellIndex?: number      // for 3x3 board (0-8)
  hexCoord?: HexCoord     // for hex board
}

export interface PlayerState {
  id: string
  displayName: string
  /** Legacy matches may still contain an emoji; current clients render catalogue portraits. */
  avatarEmoji?: string
  avatarId?: string
  titleId?: string | null
  rank: string
  handCount: number
  deckCount: number
  isConnected: boolean
  // Retained for UI compatibility. Triple Triad flow does not use round pass.
  hasPassed: boolean
  roundWins: number
  // Retained for deck identity / collection compatibility.
  chosenLocationIds: [string, string]
}

export interface GameState {
  roomId: string
  phase: GamePhase
  round: 1 | 2 | 3
  turn: number // placement number in the current match
  boardType: 'triad' | 'hex' | 'arena'
  arena?: ArenaState

  // 3x3 Triple Triad board. null represents an empty cell.
  board?: Array<TriadCellState | null>

  // Hex board (19 cells). Map key is "q,r" for coordinate lookup
  hexBoard?: Record<string, HexCellState>

  // Last submitted play per player, used for UI hints.
  pendingPlays: Record<string, PendingPlay | null>

  players: Record<string, PlayerState>

  // Only populated for the perspective of the requesting player
  hand?: Card[]
  // Explicit perspective; display names need not be unique.
  viewerPlayerId?: string

  log: GameLogEntry[]
  winner?: string
  startedAt: number
  // Sequential turns — whose turn it is to act right now
  activePlayerId: string
}

export interface GameAction {
  type:
    | 'place_card'   // place a card into an empty board cell
    | 'pass_turn'    // skip if no playable card or tactical pass
    | 'pass_round'   // unsupported in Triple Triad mode (kept for compatibility)
    | 'surrender'
    | 'commit_turn'
  playerId: string
  // Required for place_card
  cardInstanceId?: string
  cellIndex?: number     // which board cell (0-8) to place into (3x3 board)
  hexCoord?: HexCoord    // which hex coordinate to place into (hex board)
  timestamp: number
  submission?: ArenaTurnSubmission
}

export interface GameLogEntry {
  id: string
  timestamp: number
  message: string
  type: 'action' | 'system' | 'chat'
}
