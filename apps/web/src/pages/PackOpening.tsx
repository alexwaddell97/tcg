import PackTear from '../components/shop/PackTear.tsx'
import MusicControls from '../components/audio/MusicControls.tsx'
import PackArt, { packName } from '../components/shop/PackArt.tsx'
import { useReducedMotion } from 'framer-motion'
import SeasonPass from '../components/shop/SeasonPass.tsx'
import ShopVariants from '../components/shop/ShopVariants.tsx'
import { useSearchParams } from 'react-router-dom'
import ArenaMenuHeader from '../components/ui/ArenaMenuHeader.tsx'
import { UI_ASSETS } from '../lib/uiAssets.ts'
import { useState, useCallback, useRef, useEffect, type CSSProperties } from 'react'
import { Sparkle, ArrowLeft, FastForward, Info } from '@phosphor-icons/react'
import Button from '../components/ui/Button.tsx'
import Modal from '../components/ui/Modal.tsx'
import CardComponent from '../components/game/Card.tsx'
import CardViewer from '../components/game/CardViewer.tsx'
import { cn } from '../lib/cn.ts'
import { PACK_PRICES, eligiblePackCards, eligiblePackVariants, hasPackRewards } from '../lib/packRewards.ts'
import { useSeasonTime } from '../hooks/useSeasonTime.ts'
import { getCardVariant } from '@tcg/shared'
import type { CardDefinition, Card, Rarity } from '@tcg/shared'
import {
  useCollectionStore,
  msUntilNextToken,
  MAX_PACK_TOKENS,
  PACK_TOKEN_INTERVAL_MS,
} from '../stores/useCollectionStore.ts'

// ─── Responsive card size hook ──────────────────────────────────────────────

function useCardSize() {
  const getSize = () => {
    const w = Math.max(90, Math.min(280, window.innerWidth * .58, (window.innerHeight - 220) / 1.5))
    return { w, h: w * 1.5 }
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
    id: 'core',
    name: 'Core Pack',
    description: '1 unowned Core Set card',
    cost: PACK_PRICES.core.cost,
    currency: 'token' as const,
    bg: 'from-stone-800 to-stone-900',
    border: 'border-stone-600/50',
    glow: '',
    available: true,
  },
  {
    id: 'eternal',
    name: 'Eternal Pack',
    description: '1 unowned Eternal Set card',
    cost: PACK_PRICES.eternal.cost,
    currency: 'gem' as const,
    bg: 'from-amber-950 to-stone-950',
    border: 'border-amber-600/50',
    glow: 'shadow-amber-900/30',
    available: true,
  },
  {
    id: 'expanded',
    name: 'Expanded Pack',
    description: '1 unowned Expanded Set card',
    cost: PACK_PRICES.expanded.cost,
    currency: 'gem' as const,
    bg: 'from-blue-950 to-stone-950',
    border: 'border-blue-600/50',
    glow: 'shadow-blue-900/30',
    available: true,
  },
]

PACK_TYPES.sort((a, b) => a.cost - b.cost)

// ─── Drop-rate info shown in the odds popover ─────────────────────────────────

const PACK_ODDS = [
  { id: 'core', name: 'Core Pack', slots: ['Core Set: 1% alternate art when eligible. Otherwise Common 60 : Uncommon 25 : Rare 12 : Legendary 3 rarity weights.'] },
  { id: 'eternal', name: 'Eternal Pack', slots: ['Eternal Set: 1% alternate art when eligible. Otherwise one unowned legendary.'] },
  { id: 'expanded', name: 'Expanded Pack', slots: ['Expanded Set: 1% alternate art when eligible. Otherwise Common 60 : Uncommon 25 : Rare 12 : Legendary 3 rarity weights.'] },
]

function toCardInstance(def: CardDefinition, idx: number): Card {
  return { ...def, instanceId: `pack-${idx}`, questProgress: 0, isTransformed: false, powerBonus: 0, cosmeticBorder: 'bronze' }
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
        src={UI_ASSETS.cardBack}
        alt=""
        draggable={false}
        className="absolute inset-0 w-full h-full object-cover"
      />
    </div>
  )
}

// ─── Single pack card with flip ───────────────────────────────────────────────

interface PackCardProps {
  variantId?: string
  card: CardDefinition
  index: number
  revealed: boolean
  flashed: boolean
  charging: boolean
  onCardClick: (i: number, cx: number, cy: number) => void
  onViewCard: (card: CardDefinition) => void
  cardSize: { w: number; h: number }
  disabled?: boolean
}

