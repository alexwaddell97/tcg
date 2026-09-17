import { getDeckCardVariants } from '../stores/useCollectionStore.ts'
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ARENA_ARCHETYPE_DECKS, ARENA_CARD_DATABASE, ARENA_DECK_SIZE, ARENA_STARTER_DECK, getArenaDeckError } from '@tcg/shared'
import { useMatchmakingStore } from '../stores/useLobbyStore.ts'
import { useAuthStore } from '../stores/useAuthStore.ts'
import { useDeckStore } from '../stores/useDeckStore.ts'
import { connectSocket, getSocket, hasMultiplayerServer } from '../lib/socket.ts'
import { UI_ASSETS } from '../lib/uiAssets.ts'
import ArenaFrame from '../components/ui/ArenaFrame.tsx'
import { getDeckCardBorders } from '../stores/useCardMasteryStore.ts'
import ArenaCardFace from '../components/game/ArenaCardFace.tsx'
import MusicControls from '../components/audio/MusicControls.tsx'

type DeckChoice = { id: string; name: string; description: string; cards: string[]; savedId?: string; cover?: string }
const STARTER_DETAILS: Record<string, { description: string; cover: string }> = {
  transmutation: { description: 'Swap cost and power. Turn humble units into heavy hitters.', cover: 'paradox_regent' },
  sabotage: { description: 'Send unwanted gifts across the board and crowd out your opponent.', cover: 'ashen_envoy' },
  affliction: { description: 'Wear down enemy power, then feed on their weakness.', cover: 'famine_sovereign' },
  conduits: { description: 'Copy, channel and multiply power for a decisive finish.', cover: 'prism_titan' },
  formation: { description: 'Connect neighbours and hold the ends of your formation.', cover: 'banner_heir' },
  wayfarers: { description: 'Move units between arenas to unlock their power.', cover: 'horizon_rider' },
  invocation: { description: 'Use utility spells to fuel your units and relics.', cover: 'archmage' },
  stewardship: { description: 'Build around relics, then reclaim them when space matters.', cover: 'master_forger' },
}
const STARTERS: DeckChoice[] = [
  { id: 'starter:balanced', name: 'Arena Starter', description: 'A balanced introduction to leads, comebacks and arena control.', cards: ARENA_STARTER_DECK, cover: 'the_unbroken' },
  ...ARENA_ARCHETYPE_DECKS.map(deck => ({ ...deck, ...STARTER_DETAILS[deck.id], id: `starter:${deck.id}` })),
]
const getCards = (deck: DeckChoice) => deck.cards.flatMap(id => ARENA_CARD_DATABASE.find(card => card.definitionId === id) ?? [])
const getCover = (deck: DeckChoice) => ARENA_CARD_DATABASE.find(card => card.definitionId === deck.cover)
  ?? getCards(deck).filter(card => card.type === 'unit').sort((a, b) => b.cost - a.cost)[0]

