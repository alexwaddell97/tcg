import type { CardDefinition } from '../types/card.ts'
import { FOUNDATION_VARIANTS } from './foundationVariants.ts'
import { getExclusiveCardSeason } from './arenaSeasons.ts'

export interface ShopCardVariant {
  id: string
  definitionId: string
  name: string
  style: string
  imageUrl: string
  gemCost: number
  source?: 'shop' | 'pack' | 'season'
}
/** Shop-exclusive illustrations; included alongside pack artwork in the daily rotation. */
export const SHOP_CARD_VARIANTS: readonly ShopCardVariant[] = [
  { id: 'frost-sage-winter-ink', definitionId: 'frost_sage', name: 'Winter Ink', style: 'Brush & ink', imageUrl: '/cards/variants/frost-sage-winter-ink.webp', gemCost: 1800 },
  { id: 'chaos-drake-vermilion-tempest', definitionId: 'chaos_drake', name: 'Vermilion Tempest', style: 'Woodblock', imageUrl: '/cards/variants/chaos-drake-vermilion-tempest.webp', gemCost: 1800 },
  { id: 'ancient-guardian-hollow-sentinel', definitionId: 'ancient_guardian', name: 'Hollow Sentinel', style: 'Dark folklore', imageUrl: '/cards/variants/ancient-guardian-hollow-sentinel.webp', gemCost: 1800 },
]
export const SEASON_CARD_VARIANT: ShopCardVariant = { id: 'sp-midnight-sovereign', definitionId: 'paradox_regent', name: 'Midnight Sovereign', style: 'Gothic stained glass', imageUrl: '/ui/seasons/shattered-pacts/midnight-sovereign-v2.webp', gemCost: 0, source: 'season' }
export const PACK_CARD_VARIANTS = FOUNDATION_VARIANTS
export const CARD_VARIANTS: readonly ShopCardVariant[] = [...SHOP_CARD_VARIANTS, ...PACK_CARD_VARIANTS, SEASON_CARD_VARIANT]
/** Season-exclusive art is never sold, even after its base card enters packs. */
export const SHOP_VARIANT_POOL: readonly ShopCardVariant[] = [...SHOP_CARD_VARIANTS, ...PACK_CARD_VARIANTS]
export const SHOP_VARIANT_SLOTS = 3
export const SHOP_ROTATION_INTERVAL_MS = 24 * 60 * 60 * 1000

// Fixed ordering, independent of account, purchases, reloads and local timezone.
// Walk consecutive groups so every eligible illustration returns in about ten days.
function rotationOrder(id: string) {
  let hash = 2166136261
  for (const char of `arena-shop:${id}`) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619)
  return hash >>> 0
}
const rotationPool = [...SHOP_VARIANT_POOL].sort((a, b) => rotationOrder(a.id) - rotationOrder(b.id) || a.id.localeCompare(b.id))

export function getShopVariantRotation(now = Date.now()) {
  const day = Math.floor(now / SHOP_ROTATION_INTERVAL_MS)
  const pool = rotationPool.filter(variant => !getExclusiveCardSeason(variant.definitionId, now))
  const count = Math.min(SHOP_VARIANT_SLOTS, pool.length)
  const start = pool.length ? ((day * SHOP_VARIANT_SLOTS) % pool.length + pool.length) % pool.length : 0
  return {
    id: day,
    refreshesAt: (day + 1) * SHOP_ROTATION_INTERVAL_MS,
    variants: Array.from({ length: count }, (_, i) => pool[(start + i) % pool.length]),
  }
}
export const getCardVariant = (id: unknown, definitionId?: string) => CARD_VARIANTS.find(variant => variant.id === id && (definitionId === undefined || variant.definitionId === definitionId))

export function applyCardVariant<T extends CardDefinition>(card: T, variantId: unknown): T {
  const variant = getCardVariant(variantId, card.definitionId)
  return variant ? { ...card, imageUrl: variant.imageUrl } : card
}

/** Match payloads may contain known IDs for this deck only, never arbitrary URLs. */
export function sanitizeCardVariants(value: unknown, deck: readonly string[]): Record<string, string> {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
  return Object.fromEntries(deck.flatMap(id => {
    const variant = Object.hasOwn(source, id) ? getCardVariant(source[id], id) : undefined
    return variant ? [[id, variant.id]] : []
  }))
}
