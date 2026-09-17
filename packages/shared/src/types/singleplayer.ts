// ─── Status Effects ───────────────────────────────────────────────────────────

export type StatusEffectId =
  | 'vulnerable'   // take 50% more damage; decrements each turn
  | 'weak'         // deal 25% less damage; decrements each turn
  | 'strength'     // +N to all attack damage (permanent while active)
  | 'dexterity'    // +N to all block gained (permanent while active)
  | 'thorns'       // deal N damage when hit by an attack
  | 'poison'       // lose N HP at start of turn; N decrements each turn
  | 'frail'        // gain 25% less block; decrements each turn
  | 'metallicize'  // gain N block at start of turn
  | 'ritual'       // gain N strength at end of turn
  | 'brutality'    // start of turn: lose 1 HP, draw 1 card (per stack)
  | 'berserk'      // start of turn: gain 1 energy
  | 'juggernaut'   // on block gain: deal N damage to enemy
  | 'feel_no_pain' // on exhaust: gain N block
  | 'demon_form'   // start of turn: gain N strength
  | 'combust'      // end of turn: lose N HP, deal 5N damage to enemy

export interface StatusEffect {
  id: StatusEffectId
  stacks: number
}

// ─── Cards ───────────────────────────────────────────────────────────────────

export type SPCardType = 'attack' | 'skill' | 'power'
export type SPCardRarity = 'basic' | 'common' | 'uncommon' | 'rare' | 'special'

export type CardEffectType =
  | 'deal_damage'
  | 'deal_damage_multi'     // deal `value` damage `secondValue` times
  | 'gain_block'
  | 'apply_status_enemy'
  | 'apply_status_self'
  | 'draw_cards'
  | 'gain_energy'
  | 'lose_hp_self'
  | 'exhaust_random_hand'   // exhaust a random non-attack card in hand
  | 'heal'
  | 'add_wound_to_discard'
  | 'recycle_discard_top'   // move top of discard to top of draw
  | 'double_block'          // double current block amount
  | 'upgrade_random_hand'   // upgrade a random card in hand for this combat

export interface CardEffect {
  type: CardEffectType
  value?: number
  secondValue?: number
  statusId?: StatusEffectId
  statusStacks?: number
}

export interface SPCardDefinition {
  id: string
  name: string
  type: SPCardType
  rarity: SPCardRarity
  energyCost: number
  effects: CardEffect[]
  description: string
  flavourText?: string
  exhausts?: boolean   // card is removed from play when played
  innate?: boolean     // always in opening hand
  ethereal?: boolean   // exhausts if still in hand at turn end
  upgradeId?: string   // id of the upgraded version
  isUpgraded?: boolean
}

export interface SPCardInstance extends SPCardDefinition {
  instanceId: string
}

export const WOUND_CARD_ID = 'wound'

// ─── Enemies ─────────────────────────────────────────────────────────────────

export type IntentType =
  | 'attack'
  | 'attack_debuff'
  | 'attack_buff'
  | 'defend'
  | 'buff'
  | 'debuff'
  | 'multi_attack'
  | 'unknown'

export interface EnemyIntent {
  type: IntentType
  damage?: number
  hits?: number
  blockAmount?: number
  statusId?: StatusEffectId
  statusStacks?: number
  statusTarget?: 'player' | 'self'
  description: string
}

export interface EnemyMoveDefinition {
  id: string
  intent: EnemyIntent
  weight: number
  minHpPercent?: number  // only when enemy HP is >= this %
  maxHpPercent?: number  // only when enemy HP is <= this %
  onlyFirstTurn?: boolean
  notFirstTurn?: boolean
  notConsecutive?: boolean
}

export interface EnemyDefinition {
  id: string
  name: string
  minHp: number
  maxHp: number
  moves: EnemyMoveDefinition[]
  startingStatusEffects?: StatusEffect[]
  isElite?: boolean
  isBoss?: boolean
}

export interface ActiveEnemy {
  definitionId: string
  name: string
  hp: number
  maxHp: number
  block: number
  statusEffects: StatusEffect[]
  currentMoveId: string
  currentIntent: EnemyIntent
  turnCount: number
  lastMoveId?: string
}

// ─── Relics ──────────────────────────────────────────────────────────────────

export type RelicRarity = 'starter' | 'common' | 'uncommon' | 'rare' | 'boss' | 'shop'

export interface RelicDefinition {
  id: string
  name: string
  rarity: RelicRarity
  description: string
  flavourText?: string
  startingCounter?: number
}

export interface ActiveRelic {
  definitionId: string
  counter: number
}

// ─── Potions ─────────────────────────────────────────────────────────────────

export type PotionRarity = 'common' | 'uncommon' | 'rare'

export interface PotionDefinition {
  id: string
  name: string
  rarity: PotionRarity
  description: string
}

// ─── Map ─────────────────────────────────────────────────────────────────────

