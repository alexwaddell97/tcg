/** Read-only audit: node --import tsx scripts/economy-audit.ts. No player saves are read or written. */
import { ARENA_CARD_DATABASE, ARENA_STARTER_DECK, CURRENT_SEASON, PACK_CARD_VARIANTS, SHOP_CARD_VARIANTS } from '../packages/shared/src/index.ts'
import { PACK_PRICES, eligiblePackCards, generatePackReward } from '../apps/web/src/lib/packRewards.ts'
import { TOTAL_DAILY_GEMS } from '../apps/web/src/lib/quests.ts'
import { SEASON_REWARD_TRACK } from '../apps/web/src/lib/seasonPass.ts'
import { MAX_PACK_TOKENS, PACK_TOKEN_INTERVAL_MS, useCollectionStore } from '../apps/web/src/stores/useCollectionStore.ts'

const day = 86_400_000
const seasonDays = (CURRENT_SEASON.endsAt - CURRENT_SEASON.startsAt) / day
const freeSeasonGems = SEASON_REWARD_TRACK.reduce((n, tier) => n + tier.free.amount, 0)
const premiumSeasonGems = SEASON_REWARD_TRACK.reduce((n, tier) => n + (tier.premium.kind === 'gems' ? tier.premium.amount : 0), 0)
const initial = useCollectionStore.getInitialState()
const startingGems = initial.gems
const sets = ['core', 'expanded', 'eternal'] as const
const round = (n: number) => Math.round(n * 100) / 100

// Seeded pulls call the actual production drop logic, including rarity weights,
// variant eligibility and duplicate protection. Freeze at season end so all 140
// base cards are available; do not model imaginary future card releases.
let seed = 20260917
const random = () => {
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
  return seed / 4294967296
}
const runs = 1000
const pools = Object.fromEntries(sets.map(set => {
  const baseCount = eligiblePackCards(set, {}, CURRENT_SEASON.endsAt).length
  const pulls: number[] = []
  for (let run = 0; run < runs; run++) {
    const owned: Record<string, number> = {}
    const variants: Record<string, true> = {}
    let count = 0, baseOwned = 0
    while (baseOwned < baseCount) {
      const reward = generatePackReward(set, owned, variants, random, CURRENT_SEASON.endsAt)
      if (!reward) throw new Error(`Pool ${set} exhausted early`)
      if (reward.variantId) variants[reward.variantId] = true
      else { owned[reward.card.definitionId] = 1; baseOwned++ }
      count++
    }
    pulls.push(count)
  }
  pulls.sort((a, b) => a - b)
  return [set, {
    baseCount,
    availableDuringSeason: eligiblePackCards(set, {}, CURRENT_SEASON.startsAt).length,
    packVariants: PACK_CARD_VARIANTS.filter(variant => ARENA_CARD_DATABASE.find(card => card.definitionId === variant.definitionId)?.arenaSet === set).length,
    meanPulls: pulls.reduce((sum, n) => sum + n, 0) / runs,
    medianPulls: pulls[Math.floor(runs * .5)],
    p90Pulls: pulls[Math.ceil(runs * .9) - 1],
  }]
})) as Record<typeof sets[number], { baseCount: number; availableDuringSeason: number; packVariants: number; meanPulls: number; medianPulls: number; p90Pulls: number }>

const prices = [
  { name: 'Before September 17 rebalance', expanded: 100, eternal: 150, variant: 200 },
  { name: 'Live', expanded: PACK_PRICES.expanded.cost, eternal: PACK_PRICES.eternal.cost, variant: SHOP_CARD_VARIANTS[0].gemCost },
]
const freePacksWeekly = 7 * day / PACK_TOKEN_INTERVAL_MS
const coreWeeks = Math.max(0, (pools.core.meanPulls - initial.tokens) / freePacksWeekly)
const profiles = [
  { name: 'Daily completionist', daysPerWeek: 7 },
  { name: 'Four days per week', daysPerWeek: 4 },
  { name: 'Three days per week', daysPerWeek: 3 },
]

console.log(JSON.stringify({
  assumptions: [
    'One reward per pack; collect from an empty owned collection, as currently initialized.',
    'Each active day completes every daily quest. Every profile finishes the free season track.',
    'Renewed-season figures assume an equivalent free pass every 28 days; only the current pass is implemented.',
    'No purchases with real money, no gem spending on variants in base-card completion estimates, no new cards added.',
    'Free Core packs are claimed before the two-token cap stops generation. Starter gems are a one-off.',
    'Mean-pull budget estimates are averages, not exact scheduled reward dates or guarantees.',
    'Premium currency is a preview only and is excluded from available income.',
  ],
  income: { dailyGems: TOTAL_DAILY_GEMS, seasonDays, freeSeasonGems, freeSeasonWeeklyAverage: freeSeasonGems * 7 / seasonDays, premiumSeasonGemsPreviewOnly: premiumSeasonGems, startingGems, freePacksWeekly, freePackCap: MAX_PACK_TOKENS, startingCorePacks: initial.tokens, currentlyOwnedAtStart: Object.keys(initial.cards).length, playableStarterCards: ARENA_STARTER_DECK.length },
  pools,
  simulation: { runsPerSet: runs, seed: 20260917, coreCompletionWeeks: round(coreWeeks) },
  comparisons: prices.map(price => ({
    ...price,
    expectedGemCostForAllPaidBaseCards: round(pools.expanded.meanPulls * price.expanded + pools.eternal.meanPulls * price.eternal),
    // When every base and eligible pack variant is owned there are no wasted
    // duplicate pulls: their combined pool size is an exact reward count.
    gemCostAllPaidBaseAndPackVariantsPlusShopArt: (pools.expanded.baseCount + pools.expanded.packVariants) * price.expanded + (pools.eternal.baseCount + pools.eternal.packVariants) * price.eternal + SHOP_CARD_VARIANTS.length * price.variant,
    profiles: profiles.map(profile => {
      const dailyWeekly = TOTAL_DAILY_GEMS * profile.daysPerWeek
      const weeklyGems = dailyWeekly + freeSeasonGems * 7 / seasonDays
      const gemBudget = pools.expanded.meanPulls * price.expanded + pools.eternal.meanPulls * price.eternal - startingGems
      return {
        ...profile, weeklyGems,
        daysToSaveFromZero: { expanded: round(price.expanded / weeklyGems * 7), eternal: round(price.eternal / weeklyGems * 7), variant: round(price.variant / weeklyGems * 7) },
        all140BaseWeeksRenewedSeasons: round(Math.max(coreWeeks, gemBudget / weeklyGems)),
        all140BaseWeeksOnlyCurrentPass: round(Math.max(coreWeeks, (gemBudget - freeSeasonGems) / dailyWeekly)),
        eachPaidSetWeeksIfAllGemsGoThere: { expanded: round(pools.expanded.meanPulls * price.expanded / weeklyGems), eternal: round(pools.eternal.meanPulls * price.eternal / weeklyGems) },
      }
    }),
  })),
}, null, 2))
