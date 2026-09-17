import type { ArenaQuestMetrics, ArenaQuestReceipt } from '@tcg/shared'

export interface GameplayQuest {
  id: string
  label: string
  metric: keyof ArenaQuestMetrics
  target: number
  reward: number
}
export interface QuestProgress { counts: Record<string, number>; completed: string[] }
export interface DailyQuestProgress extends QuestProgress { date: string }
export interface WeeklyQuestProgress extends QuestProgress { week: number }

export const DAILY_QUESTS: readonly GameplayQuest[] = [
  { id: 'daily_units', label: 'Play 12 units', metric: 'unitsPlayed', target: 12, reward: 20 },
  { id: 'daily_spells', label: 'Cast 4 spells', metric: 'spellsPlayed', target: 4, reward: 15 },
  { id: 'daily_aether', label: 'Spend 20 aether', metric: 'aetherSpent', target: 20, reward: 10 },
  { id: 'daily_arenas', label: 'Win 3 arenas', metric: 'arenasWon', target: 3, reward: 25 },
]
export const SEASON_QUESTS: readonly GameplayQuest[] = [
  { id: 'season_units', label: 'Play 40 units', metric: 'unitsPlayed', target: 40, reward: 200 },
  { id: 'season_spells', label: 'Cast 12 spells', metric: 'spellsPlayed', target: 12, reward: 200 },
  { id: 'season_aether', label: 'Spend 80 aether', metric: 'aetherSpent', target: 80, reward: 200 },
  { id: 'season_arenas', label: 'Win 12 arenas', metric: 'arenasWon', target: 12, reward: 200 },
  { id: 'season_power', label: 'Finish 4 arenas with 20+ power', metric: 'powerArenas', target: 4, reward: 200 },
  { id: 'season_wins', label: 'Win 4 matches', metric: 'matchesWon', target: 4, reward: 200 },
]
export const TOTAL_DAILY_GEMS = DAILY_QUESTS.reduce((sum, quest) => sum + quest.reward, 0)
export const utcDay = (now = Date.now()) => new Date(now).toISOString().slice(0, 10)
export const emptyQuestProgress = (): QuestProgress => ({ counts: {}, completed: [] })
export const dailyQuestProgress = (saved?: DailyQuestProgress, now = Date.now()): DailyQuestProgress => saved?.date === utcDay(now) ? saved : { date: utcDay(now), ...emptyQuestProgress() }
export const questCount = (progress: QuestProgress, quest: GameplayQuest) => Math.min(quest.target, Math.max(0, Number.isFinite(progress.counts?.[quest.id]) ? progress.counts[quest.id] : 0))

export function advanceQuests(progress: QuestProgress, quests: readonly GameplayQuest[], metrics: ArenaQuestMetrics) {
  const counts = { ...progress.counts }
  const completed = new Set(progress.completed)
  const awarded: GameplayQuest[] = []
  for (const quest of quests) {
    if (completed.has(quest.id)) continue
    counts[quest.id] = Math.min(quest.target, questCount(progress, quest) + metrics[quest.metric])
    if (counts[quest.id] >= quest.target) { completed.add(quest.id); awarded.push(quest) }
  }
  return { progress: { counts, completed: [...completed] }, awarded, reward: awarded.reduce((sum, quest) => sum + quest.reward, 0) }
}

/** Bound receipt data before it can update the locally persisted economy. */
export function validQuestReceipt(value: unknown, now = Date.now()): value is ArenaQuestReceipt {
  if (!value || typeof value !== 'object') return false
  const receipt = value as ArenaQuestReceipt
  if (typeof receipt.matchId !== 'string' || !receipt.matchId.length || receipt.matchId.length > 200
    || !Number.isSafeInteger(receipt.finishedAt) || receipt.finishedAt <= 0 || receipt.finishedAt > now + 60_000
    || !receipt.metrics || typeof receipt.metrics !== 'object') return false
  const bounds: ArenaQuestMetrics = { unitsPlayed: 48, spellsPlayed: 48, aetherSpent: 21, arenasWon: 3, powerArenas: 3, matchesWon: 1 }
  return (Object.keys(bounds) as (keyof ArenaQuestMetrics)[]).every(key => Number.isInteger(receipt.metrics[key]) && receipt.metrics[key] >= 0 && receipt.metrics[key] <= bounds[key])
}