function PackCard({ card, index, revealed, flashed, charging, onCardClick, onViewCard, cardSize, disabled, variantId }: PackCardProps) {
  const alternate = getCardVariant(variantId, card.definitionId)
  const revealRarity = alternate ? 'legendary' : card.rarity
  const containerRef = useRef<HTMLButtonElement>(null)
  const cardInstance = toCardInstance(card, index)
  useEffect(() => {
    if (!disabled && !charging) containerRef.current?.focus({ preventScroll: true })
  }, [disabled, charging])

  const handleClick = () => {
    if (disabled || charging) return
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
      <button
        type="button"
        disabled={disabled || charging}
        aria-label={revealed ? `Inspect ${card.name}` : "Flip card"}
        aria-describedby={!disabled && !revealed && !charging ? 'pack-flip-hint' : undefined}
        ref={containerRef}
        className={cn(
          'pack-flip-container',
          !disabled && !charging && 'cursor-pointer hover:scale-105 transition-transform duration-150',
        )}
        style={{ width: cardSize.w, height: cardSize.h }}
        onClick={handleClick}
      >
        <div className={cn('pack-flip-inner', revealed && 'flipped')}>
          {/* back */}
          <div className="pack-flip-back" aria-hidden="true" style={{ width: cardSize.w, height: cardSize.h }}>
            <CardBack rarity={revealRarity} idle={!revealed && !charging} charging={charging} />
          </div>
          {/* front */}
          <div className="pack-flip-face relative" aria-hidden={!revealed} style={{ width: cardSize.w, height: cardSize.h }}>
            <CardComponent card={cardInstance} size="sm" />
            {flashed && (
              <div
                className={cn(
                  'absolute inset-0 rounded-xs pointer-events-none',
                  RARITY_FLASH_COLOR[revealRarity],
                )}
                style={{ animation: 'reveal-flash 0.5s ease-out forwards' }}
              />
            )}
          </div>
        </div>
      </button>

      {/* rarity label */}
      <div
        aria-hidden={!revealed}
        className={cn(
          'text-[0.6rem] sm:text-xs font-semibold uppercase tracking-widest transition-all duration-300',
          revealed ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2',
          RARITY_LABEL[revealRarity].cls,
        )}
      >
        {alternate ? `${alternate.name} · Variant` : RARITY_LABEL[card.rarity].text}
      </div>
    </div>
  )
}

// ─── Reveal screen ────────────────────────────────────────────────────────────

interface RevealScreenProps {
  variantId?: string
  cards: CardDefinition[]
  packId: string
  onDone: () => void
  onOpenAnother?: () => void
}

