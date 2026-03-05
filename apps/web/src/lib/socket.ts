import { io, type Socket } from 'socket.io-client'
import type { ClientToServerEvents, ServerToClientEvents } from '@tcg/shared'

export type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>

let socket: TypedSocket | null = null

export function getSocket(): TypedSocket {
  if (!socket) {
    socket = io(import.meta.env.VITE_SERVER_URL ?? 'http://localhost:3001', {
      autoConnect: false,
      reconnectionAttempts: 5,
    })
  }
  return socket
}

export function connectSocket(): TypedSocket {
  const s = getSocket()
  if (!s.connected) {
    s.connect()
  }
  return s
}

export function disconnectSocket() {
  socket?.disconnect()
  socket = null
}
