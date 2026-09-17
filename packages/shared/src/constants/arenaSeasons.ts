/** Append new seasons; retain previous entries so their release dates remain stable. */
export const ARENA_SEASONS = [{
  id: 'shattered-pacts-01', name: 'Shattered Pacts',
  startsAt: Date.UTC(2026, 8, 15), endsAt: Date.UTC(2026, 9, 13),
  featuredCard: 'paradox_regent', secondCard: 'prism_titan',
  xpPerLevel: 200, levels: 20,
}] as const

export const CURRENT_SEASON = ARENA_SEASONS[ARENA_SEASONS.length - 1]

/** Includes unreleased seasons: cards cannot enter packs before their pass begins. */
export function getExclusiveCardSeason(definitionId: string, now = Date.now()) {
  return ARENA_SEASONS.find(season => now < season.endsAt
    && (season.featuredCard === definitionId || season.secondCard === definitionId))
}
