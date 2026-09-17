import type { CardDefinition } from '../types/card.ts'
import { getExclusiveCardSeason } from './arenaSeasons.ts'

export type ArenaCardSet = 'core' | 'expanded' | 'eternal'
export const ARENA_CARD_SETS = [
  { id: 'core', name: 'Core Set', description: 'The original card pool and foundational decks.' },
  { id: 'expanded', name: 'Expanded Set', description: 'A broader range of archetypes, tools, and combinations.' },
  { id: 'eternal', name: 'Eternal Set', description: 'Recent headline cards and powerful build-around effects.' },
] as const

// Explicit membership: rarity changes must not silently move a card between sets.
export const ARENA_ETERNAL_CARD_IDS: readonly string[] = [
  'paradox_regent', 'philosopher_engine', 'court_of_thorns', 'oathbreaker_duke',
  'censer_warden', 'famine_sovereign', 'last_light_beacon', 'prism_titan',
  'wandering_colossus', 'igna_unchained', 'death_incarnate',
]
export function arenaSetName(set: string | undefined) {
  return ARENA_CARD_SETS.find(entry => entry.id === set)?.name
}

/** The stored set is the destination pool; season cards join it after their pass. */
export function arenaCardSetName(card: Pick<CardDefinition, 'definitionId' | 'arenaSet'>, now = Date.now()) {
  return getExclusiveCardSeason(card.definitionId, now) ? 'Premium Season Pass' : arenaSetName(card.arenaSet)
}
