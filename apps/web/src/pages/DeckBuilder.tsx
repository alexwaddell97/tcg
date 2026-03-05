import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Plus, Minus, PencilSimple, Check, Trash,
  MagnifyingGlass, X, CardsThree, PencilSimpleLine, WarningCircle,
} from '@phosphor-icons/react'
import {
  CARD_DATABASE, LOCATION_DATABASE, DECK_SIZE, GOLD_BUDGET,
  isValidDeckLocation,
} from '@tcg/shared'
import type { CardDefinition, Card, Rarity } from '@tcg/shared'
import { cn } from '../lib/cn.ts'
import CardComponent from '../components/game/Card.tsx'
import CardViewer from '../components/game/CardViewer.tsx'
import {
  useDeckStore, deckCardCount, canAddCard, addCard, removeCard,
  type SavedDeck,
} from '../stores/useDeckStore.ts'
import { useQuestStore } from '../stores/useQuestStore.ts'

// ─── Location theme config ────────────────────────────────────────────────────

const LOCATION_THEME: Record<string, { gradient: string; border: string; text: string; icon: string }> = {
  fire:   { gradient: 'from-orange-950 to-red-950',    border: 'border-orange-700/60',  text: 'text-orange-300',  icon: '🔥' },
  ice:    { gradient: 'from-sky-950 to-blue-950',      border: 'border-sky-700/60',     text: 'text-sky-300',     icon: '❄️' },
  arcane: { gradient: 'from-purple-950 to-indigo-950', border: 'border-purple-700/60',  text: 'text-purple-300',  icon: '🔮' },
  death:  { gradient: 'from-emerald-950 to-stone-950', border: 'border-emerald-800/60', text: 'text-emerald-400', icon: '💀' },
  light:  { gradient: 'from-amber-950 to-stone-950',   border: 'border-amber-700/60',   text: 'text-amber-300',   icon: '✨' },
  nature: { gradient: 'from-green-950 to-stone-950',   border: 'border-green-700/60',   text: 'text-green-300',   icon: '🌿' },
  shadow: { gradient: 'from-slate-900 to-stone-950',   border: 'border-slate-700/60',   text: 'text-slate-300',   icon: '🌑' },
  void:   { gradient: 'from-stone-950 to-black',       border: 'border-stone-800/60',   text: 'text-stone-400',   icon: '🌑' },
}

const PICKABLE_LOCATIONS = LOCATION_DATABASE.filter(loc =>
  CARD_DATABASE.some(c => c.affinity.includes(loc.definitionId))
)

// ─── Rarity helpers ───────────────────────────────────────────────────────────

const RARITY_ORDER: Rarity[] = ['legendary', 'rare', 'uncommon', 'common']
const RARITY_COLOR: Record<Rarity, string> = {
  legendary: 'text-amber-300',
  rare:      'text-blue-300',
  uncommon:  'text-emerald-400',
  common:    'text-stone-400',
}
const RARITY_GEM: Record<Rarity, string> = {
  legendary: '✦',
  rare:      '◇◇◇',
  uncommon:  '◇◇',
  common:    '◇',
}

function toInstance(def: CardDefinition): Card {
  return { ...def, instanceId: def.definitionId, questProgress: 0, isTransformed: false, powerBonus: 0 }
}

// ─── Deck list panel (left) ───────────────────────────────────────────────────

interface DeckListPanelProps {
  decks: SavedDeck[]
  activeDeckId: string | null
  onSelect: (id: string) => void
  onCreate: () => void
  onDelete: (id: string) => void
  className?: string
}

