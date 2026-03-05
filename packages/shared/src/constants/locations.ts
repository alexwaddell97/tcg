import type { LocationDefinition } from '../types/location.ts'

export const LOCATION_DATABASE: LocationDefinition[] = [
  {
    definitionId: 'the_forge',
    name: 'The Forge',
    description: 'Units played here cost 1 less energy.',
    effect: {
      type: 'cost_reduction',
      value: 1,
      description: 'Units played here cost 1 less energy.',
    },
    theme: 'fire',
  },
  {
    definitionId: 'the_summit',
    name: 'The Summit',
    description: 'Resilient cards here gain +2 power at the start of each round they persist.',
    effect: {
      type: 'resilient_power_gain',
      value: 2,
      description: 'Resilient cards here gain +2 power each round they stay.',
    },
    theme: 'ice',
  },
  {
    definitionId: 'the_rift',
    name: 'The Rift',
    description: 'Fleeting cards here have double power.',
    effect: {
      type: 'fleeting_amplify',
      value: 2,
      description: 'Fleeting cards here have double power.',
    },
    theme: 'arcane',
  },
  {
    definitionId: 'the_graveyard',
    name: 'The Graveyard',
    description: 'At round end, your strongest Fleeting card here returns to your hand.',
    effect: {
      type: 'recursion',
      value: 1,
      description: 'Your strongest Fleeting card returns to hand each round.',
    },
    theme: 'death',
  },
  {
    definitionId: 'the_sanctum',
    name: 'The Sanctum',
    description: 'Each spell you play here gives all your units at this location +1 power.',
    effect: {
      type: 'spell_empower',
      value: 1,
      description: 'Spells give your units here +1 power.',
    },
    theme: 'light',
  },
  {
    definitionId: 'the_frontier',
    name: 'The Frontier',
    description: 'Your highest-power unit here gains +3 power.',
    effect: {
      type: 'top_card_bonus',
      value: 3,
      description: 'Your highest-power unit here gains +3 power.',
    },
    theme: 'nature',
  },
  {
    definitionId: 'the_archive',
    name: 'The Archive',
    description: 'If you play 2 or more cards in a single turn, draw 1.',
    effect: {
      type: 'chain_draw',
      value: 1,
      description: 'Play 2+ cards in a turn to draw 1.',
    },
    theme: 'arcane',
  },
  {
    definitionId: 'the_void',
    name: 'The Void',
    description: 'At round end, the single weakest unit here is removed from the board.',
    effect: {
      type: 'void_removal',
      value: 1,
      description: 'The weakest unit here is removed at round end.',
    },
    theme: 'void',
  },
]

// Neutral locations — not tied to any player's deck identity.
// One is randomly chosen each match as the shared 3rd board location.
export const NEUTRAL_LOCATION_DATABASE: LocationDefinition[] = LOCATION_DATABASE.filter(
  l => ['the_sanctum', 'the_frontier', 'the_archive', 'the_void'].includes(l.definitionId)
)
