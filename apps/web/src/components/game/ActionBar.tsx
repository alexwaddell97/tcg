import { SkipForward } from '@phosphor-icons/react'
import type { GamePhase } from '@tcg/shared'
import Button from '../ui/Button.tsx'

interface ActionBarProps {
  phase: GamePhase
  hasPassed: boolean
  hasSubmitted: boolean
  onPassTurn: () => void
}

export default function ActionBar({
  phase,
  hasPassed,
  hasSubmitted,
  onPassTurn,
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
        title="Pass your placement"
      >
        <SkipForward className="w-3.5 h-3.5" weight="bold" />
        <span className="hidden sm:inline">Pass </span>Turn
      </Button>
    </div>
  )
}
