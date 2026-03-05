import { useState, useMemo, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, MagnifyingGlass, X, DiamondsFour, Hammer,
  ArrowsClockwise, Warning, Lock,
} from '@phosphor-icons/react'
import { CARD_DATABASE } from '@tcg/shared'
import type { CardDefinition, Card, Rarity } from '@tcg/shared'
import { cn } from '../lib/cn.ts'
import CardComponent from '../components/game/Card.tsx'
import CardViewer from '../components/game/CardViewer.tsx'
import {
  useCollectionStore,
  excessCopies, neededCopies, totalExcessShards,
  maxUsefulCopies, SHARD_REFUND, SHARD_CRAFT,
} from '../stores/useCollectionStore.ts'
import { useQuestStore } from '../stores/useQuestStore.ts'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const RARITY_ORDER: Rarity[] = ['legendary', 'rare', 'uncommon', 'common']

const RARITY_COLOR: Record<Rarity, string> = {
  legendary: 'text-amber-300',
  rare:      'text-blue-300',
  uncommon:  'text-emerald-400',
  common:    'text-stone-400',
}

const RARITY_BG: Record<Rarity, string> = {
  legendary: 'bg-amber-900/40 border-amber-700/60',
  rare:      'bg-blue-900/40 border-blue-700/60',
  uncommon:  'bg-emerald-900/30 border-emerald-800/60',
  common:    'bg-stone-900/40 border-stone-800/60',
}

function toInstance(def: CardDefinition): Card {
  return { ...def, instanceId: def.definitionId, questProgress: 0, isTransformed: false, powerBonus: 0 }
}

function ShardIcon({ className }: { className?: string }) {
  return <DiamondsFour weight="duotone" className={cn('inline-block', className)} />
}

// ─── Detail panel ─────────────────────────────────────────────────────────────

interface DetailPanelProps {
  def: CardDefinition
  cards: Record<string, number>
  shards: number
  onRefund: (defId: string, count: number) => void
  onCraft: (defId: string) => void
  onView: (card: Card) => void
  onClose: () => void
}

