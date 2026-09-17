import type { EnemyDefinition } from '../types/singleplayer.ts'

// ─── Act 1: Training Grounds ──────────────────────────────────────────────────

const ACT_1_COMMONS: EnemyDefinition[] = [
  {
    id: 'wild_boar',
    name: 'Wild Boar',
    minHp: 30,
    maxHp: 40,
    moves: [
      {
        id: 'charge',
        intent: { type: 'attack', damage: 12, hits: 1, description: 'Deals 12 damage' },
        weight: 4,
        notConsecutive: false,
      },
      {
        id: 'stampede',
        intent: {
          type: 'attack_debuff',
          damage: 8,
          hits: 1,
          statusId: 'vulnerable',
          statusStacks: 1,
          statusTarget: 'player',
          description: 'Deals 8 damage. Applies 1 Vulnerable',
        },
        weight: 2,
      },
      {
        id: 'recover',
        intent: { type: 'defend', blockAmount: 10, description: 'Gains 10 Block' },
        weight: 1,
        notConsecutive: true,
      },
    ],
  },
  {
    id: 'gladiator_trainee',
    name: 'Gladiator Trainee',
    minHp: 40,
    maxHp: 52,
    moves: [
      {
        id: 'warm_up',
        intent: {
          type: 'buff',
          statusId: 'strength',
          statusStacks: 2,
          statusTarget: 'self',
          description: 'Gains 2 Strength',
        },
        weight: 1,
        onlyFirstTurn: true,
      },
      {
        id: 'cut',
        intent: { type: 'attack', damage: 8, hits: 1, description: 'Deals 8 damage' },
        weight: 3,
        notFirstTurn: true,
      },
      {
        id: 'parry',
        intent: { type: 'defend', blockAmount: 8, description: 'Gains 8 Block' },
        weight: 2,
        notFirstTurn: true,
        notConsecutive: true,
      },
      {
        id: 'double_cut',
        intent: { type: 'multi_attack', damage: 6, hits: 2, description: 'Deals 6 damage twice' },
        weight: 2,
        notFirstTurn: true,
      },
    ],
  },
  {
    id: 'sand_spider',
    name: 'Sand Spider',
    minHp: 24,
    maxHp: 34,
    moves: [
      {
        id: 'bite',
        intent: {
          type: 'attack_debuff',
          damage: 5,
          hits: 1,
          statusId: 'poison',
          statusStacks: 1,
          statusTarget: 'player',
          description: 'Deals 5 damage. Applies 1 Poison',
        },
        weight: 3,
      },
      {
        id: 'poison_spit',
        intent: {
          type: 'debuff',
          statusId: 'poison',
          statusStacks: 3,
          statusTarget: 'player',
          description: 'Applies 3 Poison',
        },
        weight: 2,
        notConsecutive: true,
      },
      {
        id: 'scurry',
        intent: { type: 'defend', blockAmount: 6, description: 'Gains 6 Block' },
        weight: 1,
      },
    ],
  },
  {
    id: 'javelin_thrower',
    name: 'Javelin Thrower',
    minHp: 35,
    maxHp: 46,
    moves: [
      {
        id: 'quick_throw',
        intent: {
          type: 'attack_debuff',
          damage: 7,
          hits: 1,
          statusId: 'weak',
          statusStacks: 1,
          statusTarget: 'player',
          description: 'Deals 7 damage. Applies 1 Weak',
        },
        weight: 3,
      },
      {
        id: 'heavy_throw',
        intent: { type: 'attack', damage: 14, hits: 1, description: 'Deals 14 damage' },
        weight: 2,
      },
      {
        id: 'dodge',
        intent: { type: 'defend', blockAmount: 8, description: 'Gains 8 Block' },
        weight: 1,
        notConsecutive: true,
      },
    ],
  },
  {
    id: 'shield_warrior',
    name: 'Shield Warrior',
    minHp: 44,
    maxHp: 56,
    moves: [
      {
        id: 'shield_slam',
        intent: {
          type: 'attack',
          damage: 6,
          hits: 1,
          blockAmount: 8,
          description: 'Deals 6 damage. Gains 8 Block',
        },
        weight: 3,
      },
      {
        id: 'reinforce',
        intent: { type: 'defend', blockAmount: 14, description: 'Gains 14 Block' },
        weight: 2,
        notConsecutive: true,
      },
      {
        id: 'counter',
        intent: { type: 'attack', damage: 12, hits: 1, description: 'Deals 12 damage' },
        weight: 2,
        maxHpPercent: 50,
      },
    ],
  },
]

