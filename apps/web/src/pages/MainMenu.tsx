import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Swords } from 'lucide-react'
import { useAuthStore } from '../stores/useAuthStore.ts'
import { connectSocket } from '../lib/socket.ts'
import Button from '../components/ui/Button.tsx'

export default function MainMenu() {
  const navigate = useNavigate()
  const { displayName, setDisplayName, isConnected, setConnected } = useAuthStore()
  const [inputName, setInputName] = useState(displayName)
  const [error, setError] = useState('')

  const handlePlay = () => {
    const name = inputName.trim()
    if (!name) {
      setError('Please enter a display name.')
      return
    }
    setDisplayName(name)
    connectSocket(name)
    setConnected(true)
    navigate('/lobby')
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-8 p-4 bg-slate-900">
      <div className="flex flex-col items-center gap-3">
        <Swords className="w-16 h-16 text-amber-400" strokeWidth={1.5} />
        <h1 className="text-5xl font-bold tracking-tight text-white">TCG</h1>
        <p className="text-slate-400 text-lg">Trading Card Game</p>
      </div>

      <div className="w-full max-w-sm flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-sm text-slate-400" htmlFor="name">
            Display name
          </label>
          <input
            id="name"
            type="text"
            value={inputName}
            onChange={(e) => {
              setInputName(e.target.value)
              setError('')
            }}
            onKeyDown={(e) => e.key === 'Enter' && handlePlay()}
            placeholder="Enter your name…"
            maxLength={20}
            className="px-4 py-3 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 transition-colors"
          />
          {error && <p className="text-red-400 text-sm">{error}</p>}
        </div>

        <Button variant="primary" size="lg" onClick={handlePlay}>
          Play Online
        </Button>

        <Button variant="secondary" size="lg" onClick={() => navigate('/deck-builder')}>
          Deck Builder
        </Button>
      </div>

      <p className="text-slate-600 text-sm">
        {isConnected ? '● Connected' : '○ Not connected'}
      </p>
    </div>
  )
}
