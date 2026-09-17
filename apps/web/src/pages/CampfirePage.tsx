import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useRunStore } from '../stores/useRunStore.ts'
import type { SPCardInstance } from '@tcg/shared'
import { getEquipment } from '@tcg/shared'
import { cn } from '../lib/cn.ts'

type CampfireAction = 'choose' | 'smith' | 'forge'

export default function CampfirePage() {
  const navigate = useNavigate()
  const run = useRunStore((s) => s.run)
  const restAtCampfire = useRunStore((s) => s.restAtCampfire)
  const smithAtCampfire = useRunStore((s) => s.smithAtCampfire)
  const forgeAtCampfire = useRunStore((s) => s.forgeAtCampfire)

  const [action, setAction] = useState<CampfireAction>('choose')
  const [selectedCard, setSelectedCard] = useState<string | null>(null)
  const [selectedEquipment, setSelectedEquipment] = useState<string | null>(null)

  useEffect(() => {
    if (!run) { navigate('/run'); return }
    if (run.phase !== 'campfire') { navigate('/run/map'); return }
  }, [run?.phase])

  if (!run || run.phase !== 'campfire') return null

  const healAmount = Math.floor(run.maxHp * 0.3)
  const alreadyFull = run.hp >= run.maxHp

  function doRest() {
    restAtCampfire()
    navigate('/run/map')
  }

  function doSmith() {
    if (!selectedCard) return
    smithAtCampfire(selectedCard)
    navigate('/run/map')
  }

  // Upgradeable cards only (not already upgraded)
  const upgradeable = run.deck.filter((c: SPCardInstance) => !c.isUpgraded && c.rarity !== 'special')

  // Forgeable equipment (equipped items that have an upgradesTo)
  const equippedIds = [run.equippedWeapon, run.equippedArmor, run.equippedOffhand].filter(Boolean) as string[]
  const forgeable = equippedIds
    .map((id) => getEquipment(id))
    .filter((eq) => eq !== undefined && eq.upgradesTo !== undefined) as NonNullable<ReturnType<typeof getEquipment>>[]

  function doForge() {
    if (!selectedEquipment) return
    forgeAtCampfire(selectedEquipment)
    navigate('/run/map')
  }

  const typeColor = (type: string) =>
    type === 'attack' ? 'text-red-400' : type === 'skill' ? 'text-sky-400' : 'text-violet-400'

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 py-8 gap-8"
      style={{ background: 'radial-gradient(ellipse at 50% 30%, #1a0e00 0%, #0a0806 100%)' }}
    >
      {/* Campfire visual */}
      <div className="text-center flex flex-col items-center gap-2">
        <div className="sp-divider w-24 mb-2" />
        <h1 className="font-cinzel text-amber-300/90 text-3xl tracking-widest uppercase">Rest Site</h1>
        <p className="text-stone-500 text-sm">Take a moment to recover before the next battle</p>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-6 text-sm text-stone-500">
        <span className="flex items-center gap-1">
          <span className="font-cinzel text-[9px] uppercase tracking-wider text-stone-600">HP</span>
          <span className={cn('font-bold tabular-nums', run.hp < run.maxHp * 0.35 ? 'text-red-400' : 'text-stone-300')}>
            {run.hp}
          </span>
          <span>/{run.maxHp}</span>
        </span>
        <span className="flex items-center gap-1">
          <span className="font-cinzel text-[9px] uppercase tracking-wider text-stone-600">Deck</span>
          <span className="text-stone-300 font-bold tabular-nums">{run.deck.length}</span>
        </span>
      </div>

      {action === 'choose' && (
        <div className="flex flex-col gap-4 w-full max-w-sm">
          {/* Rest */}
          <button
            onClick={doRest}
            disabled={alreadyFull}
            className={cn(
              'flex items-start gap-4 p-5 rounded-2xl border-2 text-left transition-all',
              alreadyFull
                ? 'border-stone-800 opacity-40 cursor-not-allowed bg-stone-950'
                : 'border-amber-700/60 bg-amber-950/30 hover:bg-amber-950/60 hover:scale-[1.02] cursor-pointer'
            )}
          >
            <span className="font-cinzel text-[10px] text-amber-600 uppercase tracking-widest w-8 text-center shrink-0">RST</span>
            <div>
              <p className="text-amber-200 font-black text-base">Rest</p>
              <p className="text-stone-400 text-sm">
                {alreadyFull ? 'Already at full HP' : `Heal ${healAmount} HP (30% of max)`}
              </p>
            </div>
          </button>

          {/* Forge */}
          <button
            onClick={() => setAction('forge')}
            disabled={forgeable.length === 0}
            className={cn(
              'flex items-start gap-4 p-5 rounded-2xl border-2 text-left transition-all',
              forgeable.length === 0
                ? 'border-stone-800 opacity-40 cursor-not-allowed bg-stone-950'
                : 'border-amber-700/60 bg-amber-950/30 hover:bg-amber-950/60 hover:scale-[1.02] cursor-pointer'
            )}
          >
            <span className="font-cinzel text-[10px] text-amber-600 uppercase tracking-widest w-8 text-center shrink-0">FRG</span>
            <div>
              <p className="text-amber-200 font-black text-base">Forge</p>
              <p className="text-stone-400 text-sm">
                {forgeable.length === 0
                  ? 'No equipment to upgrade'
                  : `Upgrade a piece of equipment (${forgeable.length} available)`}
              </p>
            </div>
          </button>

          {/* Smith */}
          <button
            onClick={() => setAction('smith')}
            disabled={upgradeable.length === 0}
            className={cn(
              'flex items-start gap-4 p-5 rounded-2xl border-2 text-left transition-all',
              upgradeable.length === 0
                ? 'border-stone-800 opacity-40 cursor-not-allowed bg-stone-950'
                : 'border-sky-700/60 bg-sky-950/20 hover:bg-sky-950/50 hover:scale-[1.02] cursor-pointer'
            )}
          >
            <span className="font-cinzel text-[10px] text-sky-600 uppercase tracking-widest w-8 text-center shrink-0">SMT</span>
            <div>
              <p className="text-sky-200 font-black text-base">Smith</p>
              <p className="text-stone-400 text-sm">
                {upgradeable.length === 0
                  ? 'No cards to upgrade'
                  : `Upgrade a card in your deck (${upgradeable.length} available)`}
              </p>
            </div>
          </button>
        </div>
      )}

      {action === 'forge' && (
        <div className="flex flex-col gap-4 w-full max-w-lg">
          <div className="flex items-center justify-between">
            <p className="text-stone-300 font-bold">Choose equipment to upgrade:</p>
            <button
              onClick={() => { setAction('choose'); setSelectedEquipment(null) }}
              className="text-stone-600 hover:text-stone-400 text-xs uppercase tracking-widest"
            >
              Back
            </button>
          </div>

          <div className="flex flex-col gap-2">
            {forgeable.map((eq) => {
              const upgraded = eq.upgradesTo ? getEquipment(eq.upgradesTo) : undefined
              return (
                <button
                  key={eq.id}
                  onClick={() => setSelectedEquipment(eq.id)}
                  className={cn(
                    'flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all',
                    selectedEquipment === eq.id
                      ? 'border-amber-500 bg-amber-950/40 scale-[1.02]'
                      : 'border-stone-700 bg-stone-950 hover:border-amber-700/50 hover:bg-stone-900'
                  )}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[9px] uppercase tracking-widest text-stone-500 font-bold">{eq.slot}</span>
                      <span className="text-[9px] text-amber-600 font-bold">T{eq.tier}</span>
                    </div>
                    <p className="text-stone-200 font-bold text-sm">{eq.name}</p>
                    <p className="text-stone-500 text-xs leading-tight line-clamp-2">{eq.description}</p>
                  </div>
                  {upgraded && (
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-stone-600">→</span>
                      <div className="text-right">
                        <p className="text-amber-300 font-bold text-xs">{upgraded.name}</p>
                        <p className="text-amber-600 text-[9px]">T{upgraded.tier}</p>
                      </div>
                    </div>
                  )}
                </button>
              )
            })}
          </div>

          <button
            onClick={doForge}
            disabled={!selectedEquipment}
            className={cn(
              'py-3 rounded-sm font-cinzel text-sm uppercase tracking-widest transition-all',
              selectedEquipment
                ? 'bg-amber-600 hover:bg-amber-500 text-white'
                : 'bg-stone-800 text-stone-600 cursor-not-allowed'
            )}
          >
            Forge equipment
          </button>
        </div>
      )}

      {action === 'smith' && (
        <div className="flex flex-col gap-4 w-full max-w-lg">
          <div className="flex items-center justify-between">
            <p className="text-stone-300 font-bold">Choose a card to upgrade:</p>
            <button
              onClick={() => { setAction('choose'); setSelectedCard(null) }}
              className="text-stone-600 hover:text-stone-400 text-xs uppercase tracking-widest"
            >
              Back
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-80 overflow-y-auto pr-1" style={{ scrollbarWidth: 'thin' }}>
            {upgradeable.map((card: SPCardInstance) => (
              <button
                key={card.instanceId}
                onClick={() => setSelectedCard(card.instanceId)}
                className={cn(
                  'flex flex-col gap-1.5 p-3 rounded-xl border-2 text-left transition-all',
                  selectedCard === card.instanceId
                    ? 'border-amber-500 bg-amber-950/40 scale-[1.02]'
                    : 'border-stone-700 bg-stone-950 hover:border-stone-600 hover:bg-stone-900'
                )}
              >
                <div className="flex items-center justify-between">
                  <span className={cn('text-[10px] uppercase font-bold tracking-widest', typeColor(card.type))}>
                    {card.type}
                  </span>
                  <span className="text-stone-500 text-[10px] font-bold">{card.energyCost}</span>
                </div>
                <p className="text-stone-200 font-bold text-xs leading-tight">{card.name}</p>
                <p className="text-stone-500 text-[10px] leading-tight line-clamp-2">{card.description}</p>
              </button>
            ))}
          </div>

          <button
            onClick={doSmith}
            disabled={!selectedCard}
            className={cn(
              'py-3 rounded-sm font-cinzel text-sm uppercase tracking-widest transition-all',
              selectedCard
                ? 'bg-amber-600 hover:bg-amber-500 text-white'
                : 'bg-stone-800 text-stone-600 cursor-not-allowed'
            )}
          >
            Upgrade selected
          </button>
        </div>
      )}
    </div>
  )
}
