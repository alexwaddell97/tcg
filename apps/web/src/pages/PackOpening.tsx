import { useState, useCallback, useRef, useEffect, type CSSProperties } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sparkle, ArrowLeft, LockKey, FastForward, Lightning, Info } from '@phosphor-icons/react'
import Button from '../components/ui/Button.tsx'
import Modal from '../components/ui/Modal.tsx'
import CardComponent from '../components/game/Card.tsx'
import CardViewer from '../components/game/CardViewer.tsx'
import { cn } from '../lib/cn.ts'
import { CARD_DATABASE } from '@tcg/shared'
import type { CardDefinition, Card, Rarity } from '@tcg/shared'
import {
  useCollectionStore,
  msUntilNextToken,
  MAX_PACK_TOKENS,
  PACK_TOKEN_INTERVAL_MS,
  GEM_SPEEDUP_COST,
} from '../stores/useCollectionStore.ts'
import { useQuestStore } from '../stores/useQuestStore.ts'

// ─── Responsive card size hook ──────────────────────────────────────────────

function useCardSize() {
  const getSize = () => {
    const w = window.innerWidth
    if (w < 400) return { w: 88,  h: 132 }
    if (w < 520) return { w: 104, h: 156 }
    if (w < 768) return { w: 120, h: 180 }
    return              { w: 152, h: 228 }
  }
  const [size, setSize] = useState(getSize)
  useEffect(() => {
    const handler = () => setSize(getSize())
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])
  return size
}

// ─── Pack type definitions ────────────────────────────────────────────────────

const PACK_TYPES = [
  {
    id: 'standard',
    name: 'Standard Pack',
    description: '5 cards — guaranteed 1 Rare or higher',
    cost: 1,
    currency: 'token' as const,
    costLabel: '1 🎴',
    bg: 'from-stone-800 to-stone-900',
    border: 'border-stone-600/50',
    glow: '',
    available: true,
  },
  {
    id: 'premium',
    name: 'Premium Pack',
    description: '5 cards — guaranteed 1 Legendary',
    cost: 150,
    currency: 'gem' as const,
    costLabel: '150 💎',
    bg: 'from-amber-950 to-stone-950',
    border: 'border-amber-600/50',
    glow: 'shadow-amber-900/30',
    available: true,
  },
  {
    id: 'faction',
    name: 'Faction Pack',
    description: '5 cards from a single faction of your choice',
    cost: 100,
    currency: 'gem' as const,
    costLabel: '100 💎',
    bg: 'from-blue-950 to-stone-950',
    border: 'border-blue-600/50',
    glow: 'shadow-blue-900/30',
    available: true,
  },
]

// ─── Factions ──────────────────────────────────────────────────────────────────

const FACTIONS = [
  { id: 'the_forge',     name: 'The Forge',     emoji: '🔥' },
  { id: 'the_summit',    name: 'The Summit',    emoji: '❄️' },
  { id: 'the_rift',      name: 'The Rift',      emoji: '🌀' },
  { id: 'the_graveyard', name: 'The Graveyard', emoji: '💀' },
  { id: 'the_sanctum',   name: 'The Sanctum',   emoji: '✨' },
]

// ─── Drop-rate info shown in the odds popover ─────────────────────────────────

const PACK_ODDS = [
  {
    id: 'standard',
    name: 'Standard Pack',
    slots: [
      '2 × Common',
      '1 × Uncommon',
      '1 × Rare (80%) or Legendary (20%)',
      '1 × Wild — Common 60% · Uncommon 25% · Rare 12% · Legendary 3%',
    ],
  },
  {
    id: 'premium',
    name: 'Premium Pack',
    slots: [
      '1 × Uncommon',
      '1 × Rare',
      '1 × guaranteed Legendary',
      '2 × Wild — Common 42% · Uncommon 30% · Rare 20% · Legendary 8%',
    ],
  },
  {
    id: 'faction',
    name: 'Faction Pack',
    slots: [
      '2 × Common (chosen faction)',
      '1 × Uncommon (chosen faction)',
      '1 × Rare (75%) or Legendary (25%)',
      '1 × Wild — Common 52% · Uncommon 28% · Rare 15% · Legendary 5%',
    ],
  },
]

// ─── Loot table ───────────────────────────────────────────────────────────────

function pickByRarity(pool: CardDefinition[], rarity: Rarity): CardDefinition {
  const filtered = pool.filter(c => c.rarity === rarity)
  if (filtered.length === 0) return pool[Math.floor(Math.random() * pool.length)]
  return filtered[Math.floor(Math.random() * filtered.length)]
}

