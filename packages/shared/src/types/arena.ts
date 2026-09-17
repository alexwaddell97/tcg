import type { ArenaAbility, Card } from './card.ts'

export type ArenaIndex = 0 | 1 | 2
/** Logical chain order, independent of the responsive board layout. */
export type ArenaSlotIndex = 0 | 1 | 2 | 3
export type ArenaRule = 'forge' | 'sanctum' | 'summit' | 'chainbridge' | 'leyline_nexus' | 'ashen_orchard' | 'bellmarsh' | 'mirror_reservoir' | 'gilded_exchange'
export interface ArenaLocation {
  index: ArenaIndex
  definitionId: string
  name: string
  description: string
  rule?: ArenaRule
  revealTurn: number
  revealed: boolean
  /** The turn-four exchange has happened, including when both positions were empty. */
  exchangeResolved?: boolean
  cards: Record<string, ArenaPlacedCard[]>
}
export interface ArenaPlacedCard {
  card: Card
  placedOnTurn: number
  /** Optional only for older snapshots; new engine placements always set this. */
  slotIndex?: ArenaSlotIndex
}
export interface ArenaPlay {
  cardInstanceId: string
  locationIndex: ArenaIndex
  /** Units and relics reserve a position. Omission chooses the first free position; spells ignore it. */
  slotIndex?: ArenaSlotIndex
}
export interface ArenaTurnSubmission {
  turn: number
  plays: ArenaPlay[]
}
/** Public reveal snapshots, in rules-engine order. Never contains private hands. */
export interface ArenaRevealEvent {
  id: string
  kind: 'card' | 'growth' | 'location' | 'trigger' | 'location-effect'
  locationIndex: ArenaIndex
  playerId?: string
  card?: Card
  arrival?: ArenaLocation[]
  locations: ArenaLocation[]
  abilityTriggered?: boolean
  drawCount?: number
  /** A resolved arena effect, including a pre-ability Leyline transfer. */
  locationRule?: ArenaRule
  /** A publicly cast spell returned to its owner, not drawn from the deck. */
  returnToHand?: boolean
  effects?: ArenaAbility['type'][]
  /** Visible relics that supplied a played unit's pre-ability power. */
  relicSources?: string[]
}
export interface ArenaReveal {
  turn: number
  initialLocations: ArenaLocation[]
  events: ArenaRevealEvent[]
}
export interface ArenaState {
  questReceipt?: import('./quests.ts').ArenaQuestReceipt
  /** Only the viewer's played-card reward; absent for previews, spectators and retreats. */
  masteryReward?: import('../constants/cardMastery.ts').CardMasteryReward
  totalTurns: number
  energy: number
  locations: ArenaLocation[]
  lockedIn: Record<string, boolean>
  revealFirstPlayerId: string
  /** Only the viewer's submitted plan is ever sent to a client. */
  committedPlays?: ArenaPlay[]
  lastRevealTurn: number
  lastReveal?: ArenaReveal
  /** Only the viewer's pending draw transmutations are exposed. */
  transmutesPending?: number
}
