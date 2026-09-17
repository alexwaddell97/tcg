/**
 * CombatEngine — pure, immutable combat logic for the gladiator roguelike.
 * All functions take a CombatState (plus supporting data) and return a new CombatState.
 * No side effects.
 */

import type {
  CombatState,
  CombatLogEntry,
  SPCardInstance,
  StatusEffect,
  StatusEffectId,
  ActiveEnemy,
  EnemyDefinition,
  EnemyMoveDefinition,
  ActiveRelic,
  EquipmentDefinition,
} from '@tcg/shared'
import { ENEMY_DATABASE, WOUND_CARD_ID, GLADIATOR_CARD_DATABASE, getEquipment } from '@tcg/shared'
import { shuffle } from '@tcg/shared'

type EquipmentSlots = { weapon: string | null; armor: string | null; offhand: string | null }

function resolveEquipmentDefs(slots: EquipmentSlots): EquipmentDefinition[] {
  const ids = [slots.weapon, slots.armor, slots.offhand].filter(Boolean) as string[]
  return ids.map((id) => getEquipment(id)).filter(Boolean) as EquipmentDefinition[]
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

let _logIdCounter = 0
function makeLogId(): string {
  return `log_${Date.now()}_${_logIdCounter++}`
}

function log(
  state: CombatState,
  message: string,
  type: CombatLogEntry['type'] = 'system',
): CombatState {
  return {
    ...state,
    log: [
      ...state.log,
      { id: makeLogId(), message, type },
    ],
  }
}

// ─── Status effect helpers ─────────────────────────────────────────────────

export function getStatus(effects: StatusEffect[], id: StatusEffectId): number {
  return effects.find((e) => e.id === id)?.stacks ?? 0
}

function addStatus(
  effects: StatusEffect[],
  id: StatusEffectId,
  amount: number,
): StatusEffect[] {
  const existing = effects.find((e) => e.id === id)
  if (existing) {
    return effects.map((e) => e.id === id ? { ...e, stacks: e.stacks + amount } : e)
  }
  return [...effects, { id, stacks: amount }]
}

function decrementStatus(effects: StatusEffect[], id: StatusEffectId, amount = 1): StatusEffect[] {
  return effects
    .map((e) => e.id === id ? { ...e, stacks: e.stacks - amount } : e)
    .filter((e) => e.stacks > 0)
}

// ─── Relic helpers ────────────────────────────────────────────────────────

export function hasRelic(relics: ActiveRelic[], id: string): boolean {
  return relics.some((r) => r.definitionId === id)
}

// ─── Damage calculation helpers ──────────────────────────────────────────────

function calcPlayerDamage(
  baseDamage: number,
  hits: number,
  playerStatuses: StatusEffect[],
  enemyStatuses: StatusEffect[],
  relics: ActiveRelic[],
  playerHp: number,
  playerMaxHp: number,
  isFirstAttackThisTurn: boolean,
): number {
  let dmg = baseDamage

  // Strength bonus
  const strength = getStatus(playerStatuses, 'strength')
  dmg += strength

  // Weak debuff: deal 25% less
  const weak = getStatus(playerStatuses, 'weak')
  if (weak > 0) dmg = Math.floor(dmg * 0.75)

  // Blood flask: below 50% HP → 20% more
  if (hasRelic(relics, 'blood_flask') && playerHp < playerMaxHp * 0.5) {
    dmg = Math.floor(dmg * 1.2)
  }

  // Vulnerable on enemy: 50% more damage
  const enemyVulnerable = getStatus(enemyStatuses, 'vulnerable')
  if (enemyVulnerable > 0) dmg = Math.floor(dmg * 1.5)

  // War horn: first attack each turn +4
  if (hasRelic(relics, 'war_horn') && isFirstAttackThisTurn) dmg += 4

  // Philosophers stone gives player +1E but enemies start at strength 1 (handled at combat start)

  return Math.max(0, dmg) * hits
}

function calcEnemyDamagePerHit(
  baseDamagePerHit: number,
  enemyStatuses: StatusEffect[],
  playerStatuses: StatusEffect[],
): number {
  let dmg = baseDamagePerHit

  // Enemy strength
  const strength = getStatus(enemyStatuses, 'strength')
  dmg += strength

  // Enemy weak: deal 25% less
  const weak = getStatus(enemyStatuses, 'weak')
  if (weak > 0) dmg = Math.floor(dmg * 0.75)

  // Player vulnerable: take 50% more damage
  const vulnerable = getStatus(playerStatuses, 'vulnerable')
  if (vulnerable > 0) dmg = Math.floor(dmg * 1.5)

  return Math.max(0, dmg)
}

// ─── Block absorption ────────────────────────────────────────────────────────

function absorbDamage(
  hp: number,
  block: number,
  incomingDamage: number,
): { hp: number; block: number } {
  const absorbed = Math.min(block, incomingDamage)
  return {
    block: block - absorbed,
    hp: hp - (incomingDamage - absorbed),
  }
}

// ─── Enemy AI ─────────────────────────────────────────────────────────────────

export function pickNextEnemyMove(
  enemy: ActiveEnemy,
  def: EnemyDefinition,
): EnemyMoveDefinition {
  const hpPct = (enemy.hp / enemy.maxHp) * 100

  const eligible = def.moves.filter((m) => {
    if (m.onlyFirstTurn && enemy.turnCount !== 0) return false
    if (m.notFirstTurn && enemy.turnCount === 0) return false
    if (m.notConsecutive && m.id === enemy.lastMoveId) return false
    if (m.minHpPercent !== undefined && hpPct < m.minHpPercent) return false
    if (m.maxHpPercent !== undefined && hpPct > m.maxHpPercent) return false
    return true
  })

  if (eligible.length === 0) {
    // Fallback: use heaviest move ignoring conditions
    return def.moves.reduce((a, b) => (b.weight > a.weight ? b : a), def.moves[0])
  }

  const totalWeight = eligible.reduce((s, m) => s + m.weight, 0)
  let roll = Math.random() * totalWeight
  for (const m of eligible) {
    roll -= m.weight
    if (roll <= 0) return m
  }
  return eligible[eligible.length - 1]
}

// ─── Enemy block gain ────────────────────────────────────────────────────────

function enemyGainBlock(enemy: ActiveEnemy, amount: number): ActiveEnemy {
  return { ...enemy, block: enemy.block + amount }
}

// ─── Player gain block (fires juggernaut) ────────────────────────────────────

function playerGainBlock(
  state: CombatState,
  amount: number,
  relics: ActiveRelic[],
): CombatState {
  let blockGain = amount

  // Dexterity: +N to all block gained
  const dex = getStatus(state.playerStatusEffects, 'dexterity')
  blockGain += dex

  // Frail: gain 25% less block
  const frail = getStatus(state.playerStatusEffects, 'frail')
  if (frail > 0) blockGain = Math.floor(blockGain * 0.75)

  blockGain = Math.max(0, blockGain)

  let newState: CombatState = {
    ...state,
    playerBlock: state.playerBlock + blockGain,
  }

  // Juggernaut: deal N damage to enemy on block gain
  const juggStacks = getStatus(state.playerStatusEffects, 'juggernaut')
  if (juggStacks > 0 && blockGain > 0) {
    newState = dealDamageToEnemy(newState, juggStacks, relics, false)
    newState = log(newState, `Juggernaut deals ${juggStacks} damage!`, 'damage')
  }

  return newState
}

// ─── Draw cards ──────────────────────────────────────────────────────────────

function drawCards(
  state: CombatState,
  count: number,
  _relics: ActiveRelic[],
): CombatState {
  let s = state
  let remaining = count

  for (let i = 0; i < remaining; i++) {
    if (s.drawPile.length === 0) {
      if (s.discardPile.length === 0) break
      // Reshuffle discard into draw
      const reshuffled = shuffle([...s.discardPile])
      s = { ...s, drawPile: reshuffled, discardPile: [] }
      s = log(s, 'Shuffled discard pile into draw pile.', 'system')
    }
    const [card, ...rest] = s.drawPile
    s = { ...s, drawPile: rest, hand: [...s.hand, card] }
  }

  // Ink bottle check: every 10 cards played, draw 1 extra
  // (This is handled in playCard, not here directly)

  return s
}

// ─── Deal damage to enemy ────────────────────────────────────────────────────

function dealDamageToEnemy(
  state: CombatState,
  damage: number,
  _relics: ActiveRelic[],
  fromAttackCard: boolean,
): CombatState {
  let s = state
  const absorbed = Math.min(s.enemy.block, damage)
  const hpDmg = damage - absorbed
  const newBlock = s.enemy.block - absorbed
  const newHp = Math.max(0, s.enemy.hp - hpDmg)

  s = {
    ...s,
    enemy: { ...s.enemy, hp: newHp, block: newBlock },
  }

  if (s.enemy.hp <= 0) {
    s = { ...s, phase: 'victory' }
    s = log(s, `${s.enemy.name} has been defeated!`, 'system')
  }

  // Net charges: each attack applies 1 Vulnerable to enemy and decrements
  if (fromAttackCard && s.netCharges > 0 && s.phase !== 'victory') {
    s = {
      ...s,
      netCharges: s.netCharges - 1,
      enemy: {
        ...s.enemy,
        statusEffects: addStatus(s.enemy.statusEffects, 'vulnerable', 1),
      },
    }
    s = log(s, 'Net: applied 1 Vulnerable!', 'status')
  }

  return s
}

// ─── Exhaust a card ──────────────────────────────────────────────────────────

function exhaustCard(
  state: CombatState,
  cardInstanceId: string,
  relics: ActiveRelic[],
): CombatState {
  const card = state.hand.find((c) => c.instanceId === cardInstanceId)
    ?? state.discardPile.find((c) => c.instanceId === cardInstanceId)
  if (!card) return state

  const fromHand = state.hand.some((c) => c.instanceId === cardInstanceId)
  let s: CombatState = {
    ...state,
    hand: fromHand ? state.hand.filter((c) => c.instanceId !== cardInstanceId) : state.hand,
    discardPile: !fromHand ? state.discardPile.filter((c) => c.instanceId !== cardInstanceId) : state.discardPile,
    exhaustPile: [...state.exhaustPile, card],
    totalCardsExhausted: state.totalCardsExhausted + 1,
  }

  // Feel No Pain: gain N block on exhaust
  const fnp = getStatus(s.playerStatusEffects, 'feel_no_pain')
  if (fnp > 0) {
    s = playerGainBlock(s, fnp, relics)
    s = log(s, `Feel No Pain: gained ${fnp} Block.`, 'block')
  }

  return s
}

// ─── Play a card ─────────────────────────────────────────────────────────────

export function playCard(
  state: CombatState,
  cardInstanceId: string,
  relics: ActiveRelic[],
): CombatState {
  const card = state.hand.find((c) => c.instanceId === cardInstanceId)
  if (!card) return state
  if (state.phase !== 'player_turn') return state
  if (card.energyCost > state.energy) return state
  if (card.id === WOUND_CARD_ID) return state // Wound is unplayable

  let s: CombatState = {
    ...state,
    energy: state.energy - card.energyCost,
    hand: state.hand.filter((c) => c.instanceId !== cardInstanceId),
    cardsPlayedThisTurn: state.cardsPlayedThisTurn + 1,
  }

  s = log(s, `You play ${card.name}.`, 'card')

  const isFirstAttack = card.type === 'attack' && state.cardsPlayedThisTurn === 0

  // Process each effect on the card
  for (const effect of card.effects) {
    switch (effect.type) {
      case 'deal_damage': {
        const dmg = calcPlayerDamage(
          effect.value ?? 0,
          1,
          s.playerStatusEffects,
          s.enemy.statusEffects,
          relics,
          s.playerHp,
          s.playerMaxHp,
          isFirstAttack,
        )
        s = dealDamageToEnemy(s, dmg, relics, true)
        s = log(s, `Dealt ${dmg} damage to ${s.enemy.name}.`, 'damage')
        break
      }
      case 'deal_damage_multi': {
        const times = effect.secondValue ?? 1
        for (let i = 0; i < times; i++) {
          const dmg = calcPlayerDamage(
            effect.value ?? 0,
            1,
            s.playerStatusEffects,
            s.enemy.statusEffects,
            relics,
            s.playerHp,
            s.playerMaxHp,
            isFirstAttack && i === 0,
          )
          s = dealDamageToEnemy(s, dmg, relics, true)
          if (s.phase === 'victory') break
        }
        s = log(s, `Dealt ${effect.value} damage ${times} times to ${s.enemy.name}.`, 'damage')
        break
      }
      case 'gain_block': {
        s = playerGainBlock(s, effect.value ?? 0, relics)
        s = log(s, `Gained ${effect.value} Block.`, 'block')
        break
      }
      case 'apply_status_enemy': {
        if (!effect.statusId) break
        s = {
          ...s,
          enemy: {
            ...s.enemy,
            statusEffects: addStatus(s.enemy.statusEffects, effect.statusId, effect.statusStacks ?? 1),
          },
        }
        // Champions belt: vulnerable → also apply weak
        if (effect.statusId === 'vulnerable' && hasRelic(relics, 'champions_belt')) {
          s = {
            ...s,
            enemy: {
              ...s.enemy,
              statusEffects: addStatus(s.enemy.statusEffects, 'weak', 1),
            },
          }
          s = log(s, `Champion's Belt: applied 1 Weak.`, 'status')
        }
        s = log(s, `Applied ${effect.statusStacks ?? 1} ${effect.statusId} to ${s.enemy.name}.`, 'status')
        break
      }
      case 'apply_status_self': {
        if (!effect.statusId) break
        s = {
          ...s,
          playerStatusEffects: addStatus(s.playerStatusEffects, effect.statusId, effect.statusStacks ?? 1),
        }
        s = log(s, `Gained ${effect.statusStacks ?? 1} ${effect.statusId}.`, 'status')
        break
      }
      case 'draw_cards': {
        s = drawCards(s, effect.value ?? 1, relics)
        break
      }
      case 'gain_energy': {
        s = { ...s, energy: s.energy + (effect.value ?? 1) }
        s = log(s, `Gained ${effect.value} Aether.`, 'system')
        break
      }
      case 'lose_hp_self': {
        const dmg = effect.value ?? 0
        s = { ...s, playerHp: Math.max(0, s.playerHp - dmg) }
        s = log(s, `You lose ${dmg} HP.`, 'damage')
        if (s.playerHp <= 0) s = { ...s, phase: 'defeat' }
        break
      }
      case 'exhaust_random_hand': {
        // For second_wind: exhaust all non-attacks, gain 5 block each
        if (card.id === 'second_wind') {
          const nonAttacks = s.hand.filter((c) => c.type !== 'attack')
          let blockGained = 0
          for (const na of nonAttacks) {
            s = exhaustCard(s, na.instanceId, relics)
            blockGained += 5
          }
          if (blockGained > 0) {
            s = playerGainBlock(s, blockGained, relics)
            s = log(s, `Second Wind: exhausted ${nonAttacks.length} cards, gained ${blockGained} Block.`, 'block')
          }
        } else {
          // Regular: exhaust one random card
          const nonExhausted = s.hand.filter((c) => c.instanceId !== cardInstanceId)
          if (nonExhausted.length > 0) {
            const target = nonExhausted[Math.floor(Math.random() * nonExhausted.length)]
            s = exhaustCard(s, target.instanceId, relics)
            s = log(s, `Exhausted ${target.name}.`, 'system')
          }
        }
        break
      }
      case 'heal': {
        let amount = effect.value ?? 0
        // Sacred bark doubles healing
        if (hasRelic(relics, 'sacred_bark')) amount *= 2
        s = { ...s, playerHp: Math.min(s.playerMaxHp, s.playerHp + amount) }
        s = log(s, `Healed ${amount} HP.`, 'heal')
        break
      }
      case 'add_wound_to_discard': {
        const woundDef = GLADIATOR_CARD_DATABASE.find((c) => c.id === WOUND_CARD_ID)
        if (woundDef) {
          const woundInstance: SPCardInstance = {
            ...woundDef,
            instanceId: `wound_${Date.now()}_${Math.random()}`,
          }
          s = { ...s, discardPile: [...s.discardPile, woundInstance] }
          s = log(s, `A Wound was added to your discard pile.`, 'system')
        }
        break
      }
      case 'recycle_discard_top': {
        if (s.discardPile.length > 0) {
          const [top, ...rest] = s.discardPile
          s = { ...s, discardPile: rest, drawPile: [top, ...s.drawPile] }
          s = log(s, `${top.name} moved to top of draw pile.`, 'system')
        }
        break
      }
      case 'double_block': {
        const doubled = s.playerBlock * 2
        s = { ...s, playerBlock: doubled }
        s = log(s, `Block doubled to ${doubled}.`, 'block')
        break
      }
      case 'upgrade_random_hand': {
        // Find a random upgradeable card in hand
        const upgradeable = s.hand.filter((c) => c.upgradeId && !c.isUpgraded)
        if (upgradeable.length > 0) {
          const target = upgradeable[Math.floor(Math.random() * upgradeable.length)]
          const upgradedDef = GLADIATOR_CARD_DATABASE.find((c) => c.id === target.upgradeId)
          if (upgradedDef) {
            s = {
              ...s,
              hand: s.hand.map((c) =>
                c.instanceId === target.instanceId
                  ? { ...upgradedDef, instanceId: c.instanceId, isUpgraded: true }
                  : c
              ),
            }
            s = log(s, `${target.name} was upgraded.`, 'system')
          }
        }
        break
      }
    }

    // Stop processing further effects if combat is already over
    if (s.phase === 'victory' || s.phase === 'defeat') break
  }

  // Move card to discard (or exhaust pile if it exhausts)
  if (card.exhausts) {
    s = { ...s, exhaustPile: [...s.exhaustPile, card] }
  } else if (card.type !== 'power') {
    // Powers stay in play (not moved to discard) — but we already removed from hand
    // In our simplified model, powers just apply their status effect and go to discard
    s = { ...s, discardPile: [...s.discardPile, card] }
  } else {
    // Power cards go to discard (effects are encoded as status effects)
    s = { ...s, discardPile: [...s.discardPile, card] }
  }

  // Ink bottle check
  const inkBottle = relics.find((r) => r.definitionId === 'ink_bottle')
  if (inkBottle) {
    const newCounter = inkBottle.counter + 1
    if (newCounter >= 10) {
      s = drawCards(s, 1, relics)
      s = log(s, `Ink Bottle: drew a card.`, 'system')
      // Counter resets (handled in store via updateRelicCounter — return info via log)
    }
  }

  return s
}

// ─── End player turn ──────────────────────────────────────────────────────────

export function endPlayerTurn(
  state: CombatState,
  relics: ActiveRelic[],
): CombatState {
  if (state.phase !== 'player_turn') return state

  let s: CombatState = { ...state, phase: 'enemy_turn' }

  // Discard ethereal cards still in hand
  const ethereals = s.hand.filter((c) => c.ethereal)
  for (const c of ethereals) {
    s = exhaustCard(s, c.instanceId, relics)
  }

  // ── Player end-of-turn status effects ──

  // Combust: lose N HP, deal 5N damage
  const combustStacks = getStatus(s.playerStatusEffects, 'combust')
  if (combustStacks > 0) {
    s = { ...s, playerHp: Math.max(0, s.playerHp - combustStacks) }
    s = dealDamageToEnemy(s, combustStacks * 5, relics, false)
    s = log(s, `Combust: lost ${combustStacks} HP, dealt ${combustStacks * 5} damage.`, 'status')
    if (s.playerHp <= 0) s = { ...s, phase: 'defeat' }
  }

  if (s.phase === 'victory' || s.phase === 'defeat') return s

  // ── Enemy takes its turn ──
  s = executeEnemyTurn(s, relics)

  return s
}

function executeEnemyTurn(
  state: CombatState,
  relics: ActiveRelic[],
): CombatState {
  let s = state

  const intent = s.enemy.currentIntent
  s = log(s, `${s.enemy.name}: ${intent.description}`, 'enemy')

  // Enemy block is reset at start of ITS turn (happens before it defends)
  // Per StS convention: block resets at start of turn
  s = { ...s, enemy: { ...s.enemy, block: 0 } }

  // Execute the intent
  switch (intent.type) {
    case 'attack':
    case 'attack_debuff':
    case 'attack_buff':
    case 'multi_attack': {
      const hits = intent.hits ?? 1
      for (let i = 0; i < hits; i++) {
        if (s.phase === 'defeat') break
        const dmgPerHit = calcEnemyDamagePerHit(
          intent.damage ?? 0,
          s.enemy.statusEffects,
          s.playerStatusEffects,
        )
        // Armor damage reduction (flat, minimum 0 per hit)
        const reducedDmg = Math.max(0, dmgPerHit - s.armorDamageReduction)
        const result = absorbDamage(s.playerHp, s.playerBlock, reducedDmg)
        s = { ...s, playerHp: result.hp, playerBlock: result.block }
        s = log(s, `${s.enemy.name} deals ${reducedDmg} damage${s.armorDamageReduction > 0 ? ` (reduced by ${s.armorDamageReduction})` : ''}.`, 'damage')
        if (s.playerHp <= 0) {
          s = { ...s, phase: 'defeat' }
          s = log(s, `You have been defeated.`, 'system')
        }

        // Thorns: deal N damage to attacker
        const thorns = getStatus(s.playerStatusEffects, 'thorns')
        if (thorns > 0) {
          s = dealDamageToEnemy(s, thorns, relics, false)
          s = log(s, `Thorns deal ${thorns} damage to ${s.enemy.name}.`, 'damage')
        }
      }

      // Apply any debuffs from attack_debuff type
      if ((intent.type === 'attack_debuff' || intent.type === 'attack_buff') && intent.statusId && intent.statusStacks) {
        const target = intent.statusTarget ?? 'player'
        if (target === 'player' && s.phase !== 'defeat') {
          s = {
            ...s,
            playerStatusEffects: addStatus(s.playerStatusEffects, intent.statusId, intent.statusStacks),
          }
          s = log(s, `${s.enemy.name} applies ${intent.statusStacks} ${intent.statusId}.`, 'status')
        } else if (target === 'self') {
          s = {
            ...s,
            enemy: {
              ...s.enemy,
              statusEffects: addStatus(s.enemy.statusEffects, intent.statusId, intent.statusStacks),
            },
          }
        }
      }
      // Also handle shield_slam: gain block
      if (intent.blockAmount) {
        s = { ...s, enemy: enemyGainBlock(s.enemy, intent.blockAmount) }
      }
      break
    }
    case 'defend': {
      s = { ...s, enemy: enemyGainBlock(s.enemy, intent.blockAmount ?? 0) }
      s = log(s, `${s.enemy.name} gains ${intent.blockAmount} Block.`, 'block')
      break
    }
    case 'buff': {
      if (intent.statusId && intent.statusStacks) {
        const target = intent.statusTarget ?? 'self'
        if (target === 'player') {
          s = {
            ...s,
            playerStatusEffects: addStatus(s.playerStatusEffects, intent.statusId, intent.statusStacks),
          }
        } else {
          s = {
            ...s,
            enemy: {
              ...s.enemy,
              statusEffects: addStatus(s.enemy.statusEffects, intent.statusId, intent.statusStacks),
            },
          }
        }
      }
      break
    }
    case 'debuff': {
      if (intent.statusId && intent.statusStacks) {
        const target = intent.statusTarget ?? 'player'
        if (target === 'player') {
          s = {
            ...s,
            playerStatusEffects: addStatus(s.playerStatusEffects, intent.statusId, intent.statusStacks),
          }
          s = log(s, `${s.enemy.name} applies ${intent.statusStacks} ${intent.statusId}.`, 'status')
        }
      }
      break
    }
    default:
      break
  }

  if (s.phase === 'victory' || s.phase === 'defeat') return s

  // ── Enemy start-of-next-turn bookkeeping (decrement debuffs) ──
  s = {
    ...s,
    enemy: {
      ...s.enemy,
      statusEffects: s.enemy.statusEffects
        .map((e) => {
          // Vulnerable and Weak decrement at end of enemy turn
          if (e.id === 'vulnerable' || e.id === 'weak' || e.id === 'frail') {
            return { ...e, stacks: e.stacks - 1 }
          }
          // Poison: lose stacks HP, then decrement
          if (e.id === 'poison') {
            return { ...e, stacks: e.stacks - 1 }
          }
          return e
        })
        .filter((e) => e.stacks > 0),
    },
  }

  // Enemy poison damage
  // (we handle the HP loss at start of their next turn in startPlayerTurn)

  // ── Advance to player turn ──
  s = startPlayerTurn(s, relics)

  return s
}

// ─── Start of player turn ────────────────────────────────────────────────────

function startPlayerTurn(
  state: CombatState,
  relics: ActiveRelic[],
): CombatState {
  let s: CombatState = {
    ...state,
    phase: 'player_turn',
    playerBlock: 0,  // Block resets each turn (per StS rules)
    energy: s_maxEnergy(state),
    cardsPlayedThisTurn: 0,
    turn: state.turn + 1,
  }

  s = log(s, `─── Turn ${s.turn} ───`, 'system')

  // ── Player start-of-turn status effects ──

  // Metallicize: gain N block
  const metallicize = getStatus(s.playerStatusEffects, 'metallicize')
  if (metallicize > 0) {
    s = playerGainBlock(s, metallicize, relics)
    s = log(s, `Metallicize: gained ${metallicize} Block.`, 'block')
  }

  // Demon Form: gain N strength
  const demonForm = getStatus(s.playerStatusEffects, 'demon_form')
  if (demonForm > 0) {
    s = {
      ...s,
      playerStatusEffects: addStatus(s.playerStatusEffects, 'strength', demonForm),
    }
    s = log(s, `Demon Form: gained ${demonForm} Strength.`, 'status')
  }

  // Brutality: lose 1 HP, draw 1 card
  const brutality = getStatus(s.playerStatusEffects, 'brutality')
  if (brutality > 0) {
    s = { ...s, playerHp: Math.max(0, s.playerHp - brutality) }
    s = drawCards(s, brutality, relics)
    s = log(s, `Battle Trance: lost ${brutality} HP, drew ${brutality} card(s).`, 'status')
    if (s.playerHp <= 0) return { ...s, phase: 'defeat' }
  }

  // Berserk: gain 1 energy
  const berserk = getStatus(s.playerStatusEffects, 'berserk')
  if (berserk > 0) {
    s = { ...s, energy: s.energy + berserk }
  }

  // Iron bracers relic: gain 2 block at start of turn
  if (hasRelic(relics, 'iron_bracers')) {
    s = playerGainBlock(s, 2, relics)
  }

  // Horn cleat relic: gain 14 block for first 3 turns
  const hornCleat = relics.find((r) => r.definitionId === 'horn_cleat')
  if (hornCleat && hornCleat.counter > 0) {
    s = playerGainBlock(s, 14, relics)
    s = log(s, `Horn Cleat: gained 14 Block.`, 'block')
    // Note: counter decrement is signalled to the store via log, store updates relics
  }

  // Player poison: take N damage, then decrement
  const poison = getStatus(s.playerStatusEffects, 'poison')
  if (poison > 0) {
    s = { ...s, playerHp: Math.max(0, s.playerHp - poison) }
    s = { ...s, playerStatusEffects: decrementStatus(s.playerStatusEffects, 'poison') }
    s = log(s, `Poison deals ${poison} damage.`, 'status')
    if (s.playerHp <= 0) return { ...s, phase: 'defeat' }
  }

  // Decrement player temp status effects (vulnerable, weak, frail) at start of player turn
  s = {
    ...s,
    playerStatusEffects: s.playerStatusEffects
      .map((e) => {
        if (e.id === 'vulnerable' || e.id === 'weak' || e.id === 'frail') {
          return { ...e, stacks: e.stacks - 1 }
        }
        return e
      })
      .filter((e) => e.stacks > 0),
  }

  // Ritual: gain N strength at end of turn — handled in endPlayerTurn
  // Actually: ritual fires at END of PLAYER turn (before enemy)
  // Let's move it there. We'll handle in endPlayerTurn before enemy goes.

  // Draw 5 cards at start of turn
  const drawCount = 5
  s = drawCards(s, drawCount, relics)

  // Advance enemy to next move (pick next intent)
  const enemyDef = ENEMY_DATABASE.find((e) => e.id === s.enemy.definitionId)
  if (enemyDef) {
    const nextMove = pickNextEnemyMove(
      { ...s.enemy, turnCount: s.enemy.turnCount + 1, lastMoveId: s.enemy.currentMoveId },
      enemyDef,
    )
    s = {
      ...s,
      enemy: {
        ...s.enemy,
        currentMoveId: nextMove.id,
        currentIntent: nextMove.intent,
        turnCount: s.enemy.turnCount + 1,
        lastMoveId: s.enemy.currentMoveId,
      },
    }
  }

  return s
}

function s_maxEnergy(state: CombatState): number {
  // Energy cap is stored in state.maxEnergy; philosophers_stone/runic_dome are applied at initCombat
  return state.maxEnergy
}

// ─── Initialise combat ───────────────────────────────────────────────────────

export function initCombat(
  deck: SPCardInstance[],
  enemyId: string,
  hp: number,
  maxHp: number,
  relics: ActiveRelic[],
  equipment?: EquipmentSlots,
): CombatState | null {
  const enemyDef = ENEMY_DATABASE.find((e) => e.id === enemyId)
  if (!enemyDef) return null

  const hpRoll = enemyDef.minHp + Math.floor(Math.random() * (enemyDef.maxHp - enemyDef.minHp + 1))

  // Determine max energy
  let maxEnergy = 3
  if (hasRelic(relics, 'philosophers_stone') || hasRelic(relics, 'runic_dome')) maxEnergy = 4

  const firstMove = pickNextEnemyMove(
    {
      definitionId: enemyId,
      name: enemyDef.name,
      hp: hpRoll,
      maxHp: hpRoll,
      block: 0,
      statusEffects: enemyDef.startingStatusEffects ? [...enemyDef.startingStatusEffects] : [],
      currentMoveId: '',
      currentIntent: { type: 'unknown', description: '...' },
      turnCount: 0,
      lastMoveId: undefined,
    },
    enemyDef,
  )

  // Philosophers stone: enemies start with 1 strength
  let enemyStartingEffects: StatusEffect[] = enemyDef.startingStatusEffects
    ? [...enemyDef.startingStatusEffects]
    : []
  if (hasRelic(relics, 'philosophers_stone')) {
    enemyStartingEffects = addStatus(enemyStartingEffects, 'strength', 1)
  }

  const enemy: ActiveEnemy = {
    definitionId: enemyId,
    name: enemyDef.name,
    hp: hpRoll,
    maxHp: hpRoll,
    block: 0,
    statusEffects: enemyStartingEffects,
    currentMoveId: firstMove.id,
    currentIntent: firstMove.intent,
    turnCount: 0,
    lastMoveId: undefined,
  }

  // Shuffle deck for this combat
  const shuffled = shuffle([...deck])

  let state: CombatState = {
    enemy,
    playerHp: hp,
    playerMaxHp: maxHp,
    playerBlock: 0,
    playerStatusEffects: [],
    drawPile: shuffled,
    hand: [],
    discardPile: [],
    exhaustPile: [],
    turn: 0,
    energy: maxEnergy,
    maxEnergy,
    phase: 'player_turn',
    log: [{ id: makeLogId(), message: `Combat begins! Facing ${enemyDef.name}.`, type: 'system' }],
    cardsPlayedThisTurn: 0,
    totalCardsExhausted: 0,
    armorDamageReduction: 0,
    netCharges: 0,
  }

  // Gladiator's Brand: gain 5 block + 1 strength at combat start
  if (hasRelic(relics, 'gladiators_brand')) {
    state = playerGainBlock(state, 5, relics)
    state = {
      ...state,
      playerStatusEffects: addStatus(state.playerStatusEffects, 'strength', 1),
    }
    state = log(state, "Gladiator's Brand: gained 5 Block and 1 Strength.", 'status')
  }

  // Worn greaves: apply 1 Weak to enemy at start
  if (hasRelic(relics, 'worn_greaves')) {
    state = {
      ...state,
      enemy: {
        ...state.enemy,
        statusEffects: addStatus(state.enemy.statusEffects, 'weak', 1),
      },
    }
    state = log(state, 'Worn Greaves: enemy starts Weak.', 'status')
  }

  // Sturdy shield: gain 10 block turn 1 (handled in startPlayerTurn via horn_cleat-style logic)
  // Astrolabe: gain 1 dexterity at start of each combat
  if (hasRelic(relics, 'astrolabe')) {
    state = {
      ...state,
      playerStatusEffects: addStatus(state.playerStatusEffects, 'dexterity', 1),
    }
  }

  // Draw opening hand (turn 0 → 1)
  state = {
    ...state,
    turn: 1,
  }
  state = log(state, `─── Turn 1 ───`, 'system')

  // Innate cards: move to front of draw pile
  const innatePile = state.drawPile.filter((c) => c.innate)
  const restPile = state.drawPile.filter((c) => !c.innate)
  state = { ...state, drawPile: [...innatePile, ...restPile] }

  // Draw 5 cards
  state = drawCards(state, 5, relics)

  // Iron bracers at turn 1
  if (hasRelic(relics, 'iron_bracers')) {
    state = playerGainBlock(state, 2, relics)
  }

  // Horn cleat turn 1
  const hornCleat = relics.find((r) => r.definitionId === 'horn_cleat')
  if (hornCleat && hornCleat.counter > 0) {
    state = playerGainBlock(state, 14, relics)
    state = log(state, 'Horn Cleat: gained 14 Block.', 'block')
  }

  // Sturdy shield: first turn only
  if (hasRelic(relics, 'sturdy_shield')) {
    state = playerGainBlock(state, 10, relics)
    state = log(state, 'Sturdy Shield: gained 10 Block.', 'block')
  }

  // ── Apply equipment bonuses ───────────────────────────────────────────────
  if (equipment) {
    const equipDefs = resolveEquipmentDefs(equipment)
    for (const eq of equipDefs) {
      for (const effect of eq.effects) {
        switch (effect.type) {
          case 'strength_start':
            state = {
              ...state,
              playerStatusEffects: addStatus(state.playerStatusEffects, 'strength', effect.value),
            }
            state = log(state, `${eq.name}: gained ${effect.value} Strength.`, 'status')
            break
          case 'block_start':
            state = playerGainBlock(state, effect.value, relics)
            state = log(state, `${eq.name}: gained ${effect.value} Block.`, 'block')
            break
          case 'thorns_start':
            state = {
              ...state,
              playerStatusEffects: addStatus(state.playerStatusEffects, 'thorns', effect.value),
            }
            state = log(state, `${eq.name}: gained ${effect.value} Thorns.`, 'status')
            break
          case 'net_charges':
            state = { ...state, netCharges: state.netCharges + effect.value }
            state = log(state, `${eq.name}: ${effect.value} net charges loaded.`, 'status')
            break
          case 'damage_reduction':
            state = { ...state, armorDamageReduction: state.armorDamageReduction + effect.value }
            state = log(state, `${eq.name}: incoming attacks reduced by ${effect.value}.`, 'status')
            break
          // max_hp is applied to RunState before combat, not here
        }
      }
    }
  }

  // Pick initial enemy intent for turn 1 (already done above, but pick for turn 1)
  const firstMoveForTurn1 = pickNextEnemyMove(
    { ...enemy, turnCount: 0 },
    enemyDef,
  )
  state = {
    ...state,
    enemy: {
      ...state.enemy,
      currentMoveId: firstMoveForTurn1.id,
      currentIntent: firstMoveForTurn1.intent,
    },
  }

  return state
}

// ─── Use potion in combat ─────────────────────────────────────────────────────

export function usePotionInCombat(
  state: CombatState,
  potionId: string,
  relics: ActiveRelic[],
): CombatState {
  let s = state

  switch (potionId) {
    case 'health_potion': {
      let amount = Math.floor(s.playerMaxHp * 0.5)
      if (hasRelic(relics, 'sacred_bark')) amount *= 2
      s = { ...s, playerHp: Math.min(s.playerMaxHp, s.playerHp + amount) }
      s = log(s, `Health Potion: healed ${amount} HP.`, 'heal')
      break
    }
    case 'block_potion': {
      s = playerGainBlock(s, 12, relics)
      s = log(s, 'Block Potion: gained 12 Block.', 'block')
      break
    }
    case 'strength_potion': {
      s = { ...s, playerStatusEffects: addStatus(s.playerStatusEffects, 'strength', 2) }
      s = log(s, 'Strength Potion: gained 2 Strength.', 'status')
      break
    }
    case 'energy_potion': {
      s = { ...s, energy: s.energy + 2 }
      s = log(s, 'Aether Potion: gained 2 Aether.', 'system')
      break
    }
    case 'vulnerable_potion': {
      s = {
        ...s,
        enemy: {
          ...s.enemy,
          statusEffects: addStatus(s.enemy.statusEffects, 'vulnerable', 3),
        },
      }
      s = log(s, 'Vulnerable Potion: applied 3 Vulnerable.', 'status')
      break
    }
    case 'fire_potion': {
      s = dealDamageToEnemy(s, 20, relics, false)
      s = log(s, 'Fire Potion: dealt 20 damage.', 'damage')
      break
    }
  }

  return s
}
