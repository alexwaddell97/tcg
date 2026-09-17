import { CARD_DATABASE } from './cards.ts'
import { ARENA_EXPANSION_CARDS } from './arenaExpansion.ts'
import { ARENA_RELIC_CARDS } from './arenaRelics.ts'
import { ARENA_FOUNDATION_CARDS } from './arenaFoundations.ts'
import { describeArenaAbility } from '../utils/arenaAbilities.ts'
import type { ArenaAbility, ArenaArchetype, CardDefinition } from '../types/card.ts'
import type { ArenaRule } from '../types/arena.ts'

export const ARENA_TURNS = 6
export const ARENA_DECK_SIZE = 12
export const ARENA_STARTING_HAND = 3
export const ARENA_MAX_HAND = 7
export const ARENA_SLOTS = 4
export const ARENAS_PER_MATCH = 3

// Arena balance is separate from the existing solo card catalog and illustrations.
type Balance = [cost: number, power: number, ability?: ArenaAbility['type'], value?: number]
const BALANCE: Record<string, Balance> = {
  village_scout: [1, 2], wandering_blade: [2, 2, 'rally', 2],
  shield_warden: [3, 2, 'linked', 2], thunder_hawk: [4, 5, 'pressure', 2],
  iron_golem: [3, 5], forge_apprentice: [2, 2, 'pressure', 2],
  temper: [1, 0, 'boost', 3], igna_eternal_flame: [6, 7, 'aura', 2],
  ironclad_colossus: [6, 12], forge_wraith: [5, 6, 'drain', 3],
  mountain_hermit: [2, 1, 'grow', 1], ancient_guardian: [5, 8, 'ward', 0],
  frost_sage: [3, 3, 'rally', 3], the_unbroken: [6, 8, 'rally', 5],
  glacier_sovereign: [6, 9, 'pressure', 4], summit_prophet: [4, 4, 'draw', 1],
  spark_sprite: [1, 1, 'parity', 2], chaos_drake: [4, 5, 'alone', 3],
  phase_walk: [1, 0, 'move', 0], rift_caller: [3, 3, 'draw', 1],
  void_leviathan: [6, 8, 'alone', 5], rift_sovereign: [5, 6, 'aura', 1],
  entropic_maw: [5, 8, 'pressure', 3], bone_knight: [2, 3],
  revenant: [2, 1, 'consume', 0], soul_collector: [4, 5, 'drain', 2],
  lord_of_bones: [5, 5, 'token_aura', 3], the_undying: [4, 4, 'grow', 2],
  banshee_queen: [5, 6, 'afflict_all', 1], ritual_caster: [2, 2, 'full', 3],
  mana_surge: [1, 0, 'draw', 2], apprentice_mage: [2, 1, 'aura', 1],
  arcane_echo: [2, 0, 'boost_all', 2], the_archon: [6, 6, 'echo_power', 0],
  living_codex: [4, 3, 'draw', 2], grand_invocation: [2, 0, 'draw', 3],
}

const CORE_PACKAGES: Record<string, ArenaArchetype[]> = {
  village_scout: ['formation'], wandering_blade: ['formation'], shield_warden: ['formation', 'stewardship'],
  thunder_hawk: ['formation'], iron_golem: ['conduits'], forge_apprentice: ['formation'],
  temper: ['conduits', 'invocation'], igna_eternal_flame: ['formation', 'conduits'], ironclad_colossus: ['conduits'],
  forge_wraith: ['affliction'], mountain_hermit: ['conduits', 'wayfarers'], ancient_guardian: ['conduits'],
  frost_sage: ['formation'], the_unbroken: ['formation'], glacier_sovereign: ['formation'],
  summit_prophet: ['invocation'], spark_sprite: ['formation'], chaos_drake: ['wayfarers'],
  phase_walk: ['wayfarers', 'invocation'], rift_caller: ['invocation', 'transmutation'],
  void_leviathan: ['wayfarers'], rift_sovereign: ['formation', 'wayfarers'], entropic_maw: ['formation'],
  bone_knight: ['formation'], revenant: ['sabotage', 'conduits'], soul_collector: ['affliction', 'conduits'],
  lord_of_bones: ['sabotage', 'stewardship'], the_undying: ['conduits'], banshee_queen: ['affliction'],
  ritual_caster: ['formation', 'stewardship'], mana_surge: ['invocation', 'transmutation'],
  apprentice_mage: ['formation', 'invocation'], arcane_echo: ['invocation', 'conduits'],
  the_archon: ['conduits'], living_codex: ['invocation', 'transmutation'], grand_invocation: ['invocation'],
}

