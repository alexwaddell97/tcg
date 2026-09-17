import type { GladiatorClassDefinition } from '../types/singleplayer.ts'

// ─── Gladiator Classes ────────────────────────────────────────────────────────
//
// Three distinct playstyles:
//   Murmillo   — Shield fighter: high HP, defensive, iron gladius + wooden buckler
//   Retiarius  — Net caster: medium HP, vulnerable control, net trident + weighted net
//   Secutor    — Berserker: low HP, aggressive, twin blades + padded wrap

export const GLADIATOR_CLASSES: GladiatorClassDefinition[] = [
  {
    id: 'murmillo',
    name: 'Murmillo',
    icon: '🛡️',
    description: 'The shield fighter. Outlast your opponent through superior defence.',
    loreText:
      'Born of the legions, the Murmillo fights with discipline — not fury. Every blow blocked is a battle won.',
    startingMaxHp: 85,
    starterDeckIds: [
      'slash',
      'slash',
      'slash',
      'slash',
      'raise_shield',
      'raise_shield',
      'raise_shield',
      'raise_shield',
      'raise_shield',
      'armour_crash',
    ],
    startingWeapon: 'iron_gladius',
    startingArmor: 'chain_lorica',
    startingOffhand: 'wooden_buckler',
    bonusDescription: 'Starts with 3 extra Block cards and heavier armour.',
  },
  {
    id: 'retiarius',
    name: 'Retiarius',
    icon: '🔱',
    description: 'The net caster. Weaken foes with Vulnerable before delivering precise strikes.',
    loreText:
      'The crowd loves the Retiarius — the dance of the net, the deadly lunge of the trident. Beauty and brutality.',
    startingMaxHp: 75,
    starterDeckIds: [
      'slash',
      'slash',
      'slash',
      'slash',
      'slash',
      'raise_shield',
      'raise_shield',
      'raise_shield',
      'armour_crash',
      'armour_crash',
    ],
    startingWeapon: 'net_trident',
    startingArmor: 'padded_wrap',
    startingOffhand: 'weighted_net',
    bonusDescription: 'Starts with net weapons that apply Vulnerable on attacks.',
  },
  {
    id: 'secutor',
    name: 'Secutor',
    icon: '⚡',
    description: 'The berserker. Strike fast and strike often — overwhelm before you can be stopped.',
    loreText:
      "Speed is the Secutor's armour. Wounds don't matter if the opponent falls first.",
    startingMaxHp: 70,
    starterDeckIds: [
      'slash',
      'slash',
      'slash',
      'slash',
      'slash',
      'slash',
      'raise_shield',
      'raise_shield',
      'armour_crash',
      'armour_crash',
    ],
    startingWeapon: 'twin_blades',
    startingArmor: 'padded_wrap',
    startingOffhand: null,
    bonusDescription: 'Starts with twin blades for massive Strength bonus, trades defence for offence.',
  },
]

export const CLASS_DATABASE: Record<string, GladiatorClassDefinition> = Object.fromEntries(
  GLADIATOR_CLASSES.map((c) => [c.id, c])
)
