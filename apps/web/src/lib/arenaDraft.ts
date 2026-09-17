import { getArenaPlanError, resolveArenaPlaySlots } from '@tcg/shared'
import type { ArenaIndex, ArenaPlay, ArenaSlotIndex, GameState } from '@tcg/shared'

/** Moving a queued card preserves reveal order and spends its energy only once. */
export function getArenaDropPlan(state: GameState, playerId: string, draft: ArenaPlay[], cardId: string, locationIndex: ArenaIndex, slotIndex?: ArenaSlotIndex) {
  const previous = draft.find(play => play.cardInstanceId === cardId)
  const move = { cardInstanceId: cardId, locationIndex, slotIndex: slotIndex ?? (previous?.locationIndex === locationIndex ? previous.slotIndex : undefined) }
  const next = draft.some(play => play.cardInstanceId === cardId)
    ? draft.map(play => play.cardInstanceId === cardId ? move : play) : [...draft, move]
  const error = getArenaPlanError(state, playerId, state.hand ?? [], next)
  return { plan: error ? draft : resolveArenaPlaySlots(state.arena!.locations, playerId, state.hand ?? [], next), error }
}
