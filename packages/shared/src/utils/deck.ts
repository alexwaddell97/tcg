import type { Card } from '../types/card.ts'

export function shuffle<T>(array: T[]): T[] {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

export function drawCards(deck: Card[], count: number): { drawn: Card[]; remaining: Card[] } {
  const drawn = deck.slice(0, count)
  const remaining = deck.slice(count)
  return { drawn, remaining }
}
