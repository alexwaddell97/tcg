import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, ArrowLeft, RefreshCw } from 'lucide-react'
import { useLobbyStore } from '../stores/useLobbyStore.ts'
import { useAuthStore } from '../stores/useAuthStore.ts'
import { getSocket } from '../lib/socket.ts'
import RoomList from '../components/lobby/RoomList.tsx'
import CreateRoomModal from '../components/lobby/CreateRoomModal.tsx'
import Button from '../components/ui/Button.tsx'

export default function Lobby() {
  const navigate = useNavigate()
  const rooms = useLobbyStore((s) => s.rooms)
  const currentRoom = useLobbyStore((s) => s.currentRoom)
  const displayName = useAuthStore((s) => s.displayName)
  const [showCreate, setShowCreate] = useState(false)

  const handleJoinRoom = (roomId: string) => {
    getSocket().emit('lobby:join_room', { roomId })
  }

  const handleLeaveRoom = () => {
    getSocket().emit('lobby:leave_room')
  }

  const handleSetReady = (isReady: boolean) => {
    getSocket().emit('lobby:set_ready', { isReady })
  }

  const handleRefresh = () => {
    getSocket().emit('lobby:join', { displayName })
  }

  return (
    <div className="min-h-screen bg-slate-900 p-4">
      <div className="max-w-4xl mx-auto flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/')}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-2xl font-bold text-white">Lobby</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
            <Button variant="primary" onClick={() => setShowCreate(true)}>
              <Plus className="w-4 h-4" />
              Create Room
            </Button>
          </div>
        </div>

        {/* Current Room */}
        {currentRoom && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-amber-400 font-semibold">Your Room: {currentRoom.name}</h2>
              <button
                onClick={handleLeaveRoom}
                className="text-sm text-slate-400 hover:text-red-400 transition-colors"
              >
                Leave
              </button>
            </div>
            <div className="flex flex-col gap-2">
              {currentRoom.players.map((player) => (
                <div key={player.id} className="flex items-center justify-between">
                  <span className="text-white">{player.displayName}</span>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-sm ${player.isReady ? 'text-green-400' : 'text-slate-400'}`}
                    >
                      {player.isReady ? 'Ready' : 'Not ready'}
                    </span>
                  </div>
                </div>
              ))}
              {currentRoom.players.length < 2 && (
                <p className="text-slate-500 text-sm">Waiting for another player…</p>
              )}
            </div>
            {currentRoom.players.length === 2 && (
              <div className="mt-3">
                {currentRoom.players.find((p) => p.displayName === displayName)?.isReady ? (
                  <Button variant="secondary" onClick={() => handleSetReady(false)}>
                    Cancel Ready
                  </Button>
                ) : (
                  <Button variant="primary" onClick={() => handleSetReady(true)}>
                    Ready Up
                  </Button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Room List */}
        {!currentRoom && (
          <RoomList rooms={rooms} onJoin={handleJoinRoom} />
        )}
      </div>

      {showCreate && (
        <CreateRoomModal onClose={() => setShowCreate(false)} />
      )}
    </div>
  )
}
