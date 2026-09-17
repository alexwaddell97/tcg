/**
 * RunEngine — pure functions for roguelike run management.
 * Map generation, node traversal, card rewards, shop, campfire.
 */

import type {
  RunState,
  ActMap,
  MapNode,
  MapNodeType,
  SPCardDefinition,
  SPCardInstance,
  CombatState,
  ActiveRelic,
  ShopInventory,
  GladiatorClassId,
} from '@tcg/shared'
import {
  GLADIATOR_CARD_DATABASE,
  REWARD_POOL,
  ACT_ENEMY_POOLS,
  RELIC_DATABASE,
  POTION_DATABASE,
  EQUIPMENT_DATABASE,
  getEquipment,
  CLASS_DATABASE,
  shuffle,
} from '@tcg/shared'
import { initCombat } from './combatEngine.ts'

// ─── Card instance creation ───────────────────────────────────────────────────

let _instanceCounter = 0

export function makeCardInstance(def: SPCardDefinition): SPCardInstance {
  return { ...def, instanceId: `card_${Date.now()}_${_instanceCounter++}` }
}

// ─── Map generation ───────────────────────────────────────────────────────────

/**
 * Generate a map for an act.
 * Layout: 8 rows × 3 columns.
 * Row 0: 3 combat nodes (entry)
 * Rows 1-6: mixed content
 * Row 7: 1 boss node
 */
function generateActMap(actNumber: 1 | 2 | 3): ActMap {
  const pool = ACT_ENEMY_POOLS[actNumber]
  const rows = 8
  const cols = 3

  const nodeTypes: MapNodeType[][] = [
    ['combat', 'combat', 'combat'],        // row 0: always combat
    ['event', 'combat', 'combat'],         // row 1
    ['shop',  'combat', 'campfire'],       // row 2
    ['combat', 'elite', 'combat'],         // row 3
    ['campfire', 'combat', 'event'],       // row 4
    ['combat', 'shop', 'combat'],          // row 5
    ['elite', 'combat', 'campfire'],       // row 6
    ['boss',  'boss',   'boss'],           // row 7 (only centre spawns)
  ]

  const nodes: MapNode[] = []

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      // Row 7: only one boss node in the centre
      if (row === 7 && col !== 1) continue

      const type = nodeTypes[row][col]
      const id = `${actNumber}_${row}_${col}`

      // Assign enemy for combat/elite/boss nodes
      let enemyId: string | undefined
      if (type === 'combat') {
        const common = pool.common
        enemyId = common[Math.floor(Math.random() * common.length)]
      } else if (type === 'elite') {
        const elites = pool.elite
        enemyId = elites[Math.floor(Math.random() * elites.length)]
      } else if (type === 'boss') {
        enemyId = pool.boss
      }

      nodes.push({
        id,
        type,
        row,
        col,
        connections: [],
        completed: false,
        available: row === 0,  // row 0 nodes are initially available
        enemyId,
      })
    }
  }

  // Build connections: each node in row N connects to 1-2 reachable nodes in row N+1
  for (let row = 0; row < rows - 1; row++) {
    const currRow = nodes.filter((n) => n.row === row)
    const nextRow = nodes.filter((n) => n.row === row + 1)

    for (const node of currRow) {
      // Connect to same column + adjacent columns (if they exist), pick 1-2
      const adjacent = nextRow.filter(
        (n) => Math.abs(n.col - node.col) <= 1
      )
      // Always connect to at least one
      const shuffledAdj = shuffle(adjacent)
      const picks = shuffledAdj.slice(0, Math.random() < 0.4 ? 2 : 1)
      for (const pick of picks) {
        if (!node.connections.includes(pick.id)) {
          node.connections.push(pick.id)
        }
      }
      // Ensure at least one connection
      if (node.connections.length === 0 && adjacent.length > 0) {
        node.connections.push(adjacent[0].id)
      }
    }
  }

  return {
    actNumber,
    nodes,
    currentNodeId: null,
  }
}

// ─── Card reward generation ───────────────────────────────────────────────────

