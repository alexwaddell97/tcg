import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useRunStore } from '../stores/useRunStore.ts'
import type { CombatState, StatusEffect, ActiveEnemy, CombatLogEntry, RunState } from '@tcg/shared'
import { RELIC_DATABASE, POTION_DATABASE, getEquipment } from '@tcg/shared'
import { cn } from '../lib/cn.ts'
import SPCardDisplay from '../components/run/SPCardDisplay.tsx'

// ─── Status badge ─────────────────────────────────────────────────────────────

const STATUS_ICONS: Record<string, { icon: string; color: string; label: string }> = {
  vulnerable:   { icon: '🔴', color: 'text-red-400',     label: 'Vulnerable' },
  weak:         { icon: '🟡', color: 'text-yellow-400',  label: 'Weak' },
  strength:     { icon: '💪', color: 'text-orange-400',  label: 'Strength' },
  dexterity:    { icon: '🔵', color: 'text-blue-400',    label: 'Dexterity' },
  thorns:       { icon: '🌵', color: 'text-green-500',   label: 'Thorns' },
  poison:       { icon: '☠️', color: 'text-green-400',   label: 'Poison' },
  frail:        { icon: '🩹', color: 'text-stone-400',   label: 'Frail' },
  metallicize:  { icon: '🛡', color: 'text-sky-400',     label: 'Metallicize' },
  ritual:       { icon: '✨', color: 'text-purple-400',  label: 'Ritual' },
  brutality:    { icon: '🩸', color: 'text-red-500',     label: 'Battle Trance' },
  berserk:      { icon: '⚡', color: 'text-yellow-300',  label: 'Berserk' },
  juggernaut:   { icon: '⚙️', color: 'text-amber-400',  label: 'Juggernaut' },
  feel_no_pain: { icon: '🔥', color: 'text-rose-400',   label: 'Feel No Pain' },
  demon_form:   { icon: '😈', color: 'text-violet-400', label: 'Demon Form' },
  combust:      { icon: '💥', color: 'text-orange-500', label: 'Combust' },
}

function StatusBadge({ effect }: { effect: StatusEffect }) {
  const info = STATUS_ICONS[effect.id] ?? { icon: '?', color: 'text-stone-400', label: effect.id }
  return (
    <div
      className="relative flex items-center justify-center w-8 h-8 rounded-lg border border-stone-700/60 bg-stone-900/80 cursor-default"
      title={`${info.label}: ${effect.stacks}`}
    >
      <span className="text-sm leading-none">{info.icon}</span>
      <span className="absolute -bottom-1 -right-1 text-[9px] font-black text-stone-200 bg-stone-800 rounded px-0.5 leading-tight">
        {effect.stacks}
      </span>
    </div>
  )
}

// ─── Intent display ───────────────────────────────────────────────────────────

const INTENT_CONFIG: Record<string, { label: string; cls: string; textCls: string }> = {
  attack:        { label: 'ATTACK',     cls: 'border-red-800/50 bg-red-950/30',       textCls: 'text-red-300' },
  attack_debuff: { label: 'ATTACK',     cls: 'border-red-800/50 bg-red-950/30',       textCls: 'text-red-300' },
  attack_buff:   { label: 'ATTACK',     cls: 'border-red-800/50 bg-red-950/30',       textCls: 'text-red-300' },
  multi_attack:  { label: 'MULTI-ATK', cls: 'border-red-700/60 bg-red-950/50',       textCls: 'text-red-200' },
  defend:        { label: 'DEFEND',     cls: 'border-sky-800/50 bg-sky-950/30',       textCls: 'text-sky-300' },
  buff:          { label: 'BUFF',       cls: 'border-orange-800/50 bg-orange-950/30', textCls: 'text-orange-300' },
  debuff:        { label: 'DEBUFF',     cls: 'border-yellow-800/50 bg-yellow-950/30', textCls: 'text-yellow-300' },
  unknown:       { label: '???',        cls: 'border-stone-700/50 bg-stone-900/30',   textCls: 'text-stone-500' },
}

