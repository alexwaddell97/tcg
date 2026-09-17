import type { SPCardDefinition } from '../types/singleplayer.ts'

// ─── Basic / Starter Cards ────────────────────────────────────────────────────

const BASIC_CARDS: SPCardDefinition[] = [
  {
    id: 'slash',
    name: 'Slash',
    type: 'attack',
    rarity: 'basic',
    energyCost: 1,
    effects: [{ type: 'deal_damage', value: 6 }],
    description: 'Deal 6 damage.',
    flavourText: 'The first lesson in the arena.',
  },
  {
    id: 'raise_shield',
    name: 'Raise Shield',
    type: 'skill',
    rarity: 'basic',
    energyCost: 1,
    effects: [{ type: 'gain_block', value: 5 }],
    description: 'Gain 5 Block.',
    flavourText: 'Survive long enough to find an opening.',
  },
  {
    id: 'armour_crash',
    name: 'Armour Crash',
    type: 'attack',
    rarity: 'basic',
    energyCost: 2,
    effects: [
      { type: 'deal_damage', value: 8 },
      { type: 'gain_block', value: 8 },
    ],
    description: 'Deal 8 damage. Gain 8 Block.',
    flavourText: 'Crash through their guard, then brace for the counter.',
  },
  {
    id: 'wound',
    name: 'Wound',
    type: 'skill',
    rarity: 'special',
    energyCost: 0,
    effects: [],
    description: 'Unplayable.',
    flavourText: 'It hurts just looking at it.',
  },
]

// ─── Common Attack Cards ──────────────────────────────────────────────────────

const COMMON_ATTACK_CARDS: SPCardDefinition[] = [
  {
    id: 'spear_thrust',
    name: 'Spear Thrust',
    type: 'attack',
    rarity: 'common',
    energyCost: 1,
    effects: [{ type: 'deal_damage_multi', value: 5, secondValue: 2 }],
    description: 'Deal 5 damage twice.',
    flavourText: 'Quick. Precise. Lethal.',
  },
  {
    id: 'overhead_smash',
    name: 'Overhead Smash',
    type: 'attack',
    rarity: 'common',
    energyCost: 2,
    effects: [{ type: 'deal_damage', value: 14 }],
    description: 'Deal 14 damage.',
  },
  {
    id: 'arena_roar',
    name: 'Arena Roar',
    type: 'attack',
    rarity: 'common',
    energyCost: 1,
    effects: [
      { type: 'deal_damage', value: 9 },
      { type: 'draw_cards', value: 1 },
    ],
    description: 'Deal 9 damage. Draw 1 card.',
    flavourText: 'The crowd feeds your fury.',
  },
  {
    id: 'sand_throw',
    name: 'Sand Throw',
    type: 'attack',
    rarity: 'common',
    energyCost: 0,
    effects: [
      { type: 'apply_status_enemy', statusId: 'vulnerable', statusStacks: 1 },
    ],
    description: 'Apply 1 Vulnerable to the enemy.',
    flavourText: 'An old trick. Still works.',
  },
  {
    id: 'blood_offering',
    name: 'Blood Offering',
    type: 'attack',
    rarity: 'common',
    energyCost: 2,
    effects: [
      { type: 'deal_damage', value: 13 },
      { type: 'apply_status_enemy', statusId: 'weak', statusStacks: 1 },
      { type: 'apply_status_enemy', statusId: 'vulnerable', statusStacks: 1 },
    ],
    description: 'Deal 13 damage. Apply 1 Weak and 1 Vulnerable.',
  },
  {
    id: 'wild_swing',
    name: 'Wild Swing',
    type: 'attack',
    rarity: 'common',
    energyCost: 1,
    effects: [
      { type: 'deal_damage', value: 12 },
      { type: 'add_wound_to_discard' },
    ],
    description: 'Deal 12 damage. Add a Wound to your discard pile.',
    flavourText: 'Power has its price.',
  },
]