function pickCardRewards(
  count: number,
  act: 1 | 2 | 3,
  existing: Set<string>,
): SPCardDefinition[] {
  // Weight toward uncommons/rares in later acts
  const pool = shuffle([...REWARD_POOL])
  const filtered = pool.filter((c) => !existing.has(c.id))

  const byRarity = {
    common: filtered.filter((c) => c.rarity === 'common'),
    uncommon: filtered.filter((c) => c.rarity === 'uncommon'),
    rare: filtered.filter((c) => c.rarity === 'rare'),
  }

  // Probability of rare: act*10%; uncommon: 30%+act*5%
  const rarePct = act * 0.1
  const uncommonPct = 0.3 + act * 0.05

  const result: SPCardDefinition[] = []
  const used = new Set<string>()

  for (let i = 0; i < count; i++) {
    const roll = Math.random()
    let candidates: SPCardDefinition[]
    if (roll < rarePct && byRarity.rare.length > 0) {
      candidates = byRarity.rare
    } else if (roll < rarePct + uncommonPct && byRarity.uncommon.length > 0) {
      candidates = byRarity.uncommon
    } else {
      candidates = byRarity.common
    }
    const available = candidates.filter((c) => !used.has(c.id))
    if (available.length === 0) continue
    const pick = available[Math.floor(Math.random() * available.length)]
    result.push(pick)
    used.add(pick.id)
  }

  return result
}

// ─── Shop generation ──────────────────────────────────────────────────────────

function generateShop(act: 1 | 2 | 3): ShopInventory {
  const cards = pickCardRewards(4, act, new Set()).map((card) => ({
    item: card,
    price: card.rarity === 'rare' ? 150 : card.rarity === 'uncommon' ? 100 : 75,
    sold: false,
  }))

  const availableRelics = RELIC_DATABASE.filter(
    (r) => r.rarity === 'common' || r.rarity === 'uncommon' || r.rarity === 'shop'
  )
  const relicPicks = shuffle(availableRelics).slice(0, 2)
  const relics = relicPicks.map((relic) => ({
    item: relic,
    price: relic.rarity === 'uncommon' ? 250 : 150,
    sold: false,
  }))

  const potionPicks = shuffle([...POTION_DATABASE]).slice(0, 2)
  const potions = potionPicks.map((potion) => ({
    item: potion,
    price: potion.rarity === 'rare' ? 80 : potion.rarity === 'uncommon' ? 50 : 30,
    sold: false,
  }))

  // Pick 2 random equipment items (tier-1 preferred in act 1, tier-2 available from act 2)
  const availableEquip = EQUIPMENT_DATABASE.filter((e) => act >= e.tier)
  const equipPicks = shuffle(availableEquip).slice(0, 2)
  const equipment = equipPicks.map((eq) => ({
    item: eq,
    price: eq.tier === 2 ? 200 : 125,
    sold: false,
  }))

  return {
    cards,
    relics,
    potions,
    equipment,
    removeCardPrice: 75 + (act - 1) * 25,
  }
}

// ─── Start a new run ─────────────────────────────────────────────────────────

export function startRun(classId: GladiatorClassId = 'murmillo'): RunState {
  const classDef = CLASS_DATABASE[classId]
  const starterId = 'gladiators_brand'
  const starterDef = RELIC_DATABASE.find((r) => r.id === starterId)!

  const deckDefs = classDef.starterDeckIds.map(
    (id) => GLADIATOR_CARD_DATABASE.find((c) => c.id === id)!
  )
  const deck: SPCardInstance[] = deckDefs.map(makeCardInstance)

  const map = generateActMap(1)

  // Apply max_hp bonuses from starting equipment
  let maxHp = classDef.startingMaxHp
  const startEquipIds = [
    classDef.startingWeapon,
    classDef.startingArmor,
    classDef.startingOffhand,
  ].filter(Boolean) as string[]
  for (const id of startEquipIds) {
    const eq = getEquipment(id)
    if (eq) {
      for (const ef of eq.effects) {
        if (ef.type === 'max_hp') maxHp += ef.value
      }
    }
  }

  return {
    id: `run_${Date.now()}`,
    hp: maxHp,
    maxHp,
    gold: 99,
    act: 1,
    floor: 1,
    deck,
    relics: [{ definitionId: starterId, counter: starterDef.startingCounter ?? 0 }],
    potions: [null, null, null],
    currentMap: map,
    phase: 'map',
    activeCombat: null,
    cardRewardOptions: null,
    shopInventory: null,
    startedAt: Date.now(),
    gladiatorClass: classId,
    equippedWeapon: classDef.startingWeapon,
    equippedArmor: classDef.startingArmor,
    equippedOffhand: classDef.startingOffhand,
  }
}

// ─── Enter a map node ─────────────────────────────────────────────────────────