function IntentBadge({ enemy, showIntent }: { enemy: ActiveEnemy; showIntent: boolean }) {
  const intent = enemy.currentIntent
  const cfg = INTENT_CONFIG[intent.type] ?? INTENT_CONFIG.unknown

  return (
    <div className={cn('flex items-center gap-2 px-2.5 py-1 rounded-sm border', cfg.cls)}>
      <span className={cn('font-cinzel text-[9px] uppercase tracking-widest', cfg.textCls)}>
        {showIntent ? cfg.label : '???'}
      </span>
      {showIntent && intent.description && (
        <span className="text-stone-500 text-[10px] leading-tight">{intent.description}</span>
      )}
    </div>
  )
}

// ─── Enemy display ────────────────────────────────────────────────────────────

function EnemyDisplay({
  enemy,
  showIntent,
}: {
  enemy: ActiveEnemy
  showIntent: boolean
}) {
  const hpPct = Math.max(0, (enemy.hp / enemy.maxHp) * 100)

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Intent */}
      <IntentBadge enemy={enemy} showIntent={showIntent} />

      {/* Name + HP */}
      <div className="flex flex-col items-center gap-1">
        <p className="font-cinzel text-stone-200 text-sm uppercase tracking-widest">{enemy.name}</p>
        <div className="flex items-baseline gap-2">
          <span className="text-stone-100 font-bold text-lg tabular-nums">{enemy.hp}</span>
          <span className="text-stone-600 text-sm">/ {enemy.maxHp}</span>
        </div>

        {/* HP bar */}
        <div className="w-52 h-2.5 rounded-sm overflow-hidden border border-stone-800/60" style={{ background: '#1a1410' }}>
          <div
            className="h-full bg-red-700 transition-all duration-300"
            style={{ width: `${hpPct}%` }}
          />
        </div>
      </div>

      {/* Status effects */}
      {enemy.statusEffects.length > 0 && (
        <div className="flex flex-wrap gap-1 justify-center">
          {enemy.statusEffects.map((e) => (
            <StatusBadge key={e.id} effect={e} />
          ))}
        </div>
      )}

      {/* Block */}
      {enemy.block > 0 && (
        <div className="flex items-center gap-2 px-2.5 py-1 rounded-sm border border-sky-800/50 bg-sky-950/30">
          <span className="font-cinzel text-[9px] text-sky-600 tracking-[0.2em] uppercase">Block</span>
          <span className="text-sky-300 text-sm font-black tabular-nums">{enemy.block}</span>
        </div>
      )}
    </div>
  )
}

