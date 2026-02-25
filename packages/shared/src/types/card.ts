export type CardType = 'creature' | 'spell' | 'artifact' | 'enchantment'
export type Rarity = 'common' | 'uncommon' | 'rare' | 'legendary'

export interface CardEffect {
  type: 'damage' | 'heal' | 'draw' | 'buff' | 'debuff' | 'summon'
  value: number
  target?: 'self' | 'opponent' | 'creature' | 'all_creatures'
}

export interface Card {
  id: string
  definitionId: string
  name: string
  type: CardType
  rarity: Rarity
  cost: number
  power?: number
  toughness?: number
  effects: CardEffect[]
  description: string
  imageUrl: string
  keywords: string[]
}

export interface CardDefinition extends Omit<Card, 'id'> {
  definitionId: string
}
