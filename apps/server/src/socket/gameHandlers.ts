import type { Server, Socket } from 'socket.io'
import type { ClientToServerEvents, ServerToClientEvents, SocketData } from '@tcg/shared'
import { roomManager } from '../game/RoomManager.js'

type IoServer = Server<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>
type IoSocket = Socket<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>

export function registerGameHandlers(io: IoServer, socket: IoSocket) {
  socket.on('game:play_card', ({ cardInstanceId, targetId }) => {
    const roomId = socket.data.roomId
    if (!roomId) return
    const engine = roomManager.getEngine(roomId)
    if (!engine) return

    const result = engine.processAction({
      type: 'play_card',
      playerId: socket.data.playerId,
      cardInstanceId,
      targetId,
      timestamp: Date.now(),
    })

    socket.emit('game:action_result', { ...result.newState.lastAction!, success: result.success, error: result.error })

    if (result.success) {
      broadcastGameState(io, roomId, engine, socket)
    }
  })

  socket.on('game:attack', ({ attackerInstanceId, targetId }) => {
    const roomId = socket.data.roomId
    if (!roomId) return
    const engine = roomManager.getEngine(roomId)
    if (!engine) return

    const result = engine.processAction({
      type: 'attack',
      playerId: socket.data.playerId,
      cardInstanceId: attackerInstanceId,
      targetId,
      timestamp: Date.now(),
    })

    if (result.success) {
      broadcastGameState(io, roomId, engine, socket)
    }
  })

  socket.on('game:end_turn', () => {
    const roomId = socket.data.roomId
    if (!roomId) return
    const engine = roomManager.getEngine(roomId)
    if (!engine) return

    const result = engine.processAction({
      type: 'end_turn',
      playerId: socket.data.playerId,
      timestamp: Date.now(),
    })

    if (result.success) {
      broadcastGameState(io, roomId, engine, socket)
      checkGameOver(io, roomId, engine)
    }
  })

  socket.on('game:surrender', () => {
    const roomId = socket.data.roomId
    if (!roomId) return
    const engine = roomManager.getEngine(roomId)
    if (!engine) return

    engine.processAction({
      type: 'surrender',
      playerId: socket.data.playerId,
      timestamp: Date.now(),
    })

    broadcastGameState(io, roomId, engine, socket)
    checkGameOver(io, roomId, engine)
  })
}

function broadcastGameState(
  io: IoServer,
  roomId: string,
  engine: InstanceType<typeof import('../game/GameEngine.js').GameEngine>,
  socket: IoSocket
) {
  const sockets = [...io.sockets.sockets.values()].filter(s => s.data.roomId === roomId)
  for (const s of sockets) {
    s.emit('game:state_update', engine.getStateFor(s.data.playerId))
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
