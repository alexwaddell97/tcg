import type { EquipmentDefinition } from '../types/singleplayer.ts'

// ─── Weapons ─────────────────────────────────────────────────────────────────

const WEAPONS: EquipmentDefinition[] = [
  {
    id: 'iron_gladius',
    name: 'Iron Gladius',
    slot: 'weapon',
    tier: 1,
    icon: '⚔️',
    description: 'Gain 3 Strength at the start of each combat.',
    effects: [{ type: 'strength_start', value: 3 }],
    upgradesTo: 'veterans_gladius',
    flavourText: 'Standard issue to every gladiator who enters the sands.',
  },
  {
    id: 'veterans_gladius',
    name: "Veteran's Gladius",
    slot: 'weapon',
    tier: 2,
    icon: '⚔️',
    description: 'Gain 6 Strength at the start of each combat.',
    effects: [{ type: 'strength_start', value: 6 }],
    flavourText: 'Notched by a hundred victories, still razor sharp.',
  },
  {
    id: 'net_trident',
    name: 'Net Trident',
    slot: 'weapon',
    tier: 1,
    icon: '🔱',
    description: 'Gain 2 Strength at combat start. First 2 attacks apply Vulnerable to the enemy.',
    effects: [
      { type: 'strength_start', value: 2 },
      { type: 'net_charges', value: 2 },
    ],
    upgradesTo: 'balanced_trident',
    flavourText: "The retiarius' deadliest tool — strike, ensnare, repeat.",
  },
  {
    id: 'balanced_trident',
    name: 'Balanced Trident',
    slot: 'weapon',
    tier: 2,
    icon: '🔱',
    description: 'Gain 3 Strength at combat start. First 3 attacks apply Vulnerable to the enemy.',
    effects: [
      { type: 'strength_start', value: 3 },
      { type: 'net_charges', value: 3 },
    ],
    flavourText: 'Perfectly weighted for the kill strike after the net.',
  },
  {
    id: 'twin_blades',
    name: 'Twin Blades',
    slot: 'weapon',
    tier: 1,
    icon: '🗡️',
    description: 'Gain 4 Strength at the start of each combat.',
    effects: [{ type: 'strength_start', value: 4 }],
    upgradesTo: 'razor_twin_blades',
    flavourText: 'Two blades, twice the fury.',
  },
  {
    id: 'razor_twin_blades',
    name: 'Razor Twin Blades',
    slot: 'weapon',
    tier: 2,
    icon: '🗡️',
    description: 'Gain 7 Strength at the start of each combat.',
    effects: [{ type: 'strength_start', value: 7 }],
    flavourText: 'Honed to draw blood before the crowd even takes its seat.',
  },
]

// ─── Armors ──────────────────────────────────────────────────────────────────

const ARMORS: EquipmentDefinition[] = [
  {
    id: 'padded_wrap',
    name: 'Padded Wrap',
    slot: 'armor',
    tier: 1,
    icon: '🥋',
    description: 'Reduce all incoming attack damage by 2.',
    effects: [{ type: 'damage_reduction', value: 2 }],
    upgradesTo: 'leather_lorica',
    flavourText: 'Better than bare skin, barely.',
  },
  {
    id: 'leather_lorica',
    name: 'Leather Lorica',
    slot: 'armor',
    tier: 2,
    icon: '🥋',
    description: 'Reduce all incoming attack damage by 4. Gain 15 Max HP.',
    effects: [
      { type: 'damage_reduction', value: 4 },
      { type: 'max_hp', value: 15 },
    ],
    flavourText: 'Hardened leather reinforced with iron studs at the joints.',
  },
  {
    id: 'chain_lorica',
    name: 'Chain Lorica',
    slot: 'armor',
    tier: 1,
    icon: '⛓️',
    description: 'Reduce all incoming attack damage by 3. Gain 3 Block at combat start.',
    effects: [
      { type: 'damage_reduction', value: 3 },
      { type: 'block_start', value: 3 },
    ],
    upgradesTo: 'heavy_lorica',
    flavourText: 'Chain rings that have deflected more blades than counted.',
  },
  {
    id: 'heavy_lorica',
    name: 'Heavy Lorica',
    slot: 'armor',
    tier: 2,
    icon: '⛓️',
    description: 'Reduce all incoming attack damage by 5. Gain 5 Block at combat start.',
    effects: [
      { type: 'damage_reduction', value: 5 },
      { type: 'block_start', value: 5 },
    ],
    flavourText: 'The crowd groans when they see a gladiator enter in heavy iron.',
  },
  {
    id: 'studded_leather',
    name: 'Studded Leather',
    slot: 'armor',
    tier: 1,
    icon: '🦔',
    description: 'Reduce all incoming attack damage by 2. Gain 3 Thorns at combat start.',
    effects: [
      { type: 'damage_reduction', value: 2 },
      { type: 'thorns_start', value: 3 },
    ],
    upgradesTo: 'champions_leather',
    flavourText: 'Iron spikes make every tackle a regret for the attacker.',
  },
  {
    id: 'champions_leather',
    name: "Champion's Leather",
    slot: 'armor',
    tier: 2,
    icon: '🦔',
    description: 'Reduce all incoming attack damage by 3. Gain 5 Thorns at combat start.',
    effects: [
      { type: 'damage_reduction', value: 3 },
      { type: 'thorns_start', value: 5 },
    ],
    flavourText: "Awarded only to gladiators who've bled for the crowd and lived.",
  },
]