const ACT_1_ELITES: EnemyDefinition[] = [
  {
    id: 'veteran_gladiator',
    name: 'Veteran Gladiator',
    minHp: 100,
    maxHp: 115,
    isElite: true,
    moves: [
      {
        id: 'battle_stance',
        intent: {
          type: 'buff',
          statusId: 'strength',
          statusStacks: 2,
          statusTarget: 'self',
          description: 'Gains 2 Strength',
        },
        weight: 1,
        onlyFirstTurn: true,
      },
      {
        id: 'brutal_strike',
        intent: { type: 'attack', damage: 14, hits: 1, description: 'Deals 14 damage' },
        weight: 3,
        notFirstTurn: true,
      },
      {
        id: 'defensive_posture',
        intent: { type: 'defend', blockAmount: 12, description: 'Gains 12 Block' },
        weight: 2,
        notFirstTurn: true,
        notConsecutive: true,
      },
      {
        id: 'berserker_mode',
        intent: {
          type: 'attack_buff',
          damage: 10,
          hits: 1,
          statusId: 'strength',
          statusStacks: 2,
          statusTarget: 'self',
          description: 'Deals 10 damage. Gains 2 Strength',
        },
        weight: 3,
        maxHpPercent: 50,
        notFirstTurn: true,
      },
    ],
  },
  {
    id: 'the_lion',
    name: 'The Lion',
    minHp: 90,
    maxHp: 106,
    isElite: true,
    moves: [
      {
        id: 'pounce',
        intent: { type: 'multi_attack', damage: 8, hits: 2, description: 'Deals 8 damage twice' },
        weight: 3,
      },
      {
        id: 'roar',
        intent: {
          type: 'debuff',
          statusId: 'weak',
          statusStacks: 1,
          statusTarget: 'player',
          description: 'Applies 1 Weak',
        },
        weight: 1,
        notConsecutive: true,
      },
      {
        id: 'claw_swipe',
        intent: { type: 'attack', damage: 20, hits: 1, description: 'Deals 20 damage' },
        weight: 2,
      },
      {
        id: 'bloody_frenzy',
        intent: {
          type: 'buff',
          statusId: 'strength',
          statusStacks: 1,
          statusTarget: 'self',
          description: 'Gains 1 Strength',
        },
        weight: 1,
        notConsecutive: true,
      },
    ],
  },
]

const ACT_1_BOSS: EnemyDefinition[] = [
  {
    id: 'arena_master',
    name: 'The Arena Master',
    minHp: 210,
    maxHp: 240,
    isBoss: true,
    moves: [
      // Phase 1 (above 50% HP)
      {
        id: 'command',
        intent: { type: 'attack', damage: 12, hits: 1, description: 'Deals 12 damage' },
        weight: 2,
        minHpPercent: 50,
      },
      {
        id: 'rally',
        intent: {
          type: 'buff',
          statusId: 'strength',
          statusStacks: 2,
          statusTarget: 'self',
          description: 'Gains 2 Strength',
        },
        weight: 1,
        minHpPercent: 50,
        notConsecutive: true,
      },
      {
        id: 'decree',
        intent: {
          type: 'debuff',
          statusId: 'vulnerable',
          statusStacks: 2,
          statusTarget: 'player',
          description: 'Applies 2 Vulnerable',
        },
        weight: 1,
        minHpPercent: 50,
        notConsecutive: true,
      },
      // Phase 2 (below 50% HP)
      {
        id: 'execute',
        intent: { type: 'attack', damage: 22, hits: 1, description: 'Deals 22 damage' },
        weight: 3,
        maxHpPercent: 49,
      },
      {
        id: 'fortify',
        intent: { type: 'defend', blockAmount: 20, description: 'Gains 20 Block' },
        weight: 1,
        maxHpPercent: 49,
        notConsecutive: true,
      },
      {
        id: 'battle_cry_boss',
        intent: {
          type: 'buff',
          statusId: 'strength',
          statusStacks: 3,
          statusTarget: 'self',
          description: 'Gains 3 Strength',
        },
        weight: 1,
        maxHpPercent: 49,
        notConsecutive: true,
      },
    ],
  },
]

// ─── Act 2: The Grand Arena ────────────────────────────────────────────────────

