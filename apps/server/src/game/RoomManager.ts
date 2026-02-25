import { v4 as uuid } from 'uuid'
import type { Room, LobbyPlayer } from '@tcg/shared'
import { GameEngine } from './GameEngine.js'

export class RoomManager {
  private rooms = new Map<string, { room: Room; engine?: GameEngine }>()

  createRoom(name: string, host: LobbyPlayer, isPrivate: boolean): Room {
    const room: Room = {
      id: uuid(),
      name,
      hostId: host.id,
      status: 'waiting',
      players: [host],
      maxPlayers: 2,
      isPrivate,
      createdAt: Date.now(),
    }
    this.rooms.set(room.id, { room })
    return room
  }

  getRoom(roomId: string): Room | undefined {
    return this.rooms.get(roomId)?.room
  }

  getPublicRooms(): Room[] {
    return [...this.rooms.values()]
      .map(r => r.room)
      .filter(r => !r.isPrivate && r.status === 'waiting')
  }

  getAllRooms(): Room[] {
    return [...this.rooms.values()].map(r => r.room)
  }

  joinRoom(roomId: string, player: LobbyPlayer): Room | null {
    const entry = this.rooms.get(roomId)
    if (!entry || entry.room.players.length >= 2 || entry.room.status !== 'waiting') return null
    entry.room.players.push(player)
    return entry.room
  }

  leaveRoom(roomId: string, playerId: string): Room | null {
    const entry = this.rooms.get(roomId)
    if (!entry) return null
    entry.room.players = entry.room.players.filter(p => p.id !== playerId)
    if (entry.room.players.length === 0) {
      this.rooms.delete(roomId)
      return null
    }
    if (entry.room.hostId === playerId) {
      entry.room.hostId = entry.room.players[0].id
    }
    return entry.room
  }

  startGame(roomId: string): GameEngine | null {
    const entry = this.rooms.get(roomId)
    if (!entry || entry.room.players.length < 2) return null
    entry.room.status = 'in_progress'
    entry.engine = new GameEngine(entry.room)
    return entry.engine
  }

  getEngine(roomId: string): GameEngine | undefined {
    return this.rooms.get(roomId)?.engine
  }

  endGame(roomId: string) {
    const entry = this.rooms.get(roomId)
    if (entry) {
      entry.room.status = 'finished'
    }
  }

  removeRoom(roomId: string) {
    this.rooms.delete(roomId)
  }
}

export const roomManager = new RoomManager()
