import { Link } from 'react-router-dom'
import ArenaMenuHeader from '../components/ui/ArenaMenuHeader.tsx'
import { useCollectionStore } from '../stores/useCollectionStore.ts'
import { DAILY_QUESTS, TOTAL_DAILY_GEMS } from '../lib/quests.ts'
import { questResetLabel, useDailyQuests } from '../hooks/useQuestProgress.ts'
import QuestList from '../components/quests/QuestList.tsx'
import SeasonQuests from '../components/quests/SeasonQuests.tsx'
import { seasonActive } from '../lib/seasonPass.ts'

export default function Quests() {
  const gems = useCollectionStore(state => state.gems)
  const { now, progress, count } = useDailyQuests()
  const resetAt = (Math.floor(now / 86_400_000) + 1) * 86_400_000
  return <div className="arena-library-screen h-screen overflow-y-auto flex flex-col">
    <ArenaMenuHeader title="Quests" balance={gems} currency="gems"/>
    <div className="ae-quests-page">
      <SeasonQuests/>
      {seasonActive(now) && <Link className="ae-quests-link" to="/shop?tab=pass">Season pass rewards →</Link>}
      <section aria-label="Daily quests">
        <div className="ae-quests-heading"><h2>Daily quests</h2><span>{count}/{DAILY_QUESTS.length} completed · Resets in {questResetLabel(resetAt, now)}</span></div>
        <QuestList quests={DAILY_QUESTS} progress={progress} currency="gems"/>
        <p className="ae-quests-note">{TOTAL_DAILY_GEMS} gems per day. Progress counts after six-turn matches, including practice. Rewards are added automatically.</p>
      </section>
    </div>
  </div>
}