export function PackRevealScreen({ cards, packId, onDone, onOpenAnother, preview = false, variantId }: RevealScreenProps & { preview?: boolean }) {
  const [ripped, setRipped] = useState(false)
  const [released, setReleased] = useState(false)
  const [revealed, setRevealed] = useState<Set<number>>(new Set())
  const [flashed, setFlashed] = useState<Set<number>>(new Set())
  const [chargingIdx, setChargingIdx] = useState<number | null>(null)
  const [burstPos, setBurstPos] = useState<{ x: number; y: number } | null>(null)
  const [activeBackdrop, setActiveBackdrop] = useState<string | null>(null)
  const [viewingCard, setViewingCard] = useState<Card | null>(null)
  const cardSize = useCardSize()
  const reducedMotion = useReducedMotion()
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>())
  const revealing = useRef(new Set<number>())
  const later = useCallback((callback: () => void, delay: number) => {
    const timer = setTimeout(() => { timers.current.delete(timer); callback() }, delay)
    timers.current.add(timer)
  }, [])
  const clearTimers = useCallback(() => {
    timers.current.forEach(clearTimeout)
    timers.current.clear()
  }, [])
  useEffect(() => clearTimers, [clearTimers])

  const fireReveal = useCallback((i: number, cx: number, cy: number) => {
    setRevealed(prev => new Set(prev).add(i))
    if (!reducedMotion) {
      setFlashed(prev => new Set(prev).add(i))
      if (cards[i].rarity === 'legendary' || variantId) {
        setActiveBackdrop(cards[i].imageUrl)
        setBurstPos({ x: cx, y: cy })
        later(() => setBurstPos(null), 2600)
      }
      later(() => setFlashed(prev => {
        const next = new Set(prev)
        next.delete(i)
        return next
      }), 600)
    }
  }, [cards, later, reducedMotion, variantId])

  const handleCardClick = useCallback((i: number, cx: number, cy: number) => {
    if (revealing.current.has(i)) return
    revealing.current.add(i)
    if ((cards[i].rarity === 'legendary' || variantId) && !reducedMotion) {
      setChargingIdx(i)
      later(() => { setChargingIdx(null); fireReveal(i, cx, cy) }, 550)
    } else fireReveal(i, cx, cy)
  }, [cards, fireReveal, later, reducedMotion, variantId])

  const finishTear = () => {
    setRipped(true)
  }
  const skipOpening = () => {
    setRipped(true)
    setReleased(true)
  }
  const allRevealed = revealed.size === cards.length

  return <div className="pack-reveal-screen" data-pack={packId} style={{ '--card-width': `${cardSize.w}px` } as CSSProperties}>
    {activeBackdrop && <img src={activeBackdrop} alt="" className="pack-reveal-backdrop"/>}
    {burstPos && <LegendaryRevealEffect x={burstPos.x} y={burstPos.y}/>}
    <header className="pack-reveal-header">
      <h1>{packName(packId)} Pack</h1>
      <div className="pack-reveal-header-actions"><MusicControls compact/>{!ripped && <button type="button" className="pack-reveal-skip" onClick={skipOpening}><FastForward size={14}/> Skip opening</button>}</div>
    </header>
    <div className="pack-reveal-stage">
      <div className={cn('pack-reveal-card', released && 'is-released')}>
        {cards.map((card, i) => <PackCard key={i} card={card} variantId={variantId} index={i} revealed={revealed.has(i)} flashed={flashed.has(i)}
          charging={chargingIdx === i} disabled={!ripped} onCardClick={handleCardClick}
          onViewCard={def => setViewingCard(toCardInstance(def, i))} cardSize={cardSize}/>)}
      </div>
      {!ripped && <PackTear packId={packId} onBurst={() => setReleased(true)} onComplete={finishTear}/>}
    </div>
    <footer className="pack-reveal-footer" aria-live="polite">
      {ripped && !allRevealed && chargingIdx === null && <p id="pack-flip-hint">Click or tap the card to flip</p>}
      {allRevealed && <>
        <p>{preview ? 'Preview · Your collection is unchanged' : variantId ? 'Alternate artwork unlocked · Equip it in your collection' : 'Added to your collection'}</p>
        <div className="pack-reveal-actions">
          <Button className="ae-button" variant="secondary" onClick={onDone}><ArrowLeft size={16} weight="bold"/>{preview ? 'Back' : 'Done'}</Button>
          {onOpenAnother && <Button className="ae-button ae-button-primary" variant="primary" onClick={onOpenAnother}>
            <Sparkle size={16} weight="duotone"/>{preview ? 'Replay' : 'Open Another'}
          </Button>}
        </div>
      </>}
      {released && !ripped && <span className="sr-only">Opening your pack</span>}
      {chargingIdx !== null && <span className="sr-only">Revealing your card</span>}
    </footer>
    <CardViewer arena card={viewingCard} onClose={() => setViewingCard(null)}/>
  </div>
}

// ─── Pack token hook ──────────────────────────────────────────────────────────

