import { useState, useMemo } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  MagnifyingGlass, X, DiamondsFour,
} from '@phosphor-icons/react'
import { ARENA_CARD_DATABASE as CARD_DATABASE, ARENA_ARCHETYPES, ARENA_CARD_SETS, arenaCardSetName, getExclusiveCardSeason } from '@tcg/shared'
import { Link } from 'react-router-dom'
import { useSeasonTime } from '../hooks/useSeasonTime.ts'
import type { CardDefinition, Card, Rarity, ArenaArchetype } from '@tcg/shared'
import { cn } from '../lib/cn.ts'
import CardComponent from '../components/game/Card.tsx'
import CardViewer from '../components/game/CardViewer.tsx'
import ArenaMenuHeader from '../components/ui/ArenaMenuHeader.tsx'
import { useCollectionStore } from '../stores/useCollectionStore.ts'
import CardArtworkControl from '../components/game/CardArtworkControl.tsx'
import { CardMasteryControl } from '../components/game/CardMasteryDialog.tsx'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const RARITY_ORDER: Rarity[] = ['legendary', 'rare', 'uncommon', 'common']

const RARITY_COLOR: Record<Rarity, string> = {
  legendary: 'text-amber-300',
  rare:      'text-blue-300',
  uncommon:  'text-emerald-400',
  common:    'text-stone-400',
}

function toInstance(def: CardDefinition): Card {
  return { ...def, instanceId: def.definitionId, questProgress: 0, isTransformed: false, powerBonus: 0 }
}

// ─── Detail panel ─────────────────────────────────────────────────────────────

interface DetailPanelProps {
  def: CardDefinition
  cards: Record<string, number>
  onView: (card: Card) => void
  onClose: () => void
}

