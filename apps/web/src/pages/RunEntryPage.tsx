import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useRunStore } from '../stores/useRunStore.ts'
import type { GladiatorClassId } from '@tcg/shared'
import { GLADIATOR_CLASSES, getEquipment } from '@tcg/shared'
import { cn } from '../lib/cn.ts'

export default function RunEntryPage() {
  const navigate = useNavigate()
  const run = useRunStore((s) => s.run)
  const beginRun = useRunStore((s) => s.beginRun)

  const [selectedClass, setSelectedClass] = useState<GladiatorClassId>('murmillo')

  // If there's an active non-terminal run in progress, redirect to the correct sub-page
  useEffect(() => {
    if (!run) return
    if (run.phase === 'map') { navigate('/run/map', { replace: true }); return }
    if (run.phase === 'combat') { navigate('/run/combat', { replace: true }); return }
    if (run.phase === 'card_reward') { navigate('/run/reward', { replace: true }); return }
    if (run.phase === 'campfire') { navigate('/run/campfire', { replace: true }); return }
    if (run.phase === 'shop') { navigate('/run/shop', { replace: true }); return }
    if (run.phase === 'event') { navigate('/run/event', { replace: true }); return }
    if (run.phase === 'victory' || run.phase === 'game_over') { navigate('/run/over', { replace: true }); return }
  }, [run])

  function startNewRun() {
    beginRun(selectedClass)
    navigate('/run/map')
  }

  if (run) return null

  const CLASS_BORDER: Record<GladiatorClassId, string> = {
    murmillo:  'border-sky-700/70 hover:border-sky-500',
    retiarius: 'border-emerald-700/70 hover:border-emerald-500',
    secutor:   'border-red-700/70 hover:border-red-500',
  }
  const CLASS_SELECTED_BORDER: Record<GladiatorClassId, string> = {
    murmillo:  'border-sky-400 bg-sky-950/40',
    retiarius: 'border-emerald-400 bg-emerald-950/40',
    secutor:   'border-red-400 bg-red-950/40',
  }
  const CLASS_ACCENT: Record<GladiatorClassId, string> = {
    murmillo:  'text-sky-300',
    retiarius: 'text-emerald-300',
    secutor:   'text-red-300',
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 py-10 gap-8"
      style={{ background: 'radial-gradient(ellipse at 50% 15%, #200f00 0%, #0a0806 100%)' }}
    >
      {/* Hero */}
      <div className="text-center flex flex-col items-center gap-3 max-w-md">
        <div className="sp-divider w-24 mb-2" />
        <div>
          <p className="font-cinzel text-stone-600 text-[9px] uppercase tracking-[0.5em] mb-1">Gladiator Roguelike</p>
          <h1
            className="font-cinzel text-4xl tracking-wide leading-none"
            style={{
              background: 'linear-gradient(180deg, #F2C979 0%, #B57A2A 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            The Gauntlet
          </h1>
        </div>
        <p className="text-stone-400 text-sm leading-relaxed">
          Choose your fighting style. Each gladiator starts with unique gear that shapes how you play.
        </p>
      </div>

      {/* Class selection */}
      <div className="w-full max-w-lg">
        <p className="text-stone-600 text-[9px] uppercase tracking-[0.4em] font-bold mb-3 text-center">
          Choose your gladiator
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {GLADIATOR_CLASSES.map((cls) => {
            const isSelected = selectedClass === cls.id
            const weaponDef = cls.startingWeapon ? getEquipment(cls.startingWeapon) : null
            const armorDef = cls.startingArmor ? getEquipment(cls.startingArmor) : null
            const offhandDef = cls.startingOffhand ? getEquipment(cls.startingOffhand) : null

            return (
              <button
                key={cls.id}
                onClick={() => setSelectedClass(cls.id as GladiatorClassId)}
                className={cn(
                  'flex flex-col gap-3 p-4 rounded border-2 text-left transition-all',
                  isSelected
                    ? CLASS_SELECTED_BORDER[cls.id as GladiatorClassId]
                    : cn('border-stone-800 bg-stone-950/60', CLASS_BORDER[cls.id as GladiatorClassId]),
                  'hover:scale-[1.02] active:scale-[0.98]',
                )}
              >
                {/* Header */}
                <div className="flex items-center gap-2">
                  <div>
                    <p className={cn('font-cinzel text-sm leading-tight tracking-wide', isSelected ? CLASS_ACCENT[cls.id as GladiatorClassId] : 'text-stone-200')}>
                      {cls.name}
                    </p>
                    <p className="text-stone-600 text-[9px]">{cls.startingMaxHp} HP</p>
                  </div>
                  {isSelected && (
                    <div className="ml-auto w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                  )}
                </div>

                {/* Description */}
                <p className="text-stone-400 text-xs leading-snug">{cls.description}</p>

                {/* Starting gear */}
                <div className="flex flex-col gap-1 border-t border-stone-800/60 pt-2">
                  <p className="text-stone-600 text-[8px] uppercase tracking-widest font-bold">Starting Gear</p>
                  {[weaponDef, armorDef, offhandDef].filter(Boolean).map((eq) => (
                    <div key={eq!.id} className="flex items-center gap-1.5">
                      <span className="font-cinzel text-[7px] text-stone-600 uppercase tracking-wider">{eq!.slot.slice(0,3).toUpperCase()}</span>
                      <span className="text-stone-300 text-[10px] font-bold">{eq!.name}</span>
                    </div>
                  ))}
                  {!weaponDef && !armorDef && !offhandDef && (
                    <p className="text-stone-600 text-[10px]">No starting gear</p>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Selected class details */}
      {(() => {
        const cls = GLADIATOR_CLASSES.find((c) => c.id === selectedClass)!
        return (
          <div className="w-full max-w-sm text-center px-2">
            <p className="text-stone-500 text-xs italic leading-relaxed">"{cls.loreText}"</p>
          </div>
        )
      })()}

      {/* CTA */}
      <div className="flex flex-col gap-3 w-full max-w-xs">
        <button
          onClick={startNewRun}
          className={cn(
          'py-4 rounded-sm font-cinzel text-base uppercase tracking-widest transition-all',
            'bg-amber-600 hover:bg-amber-500 text-white shadow-lg shadow-amber-900/40',
            'hover:scale-[1.02] active:scale-[0.98]'
          )}
        >
          Enter the Arena
        </button>
        <button
          onClick={() => navigate('/')}
          className="py-3 rounded-sm border border-stone-700/50 text-stone-500 hover:text-stone-300 font-cinzel text-sm uppercase tracking-widest transition-all"
        >
          Back to menu
        </button>
      </div>
    </div>
  )
}
