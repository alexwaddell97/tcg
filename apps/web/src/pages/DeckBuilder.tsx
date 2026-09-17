import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ARENA_CARD_SETS, arenaCardSetName, ARENA_CARD_DATABASE, ARENA_STARTER_DECK, ARENA_DECK_SIZE, ARENA_ARCHETYPES, ARENA_ARCHETYPE_DECKS, getArenaAbilities, getArenaDeckError } from '@tcg/shared'
import type { Card, CardDefinition } from '@tcg/shared'
import { useDeckStore, deckCardCount, addCard, removeCard } from '../stores/useDeckStore.ts'
import CardArtworkControl from '../components/game/CardArtworkControl.tsx'
import { CardMasteryControl } from '../components/game/CardMasteryDialog.tsx'
import ArenaCardFace from '../components/game/ArenaCardFace.tsx'
import ArenaCardDialog from '../components/game/ArenaCardDialog.tsx'
import ArenaFrame from '../components/ui/ArenaFrame.tsx'
import { UI_ASSETS } from '../lib/uiAssets.ts'

function toInstance(def: CardDefinition): Card {
  return { ...def, instanceId: def.definitionId, questProgress: 0, isTransformed: false, powerBonus: 0 }
}

const STRATEGIES = [{id:'all',name:'All'},{id:'rally',name:'Rally'},{id:'pressure',name:'Pressure'},{id:'grow',name:'Growth'},{id:'parity',name:'Parity'},{id:'aura',name:'Support'}]
export default function DeckBuilder() {
  const { decks, activeDeckId, setActiveDeck, createDeck, saveDeck, renameDeck, deleteDeck } = useDeckStore()
  const deck = decks.find(item => item.id === activeDeckId) ?? decks[0]
  const [search, setSearch] = useState('')
  const [cost, setCost] = useState('all')
  const [condition, setCondition] = useState('all')
  const [rarity, setRarity] = useState('all')
  const [cardSet, setCardSet] = useState('all')
  const [cardType, setCardType] = useState('all')
  const [archetype, setArchetype] = useState('all')
  const [templateId, setTemplateId] = useState('starter')
  const [deckListOpen, setDeckListOpen] = useState(false)
  const [viewingId, setViewingId] = useState('wandering_blade')
  const [inspectionOpen, setInspectionOpen] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)
  const viewing = ARENA_CARD_DATABASE.find(card => card.definitionId === viewingId) ?? ARENA_CARD_DATABASE[0]
  const [compact, setCompact] = useState(() => window.matchMedia('(max-width:800px)').matches)
  const inspectionDialog = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const media = window.matchMedia('(max-width:800px)')
    const resize = () => { setCompact(media.matches); setInspectionOpen(false) }
    media.addEventListener('change', resize)
    return () => media.removeEventListener('change', resize)
  }, [])
  useEffect(() => {
    if (!inspectionOpen || !compact) return
    const dialog = inspectionDialog.current!
    dialog.showModal()
    return () => dialog.close()
  }, [inspectionOpen, compact])
  const cards = useMemo(() => ARENA_CARD_DATABASE.filter(card =>
    `${card.name} ${card.description} ${card.arenaArchetypes?.join(' ') ?? ''}`.toLowerCase().includes(search.toLowerCase()) &&
    (cardType === 'all' || card.type === cardType) &&
    (cardSet === 'all' || card.arenaSet === cardSet) &&
    (cost === 'all' || card.cost === Number(cost)) &&
    (rarity === 'all' || card.rarity === rarity) &&
    (condition === 'all' || getArenaAbilities(card).some(ability => ability.type === condition)) &&
    (archetype === 'all' || card.arenaArchetypes?.includes(archetype as typeof ARENA_ARCHETYPES[number]['id']))
  ).sort((a,b) => a.cost-b.cost || a.name.localeCompare(b.name)), [search,cost,condition,rarity,archetype,cardSet,cardType])
  const ids = Object.entries(deck?.cards ?? {}).flatMap(([id,count]) => Array<string>(count).fill(id))
  const problem = deck ? getArenaDeckError(ids) : null
  const count = deckCardCount(deck?.cards ?? {})
  const saveCards = (next: Record<string,number>) => {
    if (!deck) return
    saveDeck(deck.id, {cards:next})
  }
  const starter = () => {
    const template = ARENA_ARCHETYPE_DECKS.find(item => item.id === templateId)
    const id = createDeck()
    saveDeck(id, {name:template?.name ?? 'Arena Starter', cards:Object.fromEntries((template?.cards ?? ARENA_STARTER_DECK).map(cardId=>[cardId,1]))})
  }
  const inspect = (id: string) => { setViewingId(id); setInspectionOpen(compact) }
  const inDeck = Boolean(deck?.cards[viewing.definitionId])
  const viewingIndex = cards.findIndex(card => card.definitionId === viewing.definitionId)
  const viewFullscreenPrev = viewingIndex > 0 ? () => setViewingId(cards[viewingIndex - 1].definitionId) : undefined
  const viewFullscreenNext = viewingIndex >= 0 && viewingIndex < cards.length - 1 ? () => setViewingId(cards[viewingIndex + 1].definitionId) : undefined
  const preview = <><ArenaFrame ornate/><button className="ae-icon-button ae-inspector-close" onClick={()=>setInspectionOpen(false)} aria-label="Close card preview">×</button><button className="ae-card-control" onClick={()=>setFullscreen(true)} aria-label={`View ${viewing.name} full screen`}><ArenaCardFace card={viewing}/></button>{viewing.description && <p className="ae-card-rules">{viewing.description}</p>}<div className="ae-inspector-meta"><span>{viewing.rarity}</span><span>{arenaCardSetName(viewing)}</span><span>◆</span><span>{viewing.type}</span></div>{viewing.arenaArchetypes && <p className="ae-archetype-note">{ARENA_ARCHETYPES.filter(item=>viewing.arenaArchetypes!.includes(item.id)).map(item=>item.name).join(' · ')}</p>}<CardMasteryControl card={viewing}/><CardArtworkControl card={viewing}/><button className="ae-button" disabled={!deck||inDeck||count>=ARENA_DECK_SIZE} onClick={()=>deck&&saveCards(addCard(deck.cards,viewing.definitionId))}>{inDeck?'In deck ✓':'+ Add to deck'}</button></>
  return <main className="ae-page ae-deck-page">
    <header className="ae-page-header"><Link to="/" className="ae-header-logo" aria-label="Main menu"><img src={UI_ASSETS.logo} alt="Arena Eternal" /></Link><div><h1>Deck Builder</h1><p>12 cards · One copy of each</p></div><nav aria-label="Library navigation"><Link to="/collection">Collection</Link><Link to="/">Main menu</Link></nav></header>
    <div className="ae-deck-layout">
      <aside className="ae-panel ae-deck-sidebar" aria-label="Your deck"><ArenaFrame ornate />
        <div className="ae-deck-sidebar-top"><div><label className="ae-eyebrow" htmlFor="deck-choice">Your decks</label><select id="deck-choice" className="ae-input" value={deck?.id ?? ''} onChange={event=>setActiveDeck(event.target.value)}><option value="" disabled>Choose a deck</option>{decks.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></div>
        {deck && <div className="ae-deck-name"><input aria-label="Deck name" value={deck.name} maxLength={40} onChange={event=>renameDeck(deck.id,event.target.value)} /><span aria-hidden="true">✎</span></div>}</div>
        {deck ? <>
          <div className="ae-deck-progress"><span>{count} / {ARENA_DECK_SIZE}</span><span className="ae-deck-pips" aria-hidden="true">{Array.from({length:12},(_,i)=><i key={i} className={i<count?'filled':''}/>)}</span></div>
          <p className="ae-eyebrow">Aether</p><div className="ae-energy-curve" aria-label="Aether curve">{[1,2,3,4,5,6].map(energy=>{
            const n=ids.filter(id=>ARENA_CARD_DATABASE.find(card=>card.definitionId===id)?.cost===energy).length
            return <div key={energy} aria-label={`${n} cards costing ${energy} aether`}><i style={{height:Math.min(45,Math.max(2,n*9))}}/><span>{energy}</span></div>
          })}</div>
          <div className={`ae-deck-list ${deckListOpen ? 'is-open' : ''}`}><button className="ae-deck-list-toggle" aria-expanded={deckListOpen} onClick={()=>setDeckListOpen(!deckListOpen)}>{deckListOpen ? 'Hide' : 'View'} deck · {count} cards {deckListOpen ? '−' : '+'}</button><div className="ae-deck-rows">{Object.entries(deck.cards).filter(([,n])=>n>0).sort(([a],[b])=>(ARENA_CARD_DATABASE.find(c=>c.definitionId===a)?.cost??0)-(ARENA_CARD_DATABASE.find(c=>c.definitionId===b)?.cost??0)).map(([id,n])=>{
            const card=ARENA_CARD_DATABASE.find(item=>item.definitionId===id)
            return <div key={id} className="ae-deck-row">{card&&<img src={card.imageUrl} alt=""/>}<b>{card?.cost??'?'}</b><button onClick={()=>card&&inspect(id)}>{card?.name??id}{n>1?` ×${n}`:''}</button><button className="ae-deck-remove" aria-label={`Remove ${card?.name??id}`} onClick={()=>saveCards(removeCard(deck.cards,id))}>×</button></div>
          })}{!count&&<p className="ae-deck-empty">Choose cards from the collection to shape your strategy.</p>}</div></div>
          {problem && <p className="ae-deck-problem">{problem}</p>}
          <p className="ae-deck-save" role="status">Saved automatically</p>
        </> : <p className="ae-deck-empty">Your next great deck starts here. Create your own, or try our balanced starter deck.</p>}
        <label className="ae-eyebrow" htmlFor="deck-template">Starter decks</label><select id="deck-template" className="ae-input" value={templateId} onChange={event=>setTemplateId(event.target.value)}><option value="starter">Balanced starter</option>{ARENA_ARCHETYPE_DECKS.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select>
        <div className="ae-deck-actions"><button className="ae-button" onClick={()=>createDeck()}>New deck</button><button className="ae-button" onClick={starter}>Create deck</button>{deck&&<button className="ae-button" onClick={()=>{if(window.confirm(`Delete “${deck.name}”?`))deleteDeck(deck.id)}}>Delete deck</button>}</div>
      </aside>
      <section className="ae-deck-collection" aria-label="Available cards">
        <div className="ae-deck-toolbar"><input className="ae-input ae-deck-search" placeholder="Search cards or abilities…" aria-label="Search cards or abilities" value={search} onChange={event=>setSearch(event.target.value)}/><select aria-label="Aether cost" className="ae-input" value={cost} onChange={event=>setCost(event.target.value)}><option value="all">All aether</option>{[1,2,3,4,5,6].map(n=><option key={n} value={n}>{n} aether</option>)}</select><select aria-label="Card rarity" className="ae-input" value={rarity} onChange={event=>setRarity(event.target.value)}><option value="all">All rarities</option>{['common','uncommon','rare','legendary'].map(r=><option key={r} value={r}>{r[0].toUpperCase()+r.slice(1)}</option>)}</select>
          <select aria-label="Card type" className="ae-input" value={cardType} onChange={event=>setCardType(event.target.value)}><option value="all">All types</option><option value="unit">Units</option><option value="spell">Spells</option><option value="relic">Relics</option></select>
          <select aria-label="Card set" className="ae-input" value={cardSet} onChange={event=>setCardSet(event.target.value)}><option value="all">All sets</option>{ARENA_CARD_SETS.map(set=><option key={set.id} value={set.id}>{set.name}</option>)}</select>
          <select aria-label="Card archetype" className="ae-input" value={archetype} onChange={event=>setArchetype(event.target.value)}><option value="all">All archetypes</option>{ARENA_ARCHETYPES.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select>
          <div className="ae-strategy-tabs" role="group" aria-label="Card strategy">{STRATEGIES.map(strategy=><button key={strategy.id} aria-pressed={condition===strategy.id} onClick={()=>setCondition(strategy.id)}>{strategy.name}</button>)}</div>
        </div>
        <div className="ae-deck-catalog">{cards.map(card=>{
          const included=Boolean(deck?.cards[card.definitionId])
          return <article className="ae-catalog-item" key={card.definitionId}><button className={`ae-card-control ${viewingId===card.definitionId?'selected':''}`} onClick={()=>inspect(card.definitionId)} aria-label={`Inspect ${card.name}`}><ArenaCardFace card={card} variant="catalog"/></button><button className="ae-catalog-add" disabled={!deck||included||count>=ARENA_DECK_SIZE} onClick={()=>deck&&saveCards(addCard(deck.cards,card.definitionId))} aria-label={included?`${card.name} is in deck`:`Add ${card.name} to deck`}>{included?'In deck ✓':'+ Add to deck'}</button></article>
        })}</div>
        {!cards.length&&<p className="ae-deck-empty-result">No cards match those filters.</p>}
        <div className="ae-deck-footer"><span>{cards.length} cards</span></div>
      </section>
      <aside className="ae-panel ae-deck-inspector" aria-label="Card preview">{preview}</aside>
      {compact && <dialog ref={inspectionDialog} className="ae-inspection-dialog" aria-label={`${viewing.name} preview`} onCancel={()=>setInspectionOpen(false)} onClick={event=>{if(event.target===event.currentTarget)setInspectionOpen(false)}}><div className="ae-panel ae-deck-inspector">{preview}</div></dialog>}
      {fullscreen && <ArenaCardDialog card={toInstance(viewing)} onClose={()=>setFullscreen(false)} onPrev={viewFullscreenPrev} onNext={viewFullscreenNext} />}
    </div>
  </main>
}