export function enterNode(run: RunState, nodeId: string): RunState {
  const node = run.currentMap.nodes.find((n) => n.id === nodeId)
  if (!node || !node.available || node.completed) return run

  let r: RunState = {
    ...run,
    currentMap: {
      ...run.currentMap,
      currentNodeId: nodeId,
    },
    floor: run.floor + 1,
  }

  switch (node.type) {
    case 'combat':
    case 'elite':
    case 'boss': {
      const enemyId = node.enemyId!
      const equipment = {
        weapon: r.equippedWeapon ?? null,
        armor: r.equippedArmor ?? null,
        offhand: r.equippedOffhand ?? null,
      }
      const combat = initCombat(r.deck, enemyId, r.hp, r.maxHp, r.relics, equipment)
      if (!combat) return run
      r = { ...r, activeCombat: combat, phase: 'combat' }
      break
    }
    case 'shop': {
      r = { ...r, phase: 'shop', shopInventory: generateShop(r.act) }
      break
    }
    case 'campfire': {
      r = { ...r, phase: 'campfire' }
      break
    }
    case 'event': {
      // For now, events give a random small reward
      r = { ...r, phase: 'event' }
      break
    }
    case 'treasure': {
      // Random relic
      r = { ...r, phase: 'event' }
      break
    }
  }

  return r
}

// ─── Complete a node ──────────────────────────────────────────────────────────

export function completeNode(run: RunState, nodeId: string): RunState {
  const nodes = run.currentMap.nodes.map((n) => {
    if (n.id === nodeId) return { ...n, completed: true }
    // Unlock the nodes this one connects to
    if (n.id && run.currentMap.nodes.find((curr) => curr.id === nodeId)?.connections.includes(n.id)) {
      return { ...n, available: true }
    }
    return n
  })

  return {
    ...run,
    currentMap: {
      ...run.currentMap,
      nodes,
    },
  }
}

// ─── Combat victory ───────────────────────────────────────────────────────────

export function resolveCombatVictory(
  run: RunState,
  combat: CombatState,
): RunState {
  const node = run.currentMap.nodes.find((n) => n.id === run.currentMap.currentNodeId)
  const nodeId = node?.id

  // Heal back any HP surplus from fight
  let r: RunState = {
    ...run,
    hp: Math.min(run.maxHp, combat.playerHp),
    activeCombat: null,
  }

  // Burning blood relic: heal 6 HP at end of combat
  if (hasRelic(r.relics, 'burning_blood')) {
    r = { ...r, hp: Math.min(r.maxHp, r.hp + 6) }
  }

  // Black blood relic: heal 12 HP at end of combat
  if (hasRelic(r.relics, 'black_blood')) {
    r = { ...r, hp: Math.min(r.maxHp, r.hp + 12) }
  }

  // Meat on the bone: heal 12 HP if below 50%
  if (hasRelic(r.relics, 'meat_on_the_bone') && r.hp < r.maxHp * 0.5) {
    r = { ...r, hp: Math.min(r.maxHp, r.hp + 12) }
  }

  // War trophy: gain 10 max HP on elite kill
  if (node?.type === 'elite' && hasRelic(r.relics, 'war_trophy')) {
    r = { ...r, maxHp: r.maxHp + 10, hp: r.hp + 10 }
  }

  // Gold reward
  const goldGain = node?.type === 'boss' ? 75 : node?.type === 'elite' ? 50 : 20 + Math.floor(Math.random() * 20)
  r = { ...r, gold: r.gold + goldGain }

  // Generate card rewards (boss gives 3, otherwise 3 picks)
  const rewards = pickCardRewards(3, r.act, new Set(r.deck.map((c) => c.id)))
  r = { ...r, cardRewardOptions: rewards, phase: 'card_reward' }

  // Mark node complete, unlock next nodes
  if (nodeId) r = completeNode(r, nodeId)

  return r
}

function hasRelic(relics: ActiveRelic[], id: string): boolean {
  return relics.some((r) => r.definitionId === id)
}

// ─── Pick card reward ─────────────────────────────────────────────────────────

export function pickCardReward(run: RunState, cardId: string | null): RunState {
  let r: RunState = { ...run, cardRewardOptions: null }

  if (cardId !== null) {
    const def = GLADIATOR_CARD_DATABASE.find((c) => c.id === cardId)
    if (def) {
      r = { ...r, deck: [...r.deck, makeCardInstance(def)] }
    }
  }

  // Check if boss completed → move to next act or victory
  const currentNode = r.currentMap.nodes.find((n) => n.id === r.currentMap.currentNodeId)
  if (currentNode?.type === 'boss') {
    if (r.act === 3) {
      return { ...r, phase: 'victory', completedAt: Date.now(), isVictory: true }
    }
    // Advance to next act
    const nextAct = (r.act + 1) as 1 | 2 | 3
    const nextMap = generateActMap(nextAct)
    return {
      ...r,
      act: nextAct,
      currentMap: nextMap,
      phase: 'map',
    }
  }

  return { ...r, phase: 'map' }
}

