import type { Server, Socket } from 'socket.io'
import type { ClientToServerEvents, ServerToClientEvents, SocketData, LobbyPlayer } from '@tcg/shared'
import { roomManager } from '../game/RoomManager.js'

type IoServer = Server<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>
type IoSocket = Socket<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>

export function registerLobbyHandlers(io: IoServer, socket: IoSocket) {
  socket.on('lobby:join', ({ displayName }) => {
    socket.data.displayName = displayName
    socket.emit('lobby:room_list', roomManager.getPublicRooms())
  })

  socket.on('lobby:create_room', ({ roomName, isPrivate }) => {
    const host: LobbyPlayer = {
      id: socket.data.playerId,
      displayName: socket.data.displayName,
      isReady: false,
    }
    const room = roomManager.createRoom(roomName, host, isPrivate)
    socket.data.roomId = room.id
    socket.join(room.id)
    socket.emit('lobby:room_created', room)

    if (!isPrivate) {
      io.emit('lobby:room_list', roomManager.getPublicRooms())
    }
  })

  socket.on('lobby:join_room', ({ roomId }) => {
    const player: LobbyPlayer = {
      id: socket.data.playerId,
      displayName: socket.data.displayName,
      isReady: false,
    }
    const room = roomManager.joinRoom(roomId, player)
    if (!room) {
      socket.emit('lobby:error', { message: 'Room is full or does not exist.' })
      return
    }
    socket.data.roomId = roomId
    socket.join(roomId)
    io.to(roomId).emit('lobby:room_updated', room)
    io.emit('lobby:room_list', roomManager.getPublicRooms())
  })

  socket.on('lobby:leave_room', () => {
    const roomId = socket.data.roomId
    if (!roomId) return
    const room = roomManager.leaveRoom(roomId, socket.data.playerId)
    socket.leave(roomId)
    socket.data.roomId = undefined

    if (room) {
      io.to(roomId).emit('lobby:room_updated', room)
    } else {
      io.emit('lobby:room_removed', roomId)
    }
    io.emit('lobby:room_list', roomManager.getPublicRooms())
  })

  socket.on('lobby:set_ready', ({ isReady }) => {
    const roomId = socket.data.roomId
    if (!roomId) return
    const room = roomManager.getRoom(roomId)
    if (!room) return

    const player = room.players.find(p => p.id === socket.data.playerId)
    if (player) {
      player.isReady = isReady
    }

    io.to(roomId).emit('lobby:room_updated', room)

    // Auto-start when all players ready
    if (room.players.length === 2 && room.players.every(p => p.isReady)) {
      const engine = roomManager.startGame(roomId)
      if (engine) {
        for (const p of room.players) {
          const playerSocket = [...io.sockets.sockets.values()].find(
            s => s.data.playerId === p.id
          )
          playerSocket?.emit('game:start', engine.getStateFor(p.id))
        }
      }
    }
  })
}
