import { useId, useState } from 'react'
import type { Card, GameState, HexCoord } from '@tcg/shared'
import { coordToKey, getAllHexCoords, getHexCaptures, getHexValues, hexToPixel } from '@tcg/shared'
import { CardMedia } from './CardMedia.tsx'
import { cn } from '../../lib/cn.ts'
import './HexBoard.css'
import { UI_ASSETS } from '../../lib/uiAssets.ts'

interface HexBoardProps {
  gameState: GameState
  myPlayerId: string
  myCards: Card[]
  opponentCardCount: number
  canAct: boolean
  onPlaceCard: (cardInstanceId: string, hexCoord: HexCoord) => void
}

const SIZE = 80
const COORDS = getAllHexCoords()
const POINTS = Array.from({ length: 6 }, (_, i) => {
  const angle = Math.PI / 6 + i * Math.PI / 3
  return `${SIZE * Math.cos(angle)},${SIZE * Math.sin(angle)}`
}).join(' ')
const SIDES = ['East', 'Northeast', 'Northwest', 'West', 'Southwest', 'Southeast']

function FaceValues({ card }: { card: Card }) {
  return <g className="hex-values" aria-hidden="true">
    {getHexValues(card).map((value, i) => {
      const angle = -i * Math.PI / 3
      const x = 52 * Math.cos(angle)
      const y = 52 * Math.sin(angle)
      return <g key={i} transform={`translate(${x} ${y})`}>
        <circle r="13" />
        <text textAnchor="middle" dominantBaseline="central">{value === 10 ? 'A' : value}</text>
      </g>
    })}
  </g>
}