function DetailPanel({ def, cards, onView, onClose }: DetailPanelProps) {
  const now = useSeasonTime()
  const exclusiveSeason = getExclusiveCardSeason(def.definitionId, now)
  const owned = cards[def.definitionId] ?? 0
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
          <p className={cn('text-xs mt-0.5 capitalize', RARITY_COLOR[def.rarity])}>{def.rarity}{def.arenaSet && ` · ${arenaCardSetName(def, now)}`}</p>
        </div>

        <CardMasteryControl card={def}/><CardArtworkControl card={def}/>

        {!owned && (exclusiveSeason ? (
          <div className="px-3 py-3 rounded-lg bg-stone-900/40 border border-stone-800 text-center">
            <Link to="/shop?tab=pass" className="text-xs text-amber-200">{exclusiveSeason.name} · Premium pass</Link>
            <p className="text-[10px] text-stone-400 mt-2">Eternal packs unlock {new Date(exclusiveSeason.endsAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', timeZone: 'UTC' })} (UTC).</p>
          </div>
        ) : <Link to="/shop" className="ae-button text-center">Find in {arenaCardSetName(def, now)?.replace(' Set', '')} packs</Link>)}
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

// ─── Card grid cell ───────────────────────────────────────────────────────────

interface CardCellProps {
  def: CardDefinition
  owned: number
  selected: boolean
  onClick: () => void
}

function CardCell({ def, owned, selected, onClick }: CardCellProps) {
  const missing = owned === 0

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      aria-label={`Select ${def.name}, ${missing ? 'not owned' : 'owned'}`}
      aria-pressed={selected}
      onKeyDown={event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();onClick()}}}
      className={cn(
        'relative cursor-pointer rounded-xl transition-all duration-150 group focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-300 focus-visible:outline-offset-4',
      )}
    >
      <div className={cn('ae-card-control transition-all duration-150', selected && 'selected', missing && 'grayscale brightness-75')}>
        <CardComponent card={toInstance(def)} size="sm" />
      </div>

    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

type StatusFilter = 'all' | 'owned' | 'missing'
type SortOrder = 'owned' | 'rarity' | 'cost' | 'name'
type RarityFilter = Rarity | 'all'

export default function Collection() {
  const { cards, gems } = useCollectionStore()
  const [search, setSearch] = useState('')
  const [rarityFilter, setRarityFilter] = useState<RarityFilter>('all')
  const [cardSet, setCardSet] = useState('all')
  const [cardType, setCardType] = useState('all')
  const [archetype, setArchetype] = useState<ArenaArchetype | 'all'>('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [sortOrder, setSortOrder] = useState<SortOrder>('owned')
  const [selectedDefId, setSelectedDefId] = useState<string | null>(null)
  const [viewingCard, setViewingCard] = useState<Card | null>(null)

  const selectedDef = selectedDefId
    ? CARD_DATABASE.find(c => c.definitionId === selectedDefId) ?? null
    : null

  const filtered = useMemo(() => {
    return CARD_DATABASE.filter(def => {
      if (def.isTransformTarget) return false
      if (cardType !== 'all' && def.type !== cardType) return false
      if (cardSet !== 'all' && def.arenaSet !== cardSet) return false
      if (search && !`${def.name} ${def.description} ${def.arenaArchetypes?.join(' ') ?? ''}`.toLowerCase().includes(search.toLowerCase())) return false
      if (archetype !== 'all' && !def.arenaArchetypes?.includes(archetype)) return false
      if (rarityFilter !== 'all' && def.rarity !== rarityFilter) return false
      const owned = cards[def.definitionId] ?? 0
      if (statusFilter === 'owned' && owned === 0) return false
      if (statusFilter === 'missing' && owned > 0) return false
      return true
    }).sort((a, b) => {
      if (sortOrder === 'owned') {
        const ownership = Number((cards[b.definitionId] ?? 0) > 0) - Number((cards[a.definitionId] ?? 0) > 0)
        if (ownership) return ownership
      }
      if (sortOrder === 'name') return a.name.localeCompare(b.name)
      if (sortOrder === 'cost' && a.cost !== b.cost) return a.cost - b.cost
      // Use rarity and name to keep each group in a stable order.
      const ri = RARITY_ORDER.indexOf(a.rarity) - RARITY_ORDER.indexOf(b.rarity)
      if (ri !== 0) return ri
      return a.name.localeCompare(b.name)
    })
  }, [cards, search, rarityFilter, statusFilter, archetype, sortOrder, cardSet, cardType])

  const ownedCount = CARD_DATABASE.filter(d => !d.isTransformTarget && (cards[d.definitionId] ?? 0) > 0).length
  const totalCards = CARD_DATABASE.filter(d => !d.isTransformTarget).length

  return (
    <div
      className="arena-library-screen h-screen flex flex-col overflow-hidden"
    >
      <ArenaMenuHeader title="Collection" subtitle={`${ownedCount} of ${totalCards} cards collected`} balance={gems} currency="gems"/>

      {/* Filter bar */}
      <div className="px-3 sm:px-4 py-2.5 border-b border-stone-900 flex flex-wrap items-center gap-2 shrink-0">
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

        <select aria-label="Card archetype" className="ae-input" value={archetype} onChange={event=>setArchetype(event.target.value as ArenaArchetype | 'all')}><option value="all">All archetypes</option>{ARENA_ARCHETYPES.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select>
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

        <select aria-label="Card type" className="ae-input" value={cardType} onChange={event=>setCardType(event.target.value)}><option value="all">All types</option><option value="unit">Units</option><option value="spell">Spells</option><option value="relic">Relics</option></select>
          <select aria-label="Card set" value={cardSet} onChange={event => setCardSet(event.target.value)} className="ae-input text-[10px]"><option value="all">All sets</option>{ARENA_CARD_SETS.map(set => <option key={set.id} value={set.id}>{set.name}</option>)}</select>
        <div className="flex items-center gap-1" role="group" aria-label="Card ownership">
          {([['all', 'All cards'], ['owned', 'Owned'], ['missing', 'Missing']] as [StatusFilter, string][]).map(([value, label]) => <button key={value} onClick={() => setStatusFilter(value)} aria-pressed={statusFilter === value} className={cn('px-3 py-1.5 rounded text-[10px] font-semibold border transition-colors', statusFilter === value ? 'bg-sky-950 text-sky-100 border-sky-700' : 'bg-transparent text-stone-400 border-stone-800 hover:text-stone-200')}>{label}</button>)}
        </div>
        <select aria-label="Sort cards" value={sortOrder} onChange={event => setSortOrder(event.target.value as SortOrder)} className="ae-input text-[10px]">
          <option value="owned">Owned first</option><option value="rarity">Rarity</option><option value="cost">Aether cost</option><option value="name">Name</option>
        </select>

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
            onView={setViewingCard}
            onClose={() => setSelectedDefId(null)}
          />
        )}

        {/* Empty state (no card selected) — desktop only */}
        {!selectedDef && (
          <div className="hidden sm:flex w-64 shrink-0 border-l border-stone-900 flex-col items-center justify-center gap-3 text-stone-700 px-6 text-center">
            <DiamondsFour size={32} weight="duotone" />
            <p className="text-xs leading-relaxed">Select a card to inspect its abilities, borders and artwork.</p>
          </div>
        )}
      </div>

      <CardViewer arena
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
