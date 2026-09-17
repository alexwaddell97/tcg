import { ARENA_POSITIONS, getArenaAbilities, getArenaCardPower, getArenaFormation, getArenaLocationPower, getArenaPlanError } from '@tcg/shared'
import type { ArenaPlay, GameState } from '@tcg/shared'

// The opponent sees only its own hand and the revealed board, just like a player.
export function choosePracticePlays(state: GameState): ArenaPlay[] {
  const plays: ArenaPlay[] = []
  const hand = state.hand ?? []
  const available = [...hand]
  while (available.length) {
    const candidates = available.flatMap(card => state.arena!.locations.flatMap(location => (card.type === 'spell' ? [undefined] : ARENA_POSITIONS).map(slotIndex => {
      const play: ArenaPlay = { cardInstanceId: card.instanceId, locationIndex: location.index, slotIndex }
      if (getArenaPlanError(state, 'bot', hand, [...plays, play])) return null
      const gap = getArenaLocationPower(location, 'bot') - getArenaLocationPower(location, 'you')
      const conditional = card.arenaAbility?.type === 'rally' && gap < 0 || card.arenaAbility?.type === 'pressure' && gap > 0 || card.arenaAbility?.type === 'parity' && gap === 0
      const queuedHere = plays.filter(entry => entry.locationIndex === location.index).length
      const abilities = getArenaAbilities(card)
      const defects = abilities.some(ability => ability.type === 'defect')
      const opponentHasSpace = location.cards.you.length < 4
      const power = card.power + card.powerBonus
      const formation = getArenaFormation(location.cards.bot)
      for (const queued of plays.filter(play => play.locationIndex === location.index && play.slotIndex !== undefined)) {
        const held = hand.find(card => card.instanceId === queued.cardInstanceId)!
        formation[queued.slotIndex!] = { card: held, slotIndex: queued.slotIndex!, placedOnTurn: state.turn }
      }
      const neighbours = slotIndex === undefined ? [] : [formation[slotIndex - 1], formation[slotIndex + 1]].filter(Boolean)
      const relicCount = formation.filter(placed => placed?.card.type === 'relic').length
      let utility = 0
      for (const ability of abilities) {
        if (ability.type === 'flank' && (slotIndex === 0 || slotIndex === 3)) utility += ability.value
        if (ability.type === 'linked') utility += neighbours.length * ability.value
        if (ability.type === 'adjacent_aura') utility += neighbours.filter(placed => placed!.card.type === 'unit').length * ability.value
        if (ability.type === 'relic_power') utility += relicCount * ability.value
        if (ability.type === 'moved_power' && state.turn < 6) utility += ability.value * .4
        if (ability.type === 'dispel' && location.cards.you.some(placed => placed.card.type === 'relic')) utility += 3
        if (ability.type === 'salvage' && relicCount && state.turn < 6) utility += 2
        if (ability.type === 'draw' && state.turn < 6) utility += Math.min(ability.value, Math.max(0, 7 - available.length))
        if (ability.type === 'move' || ability.type === 'march') {
          const source = ability.type === 'march' ? [location] : state.arena!.locations.filter(site => site !== location)
          const moving = source.flatMap(site => site.cards.bot.map(placed => ({ ...placed, site })))
            .filter(placed => placed.card.type === 'unit')
            .sort((a, b) => getArenaCardPower(a.site, 'bot', a.card) - getArenaCardPower(b.site, 'bot', b.card))[0]
          if (moving && !moving.card.arenaMoved) utility += getArenaAbilities(moving.card).filter(effect => effect.type === 'moved_power').reduce((sum, effect) => sum + effect.value, 0)
        }
        if (ability.type.startsWith('transmute_')) utility += Math.max(0, 6 - state.turn) * 1.5
        if (ability.type === 'plant' && opponentHasSpace) utility += 4
        if (ability.type === 'send' && opponentHasSpace && location.cards.bot.some(entry => entry.card.power + entry.card.powerBonus <= 0)) utility += 5
        if (['drain', 'siphon', 'afflict_all', 'wither'].includes(ability.type)) utility += Math.min(3, location.cards.you.length) * ability.value
        if (ability.type === 'copy_power' && location.cards.bot.length) utility += Math.max(...location.cards.bot.map(entry => entry.card.power + entry.card.powerBonus))
        if (ability.type === 'purge' && location.cards.bot.some(entry => entry.card.arenaToken)) utility += 4
      }
      const value = (defects ? opponentHasSpace ? -power : power : power) + utility + (conditional ? card.arenaAbility!.value : 0) + (card.type === 'spell' ? 2 : 0) + (gap <= 0 ? 2 : 0) - queuedHere * 2 - Math.max(0, gap - 5) * .3
      return { play, value: value / Math.max(1, card.cost) }
    }))).filter((item): item is { play: ArenaPlay; value: number } => Boolean(item)).sort((a, b) => b.value - a.value)
    if (!candidates.length) break
    const chosen = candidates[0].play
    plays.push(chosen)
    available.splice(available.findIndex(card => card.instanceId === chosen.cardInstanceId), 1)
  }
  return plays
}
