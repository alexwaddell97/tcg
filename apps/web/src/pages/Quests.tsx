import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, CheckCircle, Sparkle } from '@phosphor-icons/react'
import { cn } from '../lib/cn.ts'
import { useCollectionStore } from '../stores/useCollectionStore.ts'
import { useQuestStore, DAILY_QUESTS, TOTAL_DAILY_GEMS } from '../stores/useQuestStore.ts'

// ─── Countdown to next UTC midnight ──────────────────────────────────────────

function msUntilMidnightUTC(): number {
  const now = new Date()
  const midnight = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1))
  return midnight.getTime() - now.getTime()
}

function formatResetTime(ms: number): string {
  const h = Math.floor(ms / 3_600_000)
  const m = Math.floor((ms % 3_600_000) / 60_000)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

// ─── Quest row ────────────────────────────────────────────────────────────────

function QuestRow({ quest, done }: { quest: typeof DAILY_QUESTS[0]; done: boolean }) {
  return (
    <div
      className={cn(
        'flex items-center gap-4 p-4 rounded-2xl border transition-all duration-200',
        done
          ? 'bg-emerald-950/30 border-emerald-800/40'
          : 'bg-stone-900/40 border-stone-800/60 hover:border-stone-700/60',
      )}
    >
      {/* Icon */}
      <div
        className={cn(
          'w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0 border',
          done ? 'bg-emerald-950/60 border-emerald-800/40' : 'bg-stone-900 border-stone-800',
        )}
      >
        {quest.icon}
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p className={cn('font-semibold text-sm', done ? 'text-stone-500 line-through' : 'text-stone-200')}>
          {quest.label}
        </p>
        <p className="text-stone-500 text-xs leading-snug mt-0.5">{quest.description}</p>
      </div>

      {/* Reward / status */}
      <div className="flex items-center gap-2 shrink-0">
        {done ? (
          <div className="flex items-center gap-1.5 text-emerald-400">
            <CheckCircle size={18} weight="fill" />
            <span className="text-xs font-semibold">Done</span>
          </div>
        ) : (
          <div className="flex items-center gap-1 bg-violet-950/60 border border-violet-800/50 rounded-full px-2.5 py-1">
            <span className="text-sm leading-none">💎</span>
            <span className="text-violet-300 font-bold text-sm">+{quest.gemReward}</span>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Quests() {
  const navigate = useNavigate()
  const gems = useCollectionStore(s => s.gems)
  const { isCompletedToday, completedTodayCount, completeQuest } = useQuestStore()

  // Visiting this page counts as a quest
  useEffect(() => {
    completeQuest('visit_collection')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const doneCount = completedTodayCount()
  const allDone = doneCount === DAILY_QUESTS.length
  const resetIn = formatResetTime(msUntilMidnightUTC())

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: 'radial-gradient(ellipse at 50% 20%, #0f0a1a 0%, #070508 100%)' }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-stone-900/60">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-1.5 text-stone-500 hover:text-stone-300 transition-colors text-sm"
        >
          <ArrowLeft size={16} weight="bold" />
          Menu
        </button>
        <div className="w-px h-4 bg-stone-800" />
        <Sparkle size={16} className="text-violet-400" weight="duotone" />
        <h1 className="text-stone-200 font-semibold">Daily Quests</h1>
        <div className="ml-auto flex items-center gap-2">
          {/* Gem balance */}
          <div className="flex items-center gap-1.5 bg-stone-900/80 border border-stone-700/60 rounded-full px-3 py-1">
            <span className="text-sm leading-none">💎</span>
            <span className="text-violet-300 font-semibold text-sm">{gems}</span>
            <span className="text-stone-500 text-xs">gems</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center p-6 gap-6 max-w-lg mx-auto w-full">

        {/* Progress summary */}
        <div className="w-full bg-stone-900/40 border border-stone-800/60 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="text-stone-300 font-semibold text-sm">
              {doneCount} / {DAILY_QUESTS.length} completed
            </p>
            <p className="text-stone-600 text-xs mt-0.5">
              Resets in {resetIn}
            </p>
          </div>
          {/* Progress bar */}
          <div className="flex flex-col items-end gap-1.5">
            <div className="w-32 h-2 rounded-full bg-stone-800 overflow-hidden">
              <div
                className="h-full rounded-full bg-linear-to-r from-violet-600 to-violet-400 transition-all duration-500"
                style={{ width: `${(doneCount / DAILY_QUESTS.length) * 100}%` }}
              />
            </div>
            <p className={cn('text-xs font-semibold', allDone ? 'text-emerald-400' : 'text-violet-400')}>
              {allDone ? '✓ All done!' : `Up to 💎 +${TOTAL_DAILY_GEMS} today`}
            </p>
          </div>
        </div>

        {/* Quest list */}
        <div className="w-full flex flex-col gap-3">
          {DAILY_QUESTS.map(quest => (
            <QuestRow
              key={quest.id}
              quest={quest}
              done={isCompletedToday(quest.id)}
            />
          ))}
        </div>

        {/* Gem uses callout */}
        <div className="w-full bg-stone-900/30 border border-stone-800/50 rounded-2xl p-4 flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="text-lg">💎</span>
            <p className="text-stone-300 font-semibold text-sm">What are Gems for?</p>
          </div>
          <ul className="flex flex-col gap-1.5 pl-1">
            {[
              { icon: '⚡', text: 'Speed up the 12h pack cooldown (50 💎)' },
              { icon: '🎴', text: 'More ways to spend gems coming soon' },
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-stone-500 leading-snug">
                <span className="shrink-0 mt-px">{item.icon}</span>
                <span>{item.text}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
