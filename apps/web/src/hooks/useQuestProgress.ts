import { useEffect, useState } from 'react'
import { useCollectionStore } from '../stores/useCollectionStore.ts'
import { DAILY_QUESTS, dailyQuestProgress } from '../lib/quests.ts'

/** Keep reset labels and visible objectives current across midnight and tab focus. */
export function useQuestClock() {
  const [now, setNow] = useState(Date.now)
  useEffect(() => {
    const refresh = () => setNow(Date.now())
    const timer = window.setInterval(refresh, 60_000)
    window.addEventListener('focus', refresh)
    return () => { window.clearInterval(timer); window.removeEventListener('focus', refresh) }
  }, [])
  return now
}
export function useDailyQuests() {
  const saved = useCollectionStore(state => state.dailyQuests)
  const now = useQuestClock()
  const progress = dailyQuestProgress(saved, now)
  const count = DAILY_QUESTS.filter(quest => progress.completed.includes(quest.id)).length
  return { now, progress, count }
}
export function questResetLabel(at: number, now: number) {
  const hours = Math.max(0, Math.ceil((at - now) / 3_600_000))
  return hours >= 24 ? `${Math.floor(hours / 24)}d ${hours % 24}h` : `${hours}h`
}
