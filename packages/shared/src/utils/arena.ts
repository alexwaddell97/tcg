import type { Card } from '../types/card.ts'
import type { ArenaLocation, ArenaPlay } from '../types/arena.ts'
import type { GameState } from '../types/game.ts'
import { ARENA_SLOTS, ARENA_MAX_HAND } from '../constants/arena.ts'
import { getArenaAbilities } from './arenaAbilities.ts'
import { getArenaFormation } from './arenaFormation.ts'

export function getArenaCardPower(location: ArenaLocation, playerId: string, card: Card): number {
  if (card.type !== 'unit') return 0
  const allies = location.cards[playerId] ?? []
  const formation = getArenaFormation(allies)
  const position = formation.findIndex(placed => placed?.card.instanceId === card.instanceId)
  let power = card.power + card.powerBonus
  if (location.revealed && location.rule === 'summit' && card.cost >= 4) power += 2
  if (location.revealed && location.rule === 'chainbridge') {
    const formation = getArenaFormation(allies)
    const slot = formation.findIndex(placed => placed?.card.instanceId === card.instanceId)
    if ((slot === 1 || slot === 2) && formation[slot - 1] && formation[slot + 1]) power += 2
  }
  for (const ally of allies) {
    if (ally.card.instanceId === card.instanceId) continue
    for (const ability of getArenaAbilities(ally.card)) {
      if (ability.type === 'aura' || ability.type === 'token_aura' && card.arenaToken) power += ability.value
      if (ability.type === 'journey_aura' && card.arenaMoved) power += ability.value
      if (ability.type === 'adjacent_aura') {
        const formation = getArenaFormation(allies)
        const source = formation.findIndex(placed => placed?.card.instanceId === ally.card.instanceId)
        const target = formation.findIndex(placed => placed?.card.instanceId === card.instanceId)
        if (source >= 0 && target >= 0 && Math.abs(source - target) === 1) power += ability.value
      }
    }
  }
  for (const ability of getArenaAbilities(card)) {
    if (ability.type === 'flank' && (position === 0 || position === 3) || ability.type === 'moved_power' && card.arenaMoved) power += ability.value
    if (ability.type === 'linked' && position >= 0) power += ability.value * (Number(Boolean(formation[position - 1])) + Number(Boolean(formation[position + 1])))
    if (ability.type === 'relic_power') power += ability.value * allies.filter(placed => placed.card.type === 'relic').length
    if (ability.type === 'alone' && allies.length === 1 || ability.type === 'full' && allies.length === ARENA_SLOTS ||
      ability.type === 'transmuted_power' && card.arenaTransmuted) power += ability.value
  }
  return power
}

/** Scoring can differ from current power; card abilities always use signed current power. */
export function getArenaCardScore(location: ArenaLocation, playerId: string, card: Card): number {
  const power = getArenaCardPower(location, playerId, card)
  return location.revealed && location.rule === 'mirror_reservoir' ? Math.abs(power) : power
}

export function getArenaLocationPower(location: ArenaLocation, playerId: string): number {
  return (location.cards[playerId] ?? []).reduce((sum, placed) => sum + getArenaCardScore(location, playerId, placed.card), 0)
}

export function getArenaMatchScore(state: GameState, playerId: string): { locations: number; power: number } {
  const opponentId = Object.keys(state.players).find(id => id !== playerId) ?? ''
  return (state.arena?.locations ?? []).reduce((score, location) => {
    const power = getArenaLocationPower(location, playerId)
    return { locations: score.locations + Number(power > getArenaLocationPower(location, opponentId)), power: score.power + power }
  }, { locations: 0, power: 0 })
}

/** Validate the entire plan before any hand, energy or board mutation. */
export function getArenaPlanError(state: GameState, playerId: string, hand: Card[], plays: unknown): string | null {
  if (!state.arena || state.phase !== 'planning') return 'This turn is no longer open.'
  if (!state.players[playerId]) return 'Player not found.'
  if (state.arena.lockedIn[playerId]) return 'Your turn is already locked in.'
  if (!Array.isArray(plays) || plays.length > ARENA_MAX_HAND) return 'Invalid turn plan.'
  const seen = new Set<string>()
  const slots = state.arena.locations.map(location => location.cards[playerId]?.length ?? 0)
  const occupied = state.arena.locations.map(location => new Set(getArenaFormation(location.cards[playerId] ?? []).flatMap((placed, slot) => placed ? [slot] : [])))
  let cost = 0
  for (const entry of plays as ArenaPlay[]) {
    if (!entry || typeof entry.cardInstanceId !== 'string' || !Number.isInteger(entry.locationIndex) || entry.locationIndex < 0 || entry.locationIndex > 2) return 'Choose a valid card and arena.'
    if (entry.slotIndex !== undefined && (!Number.isInteger(entry.slotIndex) || entry.slotIndex < 0 || entry.slotIndex >= ARENA_SLOTS)) return 'Choose a valid formation position.'
    if (seen.has(entry.cardInstanceId)) return 'A card can only be played once per turn.'
    seen.add(entry.cardInstanceId)
    const card = hand.find(item => item.instanceId === entry.cardInstanceId)
    if (!card) return 'That card is not in your hand.'
    cost += card.cost
    if (card.type !== 'spell' && ++slots[entry.locationIndex] > ARENA_SLOTS) return 'That arena already has four of your cards.'
    if (card.type !== 'spell' && entry.slotIndex !== undefined) {
      if (occupied[entry.locationIndex].has(entry.slotIndex)) return 'That position is already occupied. Choose an empty position.'
      occupied[entry.locationIndex].add(entry.slotIndex)
    }
  }
  if (cost > state.arena.energy) return 'You do not have enough aether for those cards.'
  return null
}