function pickWild(
  pool: CardDefinition[],
  weights: { common: number; uncommon: number; rare: number; legendary: number },
): CardDefinition {
  const roll = Math.random() * 100
  if (roll < weights.legendary) return pickByRarity(pool, 'legendary')
  if (roll < weights.legendary + weights.rare) return pickByRarity(pool, 'rare')
  if (roll < weights.legendary + weights.rare + weights.uncommon) return pickByRarity(pool, 'uncommon')
  return pickByRarity(pool, 'common')
}

function generatePackCards(packId: string, faction?: string): CardDefinition[] {
  const basePool = CARD_DATABASE.filter(c => !c.isTransformTarget)

  if (packId === 'premium') {
    const pool = basePool
    const guaranteed = pickByRarity(pool, 'legendary')
    return [
      pickByRarity(pool, 'uncommon'),
      pickByRarity(pool, 'rare'),
      pickWild(pool, { legendary: 8, rare: 20, uncommon: 30, common: 42 }),
      pickWild(pool, { legendary: 8, rare: 20, uncommon: 30, common: 42 }),
      guaranteed,
    ].sort(() => Math.random() - 0.5)
  }

  if (packId === 'faction' && faction) {
    const pool = basePool.filter(c => c.affinity.includes(faction as any))
    const fallback = basePool
    const safePool = pool.length >= 4 ? pool : fallback
    const guaranteed = Math.random() < 0.25
      ? pickByRarity(safePool, 'legendary')
      : pickByRarity(safePool, 'rare')
    return [
      pickByRarity(safePool, 'common'),
      pickByRarity(safePool, 'common'),
      pickByRarity(safePool, 'uncommon'),
      guaranteed,
      pickWild(safePool, { legendary: 5, rare: 15, uncommon: 28, common: 52 }),
    ].sort(() => Math.random() - 0.5)
  }

  // standard
  const pool = basePool
  const guaranteed = Math.random() < 0.2
    ? pickByRarity(pool, 'legendary')
    : pickByRarity(pool, 'rare')
  const wild = pickWild(pool, { legendary: 3, rare: 12, uncommon: 25, common: 60 })
  return [
    pickByRarity(pool, 'common'),
    pickByRarity(pool, 'common'),
    pickByRarity(pool, 'uncommon'),
    guaranteed,
    wild,
  ].sort(() => Math.random() - 0.5)
}

function toCardInstance(def: CardDefinition, idx: number): Card {
  return { ...def, instanceId: `pack-${idx}`, questProgress: 0, isTransformed: false, powerBonus: 0 }
}

// ─── Legendary reveal particles ──────────────────────────────────────────────

const LEGENDARY_ORBS = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg, i) => ({
  angle: deg,
  delay: i * 0.045,
  size: [13, 8, 11, 15, 7, 10, 12, 8, 14, 9, 11, 7][i],
  grad: i % 4 === 0
    ? ['#fde68a', '#f59e0b', 'rgba(245,158,11,0.85)']
    : i % 4 === 1
      ? ['#fdba74', '#ea580c', 'rgba(234,88,12,0.75)']
      : i % 4 === 2
        ? ['#fcd34d', '#d97706', 'rgba(217,119,6,0.85)']
        : ['#f0abfc', '#a855f7', 'rgba(168,85,247,0.65)'],
}))

const LEGENDARY_SPARKLES = [15, 75, 135, 195, 255, 315].map((deg, i) => ({
  angle: deg,
  delay: 0.1 + i * 0.07,
}))

function LegendaryRevealEffect({ x, y }: { x: number; y: number }) {
  // All particles are placed in a 520×520 container centred on the card
  const half = 260
  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {/* dim that washes away as the burst fades */}
      <div
        className="absolute inset-0"
        style={{ background: 'rgba(0,0,0,0.55)', animation: 'legendary-dim-burst 2.4s ease-out forwards' }}
      />
      {/* all particles anchored at the card centre */}
      <div
        className="absolute flex items-center justify-center"
        style={{ left: x - half, top: y - half, width: half * 2, height: half * 2 }}
      >
        {/* screen-wide glow burst */}
        <div
          className="legendary-reveal-burst absolute rounded-full"
          style={{
            width: 520,
            height: 520,
            background: 'radial-gradient(circle, rgba(251,191,36,0.55) 0%, rgba(245,158,11,0.2) 45%, transparent 72%)',
          }}
        />

        {/* expanding rings */}
        {[0, 0.12, 0.24].map((delay, i) => (
          <div
            key={i}
            className="legendary-reveal-ring absolute rounded-full"
            style={{
              width: 70 + i * 44,
              height: 70 + i * 44,
              border: `${2 - i * 0.5}px solid rgba(251,191,36,${0.85 - i * 0.2})`,
              animationDelay: `${delay}s`,
            }}
          />
        ))}

        {/* spiral orbs */}
        {LEGENDARY_ORBS.map((orb, i) => (
          <div
            key={i}
            className="legendary-reveal-orb absolute rounded-full"
            style={{
              '--orb-angle': `${orb.angle}deg`,
              animationDelay: `${orb.delay}s`,
              width: orb.size,
              height: orb.size,
              background: `radial-gradient(circle, ${orb.grad[0]}, ${orb.grad[1]})`,
              boxShadow: `0 0 ${orb.size * 2}px ${orb.size}px ${orb.grad[2]}`,
            } as CSSProperties}
          />
        ))}

        {/* close-in sparkle pops */}
        {LEGENDARY_SPARKLES.map((s, i) => (
          <div
            key={i}
            className="legendary-reveal-sparkle absolute rounded-full"
            style={{
              '--orb-angle': `${s.angle}deg`,
              animationDelay: `${s.delay}s`,
              width: 7,
              height: 7,
              background: '#fef3c7',
              boxShadow: '0 0 10px 5px rgba(251,191,36,0.95)',
            } as CSSProperties}
          />
        ))}
      </div>
    </div>
  )
}

