import { SkipForward, Flag } from 'lucide-react'
import type { GamePhase } from '@tcg/shared'
import Button from '../ui/Button.tsx'

interface ActionBarProps {
  isMyTurn: boolean
  phase: GamePhase
  onEndTurn: () => void
  onSurrender: () => void
}

export default function ActionBar({ isMyTurn, phase, onEndTurn, onSurrender }: ActionBarProps) {
  return (
    <div className="flex items-center gap-2 justify-between">
      <Button
        variant="danger"
        size="sm"
        onClick={onSurrender}
        className="opacity-60 hover:opacity-100"
      >
        <Flag className="w-3.5 h-3.5" />
        Surrender
      </Button>

      <Button
        variant="primary"
        size="md"
        onClick={onEndTurn}
        disabled={!isMyTurn || phase === 'game_over'}
      >
        <SkipForward className="w-4 h-4" />
        End Turn
      </Button>
    </div>
  )
}
