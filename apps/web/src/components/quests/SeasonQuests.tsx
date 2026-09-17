import { useCollectionStore } from '../../stores/useCollectionStore.ts'
import { CURRENT_SEASON, emptySeasonProgress, seasonActive, seasonQuestProgress, seasonQuestResetAt, seasonWeek } from '../../lib/seasonPass.ts'
import { SEASON_QUESTS } from '../../lib/quests.ts'
import { questResetLabel, useQuestClock } from '../../hooks/useQuestProgress.ts'
import QuestList from './QuestList.tsx'

export default function SeasonQuests() {
  const now = useQuestClock()
  const season = useCollectionStore(state => state.seasons[CURRENT_SEASON.id]) ?? emptySeasonProgress()
  if (!seasonActive(now)) return null
  const progress = seasonQuestProgress(season, now)
  return <section className="ae-season-quests" aria-label={`${CURRENT_SEASON.name} season quests`}>
    <div className="ae-quests-heading"><div><p className="ae-quests-season-label">Season quests</p><h2>{CURRENT_SEASON.name}</h2></div><span>Week {seasonWeek(now)} · Resets in {questResetLabel(seasonQuestResetAt(now), now)}</span></div>
    <QuestList quests={SEASON_QUESTS} progress={progress} currency="XP"/>
    <p className="ae-quests-note">Complete objectives to earn season XP. Progress counts after six-turn matches, including practice.</p>
  </section>
}
