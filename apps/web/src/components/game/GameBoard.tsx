import { useState } from 'react'
import type { Card, GameState, LaneState } from '@tcg/shared'
import { Sword } from '@phosphor-icons/react'
import { cn } from '../../lib/cn.ts'
import { useGameStore } from '../../stores/useGameStore.ts'
import CardViewer from './CardViewer.tsx'
import { CardMedia } from './CardMedia.tsx'

interface GameBoardProps {
  gameState: GameState
  myPlayerId: string
  selectedCardId: string | null
  onLaneClick: (laneIndex: 0 | 1, slotIndex: number) => void
  onLaneDrop: (laneIndex: 0 | 1, slotIndex: number, cardInstanceId: string) => void
}

const SLOTS = 6

const rarityBorder: Record<string, string> = {
  common:    'border-stone-500',
  uncommon:  'border-emerald-500',
  rare:      'border-blue-400',
  legendary: 'border-amber-400',
}

// Thematic background gradients keyed by location definitionId
const locationBackground: Record<string, string> = {
  the_forge:     'radial-gradient(ellipse at bottom, #7c2d12 0%, #431407 50%, #0c0402 100%)',
  the_summit:    'radial-gradient(ellipse at top, #bfdbfe 0%, #1e3a5f 40%, #0b1220 100%)',
  the_rift:      'radial-gradient(ellipse at center, #6d28d9 0%, #2e1065 50%, #0a0518 100%)',
  the_graveyard: 'radial-gradient(ellipse at bottom, #374151 0%, #111827 50%, #030507 100%)',
  the_sanctum:   'radial-gradient(ellipse at top, #fef08a 0%, #ca8a04 30%, #0f172a 100%)',
  the_frontier:  'radial-gradient(ellipse at center, #166534 0%, #14532d 40%, #071a0f 100%)',
  the_archive:   'radial-gradient(ellipse at top, #312e81 0%, #1e1b4b 50%, #0a0820 100%)',
  the_void:      'radial-gradient(ellipse at center, #1a0030 0%, #0a0014 50%, #000000 100%)',
}

function BoardCard({ card, onInspect }: { card: Card; onInspect?: () => void }) {
  const totalPower = card.power + (card.powerBonus ?? 0)
  const hasPowerBonus = (card.powerBonus ?? 0) !== 0

  return (
    <div
      className={cn(
        'relative rounded border-2 overflow-hidden w-full aspect-2/3 cursor-pointer transition-all duration-150 hover:brightness-110',
        rarityBorder[card.rarity] ?? 'border-stone-500',
        card.isTransformed && 'ring-1 ring-amber-400',
      )}
      onClick={onInspect}
    >
      <div className="absolute inset-0 bg-stone-950">
        {card.imageUrl
          ? <CardMedia card={card} className="w-full h-full object-cover" objectPosition="top" />
          : <span className="absolute inset-0 flex items-center justify-center text-xl opacity-20">⚔️</span>
        }
      </div>

      {/* Bottom fade */}
      <div className="absolute bottom-0 inset-x-0 h-8 bg-linear-to-t from-black/80 to-transparent pointer-events-none" />

      {/* Power badge */}
      {card.type !== 'spell' && (
        <div className={cn(
          'absolute bottom-0.5 left-1/2 -translate-x-1/2 z-20 flex items-center gap-px px-1 py-px rounded-xs font-black text-[9px] sm:text-[10px] font-ui border whitespace-nowrap',
          hasPowerBonus
            ? 'bg-emerald-950/90 border-emerald-500/60 text-emerald-300'
            : 'bg-stone-950/90 border-stone-600/60 text-amber-200'
        )}>
          <Sword size={7} weight="fill" className="shrink-0" />{totalPower}
        </div>
      )}

      {card.isTransformed && (
        <div className="absolute top-0.5 right-0.5 w-2.5 h-2.5 rounded-full bg-amber-400 text-[7px] flex items-center justify-center text-stone-950 font-bold">❆</div>
      )}
    </div>
  )
}