// ─── Campfire actions ─────────────────────────────────────────────────────────

export function campfireRest(run: RunState): RunState {
  const healAmount = Math.floor(run.maxHp * 0.3)
  const r = completeCurrentNode({ ...run, hp: Math.min(run.maxHp, run.hp + healAmount), phase: 'map' })
  return r
}

export function campfireSmith(run: RunState, cardInstanceId: string): RunState {
  // Upgrade an existing card (for now, just boost its first damage effect value by 3)
  // A proper upgrade system would swap in an upgraded card definition
  const card = run.deck.find((c) => c.instanceId === cardInstanceId)
  if (!card) return run

  const upgradedEffects = card.effects.map((e) => {
    if (e.type === 'deal_damage' || e.type === 'gain_block') {
      return { ...e, value: (e.value ?? 0) + 3 }
    }
    if (e.type === 'deal_damage_multi') {
      return { ...e, value: (e.value ?? 0) + 2 }
    }
    return e
  })

  const upgradedCard: SPCardInstance = {
    ...card,
    effects: upgradedEffects,
    isUpgraded: true,
    name: card.name + '+',
    description: card.description + ' (Upgraded)',
  }

  const r = completeCurrentNode({
    ...run,
    deck: run.deck.map((c) => c.instanceId === cardInstanceId ? upgradedCard : c),
    phase: 'map',
  })
  return r
}

function completeCurrentNode(run: RunState): RunState {
  const nodeId = run.currentMap.currentNodeId
  if (!nodeId) return run
  return completeNode(run, nodeId)
}

// ─── Shop actions ─────────────────────────────────────────────────────────────

export function shopBuyCard(run: RunState, cardId: string): RunState {
  if (!run.shopInventory) return run
  const item = run.shopInventory.cards.find((i) => i.item.id === cardId && !i.sold)
  if (!item || run.gold < item.price) return run

  const def = GLADIATOR_CARD_DATABASE.find((c) => c.id === cardId)
  if (!def) return run

  return {
    ...run,
    gold: run.gold - item.price,
    deck: [...run.deck, makeCardInstance(def)],
    shopInventory: {
      ...run.shopInventory,
      cards: run.shopInventory.cards.map((i) =>
        i.item.id === cardId ? { ...i, sold: true } : i
      ),
    },
  }
}

export function shopBuyRelic(run: RunState, relicId: string): RunState {
  if (!run.shopInventory) return run
  const item = run.shopInventory.relics.find((i) => i.item.id === relicId && !i.sold)
  if (!item || run.gold < item.price) return run

  const def = RELIC_DATABASE.find((r) => r.id === relicId)
  if (!def) return run

  return {
    ...run,
    gold: run.gold - item.price,
    relics: [...run.relics, { definitionId: relicId, counter: def.startingCounter ?? 0 }],
    shopInventory: {
      ...run.shopInventory,
      relics: run.shopInventory.relics.map((i) =>
        i.item.id === relicId ? { ...i, sold: true } : i
      ),
    },
  }
}

export function shopBuyPotion(run: RunState, potionId: string, slot: number): RunState {
  if (!run.shopInventory) return run
  const item = run.shopInventory.potions.find((i) => i.item.id === potionId && !i.sold)
  if (!item || run.gold < item.price) return run

  const potions = [...run.potions]
  const emptySlot = slot !== -1 && potions[slot] === null ? slot : potions.findIndex((p) => p === null)
  if (emptySlot === -1) return run // no empty slots

  potions[emptySlot] = potionId

  return {
    ...run,
    gold: run.gold - item.price,
    potions,
    shopInventory: {
      ...run.shopInventory,
      potions: run.shopInventory.potions.map((i) =>
        i.item.id === potionId ? { ...i, sold: true } : i
      ),
    },
  }
}

export function shopRemoveCard(run: RunState, cardInstanceId: string): RunState {
  if (!run.shopInventory || run.gold < run.shopInventory.removeCardPrice) return run
  return {
    ...run,
    gold: run.gold - run.shopInventory.removeCardPrice,
    deck: run.deck.filter((c) => c.instanceId !== cardInstanceId),
  }
}

export function leaveShop(run: RunState): RunState {
  const r = completeCurrentNode({ ...run, phase: 'map', shopInventory: null })
  return r
}

// ─── Event resolution (simple) ────────────────────────────────────────────────