// ─── Offhands ─────────────────────────────────────────────────────────────────

const OFFHANDS: EquipmentDefinition[] = [
  {
    id: 'wooden_buckler',
    name: 'Wooden Buckler',
    slot: 'offhand',
    tier: 1,
    icon: '🛡️',
    description: 'Gain 5 Block at the start of each combat.',
    effects: [{ type: 'block_start', value: 5 }],
    upgradesTo: 'iron_buckler',
    flavourText: 'Light enough to carry all day. Enough to turn a blade.',
  },
  {
    id: 'iron_buckler',
    name: 'Iron Buckler',
    slot: 'offhand',
    tier: 2,
    icon: '🛡️',
    description: 'Gain 8 Block at the start of each combat.',
    effects: [{ type: 'block_start', value: 8 }],
    flavourText: 'The dull thud of iron stopping a blade is the best sound in the arena.',
  },
  {
    id: 'weighted_net',
    name: 'Weighted Net',
    slot: 'offhand',
    tier: 1,
    icon: '🕸️',
    description: 'First 3 attacks apply Vulnerable to the enemy.',
    effects: [{ type: 'net_charges', value: 3 }],
    upgradesTo: 'precision_net',
    flavourText: "The crowd cheers whenever the net falls — they know what comes next.",
  },
  {
    id: 'precision_net',
    name: 'Precision Net',
    slot: 'offhand',
    tier: 2,
    icon: '🕸️',
    description: 'First 5 attacks apply Vulnerable to the enemy.',
    effects: [{ type: 'net_charges', value: 5 }],
    flavourText: 'Woven from the finest rope, weighted at the edges for a perfect throw.',
  },
  {
    id: 'wrist_brace',
    name: 'Wrist Brace',
    slot: 'offhand',
    tier: 1,
    icon: '🤲',
    description: 'Gain 10 Max HP. Gain 2 Block at combat start.',
    effects: [
      { type: 'max_hp', value: 10 },
      { type: 'block_start', value: 2 },
    ],
    upgradesTo: 'war_bracer',
    flavourText: 'Straps of leather bound tight over hardened bone.',
  },
  {
    id: 'war_bracer',
    name: 'War Bracer',
    slot: 'offhand',
    tier: 2,
    icon: '🤲',
    description: 'Gain 20 Max HP. Gain 4 Block at combat start.',
    effects: [
      { type: 'max_hp', value: 20 },
      { type: 'block_start', value: 4 },
    ],
    flavourText: 'Iron cuffs engraved with the names of fallen rivals.',
  },
]

// ─── Combined database ────────────────────────────────────────────────────────

export const EQUIPMENT_DATABASE: EquipmentDefinition[] = [
  ...WEAPONS,
  ...ARMORS,
  ...OFFHANDS,
]

export function getEquipment(id: string): EquipmentDefinition | undefined {
  return EQUIPMENT_DATABASE.find((e) => e.id === id)
}
