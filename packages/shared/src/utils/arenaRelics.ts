import type { Card, CardDefinition } from '../types/card.ts'
import { getArenaAbilities } from './arenaAbilities.ts'

export function getArenaRelicCounter(card: CardDefinition & Partial<Pick<Card, 'arenaRelicCharge'>>) {
  if (card.type !== 'relic') return undefined
  const ability = getArenaAbilities(card).find(effect => effect.type === 'incubate' || effect.type === 'aether_battery')
  if (!ability) return undefined
  const value = ability.type === 'incubate' ? Math.max(0, ability.value - (card.arenaRelicCharge ?? 0)) : card.arenaRelicCharge ?? 0
  return { value, short: ability.type === 'incubate' ? `${value} turn${value === 1 ? '' : 's'}` : `${value} stored`,
    label: ability.type === 'incubate' ? `${value} turn ending${value === 1 ? '' : 's'} until hatching` : `${value} stored aether` }
}
