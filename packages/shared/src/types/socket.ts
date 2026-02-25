import type { Room } from './lobby.ts'
import type { GameState, GameAction } from './game.ts'

export interface ClientToServerEvents {
  'lobby:join':        (payload: { displayName: string }) => void
  'lobby:create_room': (payload: { roomName: string; isPrivate: boolean }) => void
  'lobby:join_room':   (payload: { roomId: string }) => void
  'lobby:leave_room':  () => void
  'lobby:set_ready':   (payload: { isReady: boolean }) => void

  'game:play_card':    (payload: { cardInstanceId: string; targetId?: string }) => void
  'game:attack':       (payload: { attackerInstanceId: string; targetId: string }) => void
  'game:end_turn':     () => void
  'game:surrender':    () => void
  'game:send_message': (payload: { message: string }) => void
}

export interface ServerToClientEvents {
  'lobby:room_list':           (rooms: Room[]) => void
  'lobby:room_updated':        (room: Room) => void
  'lobby:room_created':        (room: Room) => void
  'lobby:room_removed':        (roomId: string) => void
  'lobby:error':               (payload: { message: string }) => void

  'game:start':                (initialState: GameState) => void
  'game:state_update':         (state: GameState) => void
  'game:action_result':        (action: GameAction & { success: boolean; error?: string }) => void
  'game:player_disconnected':  (playerId: string) => void
  'game:player_reconnected':   (playerId: string) => void
  'game:over':                 (payload: { winnerId: string; reason: string }) => void

  'system:ping':               () => void
}

export interface SocketData {
  playerId: string
  displayName: string
  roomId?: string
}