// ─── Rarity helpers ───────────────────────────────────────────────────────────

const RARITY_BACK_CLASS: Record<Rarity, string> = {
  common:    '',
  uncommon:  'pack-card-back-uncommon',
  rare:      'pack-card-back-rare',
  legendary: 'pack-card-back-legendary',
}

const RARITY_FLASH_COLOR: Record<Rarity, string> = {
  common:    'bg-stone-300',
  uncommon:  'bg-emerald-300',
  rare:      'bg-blue-300',
  legendary: 'bg-amber-300',
}

const RARITY_LABEL: Record<Rarity, { text: string; cls: string }> = {
  common:    { text: 'Common',    cls: 'text-stone-400' },
  uncommon:  { text: 'Uncommon',  cls: 'text-emerald-400' },
  rare:      { text: 'Rare',      cls: 'text-blue-300' },
  legendary: { text: 'Legendary', cls: 'text-amber-300' },
}

// ─── Card back face ───────────────────────────────────────────────────────────

function CardBack({ rarity, idle, charging }: { rarity: Rarity; idle: boolean; charging?: boolean }) {
  return (
    <div
      className={cn(
        'w-full h-full rounded-xs border-2 overflow-hidden select-none relative',
        'border-stone-700',
        !charging && RARITY_BACK_CLASS[rarity],
        !charging && idle && 'pack-card-idle',
        charging && 'pack-card-charging',
      )}
    >
      <img
        src="/card-back.png"
        alt=""
        draggable={false}
        className="absolute inset-0 w-full h-full object-cover"
        style={{ transform: 'scale(1.2)' }}
      />
    </div>
  )
}

// ─── Single pack card with flip ───────────────────────────────────────────────

interface PackCardProps {
  card: CardDefinition
  index: number
  revealed: boolean
  flashed: boolean
  charging: boolean
  onCardClick: (i: number, cx: number, cy: number) => void
  onViewCard: (card: CardDefinition) => void
  cardSize: { w: number; h: number }
}

function PackCard({ card, index, revealed, flashed, charging, onCardClick, onViewCard, cardSize }: PackCardProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const cardInstance = toCardInstance(card, index)

  const handleClick = () => {
    if (charging) return
    if (revealed) { onViewCard(card); return }
    const rect = containerRef.current?.getBoundingClientRect()
    const cx = rect ? rect.left + rect.width / 2 : window.innerWidth / 2
    const cy = rect ? rect.top + rect.height / 2 : window.innerHeight / 2
    onCardClick(index, cx, cy)
  }

  return (
    <div
      className="pack-card-enter flex flex-col items-center gap-2"
      style={{ animationDelay: `${index * 120}ms` }}
    >
      <div
        ref={containerRef}
        className={cn(
          'pack-flip-container',
          !charging && 'cursor-pointer hover:scale-105 transition-transform duration-150',
        )}
        style={{ width: cardSize.w, height: cardSize.h }}
        onClick={handleClick}
      >
        <div className={cn('pack-flip-inner', revealed && 'flipped')}>
          {/* back */}
          <div className="pack-flip-back" style={{ width: cardSize.w, height: cardSize.h }}>
            <CardBack rarity={card.rarity} idle={!revealed && !charging} charging={charging} />
          </div>
          {/* front */}
          <div className="pack-flip-face relative" style={{ width: cardSize.w, height: cardSize.h }}>
            <CardComponent card={cardInstance} size="sm" />
            {flashed && (
              <div
                className={cn(
                  'absolute inset-0 rounded-xs pointer-events-none',
                  RARITY_FLASH_COLOR[card.rarity],
                )}
                style={{ animation: 'reveal-flash 0.5s ease-out forwards' }}
              />
            )}
          </div>
        </div>
      </div>

      {/* rarity label */}
      <div
        className={cn(
          'text-[0.6rem] sm:text-xs font-semibold uppercase tracking-widest transition-all duration-300',
          revealed ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2',
          RARITY_LABEL[card.rarity].cls,
        )}
      >
        {RARITY_LABEL[card.rarity].text}
      </div>
    </div>
  )
}

