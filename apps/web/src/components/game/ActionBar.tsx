import { SkipForward, FastForward } from '@phosphor-icons/react'
import type { GamePhase } from '@tcg/shared'
import Button from '../ui/Button.tsx'

interface ActionBarProps {
  phase: GamePhase
  hasPassed: boolean
  hasSubmitted: boolean
  onPassTurn: () => void
  onPassRound: () => void
}

export default function ActionBar({
  phase,
  hasPassed,
  hasSubmitted,
  onPassTurn,
  onPassRound,
}: ActionBarProps) {
  const isPlanning = phase === 'planning'
  const canAct = isPlanning && !hasPassed && !hasSubmitted

  return (
    <div className="flex items-center gap-1.5 sm:gap-2 justify-end">
      <Button
        variant="secondary"
        size="sm"
        onClick={onPassTurn}
        disabled={!canAct}
        title="Skip placing a card this turn"
      >
        <SkipForward className="w-3.5 h-3.5" weight="bold" />
        <span className="hidden sm:inline">Skip </span>Turn
      </Button>

      <Button
        variant="primary"
        size="md"
        onClick={onPassRound}
        disabled={!isPlanning || hasPassed}
        title="Forfeit remaining turns this round (Gwent-style pass)"
      >
        <FastForward className="w-4 h-4" weight="bold" />
        <span className="hidden sm:inline">Pass </span>Round
      </Button>
    </div>
  )
}
