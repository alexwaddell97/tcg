import type { Card } from '@tcg/shared'
import { useGameStore } from '../../stores/useGameStore.ts'
import CardComponent from './Card.tsx'

interface PlayerHandProps {
  cards: Card[]
  isMyTurn: boolean
  playerMana: number
  onPlayCard: (cardInstanceId: string) => void
}

export default function PlayerHand({ cards, isMyTurn, playerMana, onPlayCard }: PlayerHandProps) {
  const selectedCardId = useGameStore((s) => s.selectedCardId)
  const selectCard = useGameStore((s) => s.selectCard)

  const handleCardClick = (card: Card) => {
    if (!isMyTurn) return
    if (selectedCardId === card.id) {
      onPlayCard(card.id)
      selectCard(null)
    } else {
      selectCard(card.id)
    }
  }

  if (cards.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-slate-600 text-sm">
        No cards in hand
      </div>
    )
  }

  return (
    <div className="flex items-end gap-2 overflow-x-auto pb-2 px-1" style={{ touchAction: 'pan-x' }}>
      {cards.map((card) => (
        <div key={card.id} className="flex-shrink-0 w-28 md:w-32 lg:w-36">
          <CardComponent
            card={card}
            isSelected={selectedCardId === card.id}
            isPlayable={isMyTurn && playerMana >= card.cost}
            onClick={() => handleCardClick(card)}
          />
        </div>
      ))}
    </div>
  )
}
