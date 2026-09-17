import type { ArenaAbility, ArenaArchetype, CardDefinition, Rarity } from '../types/card.ts'
import { CARD_DATABASE } from './cards.ts'
import { describeArenaAbility } from '../utils/arenaAbilities.ts'
import { ARENA_ETERNAL_CARD_IDS } from './arenaSets.ts'
import { ARENA_EXPANSION_ART } from './arenaArt.ts'
import { EMBERLING } from './arenaRelics.ts'

export const ARENA_EXPANSION_NAME = 'Shattered Pacts'

function card(id: string, name: string, archetype: ArenaArchetype, cost: number, power: number, rarity: Rarity,
  art: string, abilities: ArenaAbility[], options: { spell?: boolean; support?: ArenaArchetype[] } = {}): CardDefinition {
  const illustration = CARD_DATABASE.find(card => card.definitionId === art)
  if (!illustration) throw new Error(`Missing illustration for ${id}: ${art}`)
  return { definitionId: id, name, cost, power, rarity, type: options.spell ? 'spell' : 'unit', keywords: [],
    affinity: illustration.affinity, imageUrl: ARENA_EXPANSION_ART[id] ?? illustration.imageUrl, arenaSet: ARENA_ETERNAL_CARD_IDS.includes(id) ? 'eternal' : 'expanded', arenaRelease: ARENA_EXPANSION_NAME,
    arenaArchetypes: [archetype, ...(options.support ?? [])], arenaAbility: abilities[0], arenaEffects: abilities.slice(1),
    description: abilities.map(describeArenaAbility).join(' ') }
}
const effect = (type: ArenaAbility['type'], value = 0, extra: Omit<ArenaAbility, 'type' | 'value'> = {}): ArenaAbility => ({ type, value, ...extra })

