import React, { useMemo, useState } from 'react'
import type { Card, GameState } from '@tcg/shared'
import { UI_ASSETS } from '../../lib/uiAssets.ts'

// Minimal props for now; expand as needed
type GameBoardProps = {
	gameState?: GameState | null
	myPlayerId?: string
	myCards?: Card[]
	opponentCardCount?: number
	canAct?: boolean
	onPlaceCard?: (cardInstanceId: string, cellIndex: number) => void
	children?: React.ReactNode
}

function SideHand({
	entries,
	isOpponent = false,
	className,
}: {
	entries: Array<Card | boolean | undefined>
	isOpponent?: boolean
	className?: string
}) {
	const topRow = entries.slice(0, 3)
	const bottomRow = entries.slice(3, 5)
	const slotWidthClass = 'w-[31%] min-w-[68px] max-w-[96px] sm:min-w-[78px] sm:max-w-[108px] lg:min-w-[96px] lg:max-w-[124px]'

	const renderSlot = (entry: Card | boolean | undefined, key: string) => {
		if (isOpponent) {
			return Boolean(entry)
				? <RailSlot key={key} back />
				: <RailSlot key={key} hidden />
		}

		return <RailSlot key={key} card={entry as Card | undefined} />
	}

	return (
		<div className={`shrink-0 w-full max-w-[420px] lg:w-[40vw] lg:min-w-[190px] lg:max-w-[360px] ${className ?? ''}`}>
			<div className="flex flex-col gap-1 sm:gap-1.5">
				<div className="flex justify-center gap-1 sm:gap-1.5">
					{topRow.map((entry, i) => (
						<div key={`top-wrap-${i}`} className={slotWidthClass}>
							{renderSlot(entry, `top-${i}`)}
						</div>
					))}
				</div>
				<div className="flex justify-center gap-1 sm:gap-1.5">
					{bottomRow.map((entry, i) => (
						<div key={`bot-wrap-${i}`} className={slotWidthClass}>
							{renderSlot(entry, `bot-${i}`)}
						</div>
					))}
				</div>
			</div>
		</div>
	)
}

function RailSlot({ card, hidden, back }: { card?: Card; hidden?: boolean; back?: boolean }) {
	if (hidden) {
		return (
			<div className="w-full aspect-[2/3] rounded-xs border border-stone-700/50 bg-black/25" />
		)
	}

	if (back) {
		return (
			<div className="relative w-full aspect-[2/3] rounded-xs overflow-hidden border border-stone-600/80 bg-stone-900">
                <img src={UI_ASSETS.cardBack} alt="Card back" draggable={false} className="w-full h-full object-cover" />
			</div>
		)
	}

	if (!card) {
		return (
			<div className="w-full aspect-[2/3] rounded-xs border border-dashed border-stone-700/60 bg-black/20" />
		)
	}

	return (
		<div className="relative w-full aspect-[2/3] rounded-xs overflow-hidden border border-stone-600/70 bg-stone-950">
			{card.imageUrl ? (
				<img src={card.imageUrl} alt={card.name} draggable={false} className="w-full h-full object-cover" style={{ objectPosition: 'top' }} />
			) : (
				<div className="absolute inset-0 flex items-center justify-center text-stone-500 text-xl">✦</div>
			)}
			<div className="absolute inset-0 bg-linear-to-t from-black/60 via-transparent to-black/20" />
		</div>
	)
}

function BoardPlacedCard({ card, isMine }: { card: Card; isMine: boolean }) {
	return (
		<div
			className={`relative w-full h-full overflow-hidden ${isMine ? 'border-emerald-500/70' : 'border-rose-500/70'} border`}
		>
			{card.imageUrl ? (
				<img src={card.imageUrl} alt={card.name} draggable={false} className="w-full h-full object-cover" style={{ objectPosition: 'top' }} />
			) : (
				<div className="absolute inset-0 flex items-center justify-center text-stone-500 text-xl">✦</div>
			)}
			<div className="absolute inset-0 bg-linear-to-t from-black/65 via-transparent to-black/20" />
		</div>
	)
}

/**
 * Triple Triad style board: visually dominant, centered, with decorative background.
 * All other UI should be unobtrusive and secondary.
 */
