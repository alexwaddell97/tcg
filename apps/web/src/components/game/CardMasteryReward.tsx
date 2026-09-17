import { ARENA_CARD_DATABASE, CARD_BORDERS } from '@tcg/shared'
import type { MasteryReceipt } from '../../stores/useCardMasteryStore.ts'
import './CardMastery.css'

export default function CardMasteryReward({ receipt }: { receipt?: MasteryReceipt | null }) {
  if (!receipt?.cards.length) return null
  const total = receipt.cards.reduce((sum, card) => sum + card.xp, 0)
  const unlocks = receipt.cards.reduce((sum, card) => sum + card.unlocked.length, 0)
  return <details className="ae-mastery-reward">
    <summary><strong>{total ? `+${total} card XP` : 'Cards mastered'}</strong>{unlocks > 0 && ` · ${unlocks} new border${unlocks === 1 ? '' : 's'}`}<small>Card mastery · View rewards</small></summary>
    <ul>{receipt.cards.map(card => <li key={card.definitionId}>{ARENA_CARD_DATABASE.find(def => def.definitionId === card.definitionId)?.name}
      <span>{card.xp ? `+${card.xp} XP` : 'Max level'}{card.unlocked.map(id => ` · ${CARD_BORDERS.find(border => border.id === id)!.name}`).join('')}</span>
    </li>)}</ul>
  </details>
}