export function HexBoard({ gameState, myPlayerId, myCards, opponentCardCount, canAct, onPlaceCard }: HexBoardProps) {
  const clipId = useId().replace(/:/g, '')
  const [selection, setSelection] = useState<{ cardId: string; turn: number } | null>(null)
  const [hoveredKey, setHoveredKey] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const selected = canAct && selection?.turn === gameState.turn
    ? myCards.find((card) => card.instanceId === selection.cardId) : undefined
  const board = gameState.hexBoard ?? {}
  const hoveredCoord = COORDS.find((coord) => coordToKey(coord) === hoveredKey)
  const captures = selected && hoveredCoord && !board[hoveredKey!]?.card
    ? getHexCaptures(board, myPlayerId, selected, hoveredCoord) : []

  const place = (coord: HexCoord, cardId = selected?.instanceId) => {
    if (!canAct || !cardId || board[coordToKey(coord)]?.card || !myCards.some((card) => card.instanceId === cardId)) return
    onPlaceCard(cardId, coord)
    setSelection(null)
    setHoveredKey(null)
    setDragging(false)
  }

  return <section className="hex-arena" aria-label="Hex Triple Triad board"
    onKeyDown={(event) => {
      if (event.key === 'Escape') { setSelection(null); setHoveredKey(null) }
    }}>
    <aside className="hex-opponent" aria-label={`Opponent hand: ${opponentCardCount} cards`}>
      <p className="arena-label">Opponent's hand <span>{opponentCardCount}</span></p>
      <div className="hex-card-backs" aria-hidden="true">
        {Array.from({ length: opponentCardCount }, (_, i) => <div className="hex-card-back" key={i}><img src={UI_ASSETS.cardBack} alt="" draggable={false} /></div>)}
      </div>
      <p className="hex-rail-note">Cards stay hidden until played.</p>
    </aside>

    <div className="hex-battlefield">
      <svg className="hex-grid" viewBox="-378 -336 756 672" aria-label="19-cell battlefield">
        <defs>
          <clipPath id={clipId}><polygon points={POINTS} /></clipPath>
          <radialGradient id={`${clipId}-empty`}><stop stopColor="#302b24" /><stop offset="1" stopColor="#1a1918" /></radialGradient>
          <linearGradient id={`${clipId}-shade`} x2="0" y2="1"><stop stopColor="#090b0d" stopOpacity=".1" /><stop offset="1" stopColor="#090b0d" stopOpacity=".82" /></linearGradient>
        </defs>
        {COORDS.map((coord) => {
          const key = coordToKey(coord)
          const cell = board[key]
          const card = cell?.card
          const mine = cell?.ownerId === myPlayerId
          const enabled = Boolean(canAct && selected && !card)
          const { x, y } = hexToPixel(coord, SIZE + 3)
          const label = card
            ? `${card.name}, ${mine ? 'your control' : 'opponent control'}, ${SIDES.map((side, i) => `${side} ${getHexValues(card)[i]}`).join(', ')}`
            : `Empty hex ${key}`
          return <g key={key} transform={`translate(${x} ${y})`}
            role="button" aria-label={label} aria-disabled={!enabled}
            tabIndex={enabled ? 0 : -1}
            className={cn('hex-cell', card && (mine ? 'is-mine' : 'is-opponent'), enabled && 'is-playable', hoveredKey === key && enabled && 'is-hovered', captures.includes(key) && 'will-capture')}
            onClick={() => place(coord)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); place(coord) }
            }}
            onMouseEnter={() => setHoveredKey(key)} onMouseLeave={() => setHoveredKey(null)}
            onFocus={() => setHoveredKey(key)} onBlur={() => setHoveredKey(null)}
            onDragOver={(event) => {
              if (!enabled) return
              event.preventDefault()
              event.dataTransfer.dropEffect = 'move'
              setHoveredKey(key)
            }}
            onDragLeave={() => setHoveredKey(null)}
            onDrop={(event) => {
              event.preventDefault()
              place(coord, event.dataTransfer.getData('text/plain'))
            }}>
            <title>{label}</title>
            <polygon className="hex-surface" points={POINTS} fill={`url(#${clipId}-empty)`} />
            {card ? <g clipPath={`url(#${clipId})`} pointerEvents="none">
              {card.imageUrl && <image href={card.imageUrl} x="-80" y="-80" width="160" height="160" preserveAspectRatio="xMidYMin slice" />}
              <polygon points={POINTS} fill={`url(#${clipId}-shade)`} />
              <FaceValues card={card} />
              <text className="hex-owner-mark" textAnchor="middle" y="5">{mine ? '◆' : '◇'}</text>
            </g> : <g className="hex-empty-label" pointerEvents="none" aria-hidden="true">
              <text textAnchor="middle" dominantBaseline="central">{enabled ? '+' : '✧'}</text>
            </g>}
            <polygon className="hex-outline" points={POINTS} fill="none" pointerEvents="none" />
          </g>
        })}
      </svg>
      <div className="hex-placement-hint" role="status">
        {selected ? <><strong>{selected.name}</strong><span>{captures.length ? `${captures.length} capture${captures.length === 1 ? '' : 's'} including chains` : 'Choose an empty hex · Esc to cancel'}</span></>
          : <><strong>{canAct ? 'Choose your next move' : gameState.phase === 'game_over' ? 'Battle complete' : 'Opponent is thinking'}</strong><span>{canAct ? 'Select a card, then a hex. You can also drag it.' : 'Higher facing values capture. Equal values hold.'}</span></>}
      </div>
    </div>

    <aside className="hex-player" aria-label="Your hand">
      <p className="arena-label">Your hand <span>{myCards.length}</span></p>
      <div className="hex-hand">
        {myCards.map((card) => <button type="button" key={card.instanceId}
          className={cn('hex-hand-card', selected?.instanceId === card.instanceId && 'is-selected', dragging && selected?.instanceId === card.instanceId && 'is-dragging')}
          aria-label={`Select ${card.name}`} aria-pressed={selected?.instanceId === card.instanceId}
          title={`${card.name} — ${SIDES.map((side, i) => `${side}: ${getHexValues(card)[i]}`).join(' · ')}`}
          disabled={!canAct} draggable={canAct}
          onClick={() => setSelection(selected?.instanceId === card.instanceId ? null : { cardId: card.instanceId, turn: gameState.turn })}
          onDragStart={(event) => {
            if (!canAct) { event.preventDefault(); return }
            event.dataTransfer.effectAllowed = 'move'
            event.dataTransfer.setData('text/plain', card.instanceId)
            setSelection({ cardId: card.instanceId, turn: gameState.turn })
            setDragging(true)
          }}
          onDragEnd={() => { setDragging(false); setHoveredKey(null) }}>
          <div className="hex-hand-art">
            <CardMedia card={card} className="hex-hand-image" objectPosition="top" />
            <svg viewBox="-80 -80 160 160" className="hex-hand-values"><FaceValues card={card} /></svg>
          </div>
          <span className="hex-hand-name">{card.name}</span>
        </button>)}
        {myCards.length === 0 && <p className="hex-rail-note">All cards played.</p>}
      </div>
      <p className="hex-rail-note">A = 10 · ◆ your control · ◇ opponent</p>
    </aside>
  </section>
}
