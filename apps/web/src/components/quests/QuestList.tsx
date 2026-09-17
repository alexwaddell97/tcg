import { ChartBar, Check, DiamondsFour, Flag, MagicWand, Sword, Trophy } from '@phosphor-icons/react'
import { questCount } from '../../lib/quests.ts'
import type { GameplayQuest, QuestProgress } from '../../lib/quests.ts'
import './Quests.css'

const icons = { unitsPlayed: Sword, spellsPlayed: MagicWand, aetherSpent: DiamondsFour, arenasWon: Flag, powerArenas: ChartBar, matchesWon: Trophy }
export default function QuestList({ quests, progress, currency }: { quests: readonly GameplayQuest[]; progress: QuestProgress; currency: 'gems' | 'XP' }) {
  return <ul className={`ae-gameplay-quests ${currency === 'XP' ? 'is-season' : ''}`}>{quests.map(quest => {
    const done = progress.completed.includes(quest.id)
    const count = done ? quest.target : questCount(progress, quest)
    const Icon = icons[quest.metric]
    return <li key={quest.id} className={`ae-gameplay-quest ${done ? 'is-complete' : ''}`}>
      <Icon className="ae-quest-symbol" weight="duotone" aria-hidden="true"/>
      <div className="ae-quest-objective"><div><span>{quest.label}</span><small>{count}/{quest.target}</small></div><progress max={quest.target} value={count} aria-label={`${quest.label} progress`}/></div>
      <span className="ae-quest-payout">+{quest.reward} {currency}{done && <small><Check weight="bold" aria-hidden="true"/>Earned</small>}</span>
    </li>
  })}</ul>
}
