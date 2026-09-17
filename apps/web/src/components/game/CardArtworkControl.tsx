import { CARD_VARIANTS } from '@tcg/shared'
import type { CardDefinition } from '@tcg/shared'
import { useCollectionStore } from '../../stores/useCollectionStore.ts'
import './CardArtworkControl.css'

export default function CardArtworkControl({ card }: { card: CardDefinition }) {
  const owned = useCollectionStore(state => state.variants)
  const ownsCard = useCollectionStore(state => state.cards[card.definitionId] > 0)
  const equipped = useCollectionStore(state => state.equippedVariants[card.definitionId])
  const variants = CARD_VARIANTS.filter(variant => variant.definitionId === card.definitionId && owned[variant.id])
  if (!ownsCard || !variants.length) return null
  return <label className="ae-artwork-control">
    <span>Artwork</span>
    <select aria-label={`${card.name} artwork`} value={equipped ?? ''} onChange={event => useCollectionStore.getState().equipVariant(card.definitionId, event.target.value || undefined)} onKeyDown={event => event.stopPropagation()}>
      <option value="">Original</option>
      {variants.map(variant => <option key={variant.id} value={variant.id}>{variant.name}</option>)}
    </select>
  </label>
}
