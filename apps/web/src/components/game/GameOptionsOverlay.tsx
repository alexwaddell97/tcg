import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, Flag, House, SignOut } from '@phosphor-icons/react'

interface GameOptionsOverlayProps {
  onClose: () => void
  onSurrender: () => void
}

export default function GameOptionsOverlay({ onClose, onSurrender }: GameOptionsOverlayProps) {
  const navigate = useNavigate()

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const handleSurrender = () => {
    if (window.confirm('Surrender this game?')) {
      onSurrender()
      onClose()
    }
  }

  const handleMainMenu = () => {
    if (window.confirm('Leave and return to the main menu? Your game will be forfeit.')) {
      onSurrender()
      navigate('/')
    }
  }

  const handleQuit = () => {
    if (window.confirm('Quit the game? Your game will be forfeit.')) {
      onSurrender()
      window.close()
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-64 rounded-2xl border border-stone-700/80 bg-stone-950 shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-800">
          <h2 className="text-lg font-bold text-amber-100 tracking-tight">Paused</h2>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-stone-500 hover:text-stone-200 hover:bg-stone-800 transition-colors"
          >
            <X className="w-4 h-4" weight="bold" />
          </button>
        </div>

        {/* Nav options */}
        <div className="flex flex-col gap-1 p-3">
          <button
            onClick={onClose}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-stone-200 hover:bg-stone-800 transition-colors text-sm font-medium"
          >
            <X className="w-4 h-4 text-stone-500" weight="bold" />
            Resume Game
          </button>

          <button
            onClick={handleMainMenu}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-stone-200 hover:bg-stone-800 transition-colors text-sm font-medium"
          >
            <House className="w-4 h-4 text-stone-500" weight="duotone" />
            Main Menu
          </button>

          <button
            onClick={handleQuit}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-stone-200 hover:bg-stone-800 transition-colors text-sm font-medium"
          >
            <SignOut className="w-4 h-4 text-stone-500" weight="duotone" />
            Quit Game
          </button>
        </div>

        {/* Danger zone */}
        <div className="px-3 pb-3 border-t border-stone-800 pt-2 mt-1">
          <button
            onClick={handleSurrender}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-950/40 transition-colors text-sm font-medium"
          >
            <Flag className="w-4 h-4" weight="fill" />
            Surrender
          </button>
        </div>

        <p className="text-center text-stone-700 text-xs pb-3">Esc to resume</p>
      </div>
    </div>
  )
}