export default function GameBoard({
	gameState,
	myPlayerId = '',
	myCards = [],
	opponentCardCount = 5,
	canAct = false,
	onPlaceCard,
	children,
}: GameBoardProps) {
	const myFive = Array.from({ length: 5 }, (_, i) => myCards[i])
	const oppFive = Array.from({ length: 5 }, (_, i) => i < opponentCardCount)
	const [selectedCardId, setSelectedCardId] = useState<string | null>(null)
	const [dragOverCell, setDragOverCell] = useState<number | null>(null)

	const boardCells = useMemo(() => {
		if (!gameState) return Array.from({ length: 9 }, () => null)
		return Array.from({ length: 9 }, (_, index) => gameState.board?.[index] ?? null)
	}, [gameState])

	const handleDrop = (cellIndex: number, cardInstanceId: string) => {
		if (!canAct || !onPlaceCard) return
		onPlaceCard(cardInstanceId, cellIndex)
		setSelectedCardId(null)
	}

	const handleCellClick = (cellIndex: number) => {
		if (!canAct || !selectedCardId || !onPlaceCard) return
		handleDrop(cellIndex, selectedCardId)
	}

	return (
		<div
			className="relative flex flex-col items-center justify-center min-h-screen w-full bg-gradient-to-br from-[#18181b] via-[#23272e] to-[#0b0b0e] overflow-hidden"
			style={{ zIndex: 1 }}
		>
			{/* Decorative board background */}
			<div className="absolute inset-0 pointer-events-none z-0">
				<div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(120,120,140,0.10),transparent_70%)]" />
				<div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_80%,rgba(59,130,246,0.08),transparent_70%)]" />
			</div>

			<div className="relative z-10 w-full max-w-8xl px-1 sm:px-3 flex flex-col lg:flex-row items-center justify-center gap-2 sm:gap-3 lg:gap-3">
				{/* Your 5 cards (left) */}
				<div className="order-3 lg:order-1 shrink-0 w-full max-w-[360px] sm:max-w-[400px] lg:w-[40vw] lg:min-w-[190px] lg:max-w-[360px]">
					<div className="flex flex-col gap-1 sm:gap-1.5">
						<div className="flex justify-center gap-1 sm:gap-1.5">
							{myFive.slice(0, 3).map((card, i) => {
								const isSelected = card?.instanceId === selectedCardId
								return (
									<div key={`top-wrap-${i}`} className="w-[31%] min-w-[68px] max-w-[96px] sm:min-w-[78px] sm:max-w-[108px] lg:min-w-[96px] lg:max-w-[124px]">
										<div
											onClick={() => card && canAct && setSelectedCardId(card.instanceId)}
											draggable={Boolean(card && canAct)}
											onDragStart={(e) => {
												if (!card) return
												e.dataTransfer.effectAllowed = 'move'
												e.dataTransfer.setData('text/plain', card.instanceId)
												setSelectedCardId(card.instanceId)
											}}
											className={isSelected ? 'ring-2 ring-amber-400 rounded-xs' : undefined}
										>
											<RailSlot card={card} />
										</div>
									</div>
								)
							})}
						</div>
						<div className="flex justify-center gap-1 sm:gap-1.5">
							{myFive.slice(3, 5).map((card, i) => {
								const isSelected = card?.instanceId === selectedCardId
								return (
									<div key={`bot-wrap-${i}`} className="w-[31%] min-w-[68px] max-w-[96px] sm:min-w-[78px] sm:max-w-[108px] lg:min-w-[96px] lg:max-w-[124px]">
										<div
											onClick={() => card && canAct && setSelectedCardId(card.instanceId)}
											draggable={Boolean(card && canAct)}
											onDragStart={(e) => {
												if (!card) return
												e.dataTransfer.effectAllowed = 'move'
												e.dataTransfer.setData('text/plain', card.instanceId)
												setSelectedCardId(card.instanceId)
											}}
											className={isSelected ? 'ring-2 ring-amber-400 rounded-xs' : undefined}
										>
											<RailSlot card={card} />
										</div>
									</div>
								)
							})}
						</div>
					</div>
				</div>

				{/* Main board grid */}
				<div
					className="order-2 relative grid grid-cols-3 grid-rows-3 gap-0 p-1.5 sm:p-2 lg:p-3 rounded-3xl shadow-2xl border-4 border-stone-700/40 bg-gradient-to-br from-[#23272e] via-[#18181b] to-[#0b0b0e] w-[min(94vw,62vh,460px)] lg:w-[min(62vw,54vh,460px)]"
					style={{
						aspectRatio: '2/3',
						boxSizing: 'border-box',
					}}
				>
					{boardCells.map((cell, i) => {
						if (cell) {
							return (
								<div key={i} className="flex items-center justify-center bg-black/35 rounded-none border border-stone-700/70 w-full h-full aspect-[2/3] shadow-inner overflow-hidden">
									<BoardPlacedCard card={cell.card} isMine={cell.ownerId === myPlayerId} />
								</div>
							)
						}

						const isOver = dragOverCell === i
						return (
							<button
								key={i}
								type="button"
								onClick={() => handleCellClick(i)}
								onDragOver={(e) => {
									e.preventDefault()
									if (!canAct) return
									e.dataTransfer.dropEffect = 'move'
									setDragOverCell(i)
								}}
								onDragLeave={() => setDragOverCell(null)}
								onDrop={(e) => {
									e.preventDefault()
									setDragOverCell(null)
									const cardInstanceId = e.dataTransfer.getData('text/plain')
									if (cardInstanceId) handleDrop(i, cardInstanceId)
								}}
								className={`flex items-center justify-center rounded-none border border-stone-700/70 w-full h-full aspect-[2/3] shadow-inner transition-colors ${
									isOver ? 'bg-amber-500/25' : 'bg-black/35'
								}`}
							>
								<span className="text-stone-600 text-lg font-semibold">{i + 1}</span>
							</button>
						)
					})}
				</div>

				{/* Opponent 5 cards (right) */}
				<SideHand entries={oppFive} isOpponent className="hidden lg:block order-1 lg:order-3" />
			</div>

			{/* Children for overlays or built-in UI */}
			{children}
		</div>
	)
}
