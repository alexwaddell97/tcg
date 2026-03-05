import type { GameState } from './game.ts'

export interface ClientToServerEvents {
  'matchmaking:join':   (payload: { displayName: string; avatarEmoji?: string; rank?: string; deckId?: string; deckDefinitionIds?: string[] }) => void
  'matchmaking:leave':  () => void

  'game:place_card':   (payload: { cardInstanceId: string; laneIndex: 0 | 1; slotIndex: number }) => void
  'game:pass_turn':    () => void
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
  'game:over':                 (payload: { winnerId: string; reason: string }) => void
  'game:commended':            (payload: { fromDisplayName: string }) => void

  'system:ping':               () => void
}

export interface SocketData {
  playerId: string
  displayName: string
  roomId?: string
}
