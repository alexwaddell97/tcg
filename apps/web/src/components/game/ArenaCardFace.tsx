import type { Card, CardDefinition, CardBorderId } from '@tcg/shared'
import { applyCardVariant, getArenaRelicCounter, getEquippedCardBorder, isCardBorder } from '@tcg/shared'
import { useCardMasteryStore } from '../../stores/useCardMasteryStore.ts'
import { useCollectionStore } from '../../stores/useCollectionStore.ts'
import CardBorderFrame from './CardBorderFrame.tsx'
import { CardMedia } from './CardMedia.tsx'

export default function ArenaCardFace({ card, power = card.power + (card.powerBonus ?? 0), variant = 'full', borderOverride, artOverride }: {
  card: CardDefinition & Partial<Pick<Card, 'powerBonus' | 'arenaTransmuted' | 'cosmeticBorder' | 'arenaRelicCharge'>>
  borderOverride?: CardBorderId
  artOverride?: string
  power?: number
  variant?: 'full' | 'catalog' | 'hand' | 'board'
}) {
  const mastery = useCardMasteryStore(state => card.cosmeticBorder !== undefined || card.arenaToken ? undefined : state.cards[card.definitionId])
  // Match instances carry their owner's appearance snapshot. Only catalog cards use local preferences.
  const artwork = useCollectionStore(state => {
    const id = state.equippedVariants[card.definitionId]
    return card.cosmeticBorder === undefined && !card.arenaToken && state.cards[card.definitionId] > 0 && state.variants[id] === true ? id : undefined
  })
  const displayed = artOverride ? { ...card, imageUrl: artOverride } : applyCardVariant(card, artwork)
  const border = isCardBorder(borderOverride) ? borderOverride : isCardBorder(card.cosmeticBorder) ? card.cosmeticBorder : getEquippedCardBorder(mastery)
  const counter = getArenaRelicCounter(card)
  return <span className={`ae-card ae-card-${variant}`} data-border={border} data-card-type={card.type}>
    {variant === 'full' || variant === 'catalog' ? <CardMedia card={displayed} className="ae-card-art"/> : <img decoding="async" className="ae-card-art" src={displayed.imageUrl} alt="" draggable={false} loading={variant === 'hand' ? 'eager' : 'lazy'} />}
    <span className="ae-card-vignette" />
    <span className={`ae-card-cost ${card.arenaTransmuted ? 'is-transmuted' : ''}`} aria-label={`${card.cost} aether${card.arenaTransmuted ? ', transmuted' : ''}`}>{card.cost}</span>
    {card.type === 'relic' ? <>
      <span className="ae-card-type-icon ae-relic-emblem" aria-label="Relic · no power" title="Relic · occupies a position, contributes no power">
        <img src="/ui/card-types/relic-v1.png" alt="" draggable={false} />
      </span>
      {counter && <span className="ae-relic-counter" aria-label={counter.label} title={counter.label}>{counter.short}</span>}
      <span className="ae-relic-plinth" aria-hidden="true" />
    </> : card.type === 'spell' ? <span className="ae-card-type-icon ae-spell-emblem" aria-label="Spell" title="Spell"><img src="/ui/card-types/spell-v1.png" alt="" draggable={false} /></span> : <span className={`ae-card-power ${String(power).length > 2 ? 'is-wide' : ''} ${power < 0 ? 'is-negative' : power < card.power ? 'is-weakened' : power > card.power ? 'is-boosted' : ''}`} aria-label={`${power} power`}>{power < 0 ? `−${Math.abs(power)}` : power}</span>}
    <span className="ae-card-caption">
      <span className="ae-card-name">{card.name}</span>
    </span>
    <CardBorderFrame border={border} />
  </span>
}
