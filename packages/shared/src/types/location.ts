import type { Card } from './card.ts'

// Each location half has one passive effect that alters how its zone scores or behaves
export type LocationEffectType =
  | 'cost_reduction'         // units played here cost less energy
  | 'fleeting_amplify'       // fleeting cards here have double power
  | 'resilient_power_gain'   // resilient cards here gain bonus power each round they persist
  | 'spell_empower'          // each spell played here gives your units here +1 power
  | 'recursion'              // at round end, your strongest fleeting card here returns to hand
  | 'chain_draw'             // draw 1 if you play 2+ cards in a single turn
  | 'void_removal'           // at round end, the weakest unit in this lane (either side) is removed
  | 'top_card_bonus'         // the highest-power unit here gains bonus power

export interface LocationEffect {
  type: LocationEffectType
  value: number
  description: string
}

export type LocationTheme = 'fire' | 'nature' | 'arcane' | 'death' | 'ice' | 'shadow' | 'light' | 'void'

// The static definition of a location — stored in LOCATION_DATABASE
export interface LocationDefinition {
  definitionId: string
  name: string
  description: string
  effect: LocationEffect
  theme: LocationTheme
}

// A card placed at a location during a round
export interface PlacedCard {
  card: Card
  ownerId: string
  placedOnTurn: number
  slotIndex: number  // 0–5 position within the location grid
}

// One player's half of a lane: their chosen location definition + their placed cards
export interface LocationHalf extends LocationDefinition {
  placed: PlacedCard[]   // only this player's cards
  power: number          // this player's accumulated power in this half
}

// One lane of play — each player owns a half (their chosen location + their cards)
export interface LaneState {
  laneIndex: 0 | 1
  revealedOnRound: 1 | 2 | 3
  // playerId → their half of this lane
  halves: Record<string, LocationHalf>
}