export default function Lobby() {
  const navigate = useNavigate()
  const { status, setStatus } = useMatchmakingStore()
  const { displayName, avatarId, titleId, rank } = useAuthStore()
  const { decks, activeDeckId, createDeck, saveDeck, setActiveDeck } = useDeckStore()
  const [selectedId, setSelectedId] = useState(activeDeckId ? `saved:${activeDeckId}` : STARTERS[0].id)
  const [query, setQuery] = useState('')
  const [error, setError] = useState<string | null>(null)
  const saved: DeckChoice[] = decks.map(deck => ({ id: `saved:${deck.id}`, savedId: deck.id, name: deck.name,
    description: 'Your custom deck', cards: Object.entries(deck.cards).flatMap(([id, count]) => Array<string>(count).fill(id)) }))
  const selected = [...saved, ...STARTERS].find(deck => deck.id === selectedId) ?? STARTERS[0]
  const deckError = getArenaDeckError(selected.cards)
  const selectedCards = getCards(selected).sort((a, b) => a.cost - b.cost || a.name.localeCompare(b.name))
  const cover = getCover(selected)
  const previewCards = [cover, ...selectedCards.filter(card => card.type === 'unit' && card.definitionId !== cover?.definitionId)].filter(card => Boolean(card)).slice(0, 3)
  const matches = (deck: DeckChoice) => `${deck.name} ${deck.description} ${getCards(deck).map(card => card.name).join(' ')}`.toLowerCase().includes(query.trim().toLowerCase())
  const visibleSaved = saved.filter(matches), visibleStarters = STARTERS.filter(matches)
  const searching = status === 'searching' || status === 'found'

  useEffect(() => {
    setStatus('idle')
    const socket = getSocket()
    const rejected = ({ message }: { message: string }) => { setError(message); setStatus('idle') }
    const disconnected = () => { setError('Could not connect to matchmaking. Try again, or play a practice match.'); setStatus('idle') }
    socket.on('matchmaking:error', rejected)
    socket.on('connect_error', disconnected)
    return () => { socket.off('matchmaking:error', rejected); socket.off('connect_error', disconnected) }
  }, [setStatus])

  const search = () => {
    if (deckError || searching) return
    if (!hasMultiplayerServer) { setError('Multiplayer is unavailable in this preview build. You can still play a practice match.'); return }
    setError(null); setStatus('searching')
    connectSocket().emit('matchmaking:join', { displayName: displayName || 'Player', avatarId, titleId, rank,
      deckId: selected.savedId, deckDefinitionIds: selected.cards, cardBorders: getDeckCardBorders(selected.cards), cardVariants: getDeckCardVariants(selected.cards) })
  }
  const cancel = () => { getSocket().emit('matchmaking:leave'); setStatus('idle') }
  const editSelected = () => {
    if (selected.savedId) setActiveDeck(selected.savedId)
    else {
      const id = createDeck()
      saveDeck(id, { name: selected.name, cards: Object.fromEntries(selected.cards.map(cardId => [cardId, 1])) })
    }
    navigate('/deck-builder')
  }
  const deckTile = (deck: DeckChoice) => {
    const problem = getArenaDeckError(deck.cards), art = getCover(deck)
    return <button key={deck.id} className="ae-lobby-deck" aria-pressed={selected.id === deck.id}
      aria-label={`Select ${deck.name}${deck.savedId ? ', saved deck' : ', starter deck'}`}
      disabled={searching} onClick={() => { setSelectedId(deck.id); setError(null) }}>
      <span className="ae-lobby-deck-art">{art ? <img src={art.imageUrl} alt="" loading="lazy" /> : <span aria-hidden="true">◇</span>}</span>
      <span className="ae-lobby-deck-copy"><strong>{deck.name}</strong><span>{deck.description}</span>
        <small className={problem ? 'needs-update' : ''}>{problem ? `${deck.cards.length} / ${ARENA_DECK_SIZE} cards · Needs editing` : `${ARENA_DECK_SIZE} cards · Ready to play`}</small></span>
      <span className="ae-lobby-deck-check" aria-hidden="true">{selected.id === deck.id ? '✓' : ''}</span>
    </button>
  }

  return <main className="ae-page ae-lobby-screen">
    <div className="ae-lobby-shell">
      <header className="ae-lobby-header">
        <Link to="/" onClick={() => { if (searching) cancel() }} aria-label="Main menu"><img src={UI_ASSETS.logo} alt="Arena Eternal" /></Link>
        <div><p className="ae-eyebrow">Choose your strategy</p><h1>Enter the Arena</h1><p>Six turns. Three arenas. Make every card count.</p></div>
        <MusicControls compact/><Link to="/" onClick={() => { if (searching) cancel() }}>← Main menu</Link>
      </header>
      <div className="ae-lobby-layout">
        <section className="ae-panel ae-lobby-library" aria-label="Deck library">
          <div className="ae-lobby-library-header"><h2>Choose your deck</h2><Link to="/deck-builder" onClick={() => { if (searching) cancel() }}>Deck Builder →</Link></div>
          <input className="ae-input ae-lobby-search" aria-label="Search decks" placeholder="Search decks or cards…" value={query} onChange={event => setQuery(event.target.value)} />
          <section className="ae-lobby-deck-section" aria-labelledby="saved-decks-heading">
            <div className="ae-lobby-section-heading"><h3 id="saved-decks-heading">Your decks</h3><span>{saved.length}</span></div>
            <div className="ae-lobby-deck-grid">{visibleSaved.map(deckTile)}</div>
            {!saved.length && <p className="ae-lobby-empty">Your saved decks will appear here. Pick a starter below to jump into a match.</p>}
            {saved.length > 0 && !visibleSaved.length && <p className="ae-lobby-empty">No saved decks match your search.</p>}
          </section>
          <section className="ae-lobby-deck-section" aria-labelledby="starter-decks-heading">
            <div className="ae-lobby-section-heading"><h3 id="starter-decks-heading">Starter decks</h3><span>{STARTERS.length}</span></div>
            <p className="ae-lobby-section-note">Ready to play. Choose one and make it your own.</p>
            <div className="ae-lobby-deck-grid">{visibleStarters.map(deckTile)}</div>
            {!visibleStarters.length && <p className="ae-lobby-empty">No starter decks match your search.</p>}
          </section>
        </section>
        <aside className="ae-panel ae-lobby-selection" aria-label="Selected deck"><ArenaFrame ornate />
          <p className="ae-eyebrow">{selected.savedId ? 'Your deck' : 'Starter deck'}</p>
          <h2>{selected.name}</h2><p className="ae-lobby-description">{selected.description}</p>
          <div className="ae-lobby-preview" aria-hidden="true">{previewCards.map(card => card && <div key={card.definitionId}><ArenaCardFace card={card} variant="hand" /></div>)}</div>
          <details className="ae-lobby-card-list" key={selected.id}><summary>View deck <span>{selected.cards.length} cards</span></summary><ul>{selectedCards.map((card, index) => <li key={`${card.definitionId}-${index}`}><span>{card.cost}</span>{card.name}</li>)}</ul></details>
          {deckError && <p className="ae-lobby-problem" role="status">{deckError} Edit this deck or choose a starter.</p>}
          <div className="ae-lobby-launch" aria-live="polite">
            <p className="ae-lobby-launch-name">{selected.name}</p>
            {searching ? <><div className="ae-lobby-searching"><span className="ae-lobby-spinner" aria-hidden="true" /><p>{status === 'found' ? 'Match found. Entering the arena…' : `Finding an opponent for ${selected.name}…`}</p></div><button className="ae-button" onClick={cancel}>Cancel search</button></>
              : <><button className="ae-button ae-button-primary" disabled={Boolean(deckError)} onClick={search}>Find a match</button>
                <button className="ae-button" disabled={Boolean(deckError)} onClick={() => navigate('/practice', { state: { deckDefinitionIds: selected.cards } })}>Practice with this deck</button>
                <button className="ae-lobby-edit" onClick={editSelected}>{selected.savedId ? 'Edit deck' : 'Customize starter deck'} →</button></>}
            {error && <p className="ae-lobby-problem" role="alert">{error}</p>}
          </div>
        </aside>
      </div>
    </div>
  </main>
}
