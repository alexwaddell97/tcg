import { create } from 'zustand'
import type { Room } from '@tcg/shared'

interface LobbyState {
  rooms: Room[]
  currentRoom: Room | null
  setRooms: (rooms: Room[]) => void
  upsertRoom: (room: Room) => void
  removeRoom: (roomId: string) => void
  setCurrentRoom: (room: Room | null) => void
}

export const useLobbyStore = create<LobbyState>()((set) => ({
  rooms: [],
  currentRoom: null,
  setRooms: (rooms) => set({ rooms }),
  upsertRoom: (room) =>
    set((state) => ({
      rooms: state.rooms.some((r) => r.id === room.id)
        ? state.rooms.map((r) => (r.id === room.id ? room : r))
        : [...state.rooms, room],
    })),
  removeRoom: (roomId) =>
    set((state) => ({ rooms: state.rooms.filter((r) => r.id !== roomId) })),
  setCurrentRoom: (currentRoom) => set({ currentRoom }),
}))