// ─── Common Skill Cards ───────────────────────────────────────────────────────

const COMMON_SKILL_CARDS: SPCardDefinition[] = [
  {
    id: 'crowd_favor',
    name: "Crowd's Favor",
    type: 'skill',
    rarity: 'common',
    energyCost: 1,
    effects: [
      { type: 'gain_block', value: 8 },
      { type: 'draw_cards', value: 1 },
    ],
    description: 'Gain 8 Block. Draw 1 card.',
    flavourText: 'The roar of the crowd steadies your nerves.',
  },
  {
    id: 'flex',
    name: 'Flex',
    type: 'skill',
    rarity: 'common',
    energyCost: 0,
    effects: [
      { type: 'apply_status_self', statusId: 'strength', statusStacks: 2 },
    ],
    description: 'Gain 2 Strength.',
    flavourText: 'Raw muscle, refined purpose.',
  },
  {
    id: 'true_grit',
    name: 'True Grit',
    type: 'skill',
    rarity: 'common',
    energyCost: 1,
    effects: [
      { type: 'gain_block', value: 7 },
      { type: 'exhaust_random_hand' },
    ],
    description: 'Gain 7 Block. Exhaust a random card in your hand.',
    flavourText: 'Shed the weight. Hold the line.',
  },
  {
    id: 'intimidation',
    name: 'Intimidation',
    type: 'skill',
    rarity: 'common',
    energyCost: 1,
    effects: [
      { type: 'apply_status_enemy', statusId: 'weak', statusStacks: 2 },
    ],
    description: 'Apply 2 Weak to the enemy.',
    exhausts: true,
    flavourText: 'One look. That is all it takes.',
  },
  {
    id: 'sentinel',
    name: 'Sentinel',
    type: 'skill',
    rarity: 'common',
    energyCost: 2,
    effects: [{ type: 'gain_block', value: 14 }],
    description: 'Gain 14 Block.',
    flavourText: 'A wall of iron will.',
  },
]

// ─── Common Power Cards ───────────────────────────────────────────────────────

const COMMON_POWER_CARDS: SPCardDefinition[] = [
  {
    id: 'combust',
    name: 'Combust',
    type: 'power',
    rarity: 'common',
    energyCost: 1,
    effects: [{ type: 'apply_status_self', statusId: 'combust', statusStacks: 1 }],
    description: 'At the end of each turn, lose 1 HP and deal 5 damage to the enemy.',
    flavourText: 'Burning from the inside out.',
  },
  {
    id: 'feel_no_pain',
    name: 'Feel No Pain',
    type: 'power',
    rarity: 'common',
    energyCost: 1,
    effects: [{ type: 'apply_status_self', statusId: 'feel_no_pain', statusStacks: 3 }],
    description: 'Whenever you Exhaust a card, gain 3 Block.',
  },
]

// ─── Uncommon Attack Cards ────────────────────────────────────────────────────

const UNCOMMON_ATTACK_CARDS: SPCardDefinition[] = [
  {
    id: 'gladiatorial_fury',
    name: 'Gladiatorial Fury',
    type: 'attack',
    rarity: 'uncommon',
    energyCost: 2,
    effects: [{ type: 'deal_damage_multi', value: 5, secondValue: 4 }],
    description: 'Deal 5 damage 4 times.',
    flavourText: 'The arena erupts.',
  },
  {
    id: 'counter_strike',
    name: 'Counter Strike',
    type: 'attack',
    rarity: 'uncommon',
    energyCost: 1,
    effects: [
      { type: 'deal_damage', value: 9 },
      { type: 'recycle_discard_top' },
    ],
    description: 'Deal 9 damage. Move the top card of your discard pile to your draw pile.',
  },
  {
    id: 'carnage',
    name: 'Carnage',
    type: 'attack',
    rarity: 'uncommon',
    energyCost: 2,
    effects: [{ type: 'deal_damage', value: 20 }],
    description: 'Deal 20 damage. Exhaust.',
    exhausts: true,
    flavourText: 'An unsustainable fury. Worth every cost.',
  },
  {
    id: 'execution_strike',
    name: 'Execution Strike',
    type: 'attack',
    rarity: 'uncommon',
    energyCost: 3,
    effects: [{ type: 'deal_damage', value: 32 }],
    description: 'Deal 32 damage.',
    flavourText: 'This is how legends are made.',
  },
  {
    id: 'net_throw',
    name: 'Net Throw',
    type: 'attack',
    rarity: 'uncommon',
    energyCost: 1,
    effects: [
      { type: 'apply_status_enemy', statusId: 'vulnerable', statusStacks: 2 },
      { type: 'draw_cards', value: 1 },
    ],
    description: 'Apply 2 Vulnerable to the enemy. Draw 1 card.',
  },
]

