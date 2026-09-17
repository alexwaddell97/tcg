import { useNavigate } from 'react-router-dom'
import { useRunStore } from '../stores/useRunStore.ts'
import { cn } from '../lib/cn.ts'

export default function RunOverPage() {
  const navigate = useNavigate()
  const run = useRunStore((s) => s.run)
  const beginRun = useRunStore((s) => s.beginRun)
  const abandonRun = useRunStore((s) => s.abandonRun)

  const isVictory = run?.phase === 'victory'

  // Calculate some stats
  const cardCount = run?.deck.length ?? 0
  const relicCount = run?.relics.length ?? 0
  const gold = run?.gold ?? 0
  const floor = run?.floor ?? 0
  const hp = run?.hp ?? 0
  const maxHp = run?.maxHp ?? 0

  function startNewRun() {
    beginRun()
    navigate('/run/map')
  }

  function returnToMenu() {
    abandonRun()
    navigate('/')
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 py-8 gap-10"
      style={{
        background: isVictory
          ? 'radial-gradient(ellipse at 50% 20%, #1a1200 0%, #0a0806 100%)'
          : 'radial-gradient(ellipse at 50% 20%, #160005 0%, #0a0806 100%)',
      }}
    >
      {/* Main result */}
      <div className="text-center flex flex-col items-center gap-4">
        <div className={cn(
          'font-cinzel text-5xl tracking-widest uppercase',
          isVictory ? 'text-amber-400/60' : 'text-red-800/60'
        )}>
          {isVictory ? 'VICTORY' : 'DEFEAT'}
        </div>
        <div>
          <p className="font-cinzel text-stone-600 text-[10px] uppercase tracking-[0.4em]">
            {isVictory ? 'Run Complete' : 'Defeated'}
          </p>
          <h1
            className={cn(
              'font-cinzel text-3xl tracking-widest uppercase',
              isVictory ? 'text-amber-300' : 'text-red-400'
            )}
          >
            {isVictory ? 'Champion of the Arena!' : 'You fell in battle'}
          </h1>
        </div>
        <p className="text-stone-400 text-sm max-w-sm leading-relaxed">
          {isVictory
            ? 'Against all odds, you conquered the arena and claimed the title of Undying Champion. Your legend will be told for generations.'
            : "The crowd fell silent as you hit the sand. You fought with honour, but honour alone doesn't win in the arena."}
        </p>
      </div>

      {/* Stats */}
      <div
        className="grid grid-cols-2 gap-3 w-full max-w-xs"
      >
        {[
          { label: 'Floor reached', value: floor },
          { label: 'HP remaining', value: `${hp} / ${maxHp}` },
          { label: 'Cards in deck', value: cardCount },
          { label: 'Relics collected', value: relicCount },
          { label: 'Gold remaining', value: gold },
        ].map(({ label, value }) => (
          <div
            key={label}
            className="flex flex-col gap-1 px-4 py-3 rounded-sm border border-stone-800/60 bg-stone-950/60"
          >
            <span className="font-cinzel text-stone-600 text-[9px] uppercase tracking-widest">{label}</span>
            <span className="text-stone-200 font-black text-xl tabular-nums">{value}</span>
          </div>
        ))}
      </div>

      {/* CTA buttons */}
      <div className="flex flex-col gap-3 w-full max-w-xs">
        <button
          onClick={startNewRun}
          className={cn(
          'py-4 rounded-sm font-cinzel text-base uppercase tracking-widest transition-all',
            'hover:scale-[1.02] active:scale-[0.98]',
            isVictory
              ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-lg shadow-amber-900/40'
              : 'bg-red-700 hover:bg-red-600 text-white shadow-lg shadow-red-900/40'
          )}
        >
          {isVictory ? 'Run again' : 'Try again'}
        </button>
        <button
          onClick={returnToMenu}
          className="py-3 rounded-sm border border-stone-700/60 text-stone-400 hover:text-stone-200 font-cinzel text-sm uppercase tracking-widest transition-all"
        >
          Return to menu
        </button>
      </div>
    </div>
  )
}
