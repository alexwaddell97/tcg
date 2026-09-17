import type { RelicDefinition, PotionDefinition } from '../types/singleplayer.ts'

export const RELIC_DATABASE: RelicDefinition[] = [
  // ─── Starter Relic ──────────────────────────────────────────────────────────
  {
    id: 'gladiators_brand',
    name: "Gladiator's Brand",
    rarity: 'starter',
    description: 'At the start of each combat, gain 5 Block and 1 Strength.',
    flavourText: 'Earned in blood. Worn with pride.',
  },

  // ─── Common Relics ───────────────────────────────────────────────────────────
  {
    id: 'iron_bracers',
    name: 'Iron Bracers',
    rarity: 'common',
    description: 'At the start of each turn, gain 2 Block.',
    flavourText: 'Simple. Effective.',
  },
  {
    id: 'war_trophy',
    name: 'War Trophy',
    rarity: 'common',
    description: 'After defeating an Elite enemy, gain 10 Max HP.',
    flavourText: 'Proof of survival.',
  },
  {
    id: 'worn_greaves',
    name: 'Worn Greaves',
    rarity: 'common',
    description: 'At the start of each combat, apply 1 Weak to the enemy.',
    flavourText: 'Scuffed but still swift.',
  },
  {
    id: 'sturdy_shield',
    name: 'Sturdy Shield',
    rarity: 'common',
    description: 'During the first turn of each combat, gain 10 Block.',
    flavourText: 'First impressions matter.',
    startingCounter: 1,
  },
  {
    id: 'ancient_coin',
    name: 'Ancient Coin',
    rarity: 'common',
    description: 'Gain 2 Gold at the start of each floor.',
    flavourText: 'Fortune favours the prepared.',
  },
  {
    id: 'war_horn',
    name: 'War Horn',
    rarity: 'common',
    description: 'The first Attack played each turn deals 4 additional damage.',
    flavourText: 'The signal to strike.',
  },

  // ─── Uncommon Relics ─────────────────────────────────────────────────────────
  {
    id: 'champions_belt',
    name: "Champion's Belt",
    rarity: 'uncommon',
    description: 'Whenever you apply Vulnerable to an enemy, also apply 1 Weak.',
    flavourText: 'Strip away their defences entirely.',
  },
  {
    id: 'meat_on_the_bone',
    name: 'Meat on the Bone',
    rarity: 'uncommon',
    description: 'At the end of each combat, if your HP is below 50%, heal 12 HP.',
    flavourText: 'Keep fighting. Stay alive.',
  },
  {
    id: 'ink_bottle',
    name: 'Ink Bottle',
    rarity: 'uncommon',
    description: 'Every 10 cards you play, draw 1 card.',
    flavourText: 'The record of every blow.',
    startingCounter: 0,
  },
  {
    id: 'horn_cleat',
    name: 'Horn Cleat',
    rarity: 'uncommon',
    description: 'For the first 3 turns of each combat, gain 14 Block.',
    startingCounter: 3,
    flavourText: 'Better to start fortified.',
  },
  {
    id: 'blood_flask',
    name: 'Blood Flask',
    rarity: 'uncommon',
    description: 'While your HP is below 50%, all your Attacks deal 20% more damage.',
    flavourText: 'Nothing to lose.',
  },

  // ─── Rare Relics ─────────────────────────────────────────────────────────────
  {
    id: 'philosophers_stone',
    name: "Philosopher's Stone",
    rarity: 'rare',
    description: 'You start each turn with 4 Aether. Enemies start each combat with 1 Strength.',
    flavourText: 'Power does not come free.',
  },
  {
    id: 'sacred_bark',
    name: 'Sacred Bark',
    rarity: 'rare',
    description: 'All healing effects are doubled.',
    flavourText: 'The arena has its own medicine.',
  },
  {
    id: 'burning_blood',
    name: 'Burning Blood',
    rarity: 'rare',
    description: 'At the end of each combat, heal 6 HP.',
    flavourText: 'The arena burns away your wounds.',
  },
  {
    id: 'centennial_puzzle',
    name: 'Centennial Puzzle',
    rarity: 'rare',
    description: 'The first time each combat your HP drops below 50%, gain 3 Aether.',
    startingCounter: 0,
    flavourText: 'Crisis breeds clarity.',
  },

  // ─── Boss Relics ─────────────────────────────────────────────────────────────
  {
    id: 'black_blood',
    name: 'Black Blood',
    rarity: 'boss',
    description: "Replaces Gladiator's Brand. At the end of each combat, heal 12 HP.",
    flavourText: 'The old wounds never fully close.',
  },
  {
    id: 'empty_cage',
    name: 'Empty Cage',
    rarity: 'boss',
    description: 'Upon pickup, remove 2 cards from your deck.',
    flavourText: 'Shed what does not serve you.',
  },
  {
    id: 'runic_dome',
    name: 'Runic Dome',
    rarity: 'boss',
    description: "You cannot see enemy intent. You start each combat with 4 Aether.",
    flavourText: 'Read their movements, not their plans.',
  },
  {
    id: 'astrolabe',
    name: 'Astrolabe',
    rarity: 'boss',
    description: 'At the start of each combat, gain 1 Dexterity.',
    flavourText: 'The stars favour the adaptable.',
  },
]

export const POTION_DATABASE: PotionDefinition[] = [
  {
    id: 'health_potion',
    name: 'Health Potion',
    rarity: 'common',
    description: 'Heal 50% of your Max HP.',
  },
  {
    id: 'block_potion',
    name: 'Block Potion',
    rarity: 'common',
    description: 'Gain 12 Block.',
  },
  {
    id: 'strength_potion',
    name: 'Strength Potion',
    rarity: 'uncommon',
    description: 'Gain 2 Strength for the rest of this combat.',
  },
  {
    id: 'energy_potion',
    name: 'Aether Potion',
    rarity: 'uncommon',
    description: 'Gain 2 Aether.',
  },
  {
    id: 'vulnerable_potion',
    name: 'Vulnerable Potion',
    rarity: 'common',
    description: 'Apply 3 Vulnerable to the enemy.',
  },
  {
    id: 'fire_potion',
    name: 'Fire Potion',
    rarity: 'rare',
    description: 'Deal 20 damage to the enemy.',
  },
]
