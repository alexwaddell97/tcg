import type { ArenaArchetype, ArenaIndex, ArenaSlotIndex } from '../packages/shared/src/index.ts'
export type CurvePlay = [card: string, arena: ArenaIndex, position?: ArenaSlotIndex]
/** Authored examples, not a bot or a promise that a shuffled opening always follows this line. */
export const FOUNDATION_CURVES: { id: ArenaArchetype; order: string[]; turns: CurvePlay[][] }[] = [
  { id: 'transmutation', order: ['chalk_apprentice', 'mercury_scholar', 'glass_familiar', 'village_scout', 'philosopher_engine', 'candle_tender', 'paradox_regent', 'gilded_oracle', 'alloy_guardian', 'ascended_prophet', 'silver_equation', 'prism_titan'],
    turns: [[['chalk_apprentice', 0]], [['mercury_scholar', 1]], [['glass_familiar', 1], ['village_scout', 0]], [['paradox_regent', 2]], [['philosopher_engine', 0], ['alloy_guardian', 2], ['candle_tender', 0]], [['gilded_oracle', 1], ['ascended_prophet', 2]]] },
  { id: 'sabotage', order: ['tainted_idol', 'exile_ritual', 'false_standard', 'candle_tender', 'contraband_cache', 'inversion_rite', 'ashen_envoy', 'thorn_seeder', 'court_of_thorns', 'oathbreaker_duke', 'tax_collector', 'smuggled_contract'],
    turns: [[['tainted_idol', 1]], [['false_standard', 0]], [['contraband_cache', 2]], [['burden_token', 2], ['exile_ritual', 2], ['ashen_envoy', 1]], [['court_of_thorns', 0]], [['oathbreaker_duke', 0], ['inversion_rite', 1]]] },
  { id: 'affliction', order: ['blight_acolyte', 'dusk_leech', 'cinder_script', 'rot_scribe', 'miasma_lantern', 'salt_hex', 'unmaking', 'hollow_choir', 'famine_sovereign', 'plague_cartographer', 'debt_collector', 'warding_bell'],
    turns: [[['blight_acolyte', 0]], [['dusk_leech', 1]], [['rot_scribe', 1]], [['miasma_lantern', 1], ['salt_hex', 1], ['cinder_script', 1]], [['hollow_choir', 0], ['unmaking', 0]], [['famine_sovereign', 2]]] },
  { id: 'conduits', order: ['candle_tender', 'prism_initiate', 'temper', 'sunwell_keeper', 'current_runner', 'marrow_engine', 'vessel_of_echoes', 'last_light_beacon', 'prism_titan', 'ember_conduit', 'arcane_echo', 'warding_bell'],
    turns: [[['candle_tender', 0]], [['prism_initiate', 1]], [['current_runner', 1], ['temper', 0]], [['sunwell_keeper', 1]], [['last_light_beacon', 2]], [['prism_titan', 2]]] },
  { id: 'formation', order: ['iron_flanker', 'chain_sentinel', 'chain_anchor', 'bridge_marshal', 'warding_bell', 'shield_warden', 'linebreaker', 'banner_heir', 'grand_convergence', 'hold_the_line', 'break_standard', 'bastion_architect'],
    turns: [[['iron_flanker', 0, 0]], [['chain_sentinel', 0, 2]], [['chain_anchor', 0, 1], ['warding_bell', 0, 3]], [['linebreaker', 1, 0]], [['banner_heir', 1, 3]], [['shield_warden', 1, 1], ['grand_convergence', 1]]] },
  { id: 'wayfarers', order: ['trail_wisp', 'crossing_guard', 'wayward_current', 'phase_walk', 'pilgrim_compass', 'waystone_pilgrim', 'horizon_rider', 'wandering_colossus', 'rift_herald', 'linebreaker', 'open_horizon', 'close_ranks'],
    turns: [[['trail_wisp', 0, 0]], [['crossing_guard', 0, 1]], [['pilgrim_compass', 1, 1], ['phase_walk', 1]], [['horizon_rider', 0, 2]], [['wandering_colossus', 2, 0]], [['rift_herald', 2, 1], ['wayward_current', 0]]] },
  { id: 'invocation', order: ['rune_attendant', 'glyph_scholar', 'cinder_script', 'mana_surge', 'ember_conduit', 'miasma_lantern', 'spellfont', 'arcane_echo', 'frost_elder', 'archmage', 'grand_convergence', 'measured_cast'],
    turns: [[['rune_attendant', 0, 0]], [['glyph_scholar', 0, 1]], [['ember_conduit', 0, 2], ['cinder_script', 0]], [['spellfont', 0, 3], ['arcane_echo', 0]], [['archmage', 1, 0]], [['frost_elder', 1, 1], ['mana_surge', 1]]] },
  { id: 'stewardship', order: ['scrap_custodian', 'war_standard', 'chain_anchor', 'chain_sentinel', 'salvage_rite', 'master_forger', 'igna_unchained', 'ember_incubator', 'bastion_architect', 'linebreaker', 'relic_diver', 'null_sigil'],
    turns: [[['scrap_custodian', 0, 0]], [['war_standard', 0, 1]], [['chain_sentinel', 0, 2], ['chain_anchor', 0, 3]], [['salvage_rite', 0], ['master_forger', 1, 0]], [['igna_unchained', 1, 2]], [['bastion_architect', 2, 0], ['ember_incubator', 1, 1]]] },
]