const ACT_2_COMMONS: EnemyDefinition[] = [
  {
    id: 'net_fighter',
    name: 'Net Fighter',
    minHp: 50,
    maxHp: 65,
    moves: [
      {
        id: 'stab',
        intent: { type: 'attack', damage: 12, hits: 1, description: 'Deals 12 damage' },
        weight: 3,
      },
      {
        id: 'net_throw',
        intent: {
          type: 'debuff',
          statusId: 'vulnerable',
          statusStacks: 2,
          statusTarget: 'player',
          description: 'Applies 2 Vulnerable',
        },
        weight: 2,
        notConsecutive: true,
      },
      {
        id: 'entangle',
        intent: {
          type: 'debuff',
          statusId: 'weak',
          statusStacks: 2,
          statusTarget: 'player',
          description: 'Applies 2 Weak',
        },
        weight: 2,
        notConsecutive: true,
      },
    ],
  },
  {
    id: 'corrupted_centurion',
    name: 'Corrupted Centurion',
    minHp: 60,
    maxHp: 76,
    moves: [
      {
        id: 'strike',
        intent: { type: 'attack', damage: 12, hits: 1, description: 'Deals 12 damage' },
        weight: 3,
      },
      {
        id: 'formation',
        intent: { type: 'defend', blockAmount: 12, description: 'Gains 12 Block' },
        weight: 2,
        notConsecutive: true,
      },
      {
        id: 'legion_strike',
        intent: { type: 'multi_attack', damage: 7, hits: 2, description: 'Deals 7 damage twice' },
        weight: 2,
      },
    ],
  },
  {
    id: 'war_elephant',
    name: 'War Elephant',
    minHp: 80,
    maxHp: 96,
    moves: [
      {
        id: 'trample',
        intent: { type: 'attack', damage: 16, hits: 1, description: 'Deals 16 damage' },
        weight: 3,
      },
      {
        id: 'bellow',
        intent: {
          type: 'buff',
          statusId: 'strength',
          statusStacks: 2,
          statusTarget: 'self',
          description: 'Gains 2 Strength',
        },
        weight: 1,
        notConsecutive: true,
      },
      {
        id: 'elephant_charge',
        intent: {
          type: 'attack_debuff',
          damage: 8,
          hits: 1,
          statusId: 'vulnerable',
          statusStacks: 1,
          statusTarget: 'player',
          description: 'Deals 8 damage. Applies 1 Vulnerable',
        },
        weight: 2,
      },
    ],
  },
]

const ACT_2_ELITES: EnemyDefinition[] = [
  {
    id: 'the_gorgon',
    name: 'The Gorgon',
    minHp: 130,
    maxHp: 150,
    isElite: true,
    moves: [
      {
        id: 'petrify_gaze',
        intent: {
          type: 'debuff',
          statusId: 'frail',
          statusStacks: 2,
          statusTarget: 'player',
          description: 'Applies 2 Frail',
        },
        weight: 1,
        notConsecutive: true,
      },
      {
        id: 'poison_strike',
        intent: {
          type: 'attack_debuff',
          damage: 14,
          hits: 1,
          statusId: 'poison',
          statusStacks: 3,
          statusTarget: 'player',
          description: 'Deals 14 damage. Applies 3 Poison',
        },
        weight: 3,
      },
      {
        id: 'stone_slam',
        intent: { type: 'attack', damage: 25, hits: 1, description: 'Deals 25 damage' },
        weight: 2,
      },
    ],
  },
  {
    id: 'twin_blades',
    name: 'Twin Blades',
    minHp: 80,
    maxHp: 102,
    isElite: true,
    moves: [
      {
        id: 'whirlwind_intro',
        intent: {
          type: 'debuff',
          statusId: 'vulnerable',
          statusStacks: 1,
          statusTarget: 'player',
          description: 'Applies 1 Vulnerable and 1 Weak',
        },
        weight: 1,
        onlyFirstTurn: true,
      },
      {
        id: 'dual_strike',
        intent: { type: 'multi_attack', damage: 10, hits: 2, description: 'Deals 10 damage twice' },
        weight: 3,
        notFirstTurn: true,
      },
      {
        id: 'precision_cut',
        intent: { type: 'attack', damage: 18, hits: 1, description: 'Deals 18 damage' },
        weight: 2,
        notFirstTurn: true,
      },
      {
        id: 'defensive_roll',
        intent: { type: 'defend', blockAmount: 15, description: 'Gains 15 Block' },
        weight: 1,
        notFirstTurn: true,
        notConsecutive: true,
      },
    ],
  },
]

const ACT_2_BOSS: EnemyDefinition[] = [
  {
    id: 'beast_champion',
    name: 'The Beast Champion',
    minHp: 280,
    maxHp: 320,
    isBoss: true,
    moves: [
      {
        id: 'beastly_roar',
        intent: {
          type: 'attack_debuff',
          damage: 10,
          hits: 1,
          statusId: 'weak',
          statusStacks: 1,
          statusTarget: 'player',
          description: 'Deals 10 damage. Applies 1 Weak. Gains 2 Strength',
        },
        weight: 1,
        onlyFirstTurn: true,
      },
      {
        id: 'savage_strike',
        intent: { type: 'attack', damage: 18, hits: 1, description: 'Deals 18 damage' },
        weight: 3,
        notFirstTurn: true,
      },
      {
        id: 'primal_frenzy',
        intent: { type: 'multi_attack', damage: 8, hits: 3, description: 'Deals 8 damage 3 times' },
        weight: 2,
        notFirstTurn: true,
      },
      {
        id: 'blood_frenzy',
        intent: {
          type: 'buff',
          statusId: 'strength',
          statusStacks: 4,
          statusTarget: 'self',
          description: 'Gains 4 Strength',
        },
        weight: 2,
        maxHpPercent: 50,
        notConsecutive: true,
        notFirstTurn: true,
      },
    ],
  },
]

