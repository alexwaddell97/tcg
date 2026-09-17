import type { ArenaCardSet } from '../constants/arenaSets.ts'
export type Keyword = 'fleeting' | 'elusive' | 'overwhelm' | 'challenger' | 'resilient' | 'commander' | 'scorch'

export type Rarity = 'common' | 'uncommon' | 'rare' | 'legendary'

export type CardType = 'unit' | 'spell' | 'relic'

export type ArenaArchetype = 'transmutation' | 'sabotage' | 'affliction' | 'conduits' | 'formation' | 'wayfarers' | 'invocation' | 'stewardship'

export interface ArenaAbility {
  type: 'rally' | 'pressure' | 'parity' | 'grow' | 'aura' | 'alone' | 'full' | 'ward' | 'drain' | 'draw' | 'boost' | 'boost_all' | 'move'
    | 'transmute_hand' | 'transmute_deck' | 'transmute_draw' | 'hand_weaken' | 'hand_boost' | 'transmuted_power'
    | 'defect' | 'send' | 'plant' | 'burden' | 'token_aura' | 'purge'
    | 'siphon' | 'wither' | 'afflict_all' | 'harvest' | 'cleanse'
    | 'copy_power' | 'transfer' | 'consume' | 'purify' | 'equalize' | 'echo_power' | 'distribute' | 'double'
    | 'adjacent_aura' | 'spellfont' | 'warding_bell' | 'incubate' | 'aether_battery'
    | 'flank' | 'linked' | 'moved_power' | 'relic_power' | 'journey_aura' | 'march' | 'dispel' | 'salvage' | 'formation_boost'
  value: number
  target?: 'self' | 'weakest' | 'strongest' | 'other_arenas' | 'all' | 'afflicted'
  timing?: 'spell' | 'final'
  oncePerTurn?: boolean
  token?: 'cursed_offering' | 'burden_token'
  condition?: 'transmuted'
}

export interface CardFaceValues {
  top: number
  right: number
  bottom: number
  left: number
}

// Hex grid using axial coordinates [q, r]
export type HexCoord = [number, number]

// Pointy-top hex values, in neighbor order: E, NE, NW, W, SW, SE.
// Missing sides are derived from the card's triad values.
export type HexFaceValues = number[] // length 3-6

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
  // Optional explicit Triple Triad side values (for 4-sided board). If omitted, derived deterministically from card stats.
  triadValues?: CardFaceValues
  // Optional hexagonal face values (for 6-sided hexagon board). Can have 3-6 values.
  hexValues?: HexFaceValues
  description: string
  flavourText?: string
  imageUrl: string
  /** True for cards that only exist as quest transform results — hidden from deck builder and pack pools */
  isTransformTarget?: boolean
  arenaAbility?: ArenaAbility
  /** Additional effects resolve in printed order after arenaAbility. */
  arenaEffects?: ArenaAbility[]
  arenaArchetypes?: ArenaArchetype[]
  arenaSet?: ArenaCardSet
  /** Original release name, independent of progression set. */
  arenaRelease?: string
  /** Generated during play; never part of the collectible catalog or a starting deck. */
  arenaToken?: boolean
}

// A runtime instance of a card — one per copy in a player's deck/hand/board
export interface Card extends CardDefinition {
  /** A match snapshots its owner's cosmetic choice, independent of gameplay rarity. */
  cosmeticBorder?: import('../constants/cardMastery.ts').CardBorderId
  instanceId: string
  questProgress: number
  isTransformed: boolean
  powerBonus: number // temporary power granted by spells/effects this round
  arenaTransmuted?: boolean
  /** Successful friendly movement between arenas; ownership transfers do not count. */
  arenaMoved?: boolean
  /** Tracks reductions separately so Cleanse preserves positive buffs. */
  arenaAffliction?: number
  arenaWither?: { sourcePlayerId: string; amount: number; remaining: number }[]
  /** Stored aether or elapsed incubation turns; relics have no power stat. */
  arenaRelicCharge?: number
  /** Warding Bell's most recent prevention, retained when changing owners. */
  arenaRelicUsedTurn?: number
}