export type MapNodeType = 'combat' | 'elite' | 'boss' | 'shop' | 'campfire' | 'event' | 'treasure'

export interface MapNode {
  id: string
  type: MapNodeType
  row: number       // 0 = starting row, ascending toward boss
  col: number       // column index (0-based)
  connections: string[]  // IDs of nodes ON THE ROW ABOVE this connects to
  completed: boolean
  available: boolean
  enemyId?: string
}

export interface ActMap {
  actNumber: 1 | 2 | 3
  nodes: MapNode[]
  currentNodeId: string | null
}

// ─── Equipment ───────────────────────────────────────────────────────────────

export type EquipmentSlot = 'weapon' | 'armor' | 'offhand'
export type EquipmentTier = 1 | 2

export type EquipmentEffectType =
  | 'strength_start'    // gain N strength at combat start
  | 'block_start'       // gain N block at combat start
  | 'max_hp'            // increase max HP by N when equipped
  | 'thorns_start'      // gain N thorns at combat start
  | 'net_charges'       // gain N net charges at combat start (attacks apply vulnerable when > 0)
  | 'damage_reduction'  // reduce incoming attack damage by N per hit

export interface EquipmentEffect {
  type: EquipmentEffectType
  value: number
}

export interface EquipmentDefinition {
  id: string
  name: string
  slot: EquipmentSlot
  tier: EquipmentTier
  description: string
  icon: string
  effects: EquipmentEffect[]
  upgradesTo?: string   // id of the tier-2 version
  flavourText?: string
}

// ─── Gladiator Classes ────────────────────────────────────────────────────────

export type GladiatorClassId = 'murmillo' | 'retiarius' | 'secutor'

export interface GladiatorClassDefinition {
  id: GladiatorClassId
  name: string
  description: string
  icon: string
  loreText: string
  startingMaxHp: number
  starterDeckIds: string[]
  startingWeapon: string | null
  startingArmor: string | null
  startingOffhand: string | null
  bonusDescription: string
}

// ─── Combat ──────────────────────────────────────────────────────────────────

export interface CombatLogEntry {
  id: string
  message: string
  type: 'damage' | 'block' | 'status' | 'card' | 'heal' | 'system' | 'enemy'
}

export type CombatPhase = 'player_turn' | 'enemy_turn' | 'victory' | 'defeat'

export interface CombatState {
  enemy: ActiveEnemy
  playerHp: number
  playerMaxHp: number
  playerBlock: number
  playerStatusEffects: StatusEffect[]
  drawPile: SPCardInstance[]
  hand: SPCardInstance[]
  discardPile: SPCardInstance[]
  exhaustPile: SPCardInstance[]
  turn: number
  energy: number
  maxEnergy: number
  phase: CombatPhase
  log: CombatLogEntry[]
  cardsPlayedThisTurn: number      // for ink_bottle relic tracking
  totalCardsExhausted: number      // for ink_bottle relic tracking
  // Equipment combat bonuses (applied at combat start from equipped items)
  armorDamageReduction: number     // flat damage reduction per incoming hit
  netCharges: number               // attacks apply 1 vulnerable to enemy while > 0
}

// ─── Run ─────────────────────────────────────────────────────────────────────

export type RunPhase =
  | 'map'
  | 'combat'
  | 'card_reward'
  | 'shop'
  | 'campfire'
  | 'event'
  | 'victory'
  | 'game_over'

export interface ShopItem<T> {
  item: T
  price: number
  sold: boolean
}

export interface ShopInventory {
  cards: ShopItem<SPCardDefinition>[]
  relics: ShopItem<RelicDefinition>[]
  potions: ShopItem<PotionDefinition>[]
  equipment: ShopItem<EquipmentDefinition>[]
  removeCardPrice: number
}

export interface RunState {
  id: string
  // Player vitals
  hp: number
  maxHp: number
  gold: number
  // Progress
  act: 1 | 2 | 3
  floor: number      // 1-based absolute floor
  // Deck (card instances belonging to this run)
  deck: SPCardInstance[]
  // Collectibles
  relics: ActiveRelic[]
  potions: (string | null)[]  // potion definition IDs; null = empty slot
  // Equipment (gladiator gear)
  gladiatorClass: GladiatorClassId | null
  equippedWeapon: string | null     // equipment definition id
  equippedArmor: string | null
  equippedOffhand: string | null
  // Map
  currentMap: ActMap
  // Current phase
  phase: RunPhase
  // Active combat state (non-null when phase === 'combat')
  activeCombat: CombatState | null
  // Card reward options (non-null when phase === 'card_reward')
  cardRewardOptions: SPCardDefinition[] | null
  // Shop (non-null when phase === 'shop')
  shopInventory: ShopInventory | null
  // Metadata
  startedAt: number
  completedAt?: number
  isVictory?: boolean
}