function DetailPanel({ def, cards, shards, onRefund, onCraft, onView, onClose }: DetailPanelProps) {
  const owned = cards[def.definitionId] ?? 0
  const max = maxUsefulCopies(def.rarity)
  const excess = excessCopies(cards, def.definitionId)
  const needed = neededCopies(cards, def.definitionId)
  const craftCost = SHARD_CRAFT[def.rarity]
  const refundPer = SHARD_REFUND[def.rarity]
  const canCraft = needed > 0 && shards >= craftCost
  const atCap = owned >= max

  const inner = (
    <>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-stone-900 shrink-0">
        <p className="text-xs uppercase tracking-widest text-stone-500 font-semibold">Card Details</p>
        <button onClick={onClose} className="text-stone-600 hover:text-stone-300 transition-colors">
          <X size={14} weight="bold" />
        </button>
      </div>

      <div className="flex flex-col gap-4 p-4 overflow-y-auto">
        {/* Card preview */}
        <div className="flex justify-center">
          <div className="relative w-32 cursor-pointer" onClick={() => onView(toInstance(def))}>
            <CardComponent card={toInstance(def)} size="sm" onClick={() => onView(toInstance(def))} />
            <div className="absolute inset-0 rounded-xl ring-1 ring-white/5 hover:ring-white/20 transition-all" />
          </div>
        </div>

        {/* Name + rarity */}
        <div className="text-center">
          <p className="text-stone-100 font-bold text-sm">{def.name}</p>
          <p className={cn('text-xs mt-0.5 capitalize', RARITY_COLOR[def.rarity])}>{def.rarity}</p>
        </div>

        {/* Ownership bar */}
        <div className={cn('rounded-xl border p-3 flex flex-col gap-2', RARITY_BG[def.rarity])}>
          <div className="flex items-center justify-between text-xs">
            <span className="text-stone-400">Owned</span>
            <span className={cn('font-bold tabular-nums', atCap ? RARITY_COLOR[def.rarity] : 'text-stone-300')}>
              {owned} / {max}
            </span>
          </div>
          <div className="h-1.5 bg-stone-950/60 rounded-full overflow-hidden">
            <div
              className={cn('h-full rounded-full transition-all', atCap ? 'bg-amber-500' : 'bg-stone-500')}
              style={{ width: `${Math.min(owned / max, 1) * 100}%` }}
            />
          </div>
          {excess > 0 && (
            <p className="text-[10px] text-amber-400/80">
              {excess} excess {excess === 1 ? 'copy' : 'copies'}
            </p>
          )}
        </div>

        {/* Refund section */}
        {excess > 0 && (
          <div className="flex flex-col gap-2">
            <p className="text-stone-500 text-[10px] uppercase tracking-widest font-semibold">Refund Excess</p>
            <div className="flex flex-col gap-1.5">
              {Array.from({ length: excess }, (_, i) => i + 1).map(n => (
                <button
                  key={n}
                  onClick={() => onRefund(def.definitionId, n)}
                  className="flex items-center justify-between px-3 py-2 rounded-lg bg-stone-900/60 border border-stone-800 hover:border-amber-700/50 hover:bg-amber-950/30 transition-colors group"
                >
                  <span className="text-xs text-stone-300 group-hover:text-amber-200">
                    Refund {n} {n === 1 ? 'copy' : 'copies'}
                  </span>
                  <span className="flex items-center gap-1 text-xs font-bold text-amber-400">
                    +{n * refundPer} <ShardIcon className="w-3 h-3" />
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Craft section */}
        <div className="flex flex-col gap-2">
          <p className="text-stone-500 text-[10px] uppercase tracking-widest font-semibold">Craft</p>
          {atCap ? (
            <div className="px-3 py-2 rounded-lg bg-stone-900/40 border border-stone-800 text-center">
              <p className="text-xs text-stone-600">Collection complete</p>
            </div>
          ) : (
            <button
              onClick={() => onCraft(def.definitionId)}
              disabled={!canCraft}
              className={cn(
                'flex items-center justify-between px-3 py-2.5 rounded-lg border transition-all',
                canCraft
                  ? 'bg-violet-950/60 border-violet-700/60 hover:border-violet-500/80 hover:bg-violet-950/80'
                  : 'bg-stone-900/40 border-stone-800 opacity-50 cursor-not-allowed',
              )}
            >
              <span className="flex items-center gap-1.5 text-xs text-stone-200">
                <Hammer size={12} weight="duotone" className="text-violet-400" />
                Craft 1 copy
              </span>
              <span className="flex items-center gap-1 text-xs font-bold text-violet-300">
                {craftCost} <ShardIcon className="w-3 h-3 text-violet-300" />
              </span>
            </button>
          )}
          {!atCap && !canCraft && (
            <p className="text-[10px] text-stone-600 text-center">
              Need {craftCost - shards} more shards
            </p>
          )}
        </div>
      </div>
    </>
  )

  return (
    <>
      {/* Desktop: fixed side column */}
      <div className="hidden sm:flex w-64 shrink-0 border-l border-stone-900 flex-col overflow-hidden">
        {inner}
      </div>

      {/* Mobile: bottom sheet */}
      <div
        className="sm:hidden fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      >
        <div
          className="w-full max-h-[75vh] bg-stone-950 border border-stone-700/60 rounded-t-2xl flex flex-col overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          {/* drag pill */}
          <div className="flex justify-center pt-2.5 pb-1 shrink-0">
            <div className="w-10 h-1 rounded-full bg-stone-700" />
          </div>
          {inner}
        </div>
      </div>
    </>
  )
}

const RARITY_GLOW: Record<Rarity, string> = {
  legendary: 'shadow-[0_0_12px_3px_rgba(251,191,36,0.45)] ring-2 ring-amber-400/70',
  rare:      'shadow-[0_0_10px_2px_rgba(147,197,253,0.35)] ring-2 ring-blue-400/60',
  uncommon:  'shadow-[0_0_8px_2px_rgba(52,211,153,0.30)] ring-2 ring-emerald-400/60',
  common:    'ring-2 ring-stone-500/50',
}

// ─── Card grid cell ───────────────────────────────────────────────────────────

interface CardCellProps {
  def: CardDefinition
  owned: number
  max: number
  excess: number
  selected: boolean
  onClick: () => void
}

function CardCell({ def, owned, max, excess, selected, onClick }: CardCellProps) {
  const missing = owned === 0
  const atCap = owned >= max

  return (
    <div
      onClick={onClick}
      className={cn(
        'relative cursor-pointer rounded-xl transition-all duration-150 group',
        selected && 'ring-2 ring-amber-400 ring-offset-2 ring-offset-stone-950',
        !selected && atCap && RARITY_GLOW[def.rarity],
      )}
    >
      {/* Card renders at full opacity always — overlays handle the look */}
      <div className={cn('transition-all duration-150', missing && 'grayscale brightness-50')}>
        <CardComponent card={toInstance(def)} size="sm" />
      </div>

      {/* ── Unowned overlay ── */}
      {missing && (
        <div className="absolute inset-0 z-20 rounded-xl bg-stone-950/55 flex flex-col items-center justify-center gap-1 pointer-events-none">
          <Lock size={22} weight="duotone" className="text-stone-400" />
          <span className="text-[9px] font-bold text-stone-400 uppercase tracking-widest">Not owned</span>
        </div>
      )}

      {/* ── Owned count badge (top-right) ── */}
      {!missing && (
        <div className={cn(
          'absolute top-1.5 right-1.5 z-30 pointer-events-none',
          'flex items-center gap-0.5 px-2 py-1 rounded-lg font-black text-xs tabular-nums shadow-lg border font-ui',
          atCap
            ? 'bg-amber-400 border-amber-200/60 text-stone-950'
            : 'bg-stone-900 border-stone-600 text-stone-200',
        )}>
          {atCap && <span className="leading-none mr-0.5">✓</span>}
          {owned}/{max}
        </div>
      )}

      {/* ── Excess badge (top-left) ── */}
      {excess > 0 && (
        <div className="absolute top-1.5 left-1.5 z-30 px-1.5 py-0.5 rounded-lg bg-orange-500 border border-orange-300/60 pointer-events-none shadow-sm">
          <span className="text-[9px] font-black text-orange-950 font-ui">+{excess}</span>
        </div>
      )}

      {/* Hover shine */}
      <div className="absolute inset-0 rounded-xl bg-white/0 group-hover:bg-white/5 transition-colors pointer-events-none" />
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

type StatusFilter = 'all' | 'owned' | 'missing' | 'excess'
type RarityFilter = Rarity | 'all'

export default function Collection() {
  const navigate = useNavigate()
  const { cards, shards, refundCard, refundAllExcess, craftCard } = useCollectionStore()
  const completeQuest = useQuestStore(s => s.completeQuest)
  const [search, setSearch] = useState('')
  const [rarityFilter, setRarityFilter] = useState<RarityFilter>('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [selectedDefId, setSelectedDefId] = useState<string | null>(null)
  const [viewingCard, setViewingCard] = useState<Card | null>(null)

  // Award "Check Your Cards" quest on first visit each day
  useEffect(() => { completeQuest('visit_collection') }, [completeQuest])

  // Wrap craftCard to also trigger the craft quest
  const handleCraft = (defId: string) => {
    craftCard(defId)
    completeQuest('craft_card')
  }

  const excessShardsPreview = useMemo(() => totalExcessShards(cards), [cards])

  const selectedDef = selectedDefId
    ? CARD_DATABASE.find(c => c.definitionId === selectedDefId) ?? null
    : null

  const filtered = useMemo(() => {
    return CARD_DATABASE.filter(def => {
      if (def.isTransformTarget) return false
      if (search && !def.name.toLowerCase().includes(search.toLowerCase())) return false
      if (rarityFilter !== 'all' && def.rarity !== rarityFilter) return false
      const owned = cards[def.definitionId] ?? 0
      const max = maxUsefulCopies(def.rarity)
      const excess = Math.max(0, owned - max)
      if (statusFilter === 'owned' && owned === 0) return false
      if (statusFilter === 'missing' && owned > 0) return false
      if (statusFilter === 'excess' && excess === 0) return false
      return true
    }).sort((a, b) => {
      // Sort by rarity first, then name
      const ri = RARITY_ORDER.indexOf(a.rarity) - RARITY_ORDER.indexOf(b.rarity)
      if (ri !== 0) return ri
      return a.name.localeCompare(b.name)
    })
  }, [cards, search, rarityFilter, statusFilter])

  const ownedCount = CARD_DATABASE.filter(d => !d.isTransformTarget && (cards[d.definitionId] ?? 0) > 0).length
  const totalCards = CARD_DATABASE.filter(d => !d.isTransformTarget).length

  return (
    <div
      className="h-screen flex flex-col overflow-hidden"
      style={{ background: 'radial-gradient(ellipse at top, #100c14 0%, #080608 100%)' }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-3 border-b border-stone-900 shrink-0">
        <button
          onClick={() => navigate('/')}
          className="p-1.5 rounded-lg text-stone-500 hover:text-stone-200 hover:bg-stone-900 transition-colors shrink-0"
        >
          <ArrowLeft size={16} weight="bold" />
        </button>
        <div className="w-px h-4 bg-stone-800 shrink-0" />
        <DiamondsFour size={16} weight="duotone" className="text-violet-400 shrink-0" />
        <h1 className="text-stone-200 font-semibold text-sm sm:text-base">Collection</h1>
        <span className="text-stone-600 text-xs shrink-0">{ownedCount}/{totalCards}</span>

        <div className="ml-auto flex items-center gap-2">
          {/* Shard balance */}
          <div className="flex items-center gap-1.5 bg-stone-900 border border-stone-800 rounded-full px-2.5 sm:px-3 py-1">
            <DiamondsFour size={13} weight="duotone" className="text-violet-400" />
            <span className="text-stone-200 font-bold text-sm">{shards.toLocaleString()}</span>
            <span className="hidden sm:inline text-stone-500 text-xs">shards</span>
          </div>

          {/* Refund-all button */}
          {excessShardsPreview > 0 && (
            <button
              onClick={() => refundAllExcess()}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-orange-950/60 border border-orange-700/50 hover:border-orange-500/70 hover:bg-orange-950/80 text-orange-300 text-xs font-semibold transition-colors"
            >
              <ArrowsClockwise size={12} weight="bold" />
              <span className="hidden sm:inline">Refund all excess</span>
              <span className="sm:hidden">Refund</span>
              <span className="text-orange-400/70 hidden sm:inline">
                (+{excessShardsPreview.toLocaleString()} <DiamondsFour size={10} weight="duotone" className="inline-block -mt-0.5" />)
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Filter bar */}
      <div className="px-3 sm:px-4 py-2.5 border-b border-stone-900 flex items-center gap-2 shrink-0 overflow-x-auto scrollbar-none">
        {/* Search */}
        <div className="flex items-center gap-2 bg-stone-900 border border-stone-800 rounded-lg px-3 py-1.5 w-36 sm:w-44 shrink-0">
          <MagnifyingGlass size={13} className="text-stone-500 shrink-0" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search…"
            className="bg-transparent text-xs text-stone-200 placeholder-stone-600 outline-none w-full"
          />
          {search && (
            <button onClick={() => setSearch('')}>
              <X size={11} className="text-stone-500 hover:text-stone-300" />
            </button>
          )}
        </div>

        {/* Rarity */}
        {(['all', 'common', 'uncommon', 'rare', 'legendary'] as RarityFilter[]).map(r => (
          <button
            key={r}
            onClick={() => setRarityFilter(r)}
            className={cn(
              'px-2 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wide border transition-colors',
              rarityFilter === r
                ? r === 'legendary' ? 'bg-amber-900/80 text-amber-200 border-amber-600'
                  : r === 'rare' ? 'bg-blue-900/80 text-blue-200 border-blue-600'
                  : r === 'uncommon' ? 'bg-emerald-900/80 text-emerald-200 border-emerald-700'
                  : 'bg-stone-600 text-stone-100 border-stone-500'
                : 'bg-transparent text-stone-500 border-stone-800 hover:border-stone-600 hover:text-stone-300',
            )}
          >
            {r === 'all' ? 'All' : r}
          </button>
        ))}

        <div className="w-px h-4 bg-stone-800" />

        {/* Status filter */}
        {([
          ['all',     'All'],
          ['owned',   'Owned'],
          ['missing', 'Missing'],
          ['excess',  'Excess'],
        ] as [StatusFilter, string][]).map(([val, label]) => (
          <button
            key={val}
            onClick={() => setStatusFilter(val)}
            className={cn(
              'px-2 py-1 rounded-full text-[10px] font-semibold border transition-colors',
              statusFilter === val
                ? val === 'excess'
                  ? 'bg-orange-950/80 text-orange-200 border-orange-700'
                  : val === 'missing'
                  ? 'bg-stone-700 text-stone-200 border-stone-500'
                  : 'bg-violet-900/60 text-violet-200 border-violet-700'
                : 'bg-transparent text-stone-500 border-stone-800 hover:border-stone-600 hover:text-stone-300',
            )}
          >
            {label}
          </button>
        ))}

        <span className="ml-auto text-stone-600 text-[10px] shrink-0">{filtered.length} cards</span>
      </div>

      {/* Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Card grid */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 gap-3 text-stone-700">
              <DiamondsFour size={44} weight="duotone" />
              <p className="text-sm">No cards match these filters</p>
            </div>
          ) : (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(88px,1fr))] sm:grid-cols-[repeat(auto-fill,minmax(108px,1fr))] gap-2 sm:gap-3">
              <AnimatePresence mode="popLayout">
                {filtered.map(def => {
                  const owned = cards[def.definitionId] ?? 0
                  const max = maxUsefulCopies(def.rarity)
                  const excess = Math.max(0, owned - max)
                  return (
                    <motion.div
                      key={def.definitionId}
                      layout
                      initial={{ opacity: 0, scale: 0.82 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.82 }}
                      transition={{ duration: 0.18, ease: 'easeOut' }}
                    >
                      <CardCell
                        def={def}
                        owned={owned}
                        max={max}
                        excess={excess}
                        selected={selectedDefId === def.definitionId}
                        onClick={() => setSelectedDefId(
                          selectedDefId === def.definitionId ? null : def.definitionId,
                        )}
                      />
                    </motion.div>
                  )
                })}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Detail panel */}
        {selectedDef && (
          <DetailPanel
            def={selectedDef}
            cards={cards}
            shards={shards}
            onRefund={refundCard}
            onCraft={handleCraft}
            onView={setViewingCard}
            onClose={() => setSelectedDefId(null)}
          />
        )}

        {/* Empty state (no card selected) — desktop only */}
        {!selectedDef && (
          <div className="hidden sm:flex w-64 shrink-0 border-l border-stone-900 flex-col items-center justify-center gap-3 text-stone-700 px-6 text-center">
            {excessShardsPreview > 0 && (
              <div className="bg-orange-950/40 border border-orange-800/50 rounded-xl p-4 flex flex-col items-center gap-2 mb-2">
                <Warning size={20} weight="duotone" className="text-orange-400" />
                <p className="text-xs text-orange-300/80 leading-relaxed">
                  You have excess cards worth{' '}
                  <span className="font-bold text-orange-300">
                    {excessShardsPreview.toLocaleString()} shards
                  </span>
                </p>
                <button
                  onClick={() => refundAllExcess()}
                  className="text-[10px] text-orange-400 hover:text-orange-200 border border-orange-800/60 rounded-lg px-3 py-1.5 transition-colors"
                >
                  Refund all excess
                </button>
              </div>
            )}
            <DiamondsFour size={32} weight="duotone" />
            <p className="text-xs leading-relaxed">Click any card to refund extras or craft missing copies</p>
          </div>
        )}
      </div>

      <CardViewer
        card={viewingCard}
        onClose={() => setViewingCard(null)}
        onPrev={(() => {
          if (!viewingCard) return undefined
          const idx = filtered.findIndex(d => d.definitionId === viewingCard.definitionId)
          return idx > 0 ? () => setViewingCard(toInstance(filtered[idx - 1])) : undefined
        })()}
        onNext={(() => {
          if (!viewingCard) return undefined
          const idx = filtered.findIndex(d => d.definitionId === viewingCard.definitionId)
          return idx >= 0 && idx < filtered.length - 1 ? () => setViewingCard(toInstance(filtered[idx + 1])) : undefined
        })()}
      />
    </div>
  )
}
