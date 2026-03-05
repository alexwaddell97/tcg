import { useEffect } from 'react'
import { getSocket } from '../lib/socket.ts'
import type { ServerToClientEvents } from '@tcg/shared'

type EventKey = keyof ServerToClientEvents

export function useSocketEvent<K extends EventKey>(
  event: K,
  handler: ServerToClientEvents[K]
) {
  useEffect(() => {
    const socket = getSocket()
    // @ts-expect-error — socket.io typed events are correct at runtime
    socket.on(event, handler)
    return () => {
      // @ts-expect-error
      socket.off(event, handler)
    }
  }, [event, handler])
}
