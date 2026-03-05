// BoardCreature type was removed from @tcg/shared — using local stub
type BoardCreature = {
  instanceId: string
  card: { name: string }
  currentPower: number
  currentToughness: number
  tapped: boolean
  canAttack: boolean
}
import { cn } from '../../lib/cn.ts'

interface CardZoneProps {
  creatures: BoardCreature[]
  label: string
  isOpponent?: boolean
}

export default function CardZone({ creatures, label, isOpponent = false }: CardZoneProps) {
  return (
    <div
      className={cn(
        'flex-1 rounded-xl border-2 border-dashed p-2 flex flex-col gap-2 min-h-24',
        isOpponent
          ? 'border-red-800/40 bg-red-900/10'
          : 'border-emerald-800/40 bg-emerald-900/10'
      )}
    >
      <p className="text-xs text-stone-500 uppercase tracking-wider">{label}</p>
      <div className="flex flex-wrap gap-2">
        {creatures.map((creature) => (
          <div
            key={creature.instanceId}
            className={cn(
              'relative rounded-lg border p-2 bg-stone-900 min-w-16 text-center transition-all',
              creature.tapped ? 'opacity-60 rotate-3' : '',
              isOpponent ? 'border-red-700' : 'border-emerald-700'
            )}
          >
            <p className="text-white text-xs font-medium truncate max-w-16">{creature.card.name}</p>
            <p className="text-stone-400 text-xs">
              {creature.currentPower}/{creature.currentToughness}
            </p>
            {creature.canAttack && !creature.tapped && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-400" />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