// ─── Reveal screen ────────────────────────────────────────────────────────────

interface RevealScreenProps {
  cards: CardDefinition[]
  packId: string
  selectedFaction?: string | null
  onDone: () => void
  onOpenAnother?: () => void
}

// ─── Pack rip animation ───────────────────────────────────────────────────────────

function PackRipAnimation({
  packId,
  selectedFaction,
  onComplete,
}: {
  packId: string
  selectedFaction?: string | null
  onComplete: () => void
}) {
  const [phase, setPhase] = useState<'shake' | 'rip'>('shake')
  const pack = PACK_TYPES.find(p => p.id === packId) ?? PACK_TYPES[0]
  const faction = FACTIONS.find(f => f.id === selectedFaction)

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('rip'), 750)
    const t2 = setTimeout(onComplete, 1350)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [onComplete])

  const W = 160, H = 240
  const iconColor =
    pack.id === 'premium' ? 'text-amber-400' :
    pack.id === 'faction'  ? 'text-blue-400'  : 'text-stone-400'

  // The same visual is rendered in both clipped halves
  const packFace = (
    <div
      className={cn('absolute inset-0 rounded-2xl border-2 overflow-hidden bg-linear-to-b', pack.bg, pack.border)}
    >
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-3">
        <Sparkle size={38} className={iconColor} weight="duotone" />
        <p className="font-bold text-stone-100 text-sm text-center leading-tight">{pack.name}</p>
        {faction && (
          <p className="text-blue-300 text-xs font-medium">{faction.emoji} {faction.name}</p>
        )}
      </div>
      {/* subtle sheen lines */}
      <div className="absolute left-4 right-4 h-px bg-white/10 top-8" />
      <div className="absolute left-8 right-8 h-px bg-white/06 top-11" />
      <div className="absolute left-4 right-4 h-px bg-white/08 bottom-10" />
      {/* tear guide — shows only during shake */}
      <div
        className="absolute left-0 right-0 border-t border-dashed border-white/30 pointer-events-none"
        style={{ top: '50%', opacity: phase === 'rip' ? 0 : 1, transition: 'opacity 0.1s' }}
      />
    </div>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950">
      <div className="relative" style={{ width: W, height: H }}>
        {/* top half */}
        <div
          className="absolute inset-0"
          style={{
            clipPath: 'inset(0 0 50% 0)',
            animation: phase === 'rip'
              ? 'pack-rip-top 0.55s cubic-bezier(0.4, 0, 0.8, 1) forwards'
              : 'pack-rip-shake 0.6s ease-in-out infinite',
          }}
        >
          {packFace}
        </div>
        {/* bottom half */}
        <div
          className="absolute inset-0"
          style={{
            clipPath: 'inset(50% 0 0 0)',
            animation: phase === 'rip'
              ? 'pack-rip-bottom 0.55s cubic-bezier(0.4, 0, 0.8, 1) forwards'
              : 'pack-rip-shake 0.6s ease-in-out infinite',
          }}
        >
          {packFace}
        </div>
      </div>
      {/* white flash on rip */}
      {phase === 'rip' && (
        <div
          className="absolute inset-0 bg-white pointer-events-none"
          style={{ animation: 'pack-rip-flash 0.55s ease-out forwards' }}
        />
      )}
    </div>
  )
}

function legendaryBackdropUrl(definitionId: string) {
  return `./cards/full/${definitionId.replace(/_/g, '-')}.png`
}