function SlotGrid({ placed, side, isTarget, cols = 3, onSlotClick, onSlotDrop, onCardInspect }: {
  placed: { card: Card; slotIndex: number }[]
  side: 'mine' | 'opponent'
  isTarget: boolean
  cols?: 3 | 6
  onSlotClick?: (slotIndex: number) => void
  onSlotDrop?: (slotIndex: number, cardInstanceId: string) => void
  onCardInspect?: (card: Card) => void
}) {
  const [dragOverSlot, setDragOverSlot] = useState<number | null>(null)
  const isDragging = useGameStore((s) => s.isDragging)

  return (
    <div className={cn('grid gap-0.5 p-1', cols === 6 ? 'grid-cols-6' : 'grid-cols-3 sm:gap-1 sm:p-2')}>
      {Array.from({ length: SLOTS }).map((_, i) => {
        const lookupIndex = side === 'opponent' ? (i + 3) % SLOTS : i
        const item = placed.find(p => p.slotIndex === lookupIndex)
        if (item) {
          return (
            <BoardCard
              key={item.card.instanceId}
              card={item.card}
              onInspect={onCardInspect ? () => onCardInspect(item.card) : undefined}
            />
          )
        }
        const clickable = isTarget && side === 'mine' && onSlotClick
        const droppable = side === 'mine' && onSlotDrop
        const isDraggedOver = dragOverSlot === i
        return (
          <div
            key={i}
            onClick={clickable ? () => onSlotClick(i) : undefined}
            onDragOver={droppable ? (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setDragOverSlot(i) } : undefined}
            onDragEnter={droppable ? (e) => { e.preventDefault(); setDragOverSlot(i) } : undefined}
            onDragLeave={droppable ? () => setDragOverSlot(null) : undefined}
            onDrop={droppable ? (e) => {
              e.preventDefault()
              setDragOverSlot(null)
              const cardInstanceId = e.dataTransfer.getData('text/plain')
              if (cardInstanceId) onSlotDrop(i, cardInstanceId)
            } : undefined}
            className={cn(
              'rounded border border-dashed w-full aspect-2/3 transition-all duration-150',
              isDraggedOver && droppable
                ? 'border-amber-400 bg-amber-400/30 scale-105 shadow-amber-400/30'
                : isDragging && droppable
                  ? 'border-emerald-400/80 bg-emerald-400/10 animate-pulse'
                  : clickable
                    ? 'border-amber-400/70 bg-amber-400/10 cursor-pointer hover:bg-amber-400/20 hover:border-amber-400'
                    : isTarget && side === 'mine'
                      ? 'border-amber-400/30 bg-amber-400/5'
                      : side === 'mine'
                        ? 'border-emerald-900/30'
                        : 'border-red-900/30'
            )}
          />
        )
      })}
    </div>
  )
}

