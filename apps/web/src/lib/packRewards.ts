import { ARENA_CARD_DATABASE, PACK_CARD_VARIANTS, applyCardVariant, getExclusiveCardSeason } from '@tcg/shared'
import type { CardDefinition, Rarity } from '@tcg/shared'

const ETERNAL_PACK_COST = 1200
export const PACK_PRICES: Record<string, { currency: 'gems' | 'tokens'; cost: number }> = {
  // At 70 daily gems + 480 free-pass gems per 28 days: ~9 days / ~14 days.
  core: { currency: 'tokens', cost: 1 },
  expanded: { currency: 'gems', cost: ETERNAL_PACK_COST * 2 / 3 },
  eternal: { currency: 'gems', cost: ETERNAL_PACK_COST },
}
export const PACK_VARIANT_CHANCE = .01
export interface PackReward { card: CardDefinition; variantId?: string }
export function eligiblePackVariants(packId: string, owned: Record<string, number>, variants: Record<string, true>, now = Date.now()) {
  if (!PACK_PRICES[packId]) return []
  return PACK_CARD_VARIANTS.filter(variant => !variants[variant.id] && owned[variant.definitionId] > 0
    && !getExclusiveCardSeason(variant.definitionId, now)
    && ARENA_CARD_DATABASE.find(card => card.definitionId === variant.definitionId)?.arenaSet === packId)
}
export function hasPackRewards(packId: string, owned: Record<string, number>, variants: Record<string, true>, now = Date.now()) {
  return eligiblePackCards(packId, owned, now).length > 0 || eligiblePackVariants(packId, owned, variants, now).length > 0
}
/** Variants are rarer than legendary pulls while both reward pools have stock. */
export function generatePackReward(packId: string, owned: Record<string, number>, variants: Record<string, true>, random = Math.random, now = Date.now()): PackReward | undefined {
  const base = eligiblePackCards(packId, owned, now)
  const alternate = eligiblePackVariants(packId, owned, variants, now)
  if (alternate.length && (!base.length || random() < PACK_VARIANT_CHANCE)) {
    const variant = alternate[Math.min(alternate.length - 1, Math.floor(random() * alternate.length))]
    const card = ARENA_CARD_DATABASE.find(card => card.definitionId === variant.definitionId)!
    return { card: applyCardVariant(card, variant.id), variantId: variant.id }
  }
  const card = generatePackCard(packId, owned, random, now)
  return card ? { card } : undefined
}

// Rarity weights are renormalized over the unowned cards available in each set.
export const PACK_WEIGHTS: Record<string, Record<Rarity, number>> = {
  core: { common: 60, uncommon: 25, rare: 12, legendary: 3 },
  eternal: { common: 0, uncommon: 0, rare: 0, legendary: 100 },
  expanded: { common: 60, uncommon: 25, rare: 12, legendary: 3 },
}
export function eligiblePackCards(packId: string, owned: Record<string, number>, now = Date.now()) {
  const weights = PACK_WEIGHTS[packId]
  if (!weights) return []
  return ARENA_CARD_DATABASE.filter(card => !card.isTransformTarget && !(owned[card.definitionId] > 0)
    && !getExclusiveCardSeason(card.definitionId, now)
    && weights[card.rarity] > 0 && card.arenaSet === packId)
}
/** One unowned card, or no reward when exhausted. Never falls back to duplicates. */
export function generatePackCard(packId: string, owned: Record<string, number>, random = Math.random, now = Date.now()) {
  const pool = eligiblePackCards(packId, owned, now)
  if (!pool.length) return undefined
  const weights = PACK_WEIGHTS[packId]
  const rarities = (Object.keys(weights) as Rarity[]).filter(rarity => pool.some(card => card.rarity === rarity))
  let roll = random() * rarities.reduce((sum, rarity) => sum + weights[rarity], 0)
  const rarity = rarities.find(rarity => { roll -= weights[rarity]; return roll < 0 }) ?? rarities.at(-1)!
  const choices = pool.filter(card => card.rarity === rarity)
  return choices[Math.min(choices.length - 1, Math.floor(random() * choices.length))]
}
