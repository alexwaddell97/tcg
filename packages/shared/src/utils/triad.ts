import type { Card, CardFaceValues, Rarity } from '../types/card.ts'

const RARITY_BONUS: Record<Rarity, number> = {
  common: 0,
  uncommon: 1,
  rare: 2,
  legendary: 3,
}

const clampFace = (value: number): number => Math.max(1, Math.min(10, value))

function hashSeed(input: string): number {
  let hash = 0
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0
  }
  return hash
}

function pickOffset(seed: number, shift: number): number {
  return ((seed >>> shift) & 0x3) - 1
}

export function getTriadValues(card: Card): CardFaceValues {
  if (card.triadValues) return card.triadValues

  const rarityBonus = RARITY_BONUS[card.rarity] ?? 0
  const base = Math.max(1, Math.round((card.power + card.cost) / 2)) + rarityBonus
  const seed = hashSeed(card.definitionId)

  const top = clampFace(base + pickOffset(seed, 0))
  const right = clampFace(base + pickOffset(seed, 2))
  const bottom = clampFace(base + pickOffset(seed, 4))
  const left = clampFace(base + pickOffset(seed, 6))

  return { top, right, bottom, left }
}