// ─── Uncommon Skill Cards ─────────────────────────────────────────────────────

const UNCOMMON_SKILL_CARDS: SPCardDefinition[] = [
  {
    id: 'entrench',
    name: 'Entrench',
    type: 'skill',
    rarity: 'uncommon',
    energyCost: 2,
    effects: [{ type: 'double_block' }],
    description: 'Double your current Block.',
    flavourText: 'Immovable. Inevitable.',
  },
  {
    id: 'veterans_technique',
    name: "Veteran's Technique",
    type: 'skill',
    rarity: 'uncommon',
    energyCost: 1,
    effects: [{ type: 'gain_block', value: 14 }],
    description: 'Gain 14 Block. Exhaust.',
    exhausts: true,
    flavourText: 'Old warriors do not fight hard. They fight smart.',
  },
  {
    id: 'impervious',
    name: 'Impervious',
    type: 'skill',
    rarity: 'uncommon',
    energyCost: 2,
    effects: [{ type: 'gain_block', value: 30 }],
    description: 'Gain 30 Block. Exhaust.',
    exhausts: true,
    flavourText: 'Not even a scratch.',
  },
  {
    id: 'upgrade_armour',
    name: 'Upgrade Armour',
    type: 'skill',
    rarity: 'uncommon',
    energyCost: 1,
    effects: [
      { type: 'gain_block', value: 6 },
      { type: 'upgrade_random_hand' },
    ],
    description: 'Gain 6 Block. Upgrade a random card in your hand for this combat.',
    flavourText: 'New edge. New resolve.',
  },
]

// ─── Uncommon Power Cards ─────────────────────────────────────────────────────

const UNCOMMON_POWER_CARDS: SPCardDefinition[] = [
  {
    id: 'metallicize',
    name: 'Metallicize',
    type: 'power',
    rarity: 'uncommon',
    energyCost: 1,
    effects: [{ type: 'apply_status_self', statusId: 'metallicize', statusStacks: 3 }],
    description: 'At the start of each turn, gain 3 Block.',
    flavourText: 'Forged by the fires of the arena.',
  },
  {
    id: 'juggernaut',
    name: 'Juggernaut',
    type: 'power',
    rarity: 'uncommon',
    energyCost: 2,
    effects: [{ type: 'apply_status_self', statusId: 'juggernaut', statusStacks: 5 }],
    description: 'Whenever you gain Block, deal 5 damage to the enemy.',
    flavourText: 'A moving fortress.',
  },
  {
    id: 'battle_trance',
    name: 'Battle Trance',
    type: 'power',
    rarity: 'uncommon',
    energyCost: 0,
    effects: [{ type: 'apply_status_self', statusId: 'brutality', statusStacks: 1 }],
    description: 'At the start of each turn, lose 1 HP and draw 1 card.',
    flavourText: 'Pain sharpens focus.',
  },
]

// ─── Rare Attack Cards ────────────────────────────────────────────────────────

