import type { ArenaAbility, ArenaArchetype, CardDefinition } from '../types/card.ts'

export const ARENA_ARCHETYPES: { id: ArenaArchetype; name: string }[] = [
  { id: 'transmutation', name: 'Transmutation' }, { id: 'sabotage', name: 'Sabotage' },
  { id: 'affliction', name: 'Affliction' }, { id: 'conduits', name: 'Conduits' },
  { id: 'formation', name: 'Formation' }, { id: 'wayfarers', name: 'Wayfarers' },
  { id: 'invocation', name: 'Invocation' }, { id: 'stewardship', name: 'Stewardship' },
]

export function getArenaAbilities(card: CardDefinition): ArenaAbility[] {
  return [...(card.arenaAbility ? [card.arenaAbility] : []), ...(card.arenaEffects ?? [])]
}

export const ARENA_ABILITY_LABELS: Record<ArenaAbility['type'], string> = {
  rally: 'Rally', pressure: 'Pressure', parity: 'Parity', grow: 'Growth', aura: 'Support', alone: 'Solo', full: 'United',
  ward: 'Ward', drain: 'Afflict', draw: 'Draw', boost: 'Power up', boost_all: 'Power up', move: 'Shift',
  transmute_hand: 'Transmute', transmute_deck: 'Transmute', transmute_draw: 'Prepare transmutation',
  hand_weaken: 'Refine', hand_boost: 'Imbue', transmuted_power: 'Transmuted', defect: 'Defect', send: 'Exile',
  plant: 'Plant', burden: 'Burden', token_aura: 'Token support', purge: 'Purge', siphon: 'Siphon', wither: 'Wither',
  afflict_all: 'Afflict', harvest: 'Harvest', cleanse: 'Cleanse', copy_power: 'Mirror', transfer: 'Transfer',
  consume: 'Consume', purify: 'Invert', equalize: 'Equalize', echo_power: 'Echo', distribute: 'Distribute', double: 'Double',
  adjacent_aura: 'Standard', spellfont: 'Spellfont', warding_bell: 'Protected', incubate: 'Incubation', aether_battery: 'Stored aether',
  flank: 'Flank', linked: 'Linked', moved_power: 'Journey', relic_power: 'Reliquary', journey_aura: 'Wayfinder',
  march: 'March', dispel: 'Dispel', salvage: 'Salvage', formation_boost: 'Rally the line',
}