export const ARENA_CARD_DATABASE: CardDefinition[] = [...CARD_DATABASE.filter(card => !card.isTransformTarget).map(card => {
  const [cost, power, type, value = 0] = BALANCE[card.definitionId] ?? [Math.min(6, card.cost), Math.min(12, card.power)]
  return { ...card, arenaSet: 'core' as const, cost, power, keywords: [], quest: undefined, spellEffect: undefined,
    arenaArchetypes: CORE_PACKAGES[card.definitionId] ?? [],
    arenaAbility: type ? { type, value } : undefined,
    description: type ? describeArenaAbility({ type, value }) : 'Steady power. No ability.' }
}), ...ARENA_EXPANSION_CARDS, ...ARENA_RELIC_CARDS, ...ARENA_FOUNDATION_CARDS]

export const ARENA_STARTER_DECK = [
  'village_scout', 'spark_sprite', 'wandering_blade', 'forge_apprentice',
  'mountain_hermit', 'temper', 'iron_golem', 'frost_sage',
  'thunder_hawk', 'chaos_drake', 'ancient_guardian', 'the_unbroken',
]

export const ARENA_LOCATIONS: { definitionId: string; name: string; description: string; rule: ArenaRule }[] = [
  { definitionId: 'the_forge', name: 'The Forge', description: 'The first unit each player reveals here each turn gains +1 power.', rule: 'forge' },
  { definitionId: 'the_sanctum', name: 'The Sanctum', description: 'After you cast a spell here, your units here gain +1 power.', rule: 'sanctum' },
  { definitionId: 'the_summit', name: 'The Summit', description: 'Units that cost 4 or more have +2 power here.', rule: 'summit' },
  { definitionId: 'chainbridge', name: 'Chainbridge', description: 'Your units with two occupied neighbouring positions have +2 power.', rule: 'chainbridge' },
  { definitionId: 'leyline_nexus', name: 'Leyline Nexus', description: 'Units revealed here take 2 power from your unit in the preceding position.', rule: 'leyline_nexus' },
  { definitionId: 'ashen_orchard', name: 'Ashen Orchard', description: 'After each turn, your lowest-power units here gain +1 power. Includes ties.', rule: 'ashen_orchard' },
  { definitionId: 'bellmarsh', name: 'Bellmarsh', description: 'After each turn, return the first spell you cast here that turn to your hand.', rule: 'bellmarsh' },
  { definitionId: 'mirror_reservoir', name: 'Mirror Reservoir', description: 'For this arena’s score, count negative unit power as positive.', rule: 'mirror_reservoir' },
  { definitionId: 'gilded_exchange', name: 'Gilded Exchange', description: 'After turn 4, swap the cards in position 4 between players.', rule: 'gilded_exchange' },
]

export function getArenaDeckError(ids: unknown): string | null {
  if (ids === undefined) return null
  if (!Array.isArray(ids) || ids.length !== ARENA_DECK_SIZE) return 'Choose exactly 12 different cards for an arena deck.'
  if (new Set(ids).size !== ids.length) return 'Arena decks allow one copy of each card.'
  if (ids.some(id => typeof id !== 'string' || !ARENA_CARD_DATABASE.some(card => card.definitionId === id))) return 'That deck includes a card unavailable in arena matches.'
  return null
}
