import type { Server, Socket } from 'socket.io'
import type { ClientToServerEvents, ServerToClientEvents, SocketData, LobbyPlayer } from '@tcg/shared'
import { roomManager } from '../game/RoomManager.js'

type IoServer = Server<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>
type IoSocket = Socket<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>

// Matchmaking queue: socketId → player
const queue = new Map<string, LobbyPlayer>()

function tryMatch(io: IoServer) {
  if (queue.size < 2) return

  const [[socketIdA, playerA], [socketIdB, playerB]] = [...queue.entries()]
  queue.delete(socketIdA)
  queue.delete(socketIdB)

  const socketA = io.sockets.sockets.get(socketIdA)
  const socketB = io.sockets.sockets.get(socketIdB)

  // If a socket disconnected between queue entry and match, re-queue the other
  if (!socketA || !socketB) {
    if (socketA) queue.set(socketIdA, playerA)
    if (socketB) queue.set(socketIdB, playerB)
    return
  }

  const room = roomManager.createRoom('match', playerA, true)
  roomManager.joinRoom(room.id, playerB)

  socketA.data.roomId = room.id
  socketB.data.roomId = room.id
  socketA.join(room.id)
  socketB.join(room.id)

  const engine = roomManager.startGame(room.id)
  if (engine) {
    socketA.emit('game:start', engine.getStateFor(playerA.id))
    socketB.emit('game:start', engine.getStateFor(playerB.id))
  }
}

export function registerMatchmakingHandlers(io: IoServer, socket: IoSocket) {
  socket.on('matchmaking:join', ({ displayName, avatarEmoji, rank, deckId, deckDefinitionIds }) => {
    socket.data.displayName = displayName

    if (queue.has(socket.id)) {
      socket.emit('matchmaking:error', { message: 'Already in queue.' })
      return
    }

    const player: LobbyPlayer = {
      id: socket.data.playerId,
      displayName,
      avatarEmoji: avatarEmoji ?? '🧙',
      rank: rank ?? 'Initiate',
      isReady: true,
      deckId,
      deckDefinitionIds,
    }

    queue.set(socket.id, player)
    socket.emit('matchmaking:status', { status: 'searching', queueSize: queue.size })

    tryMatch(io)
  })

  socket.on('matchmaking:leave', () => {
    queue.delete(socket.id)
    socket.emit('matchmaking:status', { status: 'idle' })
  })

  socket.on('disconnect', () => {
    queue.delete(socket.id)
  })
}
