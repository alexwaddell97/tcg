import { Capacitor } from '@capacitor/core'
import { resolveServerEndpoint } from './serverEndpoint.ts'
import { io, type Socket } from 'socket.io-client'
import type { ClientToServerEvents, ServerToClientEvents } from '@tcg/shared'

export type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>

const serverEndpoint = resolveServerEndpoint(import.meta.env.VITE_SERVER_URL, (Capacitor.isNativePlatform() || (Boolean(window.electronAPI) && !import.meta.env.DEV)))
export const hasMultiplayerServer = serverEndpoint !== undefined

let socket: TypedSocket | null = null

export function getSocket(): TypedSocket {
  if (!socket) {
    socket = io(serverEndpoint, {
      autoConnect: false,
      reconnectionAttempts: 5,
    })
  }
  return socket
}

export function connectSocket(): TypedSocket {
  const s = getSocket()
  if (hasMultiplayerServer && !s.connected) {
    s.connect()
  }
  return s
}

export function disconnectSocket() {
  socket?.disconnect()
  socket = null
}
