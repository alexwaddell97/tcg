import type { ArenaAbility, ArenaArchetype, CardDefinition, CardType, Rarity } from '../types/card.ts'
import { describeArenaAbility } from '../utils/arenaAbilities.ts'

const e = (type: ArenaAbility['type'], value = 0, extra: Omit<ArenaAbility, 'type' | 'value'> = {}): ArenaAbility => ({ type, value, ...extra })
const cast = { timing: 'spell', oncePerTurn: true } as const
function card(id: string, name: string, type: CardType, cost: number, power: number, rarity: Rarity,
  archetypes: ArenaArchetype[], abilities: ArenaAbility[], set: CardDefinition['arenaSet'] = 'expanded', existingArt?: string): CardDefinition {
  return { definitionId: id, name, type, cost, power, rarity, keywords: [], affinity: [], arenaSet: set,
    arenaRelease: 'Eternal Foundations', arenaArchetypes: archetypes, arenaAbility: abilities[0], arenaEffects: abilities.slice(1),
    description: abilities.map(describeArenaAbility).join(' '), imageUrl: existingArt ? `./cards/${existingArt}.png` : `./cards/foundations/${id}.webp` }
}

/** Fifty additions designed against the complete 140-card pool. See docs/eternal-foundations-design.md. */
export const ARENA_FOUNDATION_CARDS: CardDefinition[] = [
  card('iron_flanker', 'Iron Flanker', 'unit', 1, 1, 'common', ['formation'], [e('flank', 2)], 'core'),
  card('chain_sentinel', 'Chain Sentinel', 'unit', 2, 2, 'common', ['formation', 'stewardship'], [e('linked', 1)], 'core'),
  card('bridge_marshal', 'Bridge Marshal', 'unit', 3, 3, 'uncommon', ['formation', 'conduits'], [e('adjacent_aura', 1)], 'core'),
  card('linebreaker', 'Linebreaker', 'unit', 4, 4, 'common', ['formation', 'wayfarers'], [e('flank', 3)], 'core'),
  card('banner_heir', 'Banner Heir', 'unit', 5, 6, 'rare', ['formation'], [e('full', 4)]),
  card('bastion_architect', 'Bastion Architect', 'unit', 4, 4, 'uncommon', ['formation', 'stewardship'], [e('relic_power', 2)]),

  card('trail_wisp', 'Trail Wisp', 'unit', 1, 1, 'common', ['wayfarers', 'transmutation'], [e('moved_power', 3)], 'core'),
  card('crossing_guard', 'Crossing Guard', 'unit', 2, 2, 'common', ['wayfarers', 'formation'], [e('moved_power', 3)], 'core'),
  card('waystone_pilgrim', 'Waystone Pilgrim', 'unit', 3, 3, 'uncommon', ['wayfarers'], [e('move')], 'core'),
  card('horizon_rider', 'Horizon Rider', 'unit', 4, 4, 'uncommon', ['wayfarers', 'conduits'], [e('moved_power', 4)]),
  card('rift_herald', 'Rift Herald', 'unit', 5, 5, 'rare', ['wayfarers', 'formation'], [e('move'), e('rally', 2)], 'expanded', 'rift-herald'),
  card('wandering_colossus', 'Wandering Colossus', 'unit', 5, 6, 'legendary', ['wayfarers'], [e('moved_power', 5)], 'eternal'),

  card('rune_attendant', 'Rune Attendant', 'unit', 1, 1, 'common', ['invocation'], [e('boost', 1, { target: 'self', ...cast })], 'core'),
  card('glyph_scholar', 'Glyph Scholar', 'unit', 2, 1, 'uncommon', ['invocation', 'transmutation'], [e('draw', 1, cast)], 'core'),
  card('archmage', 'Archmage', 'unit', 5, 4, 'rare', ['invocation', 'conduits'], [e('boost_all', 1, cast)], 'expanded', 'archmage'),
  card('frost_elder', 'Frost Elder', 'unit', 4, 4, 'rare', ['invocation', 'affliction'], [e('cleanse'), e('drain', 1, cast)], 'expanded', 'frost-elder'),

  card('scrap_custodian', 'Scrap Custodian', 'unit', 1, 1, 'common', ['stewardship'], [e('relic_power', 2)], 'core'),
  card('master_forger', 'Master Forger', 'unit', 3, 2, 'uncommon', ['stewardship', 'conduits'], [e('relic_power', 2), e('boost', 1, { target: 'weakest' })], 'core', 'master-forger'),
  card('relic_diver', 'Relic Diver', 'unit', 2, 3, 'uncommon', ['stewardship', 'invocation'], [e('salvage')]),
  card('igna_unchained', 'Igna Unchained', 'unit', 5, 6, 'legendary', ['stewardship', 'conduits'], [e('relic_power', 2)], 'eternal', 'igna-unchained'),

  card('ascended_prophet', 'Ascended Prophet', 'unit', 4, 1, 'rare', ['transmutation', 'conduits'], [e('transmuted_power', 2), e('hand_boost', 2)], 'expanded', 'ascended-prophet'),
  card('glass_dragoon', 'Glass Dragoon', 'unit', 5, 2, 'rare', ['transmutation', 'wayfarers', 'formation'], [e('flank', 2), e('moved_power', 2)]),
  card('death_reaper', 'Death Reaper', 'unit', 5, 6, 'rare', ['affliction', 'sabotage'], [e('harvest', 2, { timing: 'final' })], 'expanded', 'death-reaper'),
  card('death_incarnate', 'Death Incarnate', 'unit', 6, 6, 'legendary', ['affliction'], [e('drain', 2, { target: 'other_arenas' })], 'eternal', 'death-incarnate'),
  card('tax_collector', 'Tax Collector', 'unit', 3, 3, 'uncommon', ['sabotage', 'invocation', 'affliction'], [e('harvest', 1, cast)]),
  card('oathbound_scavenger', 'Oathbound Scavenger', 'unit', 2, 3, 'common', ['sabotage', 'conduits'], [e('purge'), e('boost', 1, { target: 'weakest' })], 'core'),

  card('hold_the_line', 'Hold the Line', 'spell', 1, 0, 'common', ['formation', 'invocation'], [e('formation_boost', 1)], 'core'),
  card('close_ranks', 'Close Ranks', 'spell', 2, 0, 'uncommon', ['formation', 'wayfarers'], [e('move'), e('boost_all', 1)]),
  card('break_standard', 'Break Standard', 'spell', 1, 0, 'common', ['formation', 'stewardship'], [e('dispel')], 'core'),
  card('wayward_current', 'Wayward Current', 'spell', 1, 0, 'common', ['wayfarers', 'invocation'], [e('march')], 'core'),
  card('homeward_call', 'Homeward Call', 'spell', 2, 0, 'common', ['wayfarers', 'conduits'], [e('move'), e('boost', 2, { target: 'weakest' })]),
  card('open_horizon', 'Open Horizon', 'spell', 2, 0, 'uncommon', ['wayfarers', 'invocation'], [e('move'), e('draw', 1)]),
  card('cinder_script', 'Cinder Script', 'spell', 1, 0, 'common', ['invocation', 'affliction'], [e('drain', 1), e('boost', 1, { target: 'weakest' })], 'core'),
  card('measured_cast', 'Measured Cast', 'spell', 1, 0, 'common', ['invocation', 'conduits'], [e('draw', 1), e('hand_boost', 1)]),
  card('grand_convergence', 'Grand Convergence', 'spell', 3, 0, 'rare', ['invocation', 'formation'], [e('boost_all', 3)]),
  card('salvage_rite', 'Salvage Rite', 'spell', 1, 0, 'common', ['stewardship', 'invocation'], [e('salvage'), e('boost', 2, { target: 'weakest' })]),
  card('null_sigil', 'Null Sigil', 'spell', 2, 0, 'uncommon', ['stewardship', 'affliction'], [e('dispel'), e('drain', 2)]),
  card('restoration', 'Restoration', 'spell', 1, 0, 'common', ['stewardship', 'conduits'], [e('cleanse'), e('boost', 1, { target: 'weakest' })], 'core'),
  card('liquid_potential', 'Liquid Potential', 'spell', 1, 0, 'uncommon', ['transmutation', 'invocation'], [e('hand_weaken', 1), e('transmute_draw', 1)]),
  card('smuggled_contract', 'Smuggled Contract', 'spell', 2, 0, 'rare', ['sabotage', 'invocation'], [e('plant', 0, { token: 'burden_token' }), e('draw', 1)]),
  card('lingering_curse', 'Lingering Curse', 'spell', 2, 0, 'common', ['affliction', 'invocation'], [e('wither', 2, { target: 'weakest' })]),
  card('borrowed_strength', 'Borrowed Strength', 'spell', 2, 0, 'uncommon', ['affliction', 'conduits'], [e('drain', 3), e('boost', 2, { target: 'weakest' })]),

  card('chain_anchor', 'Chain Anchor', 'relic', 1, 0, 'common', ['formation', 'stewardship'], [e('adjacent_aura', 1)], 'core'),
  card('pilgrim_compass', 'Pilgrim Compass', 'relic', 2, 0, 'uncommon', ['wayfarers', 'stewardship'], [e('journey_aura', 2)]),
  card('refracting_lens', 'Refracting Lens', 'relic', 2, 0, 'rare', ['transmutation', 'invocation', 'stewardship'], [e('transmute_draw', 1, cast)]),
  card('codex_of_ages', 'Codex of Ages', 'relic', 2, 0, 'uncommon', ['invocation', 'stewardship'], [e('draw', 1, cast)], 'expanded', 'codex-of-ages'),
  card('plague_censer', 'Plague Censer', 'relic', 2, 0, 'uncommon', ['affliction', 'invocation', 'stewardship'], [e('drain', 1, { target: 'weakest', ...cast })]),
  card('smuggler_vault', 'Smuggler Vault', 'relic', 1, 0, 'uncommon', ['sabotage', 'stewardship'], [e('burden', 0, { target: 'self' }), e('token_aura', 2)]),
  card('sunken_reliquary', 'Sunken Reliquary', 'relic', 3, 0, 'rare', ['conduits', 'stewardship', 'invocation'], [e('boost', 2, { target: 'weakest', ...cast })]),
  card('gilded_astrolabe', 'Gilded Astrolabe', 'relic', 3, 0, 'rare', ['formation', 'stewardship', 'invocation'], [e('boost_all', 1, cast)]),
]
