import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useRunStore } from '../stores/useRunStore.ts'
import { cn } from '../lib/cn.ts'

// Simple event scenarios
const EVENTS = [
  {
    id: 'mysterious_merchant',
    title: 'Mysterious Merchant',
    description:
      'A hooded figure beckons from the shadows. "Gladiator," he whispers, "I have wares that could tip the scales in your favour."',
    choices: [
      { label: 'Trade 25 gold for a common card', subtext: 'Costs 25 gold' },
      { label: 'Heal 10 HP at a price', subtext: 'Lose 10 gold, gain 10 HP' },
      { label: 'Leave', subtext: 'Nothing happens' },
    ],
  },
  {
    id: 'blood_shrine',
    title: 'Blood Shrine',
    description:
      'An ancient altar stained crimson stands before you. Faded text promises power to those willing to sacrifice.',
    choices: [
      { label: 'Offer blood', subtext: 'Lose 10 HP, gain 1 Strength permanently' },
      { label: 'Take from the altar', subtext: 'Gain 30 gold' },
      { label: 'Leave', subtext: 'Nothing happens' },
    ],
  },
  {
    id: 'training_guru',
    title: 'Training Guru',
    description:
      'An old gladiator sits cross-legged, whittling a wooden sword. He looks up. "Want a lesson, young fighter?"',
    choices: [
      { label: 'Accept training', subtext: 'Add a random common card to your deck' },
      { label: 'Spar with him', subtext: 'Gain 20 gold, lose 5 HP' },
      { label: 'Decline', subtext: 'Nothing happens' },
    ],
  },
]

export default function EventPage() {
  const navigate = useNavigate()
  const run = useRunStore((s) => s.run)
  const makeEventChoice = useRunStore((s) => s.makeEventChoice)

  useEffect(() => {
    if (!run) { navigate('/run'); return }
    if (run.phase !== 'event') { navigate('/run/map'); return }
  }, [run?.phase])

  if (!run || run.phase !== 'event') return null

  // Pick a deterministic event based on floor
  const event = EVENTS[run.floor % EVENTS.length]

  function choose(index: number) {
    makeEventChoice(index)
    navigate('/run/map')
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 py-8 gap-8"
      style={{ background: 'radial-gradient(ellipse at 50% 20%, #0d0a14 0%, #0a0806 100%)' }}
    >
      {/* Header ornament */}
      <div className="text-center flex flex-col items-center gap-3 max-w-md">
        <p className="font-cinzel text-stone-600 text-[9px] uppercase tracking-[0.4em]">Unknown</p>
        <h1 className="font-cinzel text-sky-200/80 text-3xl tracking-widest uppercase">{event.title}</h1>
        <p className="text-stone-400 text-sm leading-relaxed">{event.description}</p>
      </div>

      {/* Choices */}
      <div className="flex flex-col gap-3 w-full max-w-sm">
        {event.choices.map((choice, idx) => (
          <button
            key={idx}
            onClick={() => choose(idx)}
            className={cn(
              'flex items-start gap-4 p-4 rounded border-2 text-left transition-all',
              'border-stone-700/60 bg-stone-950 hover:bg-stone-900/80',
              'hover:border-sky-700/60 hover:scale-[1.01] active:scale-95'
            )}
          >
            <div className="shrink-0 w-7 h-7 rounded-full border border-sky-700/60 bg-sky-950/30 flex items-center justify-center">
              <span className="text-sky-400 font-black text-xs">{idx + 1}</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <p className="text-stone-200 font-bold text-sm leading-tight">{choice.label}</p>
              <p className="text-stone-500 text-xs">{choice.subtext}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Stats */}
      <div className="flex items-center gap-6 text-sm text-stone-600 border-t border-stone-800/50 pt-4">
        <span className="flex items-center gap-1">
          <span className="font-cinzel text-[9px] uppercase tracking-wider">HP</span>
          <span className="text-stone-400 font-bold">{run.hp}</span>
          <span>/{run.maxHp}</span>
        </span>
        <span className="flex items-center gap-1">
          <span className="font-cinzel text-[9px] uppercase tracking-wider">Gold</span>
          <span className="text-amber-300 font-bold">{run.gold}</span>
        </span>
      </div>
    </div>
  )
}