function PlayerStatus({
  combat,
}: {
  combat: CombatState
}) {
  const hpPct = Math.max(0, (combat.playerHp / combat.playerMaxHp) * 100)
  const isLow = combat.playerHp < combat.playerMaxHp * 0.35

  return (
    <div className="flex flex-col gap-2 w-full">
      {/* HP + Block row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-stone-500 text-xs uppercase tracking-widest font-bold">HP</span>
          <span className={cn('font-black text-lg tabular-nums', isLow ? 'text-red-400' : 'text-stone-100')}>
            {combat.playerHp}
          </span>
          <span className="text-stone-600 text-sm">/ {combat.playerMaxHp}</span>
        </div>
        {combat.playerBlock > 0 && (
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-sm border border-sky-800/50 bg-sky-950/30">
            <span className="font-cinzel text-[9px] text-sky-600 tracking-[0.2em] uppercase">Block</span>
            <span className="text-sky-300 text-sm font-black tabular-nums">{combat.playerBlock}</span>
          </div>
        )}
      </div>

      {/* HP bar */}
      <div className="w-full h-2.5 bg-stone-900 rounded-sm overflow-hidden border border-stone-800/60">
        <div
          className={cn(
            'h-full transition-all duration-300',
            isLow ? 'bg-red-600' : 'bg-emerald-600'
          )}
          style={{ width: `${hpPct}%` }}
        />
      </div>

      {/* Status effects */}
      {combat.playerStatusEffects.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {combat.playerStatusEffects.map((e) => (
            <StatusBadge key={e.id} effect={e} />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Energy orbs ─────────────────────────────────────────────────────────────

function EnergyOrbs({ current, max }: { current: number; max: number }) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: max }).map((_, i) => (
        <div
          key={i}
          className={cn(
            'w-7 h-7 rounded-full border-2 transition-all duration-150',
            i < current
              ? 'border-amber-500/80 shadow-[0_0_8px_rgba(217,119,6,0.5)]'
              : 'border-stone-700/60 bg-stone-900/50'
          )}
          style={i < current ? { background: 'radial-gradient(circle at 40% 35%, #fbbf24, #d97706 60%, #78350f)' } : {}}
        />
      ))}
    </div>
  )
}

// ─── Equipment panel ─────────────────────────────────────────────────────────

function EquipmentPanel({ run }: { run: RunState }) {
  const slots = [
    { id: run.equippedWeapon ?? null, label: 'Weapon', abbr: 'WPN' },
    { id: run.equippedArmor ?? null, label: 'Armour', abbr: 'ARM' },
    { id: run.equippedOffhand ?? null, label: 'Offhand', abbr: 'OFF' },
  ]

  return (
    <div className="flex flex-col gap-1.5">
      {slots.map(({ id, label, abbr }) => {
        if (!id) return (
          <div key={label} className="flex items-center gap-2 px-2 py-1.5 rounded-sm border border-stone-800/40 bg-stone-950/40">
            <span className="font-cinzel text-[8px] text-stone-700 uppercase tracking-wider">{abbr}</span>
            <span className="text-stone-700 text-[10px]">—</span>
          </div>
        )
        const eq = getEquipment(id)
        if (!eq) return null
        return (
          <div
            key={label}
            className="flex items-center gap-2 px-2 py-1.5 rounded-sm border border-stone-700/40 bg-stone-900/60 cursor-default"
            title={`${eq.name}: ${eq.description}`}
          >
            <span className="font-cinzel text-[8px] text-stone-500 uppercase tracking-wider shrink-0">{abbr}</span>
            <div className="min-w-0">
              <p className="text-stone-300 text-[10px] font-bold leading-tight truncate">{eq.name}</p>
              <p className="text-stone-600 text-[8px] leading-tight">T{eq.tier}</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── CARD_TYPE_STYLES is kept for the deck modal only ─────────────────────────

const CARD_TYPE_STYLES: Record<string, { border: string; glow: string; typeColor: string; typeLabel: string }> = {
  attack: {
    border: 'border-red-800/70',
    glow: 'hover:shadow-[0_0_18px_rgba(239,68,68,0.35)]',
    typeColor: 'text-red-400',
    typeLabel: 'ATTACK',
  },
  skill: {
    border: 'border-sky-800/70',
    glow: 'hover:shadow-[0_0_18px_rgba(56,189,248,0.35)]',
    typeColor: 'text-sky-400',
    typeLabel: 'SKILL',
  },
  power: {
    border: 'border-violet-800/70',
    glow: 'hover:shadow-[0_0_18px_rgba(167,139,250,0.35)]',
    typeColor: 'text-violet-400',
    typeLabel: 'POWER',
  },
}

// ─── Combat log ──────────────────────────────────────────────────────────────

function CombatLog({ entries }: { entries: CombatLogEntry[] }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (ref.current) {
      ref.current.scrollTop = ref.current.scrollHeight
    }
  }, [entries.length])

  const TYPE_COLORS: Record<string, string> = {
    damage: 'text-red-400',
    block: 'text-sky-400',
    status: 'text-yellow-400',
    card: 'text-stone-300',
    heal: 'text-emerald-400',
    system: 'text-stone-600',
    enemy: 'text-orange-400',
  }

  return (
    <div
      ref={ref}
      className="h-full overflow-y-auto scrollbar-thin scrollbar-thumb-stone-800 flex flex-col gap-0.5 pr-1"
    >
      {entries.slice(-40).map((entry) => (
        <p key={entry.id} className={cn('text-[10px] leading-tight', TYPE_COLORS[entry.type] ?? 'text-stone-500')}>
          {entry.message}
        </p>
      ))}
    </div>
  )
}

// ─── Potion bar ──────────────────────────────────────────────────────────────

function PotionBar({
  potions,
  onUse,
  inCombat,
}: {
  potions: (string | null)[]
  onUse: (slot: number) => void
  inCombat: boolean
}) {
  return (
    <div className="flex gap-1.5">
      {potions.map((potionId, slot) => {
        const def = potionId ? POTION_DATABASE.find((p) => p.id === potionId) : null
        return (
          <button
            key={slot}
            onClick={() => potionId && onUse(slot)}
            disabled={!potionId || (!inCombat && potionId !== 'health_potion')}
            className={cn(
              'w-9 h-9 rounded-sm border flex items-center justify-center transition-all duration-100',
              potionId
                ? 'border-amber-700/60 bg-amber-900/20 hover:bg-amber-900/40 hover:scale-105 cursor-pointer'
                : 'border-stone-800/60 bg-stone-900/40 cursor-default opacity-30'
            )}
            title={def ? `${def.name}: ${def.description}` : 'Empty potion slot'}
          >
            {!potionId ? (
              <span className="text-stone-700 text-[8px]">○</span>
            ) : (
              <span className={cn('font-cinzel text-[7px] uppercase tracking-wider font-bold leading-none text-center',
                potionId === 'health_potion' ? 'text-emerald-400' :
                potionId === 'strength_potion' ? 'text-red-400' :
                potionId === 'block_potion' ? 'text-sky-400' :
                potionId === 'energy_potion' ? 'text-amber-400' :
                potionId === 'vulnerable_potion' ? 'text-rose-400' :
                potionId === 'fire_potion' ? 'text-orange-400' : 'text-stone-400'
              )}>
                {potionId === 'health_potion' ? 'HLTH' :
                  potionId === 'strength_potion' ? 'STR' :
                  potionId === 'block_potion' ? 'BLK' :
                  potionId === 'energy_potion' ? 'NRG' :
                  potionId === 'vulnerable_potion' ? 'VLN' :
                  potionId === 'fire_potion' ? 'FIRE' : 'POT'}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

// ─── Deck preview modal ──────────────────────────────────────────────────────

function DeckModal({
  combat,
  onClose,
}: {
  combat: CombatState
  onClose: () => void
}) {
  const [tab, setTab] = useState<'draw' | 'discard' | 'exhaust'>('draw')
  const pile = tab === 'draw' ? combat.drawPile : tab === 'discard' ? combat.discardPile : combat.exhaustPile

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center"
      onClick={onClose}
    >
      <div
        className="bg-stone-950 border border-stone-800 rounded-2xl w-[90vw] max-w-lg p-4 max-h-[80vh] flex flex-col gap-3"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between shrink-0">
          <p className="text-stone-200 font-black tracking-tight">Deck</p>
          <button onClick={onClose} className="text-stone-500 hover:text-stone-300 text-sm">✕</button>
        </div>
        <div className="flex gap-2 shrink-0">
          {(['draw', 'discard', 'exhaust'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                'px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors',
                tab === t ? 'bg-amber-900/60 text-amber-200 border border-amber-700/60' : 'text-stone-500 hover:text-stone-300'
              )}
            >
              {t} ({(t === 'draw' ? combat.drawPile : t === 'discard' ? combat.discardPile : combat.exhaustPile).length})
            </button>
          ))}
        </div>
        <div className="overflow-y-auto flex-1">
          <div className="flex flex-wrap gap-2 justify-center py-2">
            {pile.map((card) => (
              <div key={card.instanceId} className="flex flex-col gap-0.5 w-24 bg-stone-900 rounded-xl border border-stone-800 p-2">
                <p className={cn('text-[9px] font-bold uppercase', CARD_TYPE_STYLES[card.type]?.typeColor ?? 'text-stone-400')}>
                  {card.type}
                </p>
                <p className="text-stone-200 text-xs font-bold leading-tight">{card.name}</p>
                <p className="text-stone-500 text-[9px] leading-snug">{card.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Gladiator sprite placeholder ────────────────────────────────────────────

function GladiatorSprite({ flash }: { flash: boolean }) {
  return (
    <div
      className={cn(
        'w-32 h-44 rounded border flex items-center justify-center relative overflow-hidden transition-all duration-100',
        flash ? 'bg-red-950/50 border-red-800/60' : 'bg-stone-900/20 border-stone-800/30'
      )}
    >
      <div className="absolute inset-4 border border-stone-700/15 rounded-sm" />
      <div className="absolute inset-7 border border-stone-700/10 rounded-sm" />
      <span className="relative z-10 font-cinzel text-stone-700 text-[9px] uppercase tracking-[0.25em]">
        Gladiator
      </span>
    </div>
  )
}

function EnemySprite({ enemy, flash }: { enemy: ActiveEnemy; flash: boolean }) {
  return (
    <div
      className={cn(
        'w-44 h-52 rounded border flex items-center justify-center relative overflow-hidden transition-all duration-100',
        flash ? 'bg-amber-950/50 border-amber-800/60' : 'bg-stone-900/20 border-stone-800/30'
      )}
    >
      <div className="absolute inset-4 border border-stone-700/15 rounded-sm" />
      <div className="absolute inset-8 border border-stone-700/10 rounded-sm" />
      <span className="relative z-10 font-cinzel text-stone-600 text-[9px] uppercase tracking-[0.15em] text-center px-4 leading-loose">
        {enemy.name}
      </span>
    </div>
  )
}

// ─── Main CombatPage ─────────────────────────────────────────────────────────

export default function CombatPage() {
  const navigate = useNavigate()
  const run = useRunStore((s) => s.run)
  const playCardInCombat = useRunStore((s) => s.playCardInCombat)
  const endTurn = useRunStore((s) => s.endTurn)
  const usePotionSlot = useRunStore((s) => s.usePotionSlot)

  const [selectedCard, setSelectedCard] = useState<string | null>(null)
  const [showDeck, setShowDeck] = useState(false)
  const [playerFlash, setPlayerFlash] = useState(false)
  const [enemyFlash, setEnemyFlash] = useState(false)
  const prevHpRef = useRef<number | null>(null)
  const prevEnemyHpRef = useRef<number | null>(null)

  const combat = run?.activeCombat

  // Flash on HP change
  useEffect(() => {
    if (!combat) return
    if (prevHpRef.current !== null && combat.playerHp < prevHpRef.current) {
      setPlayerFlash(true)
      setTimeout(() => setPlayerFlash(false), 300)
    }
    prevHpRef.current = combat.playerHp
  }, [combat?.playerHp])

  useEffect(() => {
    if (!combat) return
    if (prevEnemyHpRef.current !== null && combat.enemy.hp < prevEnemyHpRef.current) {
      setEnemyFlash(true)
      setTimeout(() => setEnemyFlash(false), 250)
    }
    prevEnemyHpRef.current = combat.enemy.hp
  }, [combat?.enemy.hp])

  // Redirect if no active run/combat
  useEffect(() => {
    if (!run) { navigate('/run'); return }
    if (run.phase === 'card_reward') { navigate('/run/reward'); return }
    if (run.phase === 'map') { navigate('/run/map'); return }
    if (run.phase === 'campfire') { navigate('/run/campfire'); return }
    if (run.phase === 'shop') { navigate('/run/shop'); return }
    if (run.phase === 'event') { navigate('/run/event'); return }
    if (run.phase === 'victory' || run.phase === 'game_over') { navigate('/run/over'); return }
  }, [run?.phase])

  if (!run || !combat) return null

  const showIntent = !run.relics.some((r) => r.definitionId === 'runic_dome')
  const isPlayerTurn = combat.phase === 'player_turn'

  function handleCardClick(instanceId: string) {
    if (!isPlayerTurn) return
    if (selectedCard === instanceId) {
      // Play the card
      playCardInCombat(instanceId)
      setSelectedCard(null)
    } else {
      setSelectedCard(instanceId)
    }
  }

  function handleEndTurn() {
    setSelectedCard(null)
    endTurn()
  }

  return (
    <div className="fixed inset-0 flex flex-col" style={{ background: '#0a0806' }}>

      {/* ─── Top strip: floor + enemy name ─── */}
      <div
        className="shrink-0 flex items-center justify-between px-4 py-2 border-b border-stone-800/60"
        style={{ background: 'rgba(10,8,6,0.95)' }}
      >
        <div className="flex items-center gap-2">
          <span className="font-cinzel text-stone-600 text-[10px] uppercase tracking-widest">Act {run.act}</span>
          <span className="text-stone-800">·</span>
          <span className="font-cinzel text-stone-500 text-[10px] tabular-nums">Floor {run.floor}</span>
        </div>
        <p className="font-cinzel text-amber-300/80 text-[11px] uppercase tracking-widest">{combat.enemy.name}</p>
        <div className="flex items-center gap-2">
          <PotionBar potions={run.potions} onUse={usePotionSlot} inCombat />
        </div>
      </div>

      {/* ─── Main content ─── */}
      <div className="flex-1 min-h-0 flex lg:flex-row flex-col">

        {/* ── Left panel: player stats + equipment + relics + deck ── */}
        <aside className="hidden lg:flex flex-col w-56 shrink-0 border-r border-stone-800/60 p-3 gap-3 overflow-y-auto">

          {/* Player stats */}
          <div>
            <p className="font-cinzel text-[9px] uppercase tracking-widest text-stone-600 mb-2">Health</p>
            <PlayerStatus combat={combat} />
            <div className="mt-3 flex items-center gap-2">
              <p className="font-cinzel text-[9px] uppercase tracking-widest text-stone-600 shrink-0">Aether</p>
              <EnergyOrbs current={combat.energy} max={combat.maxEnergy} />
              <span className="text-stone-600 text-[10px] tabular-nums">{combat.energy}/{combat.maxEnergy}</span>
            </div>
          </div>

          <div className="border-t border-stone-800/60 pt-3">
            <p className="font-cinzel text-[9px] uppercase tracking-widest text-stone-600 mb-2">Equipment</p>
            <EquipmentPanel run={run} />
          </div>

          {run.relics.length > 0 && (
            <div className="border-t border-stone-800/60 pt-3">
              <p className="font-cinzel text-[9px] uppercase tracking-widest text-stone-600 mb-2">Relics</p>
              <div className="flex flex-col gap-1">
                {run.relics.map((ar) => {
                  const def = RELIC_DATABASE.find((r) => r.id === ar.definitionId)
                  if (!def) return null
                  return (
                    <div
                      key={ar.definitionId}
                      className="px-2 py-1 rounded-sm border border-amber-900/40 bg-stone-900/60 cursor-default"
                      title={def.description}
                    >
                      <span className="font-cinzel text-[8px] text-amber-600/80 uppercase tracking-wide leading-none">{def.name}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          <div className="border-t border-stone-800/60 pt-3">
            <p className="font-cinzel text-[9px] uppercase tracking-widest text-stone-600 mb-2">Deck</p>
            <div className="flex flex-col gap-1">
              {[
                { label: 'Draw', value: combat.drawPile.length },
                { label: 'Discard', value: combat.discardPile.length },
                { label: 'Exhaust', value: combat.exhaustPile.length },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-stone-600 text-xs">{label}</span>
                  <span className="text-stone-400 text-xs tabular-nums font-bold">{value}</span>
                </div>
              ))}
              <button
                onClick={() => setShowDeck(true)}
                className="mt-1 text-stone-600 hover:text-stone-400 text-[10px] uppercase tracking-widest transition-colors text-left"
              >
                View deck →
              </button>
            </div>
          </div>
        </aside>

        {/* ── Centre: battlefield ── */}
        <div className="flex-1 min-h-0 flex flex-col items-center justify-between py-4 px-3 gap-4">

          {/* Enemy area */}
          <div className="flex flex-col items-center gap-4 w-full max-w-sm">
            <EnemyDisplay enemy={combat.enemy} showIntent={showIntent} />
            <EnemySprite enemy={combat.enemy} flash={enemyFlash} />
          </div>

          {/* Player sprite */}
          <div className="flex flex-col items-center gap-3 w-full max-w-xs">
            <GladiatorSprite flash={playerFlash} />
          </div>
        </div>

        {/* ── Right panel: combat log (desktop) ── */}
        <aside className="hidden lg:flex flex-col w-60 shrink-0 border-l border-stone-800/60 p-3 overflow-hidden">
          <p className="font-cinzel text-[9px] uppercase tracking-widest text-stone-600 mb-2 shrink-0">Battle Log</p>
          <div className="flex-1 min-h-0">
            <CombatLog entries={combat.log} />
          </div>
        </aside>
      </div>

      {/* ─── Hand + End Turn ─── */}
      <div
        className="shrink-0 flex flex-col items-center gap-3 pb-4 pt-2 border-t border-stone-800/60"
        style={{ background: 'rgba(10,8,6,0.97)' }}
      >
        {/* Turn indicator */}
        <div className="flex items-center gap-2">
          <span className={cn(
            'font-cinzel text-xs uppercase tracking-widest',
            isPlayerTurn ? 'text-amber-400' : 'text-stone-600'
          )}>
            {isPlayerTurn ? 'Your Turn' : 'Enemy Turn'}
          </span>
          <span className="font-cinzel text-stone-700 text-[9px] tracking-widest">T{combat.turn}</span>
        </div>

        {/* Hand */}
        <div
          className="flex gap-2 overflow-x-auto pb-1 max-w-full px-3"
          style={{ scrollbarWidth: 'none' }}
        >
          {combat.hand.length === 0 && (
            <p className="text-stone-700 text-sm italic px-4">No cards in hand</p>
          )}
          {combat.hand.map((card) => (
            <SPCardDisplay
              key={card.instanceId}
              card={card}
              canPlay={isPlayerTurn && combat.energy >= card.energyCost && card.id !== 'wound'}
              isSelected={selectedCard === card.instanceId}
              onClick={() => handleCardClick(card.instanceId)}
              className="w-28 min-h-36 shrink-0"
            />
          ))}
        </div>

        {/* End turn + deck size */}
        <div className="flex items-center gap-4">
          <button
            onClick={handleEndTurn}
            disabled={!isPlayerTurn}
            className={cn(
              'px-8 py-2.5 rounded-sm font-cinzel text-sm tracking-widest uppercase transition-all duration-150 relative overflow-hidden',
              isPlayerTurn
                ? 'bg-amber-600 hover:bg-amber-500 text-stone-950 hover:scale-[1.03] active:scale-[0.97] shadow-[0_2px_16px_rgba(217,119,6,0.4)]'
                : 'bg-stone-800/60 text-stone-600 cursor-not-allowed'
            )}
          >
            {isPlayerTurn && (
              <span className="absolute inset-0 bg-gradient-to-b from-white/15 to-transparent pointer-events-none" />
            )}
            End Turn
          </button>
          <div className="flex items-center gap-3 text-stone-700 text-xs">
            <span className="tabular-nums" title="Draw pile">Draw: {combat.drawPile.length}</span>
            <span className="tabular-nums" title="Discard pile">Disc: {combat.discardPile.length}</span>
            <button
              onClick={() => setShowDeck(true)}
              className="lg:hidden text-stone-600 hover:text-stone-400 transition-colors"
            >
              Deck
            </button>
          </div>
        </div>
      </div>

      {/* Deck modal */}
      {showDeck && <DeckModal combat={combat} onClose={() => setShowDeck(false)} />}

      {/* Victory / defeat overlay handled by navigation */}
    </div>
  )
}