function DeckListPanel({ decks, activeDeckId, onSelect, onCreate, onDelete, className }: DeckListPanelProps) {
  return (
    <div className={cn("w-52 shrink-0 border-r border-stone-900 flex flex-col", className)}>
      <div className="px-3 py-3 border-b border-stone-900">
        <p className="text-stone-500 text-xs uppercase tracking-widest font-semibold">My Decks</p>
      </div>
      <div className="flex-1 overflow-y-auto py-2">
        {decks.length === 0 && (
          <p className="text-stone-600 text-xs text-center px-4 py-6 leading-relaxed">
            No decks yet. Create one to get started.
          </p>
        )}
        {decks.map(deck => {
          const count = deckCardCount(deck.cards)
          const isActive = deck.id === activeDeckId
          return (
            <div
              key={deck.id}
              className={cn(
                'group flex items-center gap-2 px-3 py-2.5 cursor-pointer transition-colors mx-1 rounded-lg',
                isActive ? 'bg-stone-800 text-stone-100' : 'text-stone-400 hover:bg-stone-900/80 hover:text-stone-200',
              )}
              onClick={() => onSelect(deck.id)}
            >
              <CardsThree size={14} weight={isActive ? 'fill' : 'regular'} className={isActive ? 'text-amber-400' : 'text-stone-600'} />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold truncate">{deck.name}</p>
                <div className="flex items-center gap-1">
                  {count < DECK_SIZE && <WarningCircle size={10} weight="fill" className="text-red-500 shrink-0" />}
                  <p className={cn('text-[10px]', count >= DECK_SIZE ? 'text-amber-400' : 'text-red-400')}>
                    {count}/{DECK_SIZE} cards
                  </p>
                </div>
              </div>
              {isActive && (
                <button
                  onClick={(e) => { e.stopPropagation(); onDelete(deck.id) }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded text-stone-600 hover:text-red-400"
                >
                  <Trash size={11} weight="bold" />
                </button>
              )}
            </div>
          )
        })}
      </div>
      <div className="p-3 border-t border-stone-900">
        <button
          onClick={onCreate}
          className="w-full flex items-center justify-center gap-1.5 text-xs text-stone-400 hover:text-stone-100 border border-stone-800 hover:border-stone-600 rounded-lg py-2 transition-colors"
        >
          <Plus size={12} weight="bold" />
          New Deck
        </button>
      </div>
    </div>
  )
}

// ─── Location picker ──────────────────────────────────────────────────────────

interface LocationPickerProps {
  locationIds: string[]
  onChange: (newIds: string[]) => void
}

function LocationPicker({ locationIds, onChange }: LocationPickerProps) {
  const [openSlot, setOpenSlot] = useState<0 | 1 | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (openSlot === null) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpenSlot(null)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [openSlot])

  const selectLocation = (slot: 0 | 1, locId: string) => {
    const next = [...locationIds]
    next[slot] = locId
    const other = slot === 0 ? 1 : 0
    if (next[other] === locId) next[other] = ''
    onChange(next.filter(Boolean))
    setOpenSlot(null)
  }

  const clearSlot = (slot: 0 | 1, e: React.MouseEvent) => {
    e.stopPropagation()
    const next = [...locationIds]
    next.splice(slot, 1)
    onChange(next.filter(Boolean))
  }

  const slots = [locationIds[0] ?? null, locationIds[1] ?? null]

  return (
    <div ref={ref} className="relative">
      <div className="flex gap-2">
        {slots.map((locId, slotIdx) => {
          const loc = locId ? LOCATION_DATABASE.find(l => l.definitionId === locId) : null
          const theme = loc ? (LOCATION_THEME[loc.theme] ?? LOCATION_THEME.void) : null
          return (
            <button
              key={slotIdx}
              onClick={() => setOpenSlot(openSlot === slotIdx as 0 | 1 ? null : slotIdx as 0 | 1)}
              className={cn(
                'flex-1 flex items-center gap-1.5 px-2.5 py-2 rounded-lg border text-left transition-all text-xs',
                loc && theme
                  ? `bg-linear-to-b ${theme.gradient} ${theme.border} ${theme.text}`
                  : 'bg-stone-900/60 border-stone-700/50 border-dashed text-stone-500 hover:border-stone-500 hover:text-stone-300',
              )}
            >
              <span>{loc ? (LOCATION_THEME[loc.theme]?.icon ?? '📍') : '+'}</span>
              <span className="flex-1 truncate font-medium">{loc ? loc.name : 'Pick location'}</span>
              {loc && (
                <span className="opacity-50 hover:opacity-100 transition-opacity" onClick={(e) => clearSlot(slotIdx as 0 | 1, e)}>
                  <X size={10} weight="bold" />
                </span>
              )}
            </button>
          )
        })}
      </div>

      {openSlot !== null && (
        <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-stone-950 border border-stone-700 rounded-xl shadow-2xl overflow-hidden">
          <p className="text-stone-500 text-[10px] uppercase tracking-widest px-3 py-2 border-b border-stone-800">
            Choose location {openSlot + 1}
          </p>
          {PICKABLE_LOCATIONS.map(loc => {
            const theme = LOCATION_THEME[loc.theme] ?? LOCATION_THEME.void
            const isOtherSlot = locationIds[openSlot === 0 ? 1 : 0] === loc.definitionId
            const cardCount = CARD_DATABASE.filter(c => c.affinity.includes(loc.definitionId)).length
            return (
              <button
                key={loc.definitionId}
                disabled={isOtherSlot}
                onClick={() => selectLocation(openSlot, loc.definitionId)}
                className={cn(
                  'w-full flex items-start gap-3 px-3 py-2.5 text-left transition-colors',
                  isOtherSlot ? 'opacity-40 cursor-not-allowed' : 'hover:bg-stone-900',
                )}
              >
                <span className="text-base leading-none mt-0.5">{theme.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className={cn('text-xs font-semibold', theme.text)}>{loc.name}</p>
                  <p className="text-stone-500 text-[10px] leading-snug mt-0.5">{loc.description}</p>
                </div>
                <span className="text-stone-600 text-[10px] shrink-0 mt-0.5">{cardCount} cards</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Deck panel (right) ───────────────────────────────────────────────────────

interface DeckPanelProps {
  deck: SavedDeck
  isEditing: boolean
  onEditToggle: () => void
  onRename: (name: string) => void
  onChangeLocations: (ids: string[]) => void
  onAddCard: (id: string) => void
  onRemoveCard: (id: string) => void
  onViewCard: (card: Card) => void
  className?: string
}

function DeckPanel({ deck, isEditing, onEditToggle, onRename, onChangeLocations, onAddCard, onRemoveCard, onViewCard, className }: DeckPanelProps) {
  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput] = useState(deck.name)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { setNameInput(deck.name) }, [deck.name])
  useEffect(() => { if (editingName) inputRef.current?.select() }, [editingName])

  const commitName = () => {
    const trimmed = nameInput.trim() || 'Unnamed Deck'
    onRename(trimmed)
    setEditingName(false)
  }

  const total = deckCardCount(deck.cards)
  const pct = Math.min(total / DECK_SIZE, 1)

  const usedGold = useMemo(() => {
    return Object.entries(deck.cards).reduce((sum, [defId, count]) => {
      if (count <= 0) return sum
      const def = CARD_DATABASE.find(c => c.definitionId === defId)
      return sum + (def ? def.cost * count : 0)
    }, 0)
  }, [deck.cards])

  const manaCurve = useMemo(() => {
    const buckets = [0, 1, 2, 3, 4, 5, 6]
    const counts = Object.fromEntries(buckets.map(c => [c, 0]))
    for (const [defId, count] of Object.entries(deck.cards)) {
      if (count <= 0) continue
      const def = CARD_DATABASE.find(c => c.definitionId === defId)
      if (!def) continue
      const bucket = Math.min(def.cost, 6)
      counts[bucket] = (counts[bucket] ?? 0) + count
    }
    const max = Math.max(1, ...Object.values(counts))
    return buckets.map(cost => ({ cost, count: counts[cost] ?? 0, max }))
  }, [deck.cards])

  const grouped = useMemo(() => {
    const entries = Object.entries(deck.cards).filter(([, n]) => n > 0)
    return RARITY_ORDER.map(rarity => ({
      rarity,
      cards: entries
        .map(([defId, count]) => {
          const def = CARD_DATABASE.find(c => c.definitionId === defId)!
          return { def, count }
        })
        .filter(({ def }) => def?.rarity === rarity)
        .sort((a, b) => a.def.name.localeCompare(b.def.name)),
    })).filter(g => g.cards.length > 0)
  }, [deck.cards])

  // ── Shared header (name + edit toggle) ──────────────────────────────────────
  const nameHeader = (
    <div className="px-4 py-3 border-b border-stone-900 flex items-center gap-2 shrink-0">
      {editingName ? (
        <form className="flex-1 flex items-center gap-2" onSubmit={(e) => { e.preventDefault(); commitName() }}>
          <input
            ref={inputRef}
            value={nameInput}
            onChange={e => setNameInput(e.target.value)}
            onBlur={commitName}
            className="flex-1 bg-stone-900 border border-stone-600 rounded px-2 py-1 text-sm text-stone-100 outline-none focus:border-amber-500"
            maxLength={40}
          />
          <button type="submit" className="text-emerald-400 hover:text-emerald-300">
            <Check size={14} weight="bold" />
          </button>
        </form>
      ) : (
        <button onClick={() => setEditingName(true)} className="flex-1 flex items-center gap-2 group text-left">
          <span className="text-sm font-bold text-stone-100 truncate group-hover:text-amber-300 transition-colors">
            {deck.name}
          </span>
          <PencilSimple size={12} weight="bold" className="text-stone-600 group-hover:text-stone-400 shrink-0 transition-colors" />
        </button>
      )}
      <button
        onClick={onEditToggle}
        className={cn(
          'shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all',
          isEditing
            ? 'bg-emerald-900/60 text-emerald-300 border-emerald-700/60 hover:bg-emerald-900'
            : 'bg-stone-900 text-stone-400 border-stone-700 hover:text-stone-100 hover:border-stone-500',
        )}
      >
        {isEditing ? (
          <><Check size={11} weight="bold" /> Done</>
        ) : (
          <><PencilSimpleLine size={11} weight="bold" /> Edit</>
        )}
      </button>
    </div>
  )

  // ── Shared stats blocks ───────────────────────────────────────────────────
  const statsBlocks = (
    <>
      <div className="px-4 py-2.5">
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-stone-500 text-[10px] uppercase tracking-widest font-semibold">Cards</p>
          <span className={cn('text-xs font-bold tabular-nums font-ui', total >= DECK_SIZE ? 'text-amber-400' : 'text-red-400')}>
            {total} / {DECK_SIZE}
          </span>
        </div>
        <div className="h-1 bg-stone-800 rounded-full overflow-hidden">
          <div
            className={cn('h-full rounded-full transition-all duration-300', total >= DECK_SIZE ? 'bg-amber-500' : 'bg-red-500/70')}
            style={{ width: `${pct * 100}%` }}
          />
        </div>
        {total < DECK_SIZE && (
          <p className="mt-2 text-[10px] text-red-400/80 leading-snug">
            Need {DECK_SIZE - total} more card{DECK_SIZE - total !== 1 ? 's' : ''} to play
          </p>
        )}
      </div>
      <div className="px-4 py-2.5 border-t border-stone-900">
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-stone-500 text-[10px] uppercase tracking-widest font-semibold">Gold</p>
          <span className={cn('text-xs font-bold tabular-nums font-ui', usedGold > GOLD_BUDGET ? 'text-red-400' : usedGold >= GOLD_BUDGET * 0.9 ? 'text-amber-400' : 'text-stone-300')}>
            {usedGold} / {GOLD_BUDGET}
          </span>
        </div>
        <div className="h-1 bg-stone-800 rounded-full overflow-hidden">
          <div
            className={cn('h-full rounded-full transition-all duration-300', usedGold > GOLD_BUDGET ? 'bg-red-500' : usedGold >= GOLD_BUDGET * 0.9 ? 'bg-amber-500' : 'bg-amber-700')}
            style={{ width: `${Math.min(usedGold / GOLD_BUDGET, 1) * 100}%` }}
          />
        </div>
      </div>
      <div className="px-4 py-2.5 border-t border-stone-900">
        <p className="text-stone-500 text-[10px] uppercase tracking-widest font-semibold mb-2">Gold Curve</p>
        <div className="flex items-end gap-1 h-14">
          {manaCurve.map(({ cost, count, max }) => (
            <div key={cost} className="flex-1 flex flex-col items-center gap-0.5">
              <span className={cn('text-[9px] font-bold tabular-nums leading-none', count > 0 ? 'text-stone-300' : 'text-transparent')}>
                {count}
              </span>
              <div className="w-full rounded-xs overflow-hidden bg-stone-800/60 flex flex-col justify-end" style={{ height: 32 }}>
                <div
                  className="w-full bg-amber-500/70 transition-all duration-300"
                  style={{ height: `${(count / max) * 100}%` }}
                />
              </div>
              <span className="text-[9px] text-stone-500 tabular-nums leading-none">
                {cost === 6 ? '6+' : cost}
              </span>
            </div>
          ))}
        </div>
      </div>
    </>
  )

  // ── VIEW MODE: two-column (card grid | info sidebar) ──────────────────────
  if (!isEditing) {
    return (
      <div className={cn("flex-1 border-l border-stone-900 flex flex-col sm:flex-row overflow-hidden", className)}>
        {/* Centre: card grid */}
        <div className="flex-1 flex flex-col overflow-hidden min-h-0">
          {nameHeader}
          <div className="flex-1 overflow-y-auto py-2">
            {total === 0 ? (
              <p className="text-stone-600 text-xs text-center px-4 py-8 leading-relaxed">
                No cards in this deck — click Edit to add some
              </p>
            ) : (
              <div className="px-4 pb-4">
                {grouped.map(({ rarity, cards: group }) => (
                  <div key={rarity} className="mb-4">
                    <p className={cn('text-[9px] uppercase tracking-widest font-bold py-2', RARITY_COLOR[rarity])}>
                      {RARITY_GEM[rarity]} {rarity} · {group.reduce((s, c) => s + c.count, 0)} cards
                    </p>
                    <div className="grid grid-cols-[repeat(auto-fill,minmax(88px,1fr))] sm:grid-cols-[repeat(auto-fill,minmax(108px,1fr))] gap-2 sm:gap-3">
                      {group.flatMap(({ def, count }) =>
                        Array.from({ length: count }, (_, i) => (
                          <div
                            key={`${def.definitionId}-${i}`}
                            className="relative cursor-pointer"
                            onClick={() => onViewCard(toInstance(def))}
                          >
                            <CardComponent card={toInstance(def)} size="sm" />
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: info sidebar — full-width on mobile, side panel on desktop */}
        <div className="w-full sm:w-64 sm:shrink-0 border-t sm:border-t-0 sm:border-l border-stone-900 flex flex-col overflow-y-auto sm:overflow-hidden">
          <div className="px-4 py-3 border-b border-stone-900">
            <p className="text-stone-500 text-[10px] uppercase tracking-widest font-semibold mb-2">Locations</p>
            <LocationPicker locationIds={deck.locationIds} onChange={onChangeLocations} />
          </div>
          <div className="border-b border-stone-900">
            {statsBlocks}
          </div>
        </div>
      </div>
    )
  }

  // ── EDIT MODE: single narrow column ──────────────────────────────────────
  return (
    <div className={cn("w-72 shrink-0 border-l border-stone-900 flex flex-col", className)}>
      {nameHeader}

      {/* Locations */}
      <div className="px-4 py-3 border-b border-stone-900">
        <p className="text-stone-500 text-[10px] uppercase tracking-widest font-semibold mb-2">Locations</p>
        <LocationPicker locationIds={deck.locationIds} onChange={onChangeLocations} />
      </div>

      {/* Stats stacked */}
      <div className="border-b border-stone-900">
        {statsBlocks}
      </div>

      {/* Compact card list */}
      <div className="flex-1 overflow-y-auto py-2">
        {total === 0 && (
          <p className="text-stone-600 text-xs text-center px-4 py-8 leading-relaxed">
            Click cards in the browser to add them to your deck
          </p>
        )}
        {grouped.map(({ rarity, cards: group }) => (
          <div key={rarity} className="mb-1">
            <p className={cn('text-[9px] uppercase tracking-widest font-bold px-4 py-1.5', RARITY_COLOR[rarity])}>
              {RARITY_GEM[rarity]} {rarity}
            </p>
            {group.map(({ def, count }) => {
              const canAdd = canAddCard(deck.cards, def.definitionId)
              return (
                <div key={def.definitionId} className="flex items-center gap-2 px-3 py-1 mx-1 rounded-lg hover:bg-stone-900/60">
                  <span className={cn('text-[10px] w-4 text-center font-bold shrink-0', RARITY_COLOR[rarity])}>
                    {RARITY_GEM[rarity]}
                  </span>
                  <span className="flex-1 text-xs text-stone-200 truncate">{def.name}</span>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => onRemoveCard(def.definitionId)}
                      className="w-5 h-5 flex items-center justify-center rounded text-stone-600 hover:text-red-400 hover:bg-stone-800 transition-colors"
                    >
                      <Minus size={10} weight="bold" />
                    </button>
                    <span className="text-stone-300 text-xs font-bold w-4 text-center tabular-nums font-ui">{count}</span>
                    <button
                      onClick={() => onAddCard(def.definitionId)}
                      disabled={!canAdd}
                      className="w-5 h-5 flex items-center justify-center rounded text-stone-600 hover:text-emerald-400 hover:bg-stone-800 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <Plus size={10} weight="bold" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Card browser (centre) ────────────────────────────────────────────────────

type RarityFilter = Rarity | 'all'
type TypeFilter = 'all' | 'unit' | 'spell'

interface CardBrowserProps {
  deck: SavedDeck | null
  onAddCard: (id: string) => void
  onRemoveCard: (id: string) => void
  onViewCard: (card: Card) => void
  onFilteredChange: (defs: CardDefinition[]) => void
}

function CardBrowser({ deck, onAddCard, onRemoveCard, onViewCard, onFilteredChange }: CardBrowserProps) {
  const [search, setSearch] = useState('')
  const [rarityFilter, setRarityFilter] = useState<RarityFilter>('all')
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')
  const [validOnly, setValidOnly] = useState(false)

  const locIds = deck?.locationIds as [string, string] | undefined

  const filtered = useMemo(() => {
    return CARD_DATABASE.filter(card => {
      if (card.isTransformTarget) return false
      if (search && !card.name.toLowerCase().includes(search.toLowerCase())) return false
      if (rarityFilter !== 'all' && card.rarity !== rarityFilter) return false
      if (typeFilter !== 'all' && card.type !== typeFilter) return false
      if (validOnly && locIds && locIds.length === 2) {
        if (!isValidDeckLocation(locIds as [string, string], toInstance(card))) return false
      }
      return true
    })
  }, [search, rarityFilter, typeFilter, validOnly, locIds])

  useEffect(() => { onFilteredChange(filtered) }, [filtered, onFilteredChange])

  const isValidCard = useCallback((card: CardDefinition): boolean => {
    if (!locIds || locIds.length < 2) return true
    return isValidDeckLocation(locIds as [string, string], toInstance(card))
  }, [locIds])

  return (
    <div className="flex-1 flex flex-col overflow-hidden min-w-0">
      {/* Filter bar */}
      <div className="px-3 sm:px-4 py-3 border-b border-stone-900 flex items-center gap-2 shrink-0 overflow-x-auto scrollbar-none">
        {/* Search */}
        <div className="flex items-center gap-2 bg-stone-900 border border-stone-800 rounded-lg px-3 py-1.5 w-36 sm:w-44 shrink-0">
          <MagnifyingGlass size={13} className="text-stone-500 shrink-0" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search cards…"
            className="bg-transparent text-xs text-stone-200 placeholder-stone-600 outline-none w-full"
          />
          {search && (
            <button onClick={() => setSearch('')}>
              <X size={11} className="text-stone-500 hover:text-stone-300" />
            </button>
          )}
        </div>

        {/* Rarity filter */}
        <div className="flex gap-1 shrink-0">
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
        </div>

        {/* Type filter */}
        <div className="flex gap-1">
          {(['all', 'unit', 'spell'] as TypeFilter[]).map(t => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={cn(
                'px-2 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wide border transition-colors',
                typeFilter === t
                  ? 'bg-stone-600 text-stone-100 border-stone-500'
                  : 'bg-transparent text-stone-500 border-stone-800 hover:border-stone-600 hover:text-stone-300',
              )}
            >
              {t === 'all' ? 'All' : t}
            </button>
          ))}
        </div>

        {/* Valid-only toggle (only when 2 locations chosen) */}
        {locIds && locIds.length === 2 && (
          <button
            onClick={() => setValidOnly(v => !v)}
            className={cn(
              'flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wide border transition-colors whitespace-nowrap shrink-0',
              validOnly
                ? 'bg-violet-900/60 text-violet-200 border-violet-700'
                : 'bg-transparent text-stone-500 border-stone-800 hover:border-stone-600 hover:text-stone-300',
            )}
          >
            ✓ Valid only
          </button>
        )}

        <span className="ml-auto text-stone-600 text-[10px] whitespace-nowrap shrink-0">{filtered.length} cards</span>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-scroll overflow-x-hidden p-4">
        {!deck ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3 text-stone-600">
            <CardsThree size={44} weight="duotone" />
            <p className="text-sm">Select or create a deck to start building</p>
          </div>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(88px,1fr))] sm:grid-cols-[repeat(auto-fill,minmax(108px,1fr))] gap-2 sm:gap-3">
            <AnimatePresence mode="popLayout">
            {filtered.map(def => {
              const count = deck.cards[def.definitionId] ?? 0
              const addable = canAddCard(deck.cards, def.definitionId)
              const valid = isValidCard(def)
              return (
                <motion.div
                  key={def.definitionId}
                  layout
                  initial={{ opacity: 0, scale: 0.82 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.82 }}
                  transition={{ duration: 0.18, ease: 'easeOut' }}
                  className={cn('relative group', !valid && 'opacity-40')}
                  onContextMenu={e => { e.preventDefault(); if (count > 0) onRemoveCard(def.definitionId) }}
                >
                  <CardComponent
                    card={toInstance(def)}
                    size="sm"
                    isPlayable={addable}
                    onClick={() => { if (addable) onAddCard(def.definitionId); else onViewCard(toInstance(def)) }}
                  />
                  {/* Count badge */}
                  {count > 0 && (
                    <div className="absolute top-1.5 right-1.5 z-20 flex items-center gap-px px-2 py-1 rounded-lg bg-amber-400 border border-amber-200/60 shadow-md pointer-events-none">
                      <span className="text-[11px] font-black text-stone-950 tabular-nums leading-none font-ui">×{count}</span>
                    </div>
                  )}
                  {/* Action bar — always visible on mobile, hover on desktop */}
                  <div className="absolute bottom-0 inset-x-0 z-20 flex items-center justify-between px-1 pb-1 gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={e => { e.stopPropagation(); onViewCard(toInstance(def)) }}
                      className="flex-1 bg-stone-900/90 text-stone-300 hover:text-white text-[9px] py-1 rounded border border-stone-700/60 text-center"
                    >
                      view
                    </button>
                    {count > 0 && (
                      <button
                        onClick={e => { e.stopPropagation(); onRemoveCard(def.definitionId) }}
                        className="w-6 h-6 flex items-center justify-center rounded bg-red-950/90 border border-red-700/60 text-red-400 hover:text-red-200"
                      >
                        <Minus size={10} weight="bold" />
                      </button>
                    )}
                    {addable && (
                      <button
                        onClick={e => { e.stopPropagation(); onAddCard(def.definitionId) }}
                        className="w-6 h-6 flex items-center justify-center rounded bg-emerald-950/90 border border-emerald-700/60 text-emerald-400 hover:text-emerald-200"
                      >
                        <Plus size={10} weight="bold" />
                      </button>
                    )}
                  </div>
                  {!valid && (
                    <div className="absolute top-1 left-1 z-20 bg-stone-950/90 border border-stone-700 rounded px-1 py-0.5 pointer-events-none">
                      <span className="text-[8px] text-stone-500 font-ui">off-faction</span>
                    </div>
                  )}
                </motion.div>
              )
            })}
            </AnimatePresence>
            {filtered.length === 0 && (
              <div className="col-span-full flex flex-col items-center justify-center py-20 gap-3 text-stone-600">
                <CardsThree size={40} weight="duotone" />
                <p className="text-sm">No cards match these filters</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function DeckBuilder() {
  const navigate = useNavigate()
  const { decks, activeDeckId, createDeck, deleteDeck, renameDeck, saveDeck, setActiveDeck } = useDeckStore()
  const completeQuest = useQuestStore(s => s.completeQuest)
  const [viewingCard, setViewingCard] = useState<Card | null>(null)
  const [filteredDefs, setFilteredDefs] = useState<CardDefinition[]>([])
  const [isEditing, setIsEditing] = useState(false)
  const [mobileTab, setMobileTab] = useState<'decks' | 'browse' | 'deck'>('decks')

  // Award "Build a Deck" quest on first visit each day
  useEffect(() => { completeQuest('update_deck') }, [completeQuest])

  const activeDeck = decks.find(d => d.id === activeDeckId) ?? null

  const handleCreate = () => { createDeck() }
  const handleDelete = (id: string) => { if (window.confirm('Delete this deck?')) deleteDeck(id) }

  // Exit editing mode when switching decks
  const handleSelectDeck = (id: string) => { setActiveDeck(id); setIsEditing(false); setMobileTab('deck') }

  // Toggle edit mode; on mobile, navigate to browse when entering, deck when leaving
  const handleEditToggle = useCallback(() => {
    setIsEditing(e => {
      const next = !e
      if (next) setMobileTab('browse')   // entering edit → go straight to card browser
      else      setMobileTab('deck')     // leaving edit → return to deck view
      return next
    })
  }, [])

  const handleAddCard = useCallback((defId: string) => {
    if (!activeDeck) return
    saveDeck(activeDeck.id, { cards: addCard(activeDeck.cards, defId) })
  }, [activeDeck, saveDeck])

  const handleRemoveCard = useCallback((defId: string) => {
    if (!activeDeck) return
    saveDeck(activeDeck.id, { cards: removeCard(activeDeck.cards, defId) })
  }, [activeDeck, saveDeck])

  const handleChangeLocations = useCallback((ids: string[]) => {
    if (!activeDeck) return
    saveDeck(activeDeck.id, { locationIds: ids })
  }, [activeDeck, saveDeck])

  return (
    <div
      className="h-screen flex flex-col overflow-hidden"
      style={{ background: 'radial-gradient(ellipse at top, #120e08 0%, #0a0806 80%)' }}
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
        <CardsThree size={16} className="text-amber-400 shrink-0" weight="duotone" />
        <h1 className="text-stone-200 font-semibold text-sm sm:text-base">Deck Builder</h1>
        <span className="hidden sm:inline text-stone-600 text-xs">{CARD_DATABASE.length} cards available</span>
      </div>

      {/* Body */}
      <div className="flex-1 flex overflow-hidden">

        {/* ── Desktop: 3-panel layout ── */}
        <div className="hidden sm:flex flex-1 overflow-hidden">
          <DeckListPanel
            decks={decks}
            activeDeckId={activeDeckId}
            onSelect={handleSelectDeck}
            onCreate={handleCreate}
            onDelete={handleDelete}
          />
          {isEditing && (
            <CardBrowser
              deck={activeDeck}
              onAddCard={handleAddCard}
              onRemoveCard={handleRemoveCard}
              onViewCard={setViewingCard}
              onFilteredChange={setFilteredDefs}
            />
          )}
          {activeDeck ? (
            <DeckPanel
              key={activeDeck.id}
              deck={activeDeck}
              isEditing={isEditing}
              onEditToggle={handleEditToggle}
              onRename={(name) => renameDeck(activeDeck.id, name)}
              onChangeLocations={handleChangeLocations}
              onAddCard={handleAddCard}
              onRemoveCard={handleRemoveCard}
              onViewCard={setViewingCard}
            />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-stone-700 px-6 text-center">
              <CardsThree size={40} weight="duotone" />
              <p className="text-xs leading-relaxed">Create or select a deck on the left to begin building</p>
            </div>
          )}
        </div>

        {/* ── Mobile: single-panel tab view ── */}
        <div className="flex sm:hidden flex-1 flex-col overflow-hidden">
          {mobileTab === 'decks' && (
            <DeckListPanel
              className="w-full border-r-0"
              decks={decks}
              activeDeckId={activeDeckId}
              onSelect={handleSelectDeck}
              onCreate={handleCreate}
              onDelete={handleDelete}
            />
          )}
          {mobileTab === 'browse' && (
            <CardBrowser
              deck={activeDeck}
              onAddCard={handleAddCard}
              onRemoveCard={handleRemoveCard}
              onViewCard={setViewingCard}
              onFilteredChange={setFilteredDefs}
            />
          )}
          {mobileTab === 'deck' && activeDeck && (
            <DeckPanel
              key={activeDeck.id}
              className="w-full border-l-0 flex-1"
              deck={activeDeck}
              isEditing={isEditing}
              onEditToggle={handleEditToggle}
              onRename={(name) => renameDeck(activeDeck.id, name)}
              onChangeLocations={handleChangeLocations}
              onAddCard={handleAddCard}
              onRemoveCard={handleRemoveCard}
              onViewCard={setViewingCard}
            />
          )}
          {mobileTab === 'deck' && !activeDeck && (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-stone-700 px-6 text-center">
              <CardsThree size={40} weight="duotone" />
              <p className="text-xs leading-relaxed">Go to My Decks to create or select a deck</p>
            </div>
          )}
        </div>
      </div>

      {/* Mobile bottom tab bar */}
      <div className="sm:hidden relative z-10 shrink-0 flex border-t border-stone-900 bg-stone-950">
        <button
          onClick={() => setMobileTab('decks')}
          className={cn(
            'flex-1 flex flex-col items-center py-2.5 gap-0.5 transition-colors',
            mobileTab === 'decks' ? 'text-amber-400' : 'text-stone-600',
          )}
        >
          <CardsThree size={20} weight={mobileTab === 'decks' ? 'fill' : 'regular'} />
          <span className="text-[10px] font-semibold uppercase tracking-wider">My Decks</span>
        </button>
        <button
          onClick={() => activeDeck && setMobileTab('deck')}
          className={cn(
            'flex-1 flex flex-col items-center py-2.5 gap-0.5 transition-colors',
            mobileTab === 'deck' ? 'text-amber-400' : activeDeck ? 'text-stone-600' : 'text-stone-800 cursor-not-allowed',
          )}
        >
          <PencilSimpleLine size={20} weight={mobileTab === 'deck' ? 'fill' : 'regular'} />
          <span className="text-[10px] font-semibold uppercase tracking-wider">Deck</span>
        </button>
        {isEditing && (
          <button
            onClick={() => setMobileTab('browse')}
            className={cn(
              'flex-1 flex flex-col items-center py-2.5 gap-0.5 transition-colors',
              mobileTab === 'browse' ? 'text-amber-400' : 'text-stone-600',
            )}
          >
            <MagnifyingGlass size={20} weight={mobileTab === 'browse' ? 'fill' : 'regular'} />
            <span className="text-[10px] font-semibold uppercase tracking-wider">Browse</span>
          </button>
        )}
      </div>

      <CardViewer
        card={viewingCard}
        onClose={() => setViewingCard(null)}
        onPrev={(() => {
          if (!viewingCard) return undefined
          const idx = filteredDefs.findIndex(d => d.definitionId === viewingCard.definitionId)
          return idx > 0 ? () => setViewingCard(toInstance(filteredDefs[idx - 1])) : undefined
        })()}
        onNext={(() => {
          if (!viewingCard) return undefined
          const idx = filteredDefs.findIndex(d => d.definitionId === viewingCard.definitionId)
          return idx >= 0 && idx < filteredDefs.length - 1 ? () => setViewingCard(toInstance(filteredDefs[idx + 1])) : undefined
        })()}
      />
    </div>
  )
}