/** Shared text keeps the catalog, inspection and rules in agreement. */
export function describeArenaAbility(ability: ArenaAbility): string {
  const { type, value, target } = ability
  const enemy = target === 'weakest' ? 'the weakest unwarded enemy unit here' : 'the strongest unwarded enemy unit here'
  let text: string
  switch (type) {
    case 'flank': return `Ongoing: +${value} power in position 1 or 4.`
    case 'linked': return `Ongoing: +${value} power for each occupied adjacent friendly position (units or relics).`
    case 'moved_power': return `Journey: +${value} power after this unit moves between arenas. Does not stack; changing sides does not count.`
    case 'relic_power': return `Ongoing: +${value} power for each friendly relic here.`
    case 'journey_aura': return `Ongoing: friendly units here that have moved between arenas have +${value} power.`
    case 'march': text = 'move your weakest unit here to the next arena (left → middle → right → left), if space remains.'; break
    case 'dispel': text = 'destroy the cheapest enemy relic here. Ties favour the earlier position.'; break
    case 'salvage': text = 'destroy your cheapest relic here to draw 1 card. Ties favour the earlier position.'; break
    case 'formation_boost': text = `give your units here with an occupied adjacent friendly position +${value} power.`; break
    case 'adjacent_aura': return `Ongoing: adjacent friendly units have +${value} power.`
    case 'spellfont': return `After you cast a spell here, give your lowest-power adjacent unit +${value} power. Ties favour the earlier position.`
    case 'warding_bell': return 'Once each turn, prevent the first enemy power reduction to an adjacent friendly unit.'
    case 'incubate': return `After ${value} turn endings, destroy this and summon a 5-power Emberling in its position. Includes the turn played.`
    case 'aether_battery': return 'After each turn, store your unspent aether. When you next reveal an adjacent friendly unit, spend all stored aether to give it that much power before its ability.'
    case 'rally': return `On Reveal: +${value} power if you were behind here before this card revealed.`
    case 'pressure': return `On Reveal: +${value} power if you were leading here before this card revealed.`
    case 'parity': return `On Reveal: +${value} power if this arena was tied before this card revealed.`
    case 'grow': return `After each later turn, gain +${value} power.`
    case 'aura': return `Ongoing: your other units here have +${value} power.`
    case 'alone': return `Ongoing: +${value} power while this is your only card here.`
    case 'full': return `Ongoing: +${value} power while your side here is full.`
    case 'ward': return 'Ward: enemy effects cannot reduce this card’s power.'
    case 'transmuted_power': return `Ongoing: +${value} power if this card has been transmuted.`
    case 'token_aura': return `Ongoing: your other generated units here have +${value} power.`
    case 'drain': text = target === 'other_arenas' ? `the weakest unwarded enemy unit in each other arena loses ${value} power.` : `${enemy} loses ${value} power.`; break
    case 'draw': text = `draw ${value} card${value === 1 ? '' : 's'} (hand limit 7).`; break
    case 'boost': text = target === 'self' ? `this gains +${value} power.` : `give your ${target === 'weakest' ? 'weakest other' : 'strongest'} unit here +${value} power.`; break
    case 'boost_all': text = `give your units here +${value} power.`; break
    case 'move': text = 'move your weakest unit from another arena here, if space remains.'; break
    case 'transmute_hand': text = `Transmute ${value === 1 ? 'the lowest-power eligible unit' : `the ${value} lowest-power eligible units`} in your hand: swap cost and power (cost 0–6; once per card).`; break
    case 'transmute_deck': text = 'Transmute every eligible unit in your deck: swap cost and power (cost 0–6; once per card).'; break
    case 'transmute_draw': text = `Transmute the next ${value === 1 ? 'eligible unit you draw' : `${value} eligible units you draw`}: swap cost and power (cost 0–6; once per card).`; break
    case 'hand_weaken': text = `the lowest-power unit in your hand loses ${value} power.`; break
    case 'hand_boost': text = `give the ${target === 'strongest' ? 'highest' : 'lowest'}-power unit in your hand +${value} power.`; break
    case 'defect': text = 'Defect: switch to the opponent’s side here if there is an unreserved space. Otherwise, stay on your side.'; break
    case 'send': text = 'Exile your weakest other unit here with 0 or less power to the opponent’s side, if there is an unreserved space.'; break
    case 'plant': text = ability.token === 'burden_token' ? `Plant a −1 Burden on the enemy side ${target === 'other_arenas' ? 'of each other arena' : 'here'}, if space remains. Burdens stay until removed by an effect.` : target === 'other_arenas' ? 'Plant a −2 Cursed Offering on the enemy side of each other arena, if space remains. An Offering disappears when its controller casts a spell there.' : 'Plant a −2 Cursed Offering on the enemy side here, if space remains. It disappears when its controller casts a spell here.'; break
    case 'burden': text = `add a Burden to ${target === 'self' ? 'your' : 'the opponent’s'} hand, if space remains. It is a 0-cost, −1-power unit with no ability.`; break
    case 'purge': text = 'Purge all generated units on your side here.'; break
    case 'siphon': text = target === 'all' ? `Siphon ${value} power from each unwarded enemy here: they lose it and this gains the amount removed.` : `Siphon ${value} power from ${enemy}: it loses it and this gains the amount removed.`; break
    case 'wither': text = `Wither ${enemy}: it loses ${value} power at the end of this turn and the next.`; break
    case 'afflict_all': text = `all unwarded enemy units here lose ${value} power.`; break
    case 'harvest': text = `gain +${value} power for each enemy unit here with negative current power.${target === 'afflicted' ? ' Gain +1 instead for each other enemy here with an applied power reduction.' : ''}`; break
    case 'cleanse': text = `Cleanse ${target === 'weakest' ? 'your weakest afflicted unit here' : 'your units here'}: remove applied power reductions and Wither, preserving buffs and printed negative power.`; break
    case 'copy_power': text = `set this card’s current power to your ${target === 'weakest' ? 'weakest' : 'strongest'} other unit’s current power here.`; break
    case 'transfer': text = `transfer up to ${value} positive power from your strongest unit here to your weakest unit in another arena.`; break
    case 'consume': text = 'Consume your weakest other unit here. Gain its positive current power, then remove it.'; break
    case 'purify': text = 'Invert your weakest unit here if its current power is negative, turning that number positive.'; break
    case 'equalize': text = `set every unit’s current power here to ${value}. Enemy Ward prevents reductions.`; break
    case 'echo_power': text = 'give your weakest other unit here power equal to this card’s positive current power.'; break
    case 'distribute': text = 'distribute all this card’s positive current power evenly among your weakest units in the other arenas. Any extra point goes left first.'; break
    case 'double': text = 'double this card’s current power.'; break
  }
  const timing = ability.timing === 'spell' ? ability.oncePerTurn ? 'After you cast a spell here, once per turn' : 'After you cast a spell here' : ability.timing === 'final' ? 'After turn 6' : 'On Reveal'
  return `${timing}${ability.condition === 'transmuted' ? ', if this card was transmuted' : ''}: ${text}`
}
