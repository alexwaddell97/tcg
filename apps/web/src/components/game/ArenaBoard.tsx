import MusicControls from '../audio/MusicControls.tsx'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { CSSProperties, FocusEvent, PointerEvent } from 'react'
import type { ArenaIndex, ArenaLocation, ArenaPlay, ArenaRule, ArenaSlotIndex, ArenaTurnSubmission, Card, GameState } from '@tcg/shared'
import { ARENA_POSITIONS, getArenaCardPower, getArenaRelicCounter, getArenaCardScore, getArenaFormation, getArenaLocationPower, resolveArenaPlaySlots } from '@tcg/shared'
import { UI_ASSETS } from '../../lib/uiAssets.ts'
import './ArenaBoard.css'
import ArenaFrame from '../ui/ArenaFrame.tsx'
import type { MasteryReceipt } from '../../stores/useCardMasteryStore.ts'
import ArenaResultScreen from './ArenaResultScreen.tsx'
import ArenaCardFace from './ArenaCardFace.tsx'
import ArenaCardDialog from './ArenaCardDialog.tsx'
import ArenaLocationDialog from './ArenaLocationDialog.tsx'
import { useCardDrag } from '../../hooks/useCardDrag.ts'
import { getArenaDropPlan } from '../../lib/arenaDraft.ts'
import { useArenaPlayback } from '../../hooks/useArenaPlayback.ts'
import ArenaAtmosphere from './ArenaAtmosphere.tsx'
import ArenaEffectLinks from './ArenaEffectLinks.tsx'
import { revealEffectLabel, revealEffectTheme, RevealBurst, CardEffectTrace } from './ArenaRevealEffects.tsx'
import { ArenaScoreSummary, arenaVerdict } from './ArenaFinale.tsx'
import ArenaFormation from './ArenaFormation.tsx'
import ArenaPlayerProfile from './ArenaPlayerProfile.tsx'
import ArenaTurnAnnouncement from './ArenaTurnAnnouncement.tsx'
import { useArenaDrawAnimation } from '../../hooks/useArenaDrawAnimation.ts'
import { useArenaSounds } from '../../hooks/useArenaSounds.ts'
import { playSoundEffect } from '../../lib/gameAudio.ts'

interface Props {
  gameState: GameState
  playerId: string
  canAct: boolean
  error?: string | null
  onCommit: (submission: ArenaTurnSubmission) => void
  onSurrender: () => void
  onExit: () => void
  masteryReward?: MasteryReceipt | null
}
const SHORT_RULES = {
  forge: 'First unit each turn: +1 power.', sanctum: 'Spells give allies here +1.', summit: '4+ aether units gain +2.',
  chainbridge: 'Two neighbours: +2 power.', leyline_nexus: 'Take 2 power from the previous position.',
  ashen_orchard: 'Each turn: weakest allies gain +1.', bellmarsh: 'First spell returns after each turn.',
  mirror_reservoir: 'Negative power scores positive.', gilded_exchange: 'After turn 4: swap position 4.',
} satisfies Record<ArenaRule, string>

