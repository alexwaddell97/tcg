import { Users } from 'lucide-react'
import type { Room } from '@tcg/shared'
import Button from '../ui/Button.tsx'

interface RoomCardProps {
  room: Room
  onJoin: (roomId: string) => void
}

export default function RoomCard({ room, onJoin }: RoomCardProps) {
  const isFull = room.players.length >= room.maxPlayers

  return (
    <div className="flex items-center justify-between p-4 rounded-xl bg-slate-800 border border-slate-700">
      <div className="flex flex-col gap-1">
        <span className="text-white font-medium">{room.name}</span>
        <div className="flex items-center gap-2 text-slate-400 text-sm">
          <Users className="w-4 h-4" />
          <span>{room.players.length} / {room.maxPlayers}</span>
          <span>·</span>
          <span>Host: {room.players[0]?.displayName ?? 'Unknown'}</span>
        </div>
      </div>
      <Button
        variant="primary"
        size="sm"
        onClick={() => onJoin(room.id)}
        disabled={isFull}
      >
        {isFull ? 'Full' : 'Join'}
      </Button>
    </div>
  )
}