function LaneZone({
  lane,
  laneIndex,
  myPlayerId,
  isTarget,
  onSlotClick,
  onSlotDrop,
}: {
  lane: LaneState
  laneIndex: 0 | 1
  myPlayerId: string
  isTarget: boolean
  onSlotClick: (slotIndex: number) => void
  onSlotDrop: (slotIndex: number, cardInstanceId: string) => void
}) {
  const opponentId = Object.keys(lane.halves).find(id => id !== myPlayerId)
  const myHalf = lane.halves[myPlayerId]
  const oppHalf = opponentId ? lane.halves[opponentId] : undefined
  const [viewingCard, setViewingCard] = useState<Card | null>(null)

  const myPower = myHalf?.power ?? 0
  const oppPower = oppHalf?.power ?? 0
  const iWinning = myPower > oppPower
  const theyWinning = oppPower > myPower

  const myBg = myHalf ? locationBackground[myHalf.definitionId] : undefined
  const oppBg = oppHalf ? locationBackground[oppHalf.definitionId] : undefined

  return (
    <>
      <div
        className={cn(
          'flex flex-col rounded-xl border-2 overflow-hidden transition-all w-full',
          isTarget ? 'border-amber-400 shadow-lg shadow-amber-400/20' : 'border-stone-700/60'
        )}
        style={{ background: '#0d0b09' }}
      >
        {/* ── Opponent half ── */}
        <div
          className="flex-1 flex flex-col border-b border-stone-800/60 relative bg-red-950/15"
          style={oppBg ? { backgroundImage: oppBg } : undefined}
        >
          <div className="flex items-center justify-between px-2 pt-1.5">
            <div className="flex flex-col">
              <p className="text-red-700/70 text-[10px] uppercase tracking-widest font-bold">Opp</p>
              {oppHalf && <p className="text-stone-400 text-[9px] leading-tight">{oppHalf.name}</p>}
            </div>
            {oppHalf && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-px rounded-xs font-black text-xs font-ui bg-stone-950/80 border border-red-900/60 text-red-400">
                <Sword size={8} weight="fill" className="shrink-0" />{oppPower}
              </span>
            )}
          </div>
          {oppHalf && (
            <SlotGrid placed={oppHalf.placed} side="opponent" isTarget={false} onCardInspect={setViewingCard} />
          )}
        </div>

        {/* ── Lane centre bar: my half info + VS scores ── */}
        <div className="shrink-0 flex items-center justify-between px-2 py-1 bg-black/40 border-b border-stone-800/40 gap-2">
          <div className="flex-1 min-w-0">
            {myHalf && (
              <>
                <p className="text-amber-100 font-bold text-xs sm:text-sm leading-tight truncate">{myHalf.name}</p>
                <p className="text-stone-500 text-[9px] leading-tight line-clamp-2">{myHalf.effect.description}</p>
              </>
            )}
          </div>
          <div className="shrink-0 flex flex-col items-center gap-0.5">
            <span className={cn(
              'text-base font-black tabular-nums leading-none',
              theyWinning ? 'text-red-400' : 'text-stone-700'
            )}>{oppPower}</span>
            <span className="text-stone-700 text-[8px] uppercase font-bold">vs</span>
            <span className={cn(
              'text-base font-black tabular-nums leading-none',
              iWinning ? 'text-emerald-400' : 'text-stone-700'
            )}>{myPower}</span>
          </div>
        </div>

        {/* ── My half ── */}
        <div
          className="flex-1 flex flex-col relative bg-emerald-950/10"
          style={myBg ? { backgroundImage: myBg } : undefined}
        >
          <div className="flex items-center justify-between px-2 pt-1.5">
            <p className="text-emerald-700/70 text-[10px] uppercase tracking-widest font-bold">You</p>
            {myHalf && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-px rounded-xs font-black text-xs font-ui bg-stone-950/80 border border-emerald-900/60 text-emerald-400">
                <Sword size={8} weight="fill" className="shrink-0" />{myPower}
              </span>
            )}
          </div>
          {myHalf && (
            <SlotGrid
              placed={myHalf.placed}
              side="mine"
              isTarget={isTarget}
              onSlotClick={onSlotClick}
              onSlotDrop={onSlotDrop}
              onCardInspect={setViewingCard}
            />
          )}
        </div>
      </div>

      <CardViewer card={viewingCard} onClose={() => setViewingCard(null)} />
    </>
  )
}

export default function GameBoard({ gameState, myPlayerId, selectedCardId, onLaneClick, onLaneDrop }: GameBoardProps) {
  const canTarget = selectedCardId !== null && gameState.phase === 'planning'

  return (
    <div
      className="w-full h-full flex flex-col justify-center gap-2 p-1.5 sm:p-2 overflow-hidden rounded-xl sm:rounded-2xl border border-stone-800/50"
      style={{ background: '#111009' }}
    >
      {/* 2-column grid: Lane 0 | Lane 1 */}
      <div className="grid grid-cols-2 gap-1.5 sm:gap-2 h-full">
        {gameState.lanes.map((lane) => {
          const li = lane.laneIndex
          return (
            <LaneZone
              key={li}
              lane={lane}
              laneIndex={li}
              myPlayerId={myPlayerId}
              isTarget={canTarget}
              onSlotClick={(slotIndex) => onLaneClick(li, slotIndex)}
              onSlotDrop={(slotIndex, cardInstanceId) => onLaneDrop(li, slotIndex, cardInstanceId)}
            />
          )
        })}
      </div>
    </div>
  )
}