/** 48 collectible cards with dedicated Shattered Pacts artwork. */
export const ARENA_EXPANSION_CARDS: CardDefinition[] = [
  card('chalk_apprentice', 'Chalk Apprentice', 'transmutation', 1, 2, 'common', 'forge_apprentice', [effect('transmute_draw', 1)]),
  card('lead_to_gold', 'Lead to Gold', 'transmutation', 1, 0, 'common', 'temper', [effect('hand_weaken', 2), effect('draw', 1)], { spell: true, support: ['affliction'] }),
  card('mercury_scholar', 'Mercury Scholar', 'transmutation', 2, 2, 'uncommon', 'ritual_caster', [effect('transmute_hand', 1)]),
  card('prism_initiate', 'Prism Initiate', 'conduits', 2, 2, 'common', 'apprentice_mage', [effect('hand_boost', 2, { target: 'strongest' })]),
  card('glass_familiar', 'Glass Familiar', 'transmutation', 3, 2, 'common', 'spark_sprite', [effect('transmuted_power', 2), effect('grow', 1)]),
  card('alloy_guardian', 'Alloy Guardian', 'transmutation', 3, 2, 'uncommon', 'ancient_guardian', [effect('ward'), effect('rally', 2)]),
  card('crucible_seer', 'Crucible Seer', 'transmutation', 3, 3, 'uncommon', 'frost_sage', [effect('transmute_draw', 2)]),
  card('silver_equation', 'Silver Equation', 'transmutation', 2, 0, 'rare', 'arcane_echo', [effect('transmute_hand', 2)], { spell: true }),
  card('gilded_oracle', 'Gilded Oracle', 'transmutation', 4, 2, 'rare', 'summit_prophet', [effect('draw', 1), effect('draw', 1, { condition: 'transmuted' }), effect('rally', 1)]),
  card('quicksilver_archivist', 'Quicksilver Archivist', 'transmutation', 4, 3, 'rare', 'living_codex', [effect('transmute_hand', 2)]),
  card('paradox_regent', 'Paradox Regent', 'transmutation', 4, 3, 'legendary', 'the_archon', [effect('transmute_deck'), effect('draw', 1)]),
  card('philosopher_engine', 'Philosopher Engine', 'transmutation', 5, 2, 'legendary', 'ironclad_colossus', [effect('aura', 1), effect('rally', 3)], { support: ['conduits'] }),

  card('hollow_gift', 'Hollow Gift', 'sabotage', 1, 0, 'common', 'mana_surge', [effect('burden'), effect('draw', 1)], { spell: true }),
  card('counterfeit_courier', 'Counterfeit Courier', 'sabotage', 2, 3, 'common', 'village_scout', [effect('burden')]),
  card('ashen_envoy', 'Ashen Envoy', 'sabotage', 3, -5, 'uncommon', 'revenant', [effect('defect')], { support: ['affliction'] }),
  card('thorn_seeder', 'Thorn Seeder', 'sabotage', 2, 3, 'uncommon', 'mountain_hermit', [effect('plant')]),
  card('debt_broker', 'Debt Broker', 'sabotage', 3, 3, 'rare', 'soul_collector', [effect('burden'), effect('harvest', 1)], { support: ['affliction'] }),
  card('masked_ferryman', 'Masked Ferryman', 'sabotage', 3, 4, 'uncommon', 'rift_caller', [effect('send')]),
  card('tainted_idol', 'Tainted Idol', 'sabotage', 1, -2, 'common', 'bone_knight', [effect('draw', 2)], { support: ['transmutation'] }),
  card('splinter_agent', 'Splinter Agent', 'sabotage', 3, 4, 'rare', 'forge_wraith', [effect('plant'), effect('drain', 1, { target: 'weakest' })], { support: ['affliction'] }),
  card('false_standard', 'False Standard', 'sabotage', 2, 3, 'rare', 'shield_warden', [effect('token_aura', 2), effect('burden', 1, { target: 'self' })], { support: ['conduits'] }),
  card('exile_ritual', 'Exile Ritual', 'sabotage', 1, 0, 'common', 'phase_walk', [effect('send')], { spell: true }),
  card('court_of_thorns', 'Court of Thorns', 'sabotage', 5, 6, 'legendary', 'banshee_queen', [effect('plant', 0, { target: 'other_arenas', token: 'burden_token' })]),
  card('oathbreaker_duke', 'Oathbreaker Duke', 'sabotage', 4, -7, 'legendary', 'lord_of_bones', [effect('defect')], { support: ['affliction'] }),

  card('salt_hex', 'Salt Hex', 'affliction', 1, 0, 'common', 'grand_invocation', [effect('drain', 3, { target: 'weakest' })], { spell: true }),
  card('blight_acolyte', 'Blight Acolyte', 'affliction', 1, 1, 'common', 'ritual_caster', [effect('drain', 2, { target: 'weakest' })]),
  card('dusk_leech', 'Dusk Leech', 'affliction', 2, 2, 'uncommon', 'forge_wraith', [effect('siphon', 1)], { support: ['conduits'] }),
  card('rot_scribe', 'Rot Scribe', 'affliction', 3, 3, 'uncommon', 'living_codex', [effect('wither', 2, { target: 'weakest' })]),
  card('hollow_choir', 'Hollow Choir', 'affliction', 3, 3, 'uncommon', 'banshee_queen', [effect('afflict_all', 1)]),
  card('plague_cartographer', 'Plague Cartographer', 'affliction', 4, 4, 'rare', 'rift_caller', [effect('drain', 2, { target: 'other_arenas' })]),
  card('debt_collector', 'Debt Collector', 'affliction', 4, 4, 'rare', 'soul_collector', [effect('harvest', 2, { target: 'afflicted' })], { support: ['sabotage'] }),
  card('miasma_lantern', 'Miasma Lantern', 'affliction', 2, 2, 'rare', 'spark_sprite', [effect('siphon', 1, { timing: 'spell', oncePerTurn: true })], { support: ['conduits'] }),
  card('unmaking', 'Unmaking', 'affliction', 2, 0, 'common', 'arcane_echo', [effect('afflict_all', 2)], { spell: true }),
  card('pale_physician', 'Pale Physician', 'affliction', 2, 3, 'common', 'frost_sage', [effect('cleanse', 0, { target: 'weakest' })], { support: ['conduits'] }),
  card('censer_warden', 'Censer Warden', 'affliction', 3, 3, 'legendary', 'the_unbroken', [effect('ward'), effect('cleanse')]),
  card('famine_sovereign', 'Famine Sovereign', 'affliction', 6, 5, 'legendary', 'the_undying', [effect('siphon', 1, { target: 'all' })]),

  card('candle_tender', 'Candle Tender', 'conduits', 1, 2, 'common', 'village_scout', [effect('boost', 1, { target: 'weakest' })]),
  card('mirror_squire', 'Mirror Squire', 'conduits', 2, 2, 'common', 'shield_warden', [effect('copy_power', 0, { target: 'weakest' })], { support: ['transmutation'] }),
  card('current_runner', 'Current Runner', 'conduits', 2, 3, 'uncommon', 'wandering_blade', [effect('transfer', 2)]),
  card('ember_conduit', 'Ember Conduit', 'conduits', 2, 2, 'uncommon', 'forge_apprentice', [effect('boost', 2, { target: 'self', timing: 'spell', oncePerTurn: true })]),
  card('vessel_of_echoes', 'Vessel of Echoes', 'transmutation', 3, 0, 'rare', 'ancient_guardian', [effect('copy_power')], { support: ['conduits'] }),
  card('marrow_engine', 'Marrow Engine', 'conduits', 3, 4, 'uncommon', 'iron_golem', [effect('consume')], { support: ['sabotage'] }),
  card('inversion_rite', 'Inversion Rite', 'conduits', 2, 0, 'common', 'mana_surge', [effect('purify')], { spell: true, support: ['sabotage', 'affliction'] }),
  card('cleansing_flame', 'Cleansing Flame', 'conduits', 1, 0, 'common', 'temper', [effect('purge'), effect('cleanse', 0, { target: 'weakest' })], { spell: true, support: ['affliction'] }),
  card('equal_measure', 'Equal Measure', 'conduits', 4, 0, 'rare', 'grand_invocation', [effect('equalize', 3)], { spell: true }),
  card('sunwell_keeper', 'Sunwell Keeper', 'conduits', 4, 3, 'rare', 'summit_prophet', [effect('echo_power')]),
  card('last_light_beacon', 'Last Light Beacon', 'conduits', 5, 7, 'legendary', 'glacier_sovereign', [effect('distribute', 0, { timing: 'final' })]),
  card('prism_titan', 'Prism Titan', 'conduits', 6, 4, 'legendary', 'void_leviathan', [effect('double')], { support: ['transmutation'] }),
]

