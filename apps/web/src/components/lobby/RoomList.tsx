import type { Room } from '@tcg/shared'
import RoomCard from './RoomCard.tsx'

interface RoomListProps {
  rooms: Room[]
  onJoin: (roomId: string) => void
}

export default function RoomList({ rooms, onJoin }: RoomListProps) {
  if (rooms.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <p className="text-stone-500 text-lg">No open rooms</p>
        <p className="text-stone-600 text-sm">Create one to get started</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-stone-400 text-sm font-medium uppercase tracking-wider">
        Open Rooms ({rooms.length})
      </h2>
      {rooms.map((room) => (
        <RoomCard key={room.id} room={room} onJoin={onJoin} />
      ))}
    </div>
  )
}
