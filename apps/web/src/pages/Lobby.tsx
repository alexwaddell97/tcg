import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, CircleNotch, CardsThree, Check, MapPin, Sword,
} from '@phosphor-icons/react'
import { useMatchmakingStore } from '../stores/useLobbyStore.ts'
import { useAuthStore } from '../stores/useAuthStore.ts'
import { useDeckStore, deckCardCount, type SavedDeck } from '../stores/useDeckStore.ts'
import { LOCATION_DATABASE, DECK_SIZE } from '@tcg/shared'
import { connectSocket, getSocket } from '../lib/socket.ts'
import { cn } from '../lib/cn.ts'

// ─── Deck card ────────────────────────────────────────────────────────────────

function DeckOption({ deck, selected, onSelect }: { deck: SavedDeck; selected: boolean; onSelect: () => void }) {
  const total = deckCardCount(deck.cards)
  const ready = total >= DECK_SIZE
  const locations = deck.locationIds
    .map(id => LOCATION_DATABASE.find(l => l.definitionId === id)?.name)
    .filter(Boolean)

  return (
    <button
      onClick={onSelect}
      className={cn(
        'w-full text-left rounded-xl border px-4 py-3.5 transition-all duration-150 flex items-start gap-3',
        selected
          ? 'bg-amber-950/40 border-amber-600/60 shadow-[0_0_12px_rgba(245,158,11,0.12)]'
          : 'bg-stone-900/40 border-stone-800/60 hover:border-stone-600/60 hover:bg-stone-900/70',
      )}
    >
      {/* Checkbox */}
      <div className={cn(
        'mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors',
        selected ? 'border-amber-400 bg-amber-400' : 'border-stone-600',
      )}>
        {selected && <Check size={9} weight="bold" className="text-stone-950" />}
      </div>

      <div className="flex-1 min-w-0">
        <p className={cn('text-sm font-semibold truncate', selected ? 'text-amber-200' : 'text-stone-200')}>
          {deck.name}
        </p>
        {locations.length > 0 && (
          <div className="flex items-center gap-1 mt-1">
            <MapPin size={10} className="text-stone-500 shrink-0" />
            <p className="text-[10px] text-stone-500 truncate">{locations.join(' · ')}</p>
          </div>
        )}
      </div>

      <div className={cn('shrink-0 text-right', ready ? 'text-emerald-400' : 'text-stone-600')}>
        <p className="text-xs font-bold tabular-nums">{total}/{DECK_SIZE}</p>
        <p className="text-[9px] mt-0.5">{ready ? 'ready' : 'incomplete'}</p>
      </div>
    </button>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function Lobby() {
  const navigate = useNavigate()
  const { status, queueSize, setStatus } = useMatchmakingStore()
  const { displayName, avatarEmoji, rank } = useAuthStore()
  const { decks, activeDeckId } = useDeckStore()

  const [selectedDeckId, setSelectedDeckId] = useState<string | null>(activeDeckId)

  // Reset the matchmaking state each time we land on the lobby page
  // (status can be 'found' / 'searching' left over from a previous session)
  useEffect(() => { setStatus('idle') }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const selectedDeck = decks.find(d => d.id === selectedDeckId) ?? null
  const deckReady = selectedDeck !== null && deckCardCount(selectedDeck.cards) >= DECK_SIZE

  const handleSearch = () => {
    connectSocket()
    setStatus('searching')
    const deckDefinitionIds = selectedDeck
      ? Object.entries(selectedDeck.cards).flatMap(([defId, count]) => Array<string>(count).fill(defId))
      : undefined

    getSocket().emit('matchmaking:join', {
      displayName,
      avatarEmoji,
      rank,
      deckId: selectedDeckId ?? undefined,
      deckDefinitionIds,
    })
  }

  const handleCancel = () => {
    getSocket().emit('matchmaking:leave')
    navigate('/')
  }

  // ── Searching / found view ────────────────────────────────────────────────

  if (status === 'searching' || status === 'found') {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center p-4"
        style={{ background: 'radial-gradient(ellipse at center, #1a1008 0%, #0d0906 70%)' }}
      >
        <div className="max-w-sm w-full flex flex-col gap-8 items-center text-center">
          <div className="flex flex-col items-center gap-2">
            <h1 className="text-3xl font-bold text-amber-100">Finding Match</h1>
            <p className="text-stone-400">
              Playing as <span className="text-amber-400">{displayName}</span>
              {selectedDeck && (
                <> · <span className="text-stone-400">{selectedDeck.name}</span></>
              )}
            </p>
          </div>

          {status === 'searching' && (
            <div className="flex flex-col items-center gap-4">
              <CircleNotch className="w-12 h-12 text-amber-400 animate-spin" weight="bold" />
              <p className="text-stone-300 text-lg">Searching for opponent…</p>
              {queueSize > 0 && (
                <p className="text-stone-500 text-sm">
                  {queueSize} player{queueSize !== 1 ? 's' : ''} in queue
                </p>
              )}
            </div>
          )}

          {status === 'found' && (
            <div className="flex flex-col items-center gap-4">
              <p className="text-emerald-400 text-xl font-semibold">Match found!</p>
              <p className="text-stone-400">Starting game…</p>
            </div>
          )}

          {status === 'searching' && (
            <button
              onClick={handleCancel}
              className="flex items-center gap-2 text-stone-500 hover:text-stone-200 text-sm transition-colors border border-stone-800 hover:border-stone-600 rounded-lg px-4 py-2"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    )
  }

  // ── Deck picker view (idle) ───────────────────────────────────────────────

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-4"
      style={{ background: 'radial-gradient(ellipse at center, #1a1008 0%, #0d0906 70%)' }}
    >
      <div className="w-full max-w-md flex flex-col gap-6">

        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="p-1.5 rounded-lg text-stone-500 hover:text-stone-200 hover:bg-stone-900 transition-colors"
          >
            <ArrowLeft size={16} weight="bold" />
          </button>
          <Sword size={16} weight="duotone" className="text-amber-500/70" />
          <h1 className="text-xl font-bold text-amber-100">Find a Match</h1>
        </div>

        {/* Deck selector */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <p className="text-stone-400 text-xs uppercase tracking-widest font-semibold">Choose Your Deck</p>
            <button
              onClick={() => navigate('/deck-builder')}
              className="text-[10px] text-stone-500 hover:text-amber-400 transition-colors flex items-center gap-1"
            >
              <CardsThree size={11} />
              Manage decks
            </button>
          </div>

          {decks.length === 0 ? (
            <div className="rounded-xl border border-dashed border-stone-700/60 px-5 py-8 text-center flex flex-col items-center gap-3">
              <CardsThree size={36} weight="duotone" className="text-stone-700" />
              <p className="text-stone-500 text-sm">You don't have any decks yet.</p>
              <button
                onClick={() => navigate('/deck-builder')}
                className="text-xs text-amber-400 hover:text-amber-300 border border-amber-800/50 hover:border-amber-600/50 rounded-lg px-4 py-2 transition-colors"
              >
                Build a deck
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2 max-h-72 overflow-y-auto pr-px">
              {decks.map(deck => (
                <DeckOption
                  key={deck.id}
                  deck={deck}
                  selected={selectedDeckId === deck.id}
                  onSelect={() => setSelectedDeckId(deck.id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Info row */}
        {decks.length > 0 && selectedDeck && !deckReady && (
          <div className="-mt-2 flex items-center gap-2 rounded-lg border border-red-900/60 bg-red-950/30 px-3 py-2.5">
            <span className="text-red-400 text-sm shrink-0">⚠</span>
            <p className="text-red-400/90 text-xs leading-snug">
              This deck only has <span className="font-bold">{deckCardCount(selectedDeck.cards)}/{DECK_SIZE}</span> cards.
              {' '}Add {DECK_SIZE - deckCardCount(selectedDeck.cards)} more to queue.
            </p>
          </div>
        )}

        {/* Find Match button */}
        <button
          onClick={handleSearch}
          disabled={!deckReady}
          className={cn(
            'w-full py-3 rounded-xl font-bold text-sm transition-all duration-150 flex items-center justify-center gap-2',
            deckReady
              ? 'bg-amber-600 hover:bg-amber-500 text-stone-950 shadow-lg shadow-amber-900/40'
              : 'bg-stone-800 text-stone-600 cursor-not-allowed',
          )}
        >
          <Sword size={15} weight="bold" />
          {selectedDeck ? `Queue with "${selectedDeck.name}"` : 'Find Match (any deck)'}
        </button>

      </div>
    </div>
  )
}

