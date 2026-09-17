import { getArenaLocationPower } from '@tcg/shared'
import type { ArenaIndex, ArenaLocation, ArenaRevealEvent } from '@tcg/shared'
import type { CardPowerChange } from './arenaPlayback.ts'

export type ArenaEffectFamily = 'power' | 'growth' | 'ward' | 'arcane' | 'transmutation' | 'affliction' | 'sabotage' | 'conduits'
export interface ArenaControlChange { locationIndex: ArenaIndex; from: string | null; to: string | null }

/** Use effects that actually resolved, never a printed ability whose condition failed. */
export function getArenaEffectFamily(event?: ArenaRevealEvent): ArenaEffectFamily {
  if (event?.locationRule === 'ashen_orchard') return 'growth'
  if (event?.locationRule === 'leyline_nexus') return 'conduits'
  if (event?.locationRule === 'bellmarsh') return 'arcane'
  if (event?.locationRule === 'gilded_exchange') return 'sabotage'
  if (event?.kind === 'growth') return 'growth'
  if (!event?.abilityTriggered) return 'power'
  const effects = event.effects ?? []
  const has = (...types: string[]) => effects.some(type => types.includes(type))
  if (has('transmute_hand', 'transmute_deck', 'transmute_draw', 'transmuted_power')) return 'transmutation'
  if (has('plant', 'burden', 'defect', 'send', 'token_aura')) return 'sabotage'
  if (has('drain', 'afflict_all', 'wither', 'siphon', 'harvest', 'hand_weaken')) return 'affliction'
  if (has('adjacent_aura', 'spellfont', 'aether_battery', 'copy_power', 'transfer', 'consume', 'echo_power', 'distribute', 'double', 'equalize')
    || event.card?.arenaArchetypes?.includes('conduits') && has('boost', 'boost_all', 'hand_boost')) return 'conduits'
  if (has('warding_bell', 'ward', 'cleanse', 'purge', 'purify', 'dispel', 'salvage')) return 'ward'
  if (has('incubate', 'grow', 'rally')) return 'growth'
  if (has('draw', 'move', 'march')) return 'arcane'
  return 'power'
}

export function getArenaController(location: ArenaLocation): string | null {
  const ids = Object.keys(location.cards)
  if (ids.length !== 2) return null
  const difference = getArenaLocationPower(location, ids[0]) - getArenaLocationPower(location, ids[1])
  return difference === 0 ? null : difference > 0 ? ids[0] : ids[1]
}

export function getArenaControlChanges(before: ArenaLocation[], after: ArenaLocation[]): ArenaControlChange[] {
  return after.flatMap(location => {
    const previous = before.find(site => site.index === location.index)
    if (!previous) return []
    const from = getArenaController(previous), to = getArenaController(location)
    return from === to ? [] : [{ locationIndex: location.index, from, to }]
  })
}

/** Visual links follow observed power changes. Transfers start at the actual donor. */
export function getConduitLinks(event: ArenaRevealEvent | undefined, changes: CardPowerChange[]) {
  if (getArenaEffectFamily(event) !== 'conduits' || !event?.card) return []
  if (event.relicSources?.length) return event.relicSources.map(from => ({ from, to: event.card!.instanceId }))
  const donors = event.effects?.includes('transfer') ? changes.filter(change => change.delta < 0) : []
  const sourceId = donors[0]?.cardId ?? event.card.instanceId
  return changes.filter(change => change.delta > 0 && change.cardId !== sourceId)
    .map(change => ({ from: sourceId, to: change.cardId }))
}
