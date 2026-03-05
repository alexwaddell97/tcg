import type { Server, Socket } from 'socket.io'
import type { ClientToServerEvents, ServerToClientEvents, SocketData } from '@tcg/shared'
import { roomManager } from '../game/RoomManager.js'

type IoServer = Server<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>
type IoSocket = Socket<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>

export function registerGameHandlers(io: IoServer, socket: IoSocket) {
  // Helper: ensure the engine has a re-broadcast callback for async transitions (e.g. round_end → planning)
  function withEngine(cb: (engine: InstanceType<typeof import('../game/GameEngine.js').GameEngine>) => void) {
    const roomId = socket.data.roomId ?? ''
    const engine = roomManager.getEngine(roomId)
    if (!engine) return
    engine.onStateChange ??= () => {
      broadcastGameState(io, roomId, engine)
      checkGameOver(io, roomId, engine)
    }
    cb(engine)
  }

  socket.on('game:place_card', ({ cardInstanceId, laneIndex, slotIndex }) => {
    withEngine((engine) => {
      const result = engine.processAction({
        type: 'place_card',
        playerId: socket.data.playerId,
        cardInstanceId,
        laneIndex,
        slotIndex,
        timestamp: Date.now(),
      })
      socket.emit('game:action_result', { success: result.success, error: result.error })
      if (result.success) {
        broadcastGameState(io, socket.data.roomId!, engine)
        checkGameOver(io, socket.data.roomId!, engine)
      }
    })
  })

  socket.on('game:pass_turn', () => {
    withEngine((engine) => {
      const result = engine.processAction({
        type: 'pass_turn',
        playerId: socket.data.playerId,
        timestamp: Date.now(),
      })
      socket.emit('game:action_result', { success: result.success, error: result.error })
      if (result.success) {
        broadcastGameState(io, socket.data.roomId!, engine)
        checkGameOver(io, socket.data.roomId!, engine)
      }
    })
  })

  socket.on('game:pass_round', () => {
    withEngine((engine) => {
      const result = engine.processAction({
        type: 'pass_round',
        playerId: socket.data.playerId,
        timestamp: Date.now(),
      })
      socket.emit('game:action_result', { success: result.success, error: result.error })
      if (result.success) {
        broadcastGameState(io, socket.data.roomId!, engine)
        checkGameOver(io, socket.data.roomId!, engine)
      }
    })
  })

  socket.on('game:surrender', () => {
    withEngine((engine) => {
      engine.processAction({
        type: 'surrender',
        playerId: socket.data.playerId,
        timestamp: Date.now(),
      })
      broadcastGameState(io, socket.data.roomId!, engine)
      checkGameOver(io, socket.data.roomId!, engine)
    })
  })

  socket.on('game:commend', () => {
    const roomId = socket.data.roomId
    if (!roomId) return
    // Broadcast to everyone in the room except the sender
    socket.to(roomId).emit('game:commended', { fromDisplayName: socket.data.displayName })
  })

  socket.on('disconnect', () => {
    const roomId = socket.data.roomId
    if (!roomId) return
    const engine = roomManager.getEngine(roomId)
    if (!engine) return

    // Notify the opponent immediately
    io.to(roomId).emit('game:player_disconnected', socket.data.playerId)

    // Auto-surrender on behalf of the leaving player
    engine.processAction({
      type: 'surrender',
      playerId: socket.data.playerId,
      timestamp: Date.now(),
    })

    broadcastGameState(io, roomId, engine)
    checkGameOver(io, roomId, engine)
  })
}

function broadcastGameState(
  io: IoServer,
  roomId: string,
  engine: InstanceType<typeof import('../game/GameEngine.js').GameEngine>
) {
  for (const s of io.sockets.sockets.values()) {
    if (s.data.roomId === roomId) {
      s.emit('game:state_update', engine.getStateFor(s.data.playerId))
    }
  }
}

function checkGameOver(
  io: IoServer,
  roomId: string,
  engine: InstanceType<typeof import('../game/GameEngine.js').GameEngine>
) {
  const result = engine.isGameOver()
  if (result.over && result.winnerId) {
    io.to(roomId).emit('game:over', {
      winnerId: result.winnerId,
      reason: result.reason ?? 'unknown',
    })
    roomManager.endGame(roomId)
  }
}