function RevealScreen({ cards, packId, selectedFaction, onDone, onOpenAnother }: RevealScreenProps) {
  const [ripped, setRipped] = useState(false)
  const [revealed, setRevealed] = useState<Set<number>>(new Set())
  const [flashed, setFlashed] = useState<Set<number>>(new Set())
  const [chargingIdx, setChargingIdx] = useState<number | null>(null)
  const [burstPos, setBurstPos] = useState<{ x: number; y: number } | null>(null)
  const [activeBackdrop, setActiveBackdrop] = useState<string | null>(null)
  const [viewingCard, setViewingCard] = useState<Card | null>(null)
  const cardSize = useCardSize()

  const fireReveal = useCallback((i: number, cx: number, cy: number) => {
    setRevealed(prev => new Set(prev).add(i))
    setFlashed(prev => new Set(prev).add(i))
    if (cards[i].rarity === 'legendary') {
      setActiveBackdrop(legendaryBackdropUrl(cards[i].definitionId))
      setBurstPos({ x: cx, y: cy })
      setTimeout(() => setBurstPos(null), 2600)
    }
    setTimeout(() => {
      setFlashed(prev => {
        const next = new Set(prev)
        next.delete(i)
        return next
      })
    }, 600)
  }, [cards])

  const handleCardClick = useCallback((i: number, cx: number, cy: number) => {
    if (cards[i].rarity === 'legendary') {
      setChargingIdx(i)
      setTimeout(() => {
        setChargingIdx(null)
        fireReveal(i, cx, cy)
      }, 700)
    } else {
      fireReveal(i, cx, cy)
    }
  }, [cards, fireReveal])

  const skipAll = useCallback(() => {
    // Skip bypasses the charge delay
    cards.forEach((_, i) => {
      setTimeout(() => {
        setRevealed(prev => new Set(prev).add(i))
      }, i * 90)
    })
  }, [cards])

  const allRevealed = revealed.size === cards.length

  if (!ripped) {
    return (
      <PackRipAnimation
        packId={packId}
        selectedFaction={selectedFaction}
        onComplete={() => setRipped(true)}
      />
    )
  }

  return (
    <div
      className="min-h-screen flex flex-col relative overflow-hidden"
      style={activeBackdrop
        ? { backgroundColor: '#080508' }
        : { background: 'radial-gradient(ellipse at 50% 20%, #1a1020 0%, #080508 100%)' }}
    >
      {/* Legendary wide-art backdrop */}
      {activeBackdrop && (
        <>
          <img
            key={activeBackdrop}
            src={activeBackdrop}
            className="absolute inset-0 w-full h-full object-cover z-0"
            style={{ animation: 'legendary-bg-fade-in 0.8s ease-out forwards' }}
          />
          <div className="absolute inset-0 bg-black/55 z-0" />
        </>
      )}
      {/* dim overlay during legendary charge */}
      {chargingIdx !== null && (
        <div
          className="fixed inset-0 z-30 pointer-events-none"
          style={{ background: 'rgba(0,0,0,0.55)', animation: 'legendary-dim-in 0.35s ease-out forwards' }}
        />
      )}
      {burstPos && <LegendaryRevealEffect x={burstPos.x} y={burstPos.y} />}
      {/* top bar */}
      <div className="relative z-10 flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-stone-900/60">
        <div className="flex items-center gap-2">
          <Sparkle size={16} className="text-amber-400" weight="duotone" />
          <span className="text-stone-300 font-semibold text-sm">Pack Opening</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-stone-500 text-xs">
            {revealed.size} / {cards.length} revealed
          </span>
          {!allRevealed && (
            <button
              onClick={skipAll}
              className="flex items-center gap-1.5 text-stone-400 hover:text-stone-100 transition-colors text-xs border border-stone-700 hover:border-stone-500 px-3 py-1.5 rounded-lg"
            >
              <FastForward size={14} weight="bold" />
              Skip
            </button>
          )}
        </div>
      </div>

      {/* hint — always rendered to avoid layout shift */}
      <p className={cn('relative z-10 text-center text-stone-600 text-xs mt-4 tracking-wide transition-opacity duration-300', allRevealed ? 'invisible' : '')}>
        Tap a card to reveal it
      </p>

      {/* cards */}
      <div className="relative z-10 flex-1 flex items-center justify-center px-3 sm:px-6 py-4 sm:py-8">
        <div className="flex flex-wrap justify-center gap-3 sm:gap-6">
          {cards.map((card, i) => (
            <PackCard
              key={i}
              card={card}
              index={i}
              revealed={revealed.has(i)}
              flashed={flashed.has(i)}
              charging={chargingIdx === i}
              onCardClick={handleCardClick}
              onViewCard={(def) => setViewingCard(toCardInstance(def, i))}
              cardSize={cardSize}
            />
          ))}
        </div>
      </div>

      {/* Done / Open Another buttons — fixed so they never affect card layout */}
      <div
        className={cn(
          'fixed bottom-6 sm:bottom-8 left-0 right-0 flex justify-center gap-3 transition-all duration-500 z-40',
          allRevealed ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3 pointer-events-none',
        )}
      >
        <Button variant="secondary" onClick={onDone}>
          <ArrowLeft size={16} weight="bold" />
          Done
        </Button>
        {onOpenAnother && (
          <Button variant="primary" onClick={onOpenAnother}>
            <Sparkle size={16} weight="duotone" />
            Open Another
          </Button>
        )}
      </div>

      <CardViewer card={viewingCard} onClose={() => setViewingCard(null)} />
    </div>
  )
}

// ─── Pack token hook ──────────────────────────────────────────────────────────