export default function ArenaBoard({ gameState: incoming, playerId, canAct, error, onCommit, onSurrender, onExit, masteryReward }: Props) {
  const { gameState, frame, isRevealing, reducedMotion } = useArenaPlayback(incoming)
  useArenaSounds(gameState, frame, playerId)
  const boardRef = useRef<HTMLElement>(null)
  const cardPositions = useRef(new Map<string, DOMRect>())
  const event = frame?.event
  const effectTheme = revealEffectTheme(event)
  const effectLabel = revealEffectLabel(event)
  const arena = gameState.arena!
  const hand = gameState.hand ?? []
  const opponent = Object.values(gameState.players).find(player => player.id !== playerId)!
  const me = gameState.players[playerId]
  const over = gameState.phase === 'game_over'
  const finale = frame?.phase === 'score-focus' || frame?.phase === 'score-summary'
  const locked = arena.lockedIn[playerId]
  const [draft, setDraft] = useState<ArenaPlay[]>([])
  const [keyboardDrag, setKeyboardDrag] = useState<{ cardId: string; index: ArenaIndex; slotIndex: ArenaSlotIndex } | null>(null)
  const [cardPreview, setCardPreview] = useState<Card | null>(null)
  const [hoveredCardId, setHoveredCardId] = useState<string | null>(null)
  const [focusedCardId, setFocusedCardId] = useState<string | null>(null)
  const [locationPreview, setLocationPreview] = useState<ArenaLocation | null>(null)
  const [localError, setLocalError] = useState<string | null>(null)
  const [resultDismissed, setResultDismissed] = useState(false)
  const [pageVisible, setPageVisible] = useState(() => !document.hidden)
  useEffect(() => {
    // Warm the small result illustrations during play so the final reveal is complete.
    Object.values(UI_ASSETS.results).forEach(src => { const image = new Image(); image.src = src })
  }, [])
  useEffect(() => {
    const update = () => setPageVisible(!document.hidden)
    document.addEventListener('visibilitychange', update)
    return () => document.removeEventListener('visibilitychange', update)
  }, [])
  const plan = resolveArenaPlaySlots(arena.locations, playerId, hand, isRevealing ? [] : locked ? arena.committedPlays ?? [] : draft)
  const spent = plan.reduce((sum, play) => sum + (hand.find(card => card.instanceId === play.cardInstanceId)?.cost ?? 0), 0)
  const available = arena.energy - spent
  const isDrawing = useArenaDrawAnimation(boardRef, gameState, reducedMotion)
  const editable = canAct && !locked && !over && !isRevealing && !isDrawing
  const detailCardId = hoveredCardId ?? focusedCardId
  const detailCard = hand.find(card => card.instanceId === detailCardId)
    ?? arena.locations.flatMap(location => Object.values(location.cards).flat()).find(placed => placed.card.instanceId === detailCardId)?.card
  const inspectedLocation = cardPreview && arena.locations.find(location => Object.values(location.cards).flat().some(placed => placed.card.instanceId === cardPreview.instanceId))
  const inspectedMirrorScore = inspectedLocation?.rule === 'mirror_reservoir' && cardPreview && cardPreview.power + cardPreview.powerBonus < 0
    ? Math.abs(cardPreview.power + cardPreview.powerBonus) : undefined
  useEffect(() => {
    setDraft([]); setKeyboardDrag(null); setLocalError(null)
    if (isRevealing) { setCardPreview(null); setLocationPreview(null); setHoveredCardId(null); setFocusedCardId(null) }
  }, [gameState.turn, isRevealing])
  useLayoutEffect(() => {
    const positions = new Map<string, DOMRect>()
    const animations: Animation[] = []
    boardRef.current?.querySelectorAll<HTMLElement>('[data-card-id]').forEach(node => {
      const id = node.dataset.cardId!
      const rect = node.getBoundingClientRect()
      positions.set(id, rect)
      const previous = cardPositions.current.get(id)
      const moved = frame?.changes.some(change => change.cardId === id && (change.from !== change.to || change.fromOwner !== change.toOwner || change.fromSlot !== change.toSlot))
      if (moved && previous && !reducedMotion) animations.push(node.animate([
        { transform: `translate(${previous.x - rect.x}px, ${previous.y - rect.y}px) scale(1.06)`, zIndex: 12 },
        { transform: 'translate(0, 0) scale(1)', zIndex: 12 },
      ], { duration: 750, easing: 'cubic-bezier(.22,1,.36,1)' }))
    })
    cardPositions.current = positions
    return () => animations.forEach(animation => animation.cancel())
  }, [frame, arena.locations, reducedMotion])
  const place = (index: ArenaIndex, cardId: string, slotIndex?: ArenaSlotIndex) => {
    if (!editable) return
    const result = getArenaDropPlan(gameState, playerId, draft, cardId, index, slotIndex)
    if (result.error) { setLocalError(result.error); return }
    setDraft(result.plan); setKeyboardDrag(null); setLocalError(null)
    playSoundEffect('place')
  }
  const remove = (cardId: string) => {
    if (!editable) return
    setDraft(current => current.filter(play => play.cardInstanceId !== cardId)); setLocalError(null)
  }
  const cardDrag = useCardDrag({ board: boardRef, enabled: editable, turn: gameState.turn,
    onBegin: () => { setKeyboardDrag(null); setLocalError(null) },
    onDrop: (cardId, target) => {
      if (target?.kind === 'arena') place(target.index, cardId, target.slotIndex)
      else if (target?.kind === 'hand') remove(cardId)
    },
  })
  const dragging = hand.find(card => card.instanceId === (cardDrag.drag?.cardId ?? keyboardDrag?.cardId))
  const showAbility = Boolean(detailCard && !dragging && !isDrawing && !isRevealing && !cardPreview && !locationPreview && (!over || resultDismissed))
  const cardDetails = (cardId: string) => ({
    onPointerEnter: (event: PointerEvent<HTMLButtonElement>) => { if (event.pointerType !== 'touch') setHoveredCardId(cardId) },
    onPointerLeave: () => setHoveredCardId(current => current === cardId ? null : current),
    onFocus: (event: FocusEvent<HTMLButtonElement>) => { if (event.currentTarget.matches(':focus-visible')) setFocusedCardId(cardId) },
    onBlur: () => { setFocusedCardId(current => current === cardId ? null : current); setKeyboardDrag(current => current?.cardId === cardId ? null : current) },
  })
  const dropIndex = cardDrag.drag?.target?.kind === 'arena' ? cardDrag.drag.target.index : keyboardDrag?.index
  const dropSlot = cardDrag.drag?.target?.kind === 'arena' ? cardDrag.drag.target.slotIndex : keyboardDrag?.slotIndex
  const canPlace = (location: ArenaLocation, slotIndex?: ArenaSlotIndex) => Boolean(editable && dragging && !getArenaDropPlan(gameState, playerId, draft, dragging.instanceId, location.index, slotIndex).error)
  const startKeyboardDrag = (card: Card) => {
    cardDrag.cancel(); setLocalError(null)
    const index = arena.locations.find(location => !getArenaDropPlan(gameState, playerId, draft, card.instanceId, location.index).error)?.index ?? 0
    const slotIndex = getArenaDropPlan(gameState, playerId, draft, card.instanceId, index).plan.find(play => play.cardInstanceId === card.instanceId)?.slotIndex ?? 0
    setKeyboardDrag({ cardId: card.instanceId, index, slotIndex })
  }
  const inspect = (card: Card, clickDetail: number) => {
    if (isRevealing || isDrawing || !cardDrag.canInspect(clickDetail)) return
    setKeyboardDrag(null); setLocalError(null); setCardPreview(card)
  }
  useEffect(() => { if (!editable) setKeyboardDrag(null) }, [editable])

  const cardsAt = (location: ArenaLocation, ownerId: string) => {
    const placed = getArenaFormation(location.cards[ownerId] ?? [])
    const queued = ownerId === playerId ? plan.filter(play => play.locationIndex === location.index)
      .map(play => ({ slotIndex: play.slotIndex, card: hand.find(card => card.instanceId === play.cardInstanceId) })).filter(entry => entry.card && entry.card.type !== 'spell') : []
    const targeted = ownerId === playerId && dropIndex === location.index && dragging && dragging.type !== 'spell'
    const activeSlot = targeted ? dropSlot ?? getArenaDropPlan(gameState, playerId, draft, dragging.instanceId, location.index).plan.find(play => play.cardInstanceId === dragging.instanceId)?.slotIndex : undefined
    const exchangePending = location.revealed && location.rule === 'gilded_exchange' && !location.exchangeResolved && gameState.turn <= 4 && !over
    return <ArenaFormation yours={ownerId === playerId} activeSlot={activeSlot} dragging={Boolean(dragging)} exchangePending={exchangePending} legalSlots={ownerId === playerId && dragging && dragging.type !== 'spell' ? ARENA_POSITIONS.filter(slot => canPlace(location, slot)) : []}>
      {i => {
        const existing = placed[i]
        const pendingCard = queued.find(entry => entry.slotIndex === i)?.card
        const card = existing?.card ?? pendingCard
        if (!card) return <div key={`empty-${i}`} className="clash-empty-slot" aria-hidden="true"><span>+</span></div>
        const power = pendingCard ? card.power + card.powerBonus : getArenaCardPower(location, ownerId, card)
        const score = pendingCard ? power : getArenaCardScore(location, ownerId, card)
        const queuedIndex = plan.findIndex(play => play.cardInstanceId === card.instanceId)
        const change = frame?.changes.find(item => item.cardId === card.instanceId)
        const arriving = frame?.phase === 'arrive' && event?.card?.instanceId === card.instanceId || Boolean(change?.spawned)
        const resolving = frame?.phase === 'effect' && event?.card?.instanceId === card.instanceId
        const marked = change && (effectTheme === 'affliction' && change.delta < 0
          || effectTheme === 'sabotage' && (change.spawned || change.fromOwner !== change.toOwner)
          || effectTheme === 'conduits' && change.delta !== 0)
        return <button key={card.instanceId} data-card-id={card.instanceId} className={`clash-board-card ${pendingCard ? 'is-queued' : ''} ${arriving ? 'is-arriving' : ''} ${resolving ? 'is-resolving' : ''} ${change ? 'is-affected' : ''} fx-${effectTheme}`}
          aria-label={`Inspect ${card.name}, ${pendingCard ? 'queued, ' : ''}${card.type === 'relic' ? `relic${getArenaRelicCounter(card) ? `, ${getArenaRelicCounter(card)!.label}` : ''}` : `${power} power`}${score !== power ? `, scores ${score} here` : ''}, position ${i + 1}${exchangePending && i === 3 ? ', exchanges sides after turn 4' : ''}`}
          {...(pendingCard ? cardDrag.bind(card.instanceId) : {})} draggable={false} onDragStart={event => event.preventDefault()}
          data-can-drag={Boolean(pendingCard && editable) || undefined}
          aria-describedby={pendingCard ? 'clash-keyboard-play-help' : undefined}
          onKeyDown={event => { if (pendingCard && editable && !keyboardDrag && event.key === 'ArrowUp') { event.preventDefault(); event.stopPropagation(); startKeyboardDrag(card) } }}
          {...cardDetails(card.instanceId)}
          onClick={event => inspect(pendingCard ? card : { ...card, powerBonus: getArenaCardPower(location, ownerId, card) - card.power }, event.detail)}>
          <ArenaCardFace card={card} power={pendingCard ? card.power + card.powerBonus : getArenaCardPower(location, ownerId, card)} variant="board" />
          {score !== power && <span className="clash-mirror-score" title={`Scores ${score} power at Mirror Reservoir`} aria-hidden="true">+{score} score</span>}
          {resolving && !(marked && effectTheme === 'affliction') && <RevealBurst key={frame!.id} family={effectTheme}/>}
          {marked && (!resolving || effectTheme === 'affliction') && <CardEffectTrace key={`${frame!.id}:trace`} family={effectTheme}/>}
          {change && !change.spawned && <span key={`${frame!.id}:power`} className={`clash-power-change ${change.delta < 0 ? 'is-negative' : ''}`} aria-hidden="true">{change.delta ? `${change.delta > 0 ? '+' : '−'}${Math.abs(change.delta)}` : '↝'}</span>}
          {resolving && effectLabel && <span key={`${frame!.id}:label`} className="clash-ability-pop" aria-hidden="true">{effectLabel}</span>}
          {pendingCard && <span className="clash-queue-marker">{queuedIndex + 1}{!editable ? ' · ✓' : ''}</span>}
        </button>
      }}
    </ArenaFormation>
  }

  return <main ref={boardRef} className={`clash-screen ${cardDrag.drag ? 'is-dragging-card' : ''} ${isRevealing ? 'is-revealing' : ''} ${finale ? 'is-finale' : ''} ${frame?.phase === 'score-summary' ? 'is-score-summary' : ''}`} aria-busy={(isRevealing && frame?.phase !== 'turn-intro') || isDrawing} style={{ '--reveal-duration': `${frame?.duration ?? 0}ms` } as CSSProperties}
    onKeyDown={event => {
      if (cardPreview || locationPreview || over && !resultDismissed) return
      if (event.key === 'Escape') { event.preventDefault(); cardDrag.cancel(); setKeyboardDrag(null); setLocalError(null) }
      if (!keyboardDrag || !editable) return
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault(); setKeyboardDrag({ ...keyboardDrag, slotIndex: ((keyboardDrag.slotIndex + (event.key === 'ArrowRight' ? 1 : 3)) % 4) as ArenaSlotIndex })
      }
      if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
        event.preventDefault(); setKeyboardDrag({ ...keyboardDrag, index: ((keyboardDrag.index + (event.key === 'ArrowDown' ? 1 : 2)) % 3) as ArenaIndex })
      }
      if (event.key === 'Enter') { event.preventDefault(); place(keyboardDrag.index, keyboardDrag.cardId, keyboardDrag.slotIndex) }
    }}>
    <h1 className="sr-only">Arena Eternal match</h1>
    <span className="sr-only" id="clash-keyboard-play-help">Press Up Arrow to pick up a card. Left and Right follow positions 1 through 4; Up and Down choose an arena. Enter drops and Escape cancels. Press Enter on a card to inspect it.</span>
    <header className="clash-header">
      <ArenaPlayerProfile player={me} yours priority={!over && !finale && arena.revealFirstPlayerId === playerId}/>
      <div className={`clash-turn-track ${gameState.turn === arena.totalTurns ? 'is-final-turn' : ''}`} aria-label={`Turn ${gameState.turn} of ${arena.totalTurns}`}><span>Turn <b>{gameState.turn}</b> / {arena.totalTurns}</span><div>{Array.from({ length: arena.totalTurns }, (_, i) => <i key={i} className={i + 1 === gameState.turn ? 'current' : i + 1 < gameState.turn ? 'complete' : ''} />)}</div></div>
      <ArenaPlayerProfile player={opponent} priority={!over && !finale && arena.revealFirstPlayerId === opponent.id}/>
      <span className="sr-only" role="status">{over ? 'Match complete' : finale ? 'Final scores' : arena.revealFirstPlayerId === playerId ? 'You reveal first this turn.' : `${opponent.displayName || 'Opponent'} reveals first this turn.`}</span>
    </header>
    <section className="clash-locations" aria-label="Three arenas"><div className="clash-lanes">
      {arena.locations.map(location => {
        const scoreLocation = frame?.scoreSnapshot?.[location.index] ?? location
        const mine = getArenaLocationPower(scoreLocation, playerId)
        const theirs = getArenaLocationPower(scoreLocation, opponent.id)
        const active = event?.locationIndex === location.index
        const verdict = arenaVerdict(location, playerId, opponent.id)
        const scoreFocus = frame?.phase === 'score-focus' && frame.focusIndex === location.index
        const scoreMarked = finale && (frame?.phase === 'score-summary' || location.index <= (frame?.focusIndex ?? -1))
        const legal = canPlace(location)
        const controlChange = frame?.phase === 'effect' ? frame.controlChanges?.find(change => change.locationIndex === location.index) : undefined
        const scoreChanged = (id: string) => frame?.scores.some(score => score.locationIndex === location.index && score.playerId === id)
        return <article key={location.index} className={`clash-location theme-${location.rule ?? 'unknown'} ${legal ? 'can-place' : dragging && editable ? 'cannot-place' : ''} ${dropIndex === location.index ? 'is-drop-target' : ''} ${scoreFocus ? 'is-score-focus' : ''} ${scoreMarked ? 'is-score-marked' : ''} verdict-${verdict} fx-${effectTheme}`} aria-label={location.name} data-arena-index={location.index}>
          <ArenaAtmosphere rule={location.revealed ? location.rule : undefined} paused={!pageVisible || isRevealing || over || Boolean(cardPreview || locationPreview || dragging)}/>
          {cardsAt(location, opponent.id)}
          <div className="clash-site-info">
            <strong className={`clash-site-score their-score ${controlChange?.to === opponent.id ? 'control-gained' : ''} ${theirs > mine ? 'is-leading' : ''} ${scoreChanged(opponent.id) ? 'score-changing' : ''}`} aria-label={`${location.name}: opponent ${theirs} power, ${theirs > mine ? 'leading' : theirs < mine ? 'behind' : 'tied'}`}><span key={`${frame?.id}:${theirs}`}>{theirs}</span></strong>
            <button className="clash-site-tile" disabled={isRevealing} onClick={() => setLocationPreview(location)} aria-label={`View ${location.name} rules`}>
              {location.rule ? <img className="clash-location-art" src={UI_ASSETS.locations[location.rule]} alt="" draggable={false} /> : <span className="clash-uncharted-symbol" aria-hidden="true">◇</span>}
              <span className="clash-location-art-shade" />
              <span className="clash-site-copy"><h2>{location.name}</h2><span>{location.rule ? SHORT_RULES[location.rule] : `Reveals on turn ${location.revealTurn}`}</span></span>
              {scoreMarked && <span className="clash-score-verdict" key={`verdict:${location.index}`} role={scoreFocus ? 'status' : undefined}>{verdict === 'won' ? '✓ Won' : verdict === 'lost' ? '× Lost' : '− Tied'}</span>}
              <ArenaFrame />
              {active && frame?.phase === 'effect' && <span key={frame.id} className="clash-site-impact" aria-hidden="true" />}
              {active && frame?.phase === 'effect' && event?.kind === 'location-effect' && <span key={`${frame.id}:location-label`} className="clash-location-effect-label" role="status">{effectLabel}</span>}
            </button>
            <strong className={`clash-site-score your-score ${controlChange?.to === playerId ? 'control-gained' : ''} ${mine > theirs ? 'is-leading' : ''} ${scoreChanged(playerId) ? 'score-changing' : ''}`} aria-label={`${location.name}: you ${mine} power, ${mine > theirs ? 'leading' : mine < theirs ? 'behind' : 'tied'}`}><span key={`${frame?.id}:${mine}`}>{mine}</span></strong>
            {frame?.scores.filter(score => score.locationIndex === location.index).map(score => <span key={`${frame.id}:${score.playerId}`} className={`clash-score-delta ${score.playerId === playerId ? 'your-score' : 'their-score'} ${score.delta < 0 ? 'is-negative' : ''}`} aria-hidden="true">{score.delta > 0 ? '+' : '−'}{Math.abs(score.delta)}</span>)}
            {active && event?.card?.type === 'spell' && !event.returnToHand && <div key={event.id} className={`clash-spell-reveal ${frame?.phase === 'effect' ? 'is-casting' : ''} ${event.playerId === playerId ? 'is-yours' : 'is-theirs'}`} aria-label={`${event.card.name} is being cast`} data-effect-source={event.card.instanceId}><ArenaCardFace card={event.card} variant="hand" />{frame?.phase === 'effect' && <><RevealBurst family={effectTheme}/>{effectLabel && <span className="clash-ability-pop">{effectLabel}</span>}</>}</div>}
          </div>
          {cardsAt(location, playerId)}
        </article>
      })}
    </div></section>
    <section className="clash-hand-area" data-card-hand aria-label="Your hand and card details">
      {/* Preserve the hand's space while the result is shown above the board. */}
      <div className="clash-hand-content" inert={over || finale || frame?.nextTurn?.turn === 1} aria-hidden={over || finale || frame?.nextTurn?.turn === 1 || undefined}>
      <div className="clash-hand-heading"><span>{hand.length - plan.length} in hand · {me.deckCount} in deck</span><span className="clash-hand-count">{arena.transmutesPending ? `Transmute next ${arena.transmutesPending}` : 'Your hand'}</span></div>
      <div className="clash-hand" style={{ '--hand-count': hand.length } as CSSProperties}>{hand.map(card => {
        const queued = plan.some(play => play.cardInstanceId === card.instanceId)
        const affordable = queued || card.cost <= available
        return <button key={card.instanceId} data-hand-card-id={card.instanceId} className={`clash-hand-card ${dragging?.instanceId === card.instanceId ? 'is-picked-up' : ''} ${queued ? 'queued-in-hand' : ''} ${!affordable ? 'unaffordable' : editable && !queued ? 'is-playable' : ''}`}
          aria-label={`Inspect ${card.name}, ${queued ? 'queued, ' : ''}${card.cost} aether, ${card.type === 'relic' ? 'relic' : card.type === 'spell' ? 'spell' : `${card.power + card.powerBonus} power`}`}
          aria-describedby="clash-keyboard-play-help" data-can-drag={editable || undefined} {...cardDrag.bind(card.instanceId)} draggable={false} onDragStart={event => event.preventDefault()}
          {...cardDetails(card.instanceId)}
          onKeyDown={event => {
            if (event.key === 'ArrowUp' && editable && !keyboardDrag) {
              event.preventDefault(); event.stopPropagation(); startKeyboardDrag(card)
            }
          }}
          onClick={event => inspect(card, event.detail)}>
          <ArenaCardFace card={card} variant="hand" /><span className="clash-draw-back" aria-hidden="true" style={{ backgroundImage: `url(${UI_ASSETS.cardBack})` }} />{queued && <span className="clash-hand-queued-label">Queued</span>}
        </button>
      })}{hand.length === 0 && <p className="clash-empty-hand">No cards left. End the turn to continue.</p>}</div>
      {plan.some(play => hand.find(card => card.instanceId === play.cardInstanceId)?.type === 'spell') && <div className="clash-queued-spells" aria-label="Queued spells">{plan.map((play, index) => {
        const card = hand.find(card => card.instanceId === play.cardInstanceId)
        return card?.type === 'spell' ? <button key={card.instanceId} disabled={!editable} onClick={() => remove(card.instanceId)}>{index + 1}. {card.name} → {arena.locations[play.locationIndex].name} {editable ? '×' : '✓'}</button> : null
      })}</div>}
      </div>
      <div className={`clash-card-detail ${showAbility ? 'is-card-ability' : ''}`} aria-live="polite" style={{ visibility: frame?.phase === 'turn-intro' || finale || over && !showAbility ? 'hidden' : undefined }}>
        {showAbility && detailCard ? <div className="clash-ability-description"><b>{detailCard.name}</b><span>{detailCard.description || 'No ability.'}</span></div>
        : isDrawing ? <><b>{gameState.turn === 1 && !isRevealing ? 'Drawing opening hand' : 'Drawing cards'}</b><span>{isRevealing ? event?.card?.name : 'Cards arriving…'}</span></>
        : isRevealing ? <><b>{event?.card?.name ?? (event?.kind === 'location' ? 'Arena revealed' : 'Resolving turn')}</b><span>{frame?.phase === 'effect' ? effectLabel || 'Power settles across the arena.' : 'Revealing cards…'}</span></>
        : dragging ? <><b>{dragging.name}</b><span>{keyboardDrag ? `${arena.locations[keyboardDrag.index].name}${dragging.type !== 'spell' ? ` · Position ${keyboardDrag.slotIndex + 1}` : ''} · ← → position · ↑ ↓ arena · Enter to drop` : dropIndex !== undefined ? canPlace(arena.locations[dropIndex], dropSlot) ? `Release at ${arena.locations[dropIndex].name}${dragging.type !== 'spell' && dropSlot !== undefined ? `, position ${dropSlot + 1}` : ''}.` : 'That position is unavailable.' : 'Drag onto your formation. Release outside to cancel.'}</span></>
        : <><b>{locked ? 'Cards locked in' : 'Your hand'}</b><span>{locked ? `Waiting for ${opponent.displayName}. Tap a card to inspect it.` : 'Tap to inspect. Drag to an empty position to play.'}</span></>}
      </div>
      {frame?.phase === 'score-summary' && <ArenaScoreSummary state={gameState} playerId={playerId} opponentId={opponent.id} />}
    </section>
    {(error || localError) && <p className="clash-error" role="alert">{error ?? localError}</p>}
    <footer className="clash-footer"><div className="clash-footer-tools"><div className="clash-energy" inert={over} aria-hidden={over || undefined} aria-label={`${available} aether available`}><span className="clash-energy-shards" aria-hidden="true">{Array.from({ length: Math.max(arena.totalTurns, arena.energy) }, (_, index) => <i key={index} className={index < available ? 'is-available' : index < arena.energy ? 'is-spent' : 'is-locked'} />)}</span><b aria-hidden="true">{available}</b></div><MusicControls compact/></div>
      <div className="clash-actions" inert={over} aria-hidden={over || undefined}><button className="clash-text-button clash-retreat" disabled={isRevealing} onClick={onSurrender}>Retreat</button><button className="ae-button clash-button" disabled={!editable || !draft.length} onClick={() => { setDraft(current => current.slice(0, -1)); setLocalError(null) }}>Undo</button><button className="ae-button ae-button-primary clash-lock-button" disabled={!editable} onClick={() => onCommit({ turn: gameState.turn, plays: draft })}>{frame?.phase === 'turn-intro' ? frame.nextTurn?.turn === 1 ? 'Starting…' : 'Next turn…' : finale ? 'Resolving match…' : isRevealing ? 'Revealing…' : isDrawing ? 'Drawing…' : locked ? 'Locked in ✓' : !canAct ? 'Sending…' : draft.length ? 'Lock in turn' : 'End turn'}</button></div>
      {over && <button className="ae-button ae-button-primary clash-lock-button clash-result-trigger" onClick={() => setResultDismissed(false)}>View result</button>}
    </footer>
    {over && !resultDismissed && <ArenaResultScreen state={gameState} playerId={playerId} opponentId={opponent.id} receipt={masteryReward} onClose={() => setResultDismissed(true)} onExit={onExit}/>}
    {locationPreview && <ArenaLocationDialog location={locationPreview} onClose={() => setLocationPreview(null)} />}
    {cardPreview && <ArenaCardDialog inMatch card={cardPreview} scoreContribution={inspectedMirrorScore} onClose={() => setCardPreview(null)} onReturnToHand={editable && draft.some(play => play.cardInstanceId === cardPreview.instanceId) ? () => { remove(cardPreview.instanceId); setCardPreview(null) } : undefined}/>}
    {frame?.phase === 'turn-intro' && frame.nextTurn && <ArenaTurnAnnouncement key={frame.id} {...frame.nextTurn} />}
    <ArenaEffectLinks frame={frame} board={boardRef} reducedMotion={reducedMotion}/>
    {cardDrag.drag && dragging && createPortal(<div className={`clash-drag-preview ${dropIndex !== undefined ? canPlace(arena.locations[dropIndex], dropSlot) ? 'can-drop' : 'cannot-drop' : ''}`} aria-hidden="true" style={{ width: cardDrag.drag.width, transform: `translate3d(${cardDrag.drag.left}px,${cardDrag.drag.top}px,0)` }}><ArenaCardFace card={dragging} variant="hand"/></div>, document.body)}
  </main>
}