export function resolveEvent(run: RunState, choiceIndex: number): RunState {
  // Simple event: 0 = gain 25 gold, 1 = heal 10 HP, 2 = add random common card
  let r: RunState = run

  switch (choiceIndex) {
    case 0:
      r = { ...r, gold: r.gold + 25 }
      break
    case 1:
      r = { ...r, hp: Math.min(r.maxHp, r.hp + 10) }
      break
    case 2: {
      const commons = REWARD_POOL.filter((c) => c.rarity === 'common')
      if (commons.length > 0) {
        const card = commons[Math.floor(Math.random() * commons.length)]
        r = { ...r, deck: [...r.deck, makeCardInstance(card)] }
      }
      break
    }
  }

  r = completeCurrentNode({ ...r, phase: 'map' })
  return r
}

// ─── Use potion (outside combat) ──────────────────────────────────────────────

export function usePotion(run: RunState, slot: number): RunState {
  const potionId = run.potions[slot]
  if (!potionId) return run

  let r: RunState = run

  switch (potionId) {
    case 'health_potion': {
      const amount = Math.floor(r.maxHp * 0.5)
      r = { ...r, hp: Math.min(r.maxHp, r.hp + amount) }
      break
    }
    default:
      return run
  }

  const potions = [...r.potions]
  potions[slot] = null
  return { ...r, potions }
}

// ─── Equipment: equip from shop/reward ────────────────────────────────────────

/** Directly equip an item by id (used when buying from shop or getting as reward). */
export function equipItem(run: RunState, equipmentId: string): RunState {
  const eq = getEquipment(equipmentId)
  if (!eq) return run

  // Determine old item being replaced
  const oldId =
    eq.slot === 'weapon' ? run.equippedWeapon :
    eq.slot === 'armor'  ? run.equippedArmor  :
    run.equippedOffhand

  let r = run

  // Remove max_hp from old item
  if (oldId) {
    const old = getEquipment(oldId)
    if (old) {
      for (const eff of old.effects) {
        if (eff.type === 'max_hp') {
          const newMaxHp = Math.max(1, r.maxHp - eff.value)
          r = { ...r, maxHp: newMaxHp, hp: Math.min(r.hp, newMaxHp) }
        }
      }
    }
  }

  // Apply max_hp from new item
  for (const eff of eq.effects) {
    if (eff.type === 'max_hp') {
      r = { ...r, maxHp: r.maxHp + eff.value, hp: r.hp + eff.value }
    }
  }

  // Update equipped slot
  if (eq.slot === 'weapon')  r = { ...r, equippedWeapon: equipmentId }
  if (eq.slot === 'armor')   r = { ...r, equippedArmor: equipmentId }
  if (eq.slot === 'offhand') r = { ...r, equippedOffhand: equipmentId }

  return r
}

// ─── Equipment: buy from shop ─────────────────────────────────────────────────

export function shopBuyEquipment(run: RunState, equipmentId: string): RunState {
  if (!run.shopInventory) return run
  const item = run.shopInventory.equipment.find((i) => i.item.id === equipmentId && !i.sold)
  if (!item || run.gold < item.price) return run

  let r: RunState = {
    ...run,
    gold: run.gold - item.price,
    shopInventory: {
      ...run.shopInventory,
      equipment: run.shopInventory.equipment.map((i) =>
        i.item.id === equipmentId ? { ...i, sold: true } : i
      ),
    },
  }

  r = equipItem(r, equipmentId)
  return r
}

// ─── Equipment: forge (upgrade at campfire) ───────────────────────────────────

export function forgeEquipment(run: RunState, equipmentId: string): RunState {
  const eq = getEquipment(equipmentId)
  if (!eq || !eq.upgradesTo) return run

  const upgrade = getEquipment(eq.upgradesTo)
  if (!upgrade) return run

  let r = run

  // Apply max_hp delta
  const oldMaxHp = eq.effects.find((e) => e.type === 'max_hp')?.value ?? 0
  const newMaxHp = upgrade.effects.find((e) => e.type === 'max_hp')?.value ?? 0
  const delta = newMaxHp - oldMaxHp
  if (delta > 0) {
    r = { ...r, maxHp: r.maxHp + delta, hp: r.hp + delta }
  }

  // Swap the item
  if (upgrade.slot === 'weapon')  r = { ...r, equippedWeapon: upgrade.id }
  if (upgrade.slot === 'armor')   r = { ...r, equippedArmor: upgrade.id }
  if (upgrade.slot === 'offhand') r = { ...r, equippedOffhand: upgrade.id }

  r = completeCurrentNode({ ...r, phase: 'map' })
  return r
}
