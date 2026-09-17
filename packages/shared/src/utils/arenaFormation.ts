import type { ArenaLocation, ArenaPlacedCard, ArenaPlay, ArenaSlotIndex } from '../types/arena.ts'
import type { Card } from '../types/card.ts'

export const ARENA_POSITIONS: readonly ArenaSlotIndex[] = [0, 1, 2, 3]

/** A fixed chain: mobile folds it into 1–2 / 4–3 without changing any relationships. */
export function getArenaNeighbours(slot: ArenaSlotIndex): ArenaSlotIndex[] {
  return ARENA_POSITIONS.filter(other => Math.abs(other - slot) === 1)
}

/** Keep holes intact. Old positionless snapshots occupy the first remaining spaces. */
export function getArenaFormation(cards: ArenaPlacedCard[]): (ArenaPlacedCard | undefined)[] {
  const formation: (ArenaPlacedCard | undefined)[] = Array(4).fill(undefined)
  for (const placed of cards) if (placed.slotIndex !== undefined) formation[placed.slotIndex] = placed
  for (const placed of cards) if (placed.slotIndex === undefined) {
    const free = formation.findIndex(entry => !entry)
    if (free >= 0) formation[free] = placed
  }
  return formation
}

/** Call after validation. Explicit choices are reserved before automatic placements. */
export function resolveArenaPlaySlots(locations: ArenaLocation[], playerId: string, hand: Card[], plays: ArenaPlay[]): ArenaPlay[] {
  const occupied = locations.map(location => new Set(ARENA_POSITIONS.filter(slot => getArenaFormation(location.cards[playerId] ?? [])[slot])))
  for (const play of plays) if (play.slotIndex !== undefined && hand.find(card => card.instanceId === play.cardInstanceId)?.type !== 'spell') occupied[play.locationIndex].add(play.slotIndex)
  return plays.map(play => {
    if (hand.find(card => card.instanceId === play.cardInstanceId)?.type === 'spell') return { cardInstanceId: play.cardInstanceId, locationIndex: play.locationIndex }
    const slotIndex = play.slotIndex ?? ARENA_POSITIONS.find(slot => !occupied[play.locationIndex].has(slot))
    if (slotIndex !== undefined) occupied[play.locationIndex].add(slotIndex)
    return { cardInstanceId: play.cardInstanceId, locationIndex: play.locationIndex, slotIndex }
  })
}