function usePackTokens() {
  const { tokens, nextTokenAt, tickTokens, spendToken, gems, speedUpPack } = useCollectionStore()
  const [msLeft, setMsLeft] = useState(() => msUntilNextToken(nextTokenAt))

  useEffect(() => {
    tickTokens() // catch up tokens accumulated while app was closed
    setMsLeft(msUntilNextToken(nextTokenAt))
    if (nextTokenAt === null) return
    const id = setInterval(() => {
      const remaining = msUntilNextToken(nextTokenAt)
      setMsLeft(remaining)
      if (remaining === 0) { clearInterval(id); tickTokens() }
    }, 1000)
    return () => clearInterval(id)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nextTokenAt])

  // 0..1 fill progress of the charging slot
  const progress = nextTokenAt !== null && msLeft > 0
    ? 1 - msLeft / PACK_TOKEN_INTERVAL_MS
    : 0

  const hh = String(Math.floor(msLeft / 3_600_000)).padStart(2, '0')
  const mm = String(Math.floor((msLeft % 3_600_000) / 60_000)).padStart(2, '0')
  const countdown = `${hh}h ${mm}m`

  const canSpeedUp = gems >= GEM_SPEEDUP_COST && nextTokenAt !== null && tokens < MAX_PACK_TOKENS

  return { tokens, nextTokenAt, progress, countdown, gems, canSpeedUp, speedUpPack, spendToken }
}

// ─── Visual pack slot ─────────────────────────────────────────────────────────

function PackSlot({ ready, charging, progress, countdown }: {
  ready: boolean
  charging: boolean
  progress: number
  countdown: string
}) {
  const r = 18
  const circ = 2 * Math.PI * r
  const offset = circ * (1 - progress)

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className={cn(
        'relative w-14 h-20 rounded-xl border-2 flex items-center justify-center overflow-hidden transition-all duration-300',
        ready
          ? 'border-amber-400/80 bg-stone-900 shadow-lg shadow-amber-900/50'
          : 'border-stone-700/40 bg-stone-950',
      )}>
        {ready ? (
          <>
            <div className="absolute inset-0 bg-linear-to-b from-amber-900/30 to-transparent" />
            <div className="relative flex flex-col items-center gap-1.5">
              <span className="text-amber-400 text-xl leading-none">✦</span>
              <div className="flex flex-col items-center gap-px opacity-25">
                <div className="w-6 h-px bg-amber-300" />
                <div className="w-4 h-px bg-amber-300" />
              </div>
            </div>
            <div className="absolute inset-0 rounded-xl border border-amber-400/30 animate-pulse" />
          </>
        ) : charging ? (
          <svg width="44" height="44" viewBox="0 0 44 44" className="-rotate-90">
            <circle cx="22" cy="22" r={r} fill="none" stroke="rgb(68,64,60)" strokeWidth="3" />
            <circle
              cx="22" cy="22" r={r} fill="none"
              stroke="rgb(251,191,36)"
              strokeWidth="3"
              strokeDasharray={circ}
              strokeDashoffset={offset}
              strokeLinecap="round"
              style={{ transition: 'stroke-dashoffset 1s linear' }}
            />
          </svg>
        ) : (
          <span className="text-stone-700 text-2xl">⊘</span>
        )}
      </div>
      <span className={cn(
        'text-[0.58rem] font-semibold uppercase tracking-wide',
        ready ? 'text-amber-400' : charging ? 'text-stone-500 tabular-nums' : 'text-stone-700',
      )}>
        {ready ? 'Ready' : charging ? countdown : 'Empty'}
      </span>
    </div>
  )
}

// ─── Pack dock ────────────────────────────────────────────────────────────────