const RARE_ATTACK_CARDS: SPCardDefinition[] = [
  {
    id: 'reap',
    name: 'Reap',
    type: 'attack',
    rarity: 'rare',
    energyCost: 2,
    effects: [
      { type: 'deal_damage_multi', value: 4, secondValue: 5 },
      { type: 'heal', value: 4 },
    ],
    description: 'Deal 4 damage 5 times. Heal 4 HP.',
    flavourText: 'Take what is owed.',
  },
  {
    id: 'desperation',
    name: 'Desperation',
    type: 'attack',
    rarity: 'rare',
    energyCost: 0,
    effects: [
      { type: 'lose_hp_self', value: 6 },
      { type: 'gain_energy', value: 2 },
      { type: 'draw_cards', value: 3 },
    ],
    description: 'Lose 6 HP. Gain 2 Aether. Draw 3 cards. Exhaust.',
    exhausts: true,
    flavourText: 'Everything, all at once.',
  },
  {
    id: 'feed',
    name: 'Feed',
    type: 'attack',
    rarity: 'rare',
    energyCost: 1,
    effects: [
      { type: 'deal_damage', value: 10 },
      { type: 'heal', value: 3 },
    ],
    description: 'Deal 10 damage. Heal 3 HP.',
    exhausts: true,
    flavourText: 'The arena gives. The arena takes.',
  },
]

// ─── Rare Skill Cards ─────────────────────────────────────────────────────────

const RARE_SKILL_CARDS: SPCardDefinition[] = [
  {
    id: 'second_wind',
    name: 'Second Wind',
    type: 'skill',
    rarity: 'rare',
    energyCost: 1,
    effects: [
      // Engine handles: exhaust all non-attacks in hand, gain 5 block each
      { type: 'exhaust_random_hand' },
    ],
    description: 'Exhaust all non-Attack cards in your hand. Gain 5 Block for each card Exhausted.',
    flavourText: 'Strip away the excess. Find the warrior beneath.',
  },
]

// ─── Rare Power Cards ─────────────────────────────────────────────────────────

const RARE_POWER_CARDS: SPCardDefinition[] = [
  {
    id: 'demon_form',
    name: 'Demon Form',
    type: 'power',
    rarity: 'rare',
    energyCost: 3,
    effects: [{ type: 'apply_status_self', statusId: 'demon_form', statusStacks: 2 }],
    description: 'At the start of each turn, gain 2 Strength.',
    flavourText: 'The gladiator becomes something else entirely.',
  },
  {
    id: 'rally',
    name: 'Rally',
    type: 'power',
    rarity: 'rare',
    energyCost: 3,
    effects: [{ type: 'apply_status_self', statusId: 'ritual', statusStacks: 2 }],
    description: 'At the end of each turn, gain 2 Strength.',
    flavourText: 'Each blow lands heavier than the last.',
  },
]

// ─── Export ───────────────────────────────────────────────────────────────────

export const GLADIATOR_CARD_DATABASE: SPCardDefinition[] = [
  ...BASIC_CARDS,
  ...COMMON_ATTACK_CARDS,
  ...COMMON_SKILL_CARDS,
  ...COMMON_POWER_CARDS,
  ...UNCOMMON_ATTACK_CARDS,
  ...UNCOMMON_SKILL_CARDS,
  ...UNCOMMON_POWER_CARDS,
  ...RARE_ATTACK_CARDS,
  ...RARE_SKILL_CARDS,
  ...RARE_POWER_CARDS,
]

/** The starter deck given to every new run: 5× Slash, 4× Raise Shield, 1× Armour Crash */
export const STARTER_DECK_IDS: string[] = [
  'slash', 'slash', 'slash', 'slash', 'slash',
  'raise_shield', 'raise_shield', 'raise_shield', 'raise_shield',
  'armour_crash',
]

/** Reward pool: cards that can appear as combat rewards (non-basic, non-special) */
export const REWARD_POOL: SPCardDefinition[] = GLADIATOR_CARD_DATABASE.filter(
  (c) => c.rarity !== 'basic' && c.rarity !== 'special'
)