function usePackTokens() {
  const { tokens, nextTokenAt, tickTokens } = useCollectionStore()
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
  const days = Math.floor(msLeft / 86_400_000)
  const countdown = days ? `${days}d ${Number(hh) % 24}h` : `${hh}h ${mm}m`

  return { tokens, nextTokenAt, progress, countdown }

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
        'relative w-12 h-20 rounded-sm border flex items-center justify-center overflow-hidden transition-all duration-300',
        ready
          ? 'border-amber-400/80 bg-stone-900 shadow-lg shadow-amber-900/50'
          : 'border-stone-700/40 bg-stone-950',
      )}>
        {ready ? (
          <PackArt packId="core"/>
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
  const { tokens, nextTokenAt, progress, countdown } = usePackTokens()
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
              Next free Core pack in{' '}
              <span className="text-stone-300 tabular-nums font-mono">{countdown}</span>
            </span>

          </>
        ) : tokens >= MAX_PACK_TOKENS ? (
          <span className="text-amber-400/60 text-xs">2 free Core packs ready · refills every 3½ days</span>
        ) : null}
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function PackOpening() {
  const now = useSeasonTime()
  const [searchParams, setSearchParams] = useSearchParams()
  const shopTab = searchParams.get('tab') === 'pass' ? 'pass' : 'packs'
  const setShopTab = (tab: 'packs' | 'pass') => setSearchParams(previous => {
    const next = new URLSearchParams(previous)
    if (tab === 'pass') next.set('tab', 'pass')
    else next.delete('tab')
    return next
  })
  const [selected, setSelected] = useState<string | null>(null)
  const [showOdds, setShowOdds] = useState(false)
  const [packCards, setPackCards] = useState<CardDefinition[] | null>(null)
  const [packKey, setPackKey] = useState(0)
  const [packVariant, setPackVariant] = useState<string>()

  const ownedCards = useCollectionStore(s => s.cards)
  const ownedVariants = useCollectionStore(s => s.variants)
  const tokens = useCollectionStore(s => s.tokens)
  const gems = useCollectionStore(s => s.gems)

  const handleOpen = (packId = selected) => {
    if (!packId) return
    const store = useCollectionStore.getState()
    const reward = store.openPack(packId)
    if (!reward) return
    setSelected(packId)
    setPackKey(k => k + 1)
    setPackVariant(reward.variantId)
    setPackCards([reward.card])
  }
  const selectedHasCards = Boolean(selected && hasPackRewards(selected, ownedCards, ownedVariants, now))

  if (packCards) {
    return (
      <PackRevealScreen
        key={packKey}
        cards={packCards}
        variantId={packVariant}
        packId={selected!}
        onDone={() => {
          setPackCards(null)
          setSelected(null)
        }}
        onOpenAnother={(() => {
          if (!selected) return undefined
          const pack = PACK_TYPES.find(p => p.id === selected)!
          const canAfford = pack.currency === 'gem' ? gems >= pack.cost : tokens >= 1
          if (!canAfford || !selectedHasCards) return undefined
          return () => handleOpen()
        })()}
      />
    )
  }

  return (
    <div
      className="arena-library-screen h-screen overflow-y-auto flex flex-col"
    >
      <ArenaMenuHeader title="Shop" balance={gems} currency="gems"/>

      <nav className="shop-navigation" aria-label="Shop sections"><button aria-pressed={shopTab === 'packs'} onClick={() => setShopTab('packs')}>Featured shop</button><button aria-pressed={shopTab === 'pass'} onClick={() => setShopTab('pass')}>Season pass</button></nav>
      {shopTab === 'pass' ? <SeasonPass/> : <main className="shop-storefront">
        <section className="shop-products" aria-label="Card packs">
          <div className="shop-section-heading"><div><h2>Card packs</h2></div><button className="shop-rates" onClick={() => setShowOdds(true)}><Info size={16}/> Drop rates</button></div>
          <div className="shop-product-grid">{PACK_TYPES.map(pack => {
            const canAfford = pack.currency === 'gem' ? gems >= pack.cost : tokens >= 1
            const remaining = eligiblePackCards(pack.id, ownedCards, now).length
            const alternateCount = eligiblePackVariants(pack.id, ownedCards, ownedVariants, now).length
            const available = remaining + alternateCount > 0
            return <article key={pack.id} className={`shop-product shop-product-${pack.id}`}>
              <div className="shop-product-art">{pack.id === 'core' && <span className="shop-product-tag">Free · Twice weekly</span>}<div className="shop-pack-wrapper"><PackArt packId={pack.id}/></div></div>
              <div className="shop-product-details"><h3>{pack.name}</h3><span className="shop-product-contents">{remaining ? `1 card · ${remaining} missing${alternateCount ? ' · 1% alternate art' : ''}` : alternateCount ? `Guaranteed alternate art · ${alternateCount} remaining` : 'All available cards and pack variants owned'}</span><button className="shop-buy" disabled={!canAfford || !available} onClick={() => handleOpen(pack.id)}><span>{!available ? 'No rewards available' : pack.id === 'core' ? tokens ? 'Open free pack' : 'Replenishing' : 'Open pack'}</span><strong>{pack.id === 'core' ? `${tokens} ready` : `◇ ${pack.cost}`}</strong></button>{pack.currency === 'gem' && !canAfford && available && <small className="shop-product-shortfall">{pack.cost - gems} more gems needed</small>}</div>
            </article>
          })}</div>
        </section>
        <ShopVariants/>
          <div className="shop-free-restock"><div><h3>Free Core packs</h3><p>One pack every 3½ days · Up to 2 stored</p></div><PackDock/></div>
      </main>}
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
              One reward per pack. Base cards never repeat. Alternate art requires its base card and never repeats artwork you own. When all available base cards in a set are owned, remaining pack variants are guaranteed; when both pools are empty, opening is disabled. Season-pass cards and their pack variants unlock in Eternal packs after their season ends. Season-exclusive and featured-shop artwork never drop from packs. Base rarity weights are redistributed among available rarities.
            </p>
          </div>
        </Modal>
      )}
    </div>
  )
}
