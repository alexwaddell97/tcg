import type { ArenaAbility, CardDefinition } from '../types/card.ts'
import { describeArenaAbility } from '../utils/arenaAbilities.ts'

function relic(id: string, name: string, cost: number, type: ArenaAbility['type'], value: number, rarity: CardDefinition['rarity'], options: Partial<ArenaAbility> = {}): CardDefinition {
  const ability: ArenaAbility = { type, value, ...(type === 'spellfont' ? { timing: 'spell' as const } : {}), ...options }
  return { definitionId: id, name, type: 'relic', cost, power: 0, rarity, keywords: [], affinity: [],
    arenaSet: id === 'war_standard' || id === 'warding_bell' || id === 'spellfont' ? 'core' : 'expanded', arenaRelease: 'Relics', arenaAbility: ability,
    arenaArchetypes: type === 'adjacent_aura' || type === 'warding_bell' ? ['stewardship', 'formation'] : type === 'spellfont' ? ['stewardship', 'invocation'] : ['stewardship', 'conduits'],
    imageUrl: `./cards/relics/${id}-v1.jpg`, description: describeArenaAbility(ability) }
}

export const ARENA_RELIC_CARDS: CardDefinition[] = [
  relic('war_standard', 'War Standard', 2, 'adjacent_aura', 2, 'common'),
  relic('spellfont', 'Spellfont', 2, 'spellfont', 1, 'uncommon'),
  relic('warding_bell', 'Warding Bell', 1, 'warding_bell', 1, 'uncommon'),
  relic('ember_incubator', 'Ember Incubator', 2, 'incubate', 2, 'rare'),
  relic('aether_battery', 'Aether Battery', 1, 'aether_battery', 0, 'rare'),
  { ...relic('contraband_cache', 'Contraband Cache', 2, 'plant', 0, 'rare', { timing: 'spell', oncePerTurn: true, token: 'burden_token' }), arenaArchetypes: ['sabotage', 'invocation', 'stewardship'] },
]

export const EMBERLING: CardDefinition = { definitionId: 'emberling', name: 'Emberling', type: 'unit', cost: 0, power: 5,
  rarity: 'common', keywords: [], affinity: [], arenaToken: true, imageUrl: './cards/forge-wraith.png',
  description: 'Generated unit. No ability.' }