export const ARENA_TOKEN_DATABASE: CardDefinition[] = [
  { definitionId: 'cursed_offering', name: 'Cursed Offering', type: 'unit', cost: 0, power: -2, rarity: 'common',
    keywords: [], affinity: [], arenaToken: true, imageUrl: ARENA_EXPANSION_ART.cursed_offering ?? './cards/bone-knight.png',
    description: 'Generated unit. Disappears after its controller casts a spell in this arena.' },
  { definitionId: 'burden_token', name: 'Burden', type: 'unit', cost: 0, power: -1, rarity: 'common',
    keywords: [], affinity: [], arenaToken: true, imageUrl: ARENA_EXPANSION_ART.burden_token ?? './cards/ritual-caster.png',
    description: 'Generated unit. No ability. Occupies hand space until played, then occupies board space.' },
  EMBERLING,
]

export const ARENA_ARCHETYPE_DECKS: { id: ArenaArchetype; name: string; cards: string[] }[] = [
  { id: 'transmutation', name: 'Transmutation', cards: ['chalk_apprentice', 'village_scout', 'silver_equation', 'mercury_scholar', 'candle_tender', 'glass_familiar', 'alloy_guardian', 'ascended_prophet', 'gilded_oracle', 'paradox_regent', 'philosopher_engine', 'prism_titan'] },
  { id: 'sabotage', name: 'Sabotage', cards: ['tainted_idol', 'candle_tender', 'inversion_rite', 'exile_ritual', 'false_standard', 'thorn_seeder', 'oathbreaker_duke', 'ashen_envoy', 'smuggled_contract', 'tax_collector', 'court_of_thorns', 'contraband_cache'] },
  { id: 'affliction', name: 'Affliction', cards: ['blight_acolyte', 'cinder_script', 'salt_hex', 'dusk_leech', 'miasma_lantern', 'rot_scribe', 'hollow_choir', 'unmaking', 'plague_cartographer', 'debt_collector', 'famine_sovereign', 'warding_bell'] },
  { id: 'conduits', name: 'Conduits', cards: ['candle_tender', 'warding_bell', 'temper', 'prism_initiate', 'current_runner', 'ember_conduit', 'marrow_engine', 'vessel_of_echoes', 'arcane_echo', 'sunwell_keeper', 'last_light_beacon', 'prism_titan'] },
  { id: 'formation', name: 'Formation', cards: ['iron_flanker', 'chain_anchor', 'hold_the_line', 'chain_sentinel', 'warding_bell', 'break_standard', 'bridge_marshal', 'shield_warden', 'linebreaker', 'bastion_architect', 'banner_heir', 'grand_convergence'] },
  { id: 'wayfarers', name: 'Wayfarers', cards: ['trail_wisp', 'phase_walk', 'wayward_current', 'crossing_guard', 'pilgrim_compass', 'close_ranks', 'waystone_pilgrim', 'open_horizon', 'horizon_rider', 'linebreaker', 'rift_herald', 'wandering_colossus'] },
  { id: 'invocation', name: 'Invocation', cards: ['rune_attendant', 'cinder_script', 'mana_surge', 'measured_cast', 'glyph_scholar', 'ember_conduit', 'miasma_lantern', 'spellfont', 'arcane_echo', 'frost_elder', 'archmage', 'grand_convergence'] },
  { id: 'stewardship', name: 'Stewardship', cards: ['scrap_custodian', 'chain_anchor', 'chain_sentinel', 'linebreaker', 'war_standard', 'ember_incubator', 'relic_diver', 'master_forger', 'salvage_rite', 'null_sigil', 'bastion_architect', 'igna_unchained'] },
]
