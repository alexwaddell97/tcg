import { useState } from 'react'
import Modal from '../ui/Modal.tsx'
import Button from '../ui/Button.tsx'

interface CreateRoomModalProps {
  onClose: () => void
}

export default function CreateRoomModal({ onClose }: CreateRoomModalProps) {
  const [roomName, setRoomName] = useState('')
  const [isPrivate, setIsPrivate] = useState(false)

  const handleCreate = () => {
    const name = roomName.trim()
    if (!name) return
    // TODO: 'lobby:create_room' event not yet defined — wire up when lobby socket events are added
    void name; void isPrivate
    onClose()
  }

  return (
    <Modal title="Create Room" onClose={onClose}>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-sm text-stone-400">Room name</label>
          <input
            autoFocus
            type="text"
            value={roomName}
            onChange={(e) => setRoomName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            placeholder="My epic duel…"
            maxLength={30}
            className="px-4 py-3 rounded-lg bg-stone-800 border border-stone-700 text-stone-100 placeholder-stone-600 focus:outline-none focus:border-amber-500 transition-colors"
          />
        </div>

        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={isPrivate}
            onChange={(e) => setIsPrivate(e.target.checked)}
            className="w-4 h-4 accent-amber-400"
          />
          <span className="text-stone-300 text-sm">Private (invite only)</span>
        </label>

        <div className="flex gap-2 justify-end">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={handleCreate} disabled={!roomName.trim()}>
            Create
          </Button>
        </div>
      </div>
    </Modal>
  )
}