function PackDock() {
  const { tokens, nextTokenAt, progress, countdown, gems, canSpeedUp, speedUpPack } = usePackTokens()
  const isCharging = nextTokenAt !== null && tokens < MAX_PACK_TOKENS

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Slot row */}
      <div className="flex items-end gap-6">
        {Array.from({ length: MAX_PACK_TOKENS }, (_, i) => {
          const ready = i < tokens
          const charging = !ready && i === tokens && isCharging
          return (
            <PackSlot
              key={i}
              ready={ready}
              charging={charging}
              progress={charging ? progress : 0}
              countdown={charging ? countdown : '--'}
            />
          )
        })}
      </div>

      {/* Status line + speed-up */}
      <div className="flex items-center gap-3 h-6">
        {isCharging ? (
          <>
            <span className="text-stone-500 text-xs">
              Next pack in{' '}
              <span className="text-stone-300 tabular-nums font-mono">{countdown}</span>
            </span>
            {canSpeedUp && (
              <button
                onClick={speedUpPack}
                className="flex items-center gap-1 bg-violet-950/70 hover:bg-violet-900/70 border border-violet-700/50 hover:border-violet-500 rounded-full px-2.5 py-0.5 text-violet-300 text-xs font-semibold transition-colors"
              >
                <Lightning size={11} weight="fill" />
                Speed up ({GEM_SPEEDUP_COST} 💎)
              </button>
            )}
            {!canSpeedUp && gems < GEM_SPEEDUP_COST && (
              <span className="text-stone-700 text-xs">{gems} / {GEM_SPEEDUP_COST} 💎 to speed up</span>
            )}
          </>
        ) : tokens >= MAX_PACK_TOKENS ? (
          <span className="text-amber-400/60 text-xs">All packs ready — open one to start the timer</span>
        ) : null}
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function PackOpening() {
  const navigate = useNavigate()
  const [selected, setSelected] = useState<string | null>(null)
  const [selectedFaction, setSelectedFaction] = useState<string | null>(null)
  const [showFactionModal, setShowFactionModal] = useState(false)
  const [showOdds, setShowOdds] = useState(false)
  const [packCards, setPackCards] = useState<CardDefinition[] | null>(null)
  const [packKey, setPackKey] = useState(0)

  const addCards = useCollectionStore(s => s.addCards)
  const tokens = useCollectionStore(s => s.tokens)
  const gems = useCollectionStore(s => s.gems)
  const spendToken = useCollectionStore(s => s.spendToken)
  const spendGems = useCollectionStore(s => s.spendGems)
  const completeQuest = useQuestStore(s => s.completeQuest)

  const handleOpen = () => {
    if (!selected) return
    const pack = PACK_TYPES.find(p => p.id === selected)!
    if (pack.currency === 'gem') {
      if (gems < pack.cost) return
      if (selected === 'faction' && !selectedFaction) return
      spendGems(pack.cost)
    } else {
      if (tokens < 1) return
      spendToken()
    }
    completeQuest('open_pack')
    setPackKey(k => k + 1)
    setPackCards(generatePackCards(selected, selectedFaction ?? undefined))
  }

  if (packCards) {
    return (
      <RevealScreen
        key={packKey}
        cards={packCards}
        packId={selected!}
        selectedFaction={selectedFaction}
        onDone={() => {
          addCards(packCards)
          setPackCards(null)
          setSelected(null)
          setSelectedFaction(null)
          setShowFactionModal(false)
        }}
        onOpenAnother={(() => {
          if (!selected) return undefined
          const pack = PACK_TYPES.find(p => p.id === selected)!
          const canAfford = pack.currency === 'gem' ? gems >= pack.cost : tokens >= 1
          if (!canAfford) return undefined
          return () => {
            addCards(packCards)
            if (pack.currency === 'gem') {
              spendGems(pack.cost)
            } else {
              spendToken()
            }
            completeQuest('open_pack')
            setPackKey(k => k + 1)
            setPackCards(generatePackCards(selected, selectedFaction ?? undefined))
          }
        })()}
      />
    )
  }

  return (
    <div
      className="h-screen overflow-hidden flex flex-col"
      style={{ background: 'radial-gradient(ellipse at 50% 30%, #1e1408 0%, #0a0806 100%)' }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 sm:gap-3 px-4 sm:px-6 py-3 sm:py-4 border-b border-stone-900/60">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-1.5 text-stone-500 hover:text-stone-300 transition-colors text-sm shrink-0"
        >
          <ArrowLeft size={16} weight="bold" />
          <span className="hidden sm:inline">Menu</span>
        </button>
        <div className="w-px h-4 bg-stone-800" />
        <Sparkle size={16} className="text-blue-400 shrink-0" weight="duotone" />
        <h1 className="text-stone-200 font-semibold text-sm sm:text-base">Pack Opening</h1>
        <div className="ml-auto flex items-center gap-2">
          {/* Gem balance */}
          <div className="flex items-center gap-1.5 bg-stone-900/80 border border-stone-700/60 rounded-full px-2.5 sm:px-3 py-1">
            <span className="text-sm leading-none">💎</span>
            <span className="text-violet-300 font-semibold text-sm">{gems}</span>
            <span className="hidden sm:inline text-stone-500 text-xs">gems</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center gap-4 sm:gap-6 px-4 sm:px-8 py-4 sm:py-6">

        {/* Pack dock — visual token slots */}
        <PackDock />

        <div className="flex items-center gap-3">
          <div className="text-center flex flex-col gap-1">
            <h2 className="text-xl sm:text-2xl font-bold text-stone-100">Choose a Pack</h2>
            <p className="text-stone-500 text-sm">
              {tokens < 1
                ? 'No packs available — wait for the timer or speed up with gems'
                : `${tokens} pack${tokens !== 1 ? 's' : ''} available`}
            </p>
          </div>
          <button
            onClick={() => setShowOdds(true)}
            className="shrink-0 text-stone-600 hover:text-stone-300 transition-colors mt-0.5"
            title="Drop rates"
          >
            <Info size={18} />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-5 w-full max-w-xs sm:max-w-2xl">
          {PACK_TYPES.map(pack => {
            const canAfford = pack.currency === 'gem' ? gems >= pack.cost : tokens >= pack.cost
            const isSelected = selected === pack.id

            return (
              <button
                key={pack.id}
                onClick={() => {
                    if (!pack.available || !canAfford) return
                    if (pack.id === 'faction') {
                      setSelected('faction')
                      setShowFactionModal(true)
                    } else {
                      setSelected(pack.id)
                    }
                  }}
                disabled={!pack.available || !canAfford}
                className={cn(
                  'relative flex sm:flex-col items-center gap-4 p-4 sm:p-6 rounded-2xl border bg-linear-to-b transition-all duration-200 text-left',
                  pack.border,
                  pack.bg,
                  pack.glow && `shadow-lg ${pack.glow}`,
                  isSelected && 'ring-2 ring-amber-400 ring-offset-2 ring-offset-stone-950 sm:scale-[1.03]',
                  pack.available && canAfford
                    ? 'cursor-pointer hover:brightness-110'
                    : 'opacity-50 cursor-not-allowed',
                )}
              >
                {!pack.available && (
                  <div className="absolute top-3 right-3">
                    <LockKey size={14} className="text-stone-600" weight="duotone" />
                  </div>
                )}
                <div className="w-14 h-20 sm:w-20 sm:h-28 shrink-0 rounded-xl bg-stone-950/60 border border-stone-700/50 flex items-center justify-center">
                  <Sparkle
                    size={28}
                    className={
                      pack.id === 'premium'
                        ? 'text-amber-400'
                        : pack.id === 'faction'
                          ? 'text-blue-400'
                          : 'text-stone-400'
                    }
                    weight="duotone"
                  />
                </div>
                <div className="flex flex-col gap-1 sm:text-center flex-1">
                  <p className="font-bold text-stone-100 text-sm">{pack.name}</p>
                  {pack.id === 'faction' && selectedFaction && (
                    <p className="text-blue-300 text-xs font-semibold mt-0.5">
                      {FACTIONS.find(f => f.id === selectedFaction)?.emoji}{' '}
                      {FACTIONS.find(f => f.id === selectedFaction)?.name}
                    </p>
                  )}
                  <p className={cn('text-sm font-semibold mt-1', canAfford ? (pack.currency === 'gem' ? 'text-violet-300' : 'text-amber-400') : 'text-stone-600')}>
                    {pack.costLabel}
                  </p>
                </div>
              </button>
            )
          })}
        </div>

        <Button variant="primary" size="lg" disabled={!selected || (PACK_TYPES.find(p => p.id === selected)?.currency === 'gem' ? gems < (PACK_TYPES.find(p => p.id === selected)?.cost ?? 0) : tokens < 1) || (selected === 'faction' && !selectedFaction)} onClick={handleOpen}>
          Open Pack
        </Button>

        {/* Faction picker modal */}
        {showFactionModal && (
          <Modal title="Choose a Faction" onClose={() => { setShowFactionModal(false); setSelected(null); setSelectedFaction(null) }}>
            <div className="flex flex-col gap-3">
              <p className="text-stone-400 text-sm">Your pack will contain 5 cards from the chosen faction.</p>
              <div className="grid grid-cols-1 gap-2 mt-1">
                {FACTIONS.map(f => (
                  <button
                    key={f.id}
                    onClick={() => { setSelectedFaction(f.id); setShowFactionModal(false) }}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl border border-stone-700 bg-stone-800/60 hover:border-blue-500/60 hover:bg-blue-950/40 transition-all text-left group"
                  >
                    <span className="text-2xl">{f.emoji}</span>
                    <span className="font-semibold text-stone-200 group-hover:text-blue-200 transition-colors">{f.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </Modal>
        )}

      </div>

      {/* Odds modal */}
      {showOdds && (
        <Modal title="Drop Rates" onClose={() => setShowOdds(false)}>
          <div className="flex flex-col gap-5">
            {PACK_ODDS.map(pack => (
              <div key={pack.id}>
                <p className="text-stone-200 font-semibold text-sm mb-2">{pack.name}</p>
                <ul className="flex flex-col gap-1">
                  {pack.slots.map((slot, i) => (
                    <li key={i} className="flex items-start gap-2 text-stone-400 text-xs">
                      <span className="text-stone-600 mt-px">•</span>
                      {slot}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            <p className="text-stone-600 text-xs border-t border-stone-800 pt-3">
              All cards are added to your collection permanently.
            </p>
          </div>
        </Modal>
      )}
    </div>
  )
}
