import type { ArenaQuestReceipt } from '@tcg/shared'
import { CURRENT_SEASON, getProfileAvatar, getProfileTitle, SEASON_CARD_VARIANT } from '@tcg/shared'
import { SEASON_QUESTS, advanceQuests, emptyQuestProgress, validQuestReceipt } from './quests.ts'
import type { WeeklyQuestProgress } from './quests.ts'

export { CURRENT_SEASON } from '@tcg/shared'
export type GemReward = { kind: 'gems'; amount: number }
export type SeasonReward = GemReward
  | { kind: 'card'; definitionId: string }
  | { kind: 'title'; id: string; name: string }
  | { kind: 'avatar'; id: string; name: string; imageUrl: string; position: string }
  | { kind: 'card_back'; id: string; name: string; imageUrl: string }
  | { kind: 'variant'; id: string; name: string; style: string; interpretation: string; definitionId: string; imageUrl: string }
export interface SeasonProgress { xp: number; claimed: number[]; matches: Record<string, true>; quests?: WeeklyQuestProgress }
export const emptySeasonProgress = (): SeasonProgress => ({ xp: 0, claimed: [], matches: {} })
export const seasonActive = (now = Date.now()) => now >= CURRENT_SEASON.startsAt && now < CURRENT_SEASON.endsAt
export const seasonLevel = (xp: number) => Math.min(CURRENT_SEASON.levels, 1 + Math.floor(xp / CURRENT_SEASON.xpPerLevel))
export const freeSeasonReward = (level: number): GemReward => ({ kind: 'gems', amount: level % 5 === 0 ? 40 : 20 })

// Premium remains a preview. Stable cosmetic IDs are independent of base-card ownership.
const premiumMilestones: Partial<Record<number, SeasonReward>> = {
  1: { kind: 'card', definitionId: CURRENT_SEASON.featuredCard },
  3: { kind: 'avatar', ...getProfileAvatar('sp-regent-portrait')! },
  5: { kind: 'title', ...getProfileTitle('sp-timebender')! },
  8: { kind: 'card_back', id: 'sp-astral-covenant', name: 'Astral Covenant', imageUrl: '/ui/seasons/shattered-pacts/astral-covenant.webp' },
  11: { kind: 'avatar', ...getProfileAvatar('sp-titan-portrait')! },
  14: { kind: 'title', ...getProfileTitle('sp-pactbreaker')! },
  17: { ...SEASON_CARD_VARIANT, kind: 'variant', interpretation: 'A cursed Regent beneath a crimson eclipse, holding a shattered hourglass.' },
  20: { kind: 'card', definitionId: CURRENT_SEASON.secondCard },
}
export const premiumSeasonReward = (level: number): SeasonReward => premiumMilestones[level] ?? { kind: 'gems', amount: level % 5 === 0 ? 120 : 80 }
export const SEASON_REWARD_TRACK = Array.from({ length: CURRENT_SEASON.levels }, (_, i) => ({ level: i + 1, free: freeSeasonReward(i + 1), premium: premiumSeasonReward(i + 1) }))
export const seasonWeek = (now = Date.now()) => Math.floor((now - CURRENT_SEASON.startsAt) / (7 * 86_400_000)) + 1
export const seasonQuestResetAt = (now = Date.now()) => Math.min(CURRENT_SEASON.endsAt, CURRENT_SEASON.startsAt + seasonWeek(now) * 7 * 86_400_000)
export const seasonQuestProgress = (progress: SeasonProgress, now = Date.now()): WeeklyQuestProgress => progress.quests?.week === seasonWeek(now) ? progress.quests : { week: seasonWeek(now), ...emptyQuestProgress() }

export function advanceSeasonQuests(progress: SeasonProgress, receipt: ArenaQuestReceipt, now = Date.now()) {
  if (!validQuestReceipt(receipt, now) || !seasonActive(now) || !seasonActive(receipt.finishedAt)
    || seasonWeek(receipt.finishedAt) !== seasonWeek(now) || Object.hasOwn(progress.matches, receipt.matchId)) return { progress, earnedXP: 0 }
  const current = seasonQuestProgress(progress, now)
  const result = advanceQuests(current, SEASON_QUESTS, receipt.metrics)
  const xp = Math.min((CURRENT_SEASON.levels - 1) * CURRENT_SEASON.xpPerLevel, progress.xp + result.reward)
  return { earnedXP: xp - progress.xp, progress: { ...progress, xp, quests: { ...result.progress, week: current.week }, matches: { ...progress.matches, [receipt.matchId]: true as const } } }
}
export function claimFreeSeasonLevel(progress: SeasonProgress, level: number, now = Date.now()) {
  if (now < CURRENT_SEASON.startsAt || !Number.isInteger(level) || level < 1 || level > seasonLevel(progress.xp) || progress.claimed.includes(level)) return null
  // Earned free rewards remain claimable after the season closes.
  return { progress: { ...progress, claimed: [...progress.claimed, level] }, reward: freeSeasonReward(level) }
}
