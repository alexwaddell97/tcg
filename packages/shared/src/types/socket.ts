import type { GameState } from './game.ts'
import type { HexCoord } from './card.ts'
import type { ArenaTurnSubmission } from './arena.ts'

export interface ClientToServerEvents {
  'matchmaking:join':   (payload: { displayName: string; avatarEmoji?: string; avatarId?: string; titleId?: string | null; rank?: string; deckId?: string; deckDefinitionIds?: string[]; cardVariants?: Record<string, string>; cardBorders?: Record<string, import('../constants/cardMastery.ts').CardBorderId> }) => void
  'matchmaking:leave':  () => void

  'game:place_card':   (payload: { cardInstanceId: string; cellIndex?: number; hexCoord?: HexCoord }) => void
  'game:pass_turn':    () => void
  'game:commit_turn':  (payload: ArenaTurnSubmission) => void
  'game:pass_round':   () => void
  'game:surrender':    () => void
  'game:send_message': (payload: { message: string }) => void
  'game:commend':      () => void
}

export interface ServerToClientEvents {
  'matchmaking:status': (payload: { status: 'idle' | 'searching' | 'found'; queueSize?: number }) => void
  'matchmaking:error':  (payload: { message: string }) => void

  'game:start':                (initialState: GameState) => void
  'game:state_update':         (state: GameState) => void
  'game:action_result':        (payload: { success: boolean; error?: string }) => void
  'game:player_disconnected':  (playerId: string) => void
  'game:player_reconnected':   (playerId: string) => void
  'game:over':                 (payload: { winnerId: string | null; reason: string }) => void
  'game:commended':            (payload: { fromDisplayName: string }) => void

  'system:ping':               () => void
}

export interface SocketData {
  playerId: string
  displayName: string
  roomId?: string
}
