export const CARD_BORDERS = [
  { id: 'bronze', name: 'Bronze', level: 1, xp: 0, color: '#d5ae72', description: 'Forged bronze. Where every legend begins.' },
  { id: 'silver', name: 'Silver', level: 2, xp: 20, color: '#cfedff', description: 'Polished silver, cut with cold light.' },
  { id: 'jade', name: 'Jade', level: 3, xp: 80, color: '#78efb2', description: 'Living crystal threaded through ancient metal.' },
  { id: 'arcane', name: 'Arcane', level: 4, xp: 180, color: '#bf9bff', description: 'Amethyst facets and aether-bound inscriptions.' },
  { id: 'sunfire', name: 'Sunfire', level: 5, xp: 360, color: '#ffbd62', description: 'Gilded wings, tempered in the heart of a star.' },
  { id: 'eternal', name: 'Eternal', level: 6, xp: 700, color: '#f0cbff', description: 'Prismatic aether. A frame worthy of a legend.' },
] as const

export type CardBorderId = typeof CARD_BORDERS[number]['id']
export interface CardMastery { xp: number; equippedBorder?: CardBorderId }
export interface CardMasteryReward { matchId: string; cards: { definitionId: string; xp: number }[] }
/** One award per played card definition, after all six turns. Replays cannot farm XP. */
export const CARD_PLAY_XP = 20
export const MAX_CARD_XP = CARD_BORDERS[CARD_BORDERS.length - 1].xp
export const isCardBorder = (value: unknown): value is CardBorderId => CARD_BORDERS.some(border => border.id === value)
export const normalizeCardXP = (xp: unknown): number => typeof xp === 'number' && Number.isFinite(xp) ? Math.min(MAX_CARD_XP, Math.max(0, Math.floor(xp))) : 0
export const getCardMasteryTier = (xp: number = 0) => [...CARD_BORDERS].reverse().find(border => normalizeCardXP(xp) >= border.xp)!
export const isBorderUnlocked = (xp: number, border: CardBorderId) => CARD_BORDERS.some(tier => tier.id === border && normalizeCardXP(xp) >= tier.xp)
export const getEquippedCardBorder = (mastery?: CardMastery): CardBorderId => mastery?.equippedBorder && isBorderUnlocked(mastery.xp, mastery.equippedBorder)
  ? mastery.equippedBorder : getCardMasteryTier(mastery?.xp).id

/** Accept asset identifiers only. Never allow custom CSS, URLs, or private collection data. */
export function sanitizeCardBorders(value: unknown, deck: readonly string[]): Record<string, CardBorderId> {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
  return Object.fromEntries(deck.map(id => [id, Object.hasOwn(source, id) && isCardBorder(source[id]) ? source[id] : 'bronze']))
}