// ─── Act 3: The Tournament of Champions ───────────────────────────────────────

const ACT_3_COMMONS: EnemyDefinition[] = [
  {
    id: 'shadow_assassin',
    name: 'Shadow Assassin',
    minHp: 65,
    maxHp: 82,
    moves: [
      {
        id: 'shadow_strike',
        intent: { type: 'attack', damage: 16, hits: 1, description: 'Deals 16 damage' },
        weight: 3,
      },
      {
        id: 'vanish',
        intent: { type: 'defend', blockAmount: 15, description: 'Gains 15 Block' },
        weight: 2,
        notConsecutive: true,
      },
      {
        id: 'poison_blade',
        intent: {
          type: 'attack_debuff',
          damage: 8,
          hits: 1,
          statusId: 'poison',
          statusStacks: 3,
          statusTarget: 'player',
          description: 'Deals 8 damage. Applies 3 Poison',
        },
        weight: 2,
      },
    ],
  },
  {
    id: 'dark_centurion',
    name: 'Dark Centurion',
    minHp: 75,
    maxHp: 92,
    moves: [
      {
        id: 'iron_march',
        intent: {
          type: 'buff',
          statusId: 'strength',
          statusStacks: 2,
          statusTarget: 'self',
          description: 'Gains 2 Strength',
        },
        weight: 1,
        onlyFirstTurn: true,
      },
      {
        id: 'heavy_cut',
        intent: { type: 'attack', damage: 18, hits: 1, description: 'Deals 18 damage' },
        weight: 3,
        notFirstTurn: true,
      },
      {
        id: 'iron_shield',
        intent: { type: 'defend', blockAmount: 16, description: 'Gains 16 Block' },
        weight: 2,
        notFirstTurn: true,
        notConsecutive: true,
      },
      {
        id: 'legions_fury',
        intent: {
          type: 'multi_attack',
          damage: 9,
          hits: 2,
          description: 'Deals 9 damage twice',
        },
        weight: 2,
        notFirstTurn: true,
      },
    ],
  },
]

const ACT_3_BOSS: EnemyDefinition[] = [
  {
    id: 'undying_champion',
    name: 'The Undying Champion',
    minHp: 350,
    maxHp: 400,
    isBoss: true,
    moves: [
      {
        id: 'eternal_strike',
        intent: { type: 'attack', damage: 20, hits: 1, description: 'Deals 20 damage' },
        weight: 3,
      },
      {
        id: 'ancient_ritual',
        intent: {
          type: 'buff',
          statusId: 'thorns',
          statusStacks: 3,
          statusTarget: 'self',
          description: 'Gains 3 Strength and 3 Thorns',
        },
        weight: 1,
        notConsecutive: true,
      },
      {
        id: 'judgment',
        intent: {
          type: 'attack_debuff',
          damage: 25,
          hits: 1,
          statusId: 'vulnerable',
          statusStacks: 1,
          statusTarget: 'player',
          description: 'Deals 25 damage. Applies 1 Vulnerable and 1 Weak',
        },
        weight: 2,
      },
      {
        id: 'undying_rage',
        intent: {
          type: 'attack_buff',
          damage: 15,
          hits: 2,
          statusId: 'strength',
          statusStacks: 3,
          statusTarget: 'self',
          description: 'Deals 15 damage twice. Gains 3 Strength',
        },
        weight: 2,
        maxHpPercent: 40,
      },
    ],
  },
]

// ─── Full database ────────────────────────────────────────────────────────────

export const ENEMY_DATABASE: EnemyDefinition[] = [
  ...ACT_1_COMMONS,
  ...ACT_1_ELITES,
  ...ACT_1_BOSS,
  ...ACT_2_COMMONS,
  ...ACT_2_ELITES,
  ...ACT_2_BOSS,
  ...ACT_3_COMMONS,
  ...ACT_3_BOSS,
]

export const ACT_ENEMY_POOLS: Record<1 | 2 | 3, {
  common: string[]
  elite: string[]
  boss: string
}> = {
  1: {
    common: ['wild_boar', 'gladiator_trainee', 'sand_spider', 'javelin_thrower', 'shield_warrior'],
    elite: ['veteran_gladiator', 'the_lion'],
    boss: 'arena_master',
  },
  2: {
    common: ['net_fighter', 'corrupted_centurion', 'war_elephant'],
    elite: ['the_gorgon', 'twin_blades'],
    boss: 'beast_champion',
  },
  3: {
    common: ['shadow_assassin', 'dark_centurion'],
    elite: ['the_gorgon', 'twin_blades'],
    boss: 'undying_champion',
  },
}
