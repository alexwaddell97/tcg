export type Keyword = 'fleeting' | 'elusive' | 'overwhelm' | 'challenger' | 'resilient' | 'commander' | 'scorch'

export type Rarity = 'common' | 'uncommon' | 'rare' | 'legendary'

export type CardType = 'unit' | 'spell'

// Defines how a quest card levels up. Checked by the engine after each game event.
export interface QuestDefinition {
  description: string
  trigger: 'on_unit_played' | 'on_spell_played' | 'on_round_start' | 'on_location_filled'
  threshold: number
  transformsToId: string // definitionId of the card this becomes when complete
}

// Spell-specific immediate effect triggered on play (no targeting UI needed)
export type SpellEffectType = 'draw' | 'power_boost' | 'power_drain'
export interface SpellEffect {
  type: SpellEffectType
  value: number // draw N cards | boost/drain by N power
}

// The static definition of a card — stored in CARD_DATABASE
export interface CardDefinition {
  definitionId: string
  name: string
  type: CardType
  rarity: Rarity
  cost: number
  power: number
  keywords: Keyword[]
  // Location affinity — which locations allow this card in a deck.
  // Empty array means neutral: any deck can include it.
  affinity: string[] // location definitionIds
  quest?: QuestDefinition
  spellEffect?: SpellEffect // only used when type === 'spell'
  description: string
  flavourText?: string
  imageUrl: string
  /** True for cards that only exist as quest transform results — hidden from deck builder and pack pools */
  isTransformTarget?: boolean
}

// A runtime instance of a card — one per copy in a player's deck/hand/board
export interface Card extends CardDefinition {
  instanceId: string
  questProgress: number
  isTransformed: boolean
  powerBonus: number // temporary power granted by spells/effects this round
}
