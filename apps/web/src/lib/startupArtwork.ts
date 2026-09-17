import { ARENA_CARD_DATABASE, ARENA_STARTER_DECK, applyCardVariant } from '@tcg/shared'
import { useDeckStore } from '../stores/useDeckStore.ts'
import { useCollectionStore } from '../stores/useCollectionStore.ts'
import { UI_ASSETS } from './uiAssets.ts'

export function startupArtwork(): string[] {
  const { decks, activeDeckId } = useDeckStore.getState()
  const selected = decks.find(deck => deck.id === activeDeckId)
  const ids = selected ? Object.keys(selected.cards).slice(0, 12) : ARENA_STARTER_DECK
  const collection = useCollectionStore.getState()
  const cards = ids.flatMap(id => {
    const definition = ARENA_CARD_DATABASE.find(card => card.definitionId === id)
    if (!definition) return []
    const equipped = collection.equippedVariants[id]
    const card = applyCardVariant(definition, collection.variants[equipped] ? equipped : undefined)
    return card.imageUrl ? [card.imageUrl] : []
  })
  return [UI_ASSETS.menu, UI_ASSETS.logo, UI_ASSETS.cardBack, UI_ASSETS.panel,
    ...Object.values(UI_ASSETS.locations),
    '/ui/cards/aether-energy-v1.svg', '/ui/cards/aether-power-v1.svg',
    '/ui/card-types/relic-v1.png', '/ui/card-types/spell-v1.png', ...cards,
  ].map(url => new URL(url, document.baseURI).href)
}
