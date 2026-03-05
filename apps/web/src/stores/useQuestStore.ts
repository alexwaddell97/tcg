import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { useCollectionStore } from './useCollectionStore.ts'

// ─── Quest definitions ────────────────────────────────────────────────────────

export interface QuestDefinition {
  id: string
  label: string
  description: string
  gemReward: number
  icon: string
}

export const DAILY_QUESTS: QuestDefinition[] = [
  {
    id: 'open_pack',
    label: 'Open a Pack',
    description: 'Open any pack in the Pack Opening screen',
    gemReward: 20,
    icon: '📦',
  },
  {
    id: 'craft_card',
    label: 'Craft a Card',
    description: 'Use shards to craft a card from your collection',
    gemReward: 25,
    icon: '⚗️',
  },
  {
    id: 'update_deck',
    label: 'Build a Deck',
    description: 'Create or update a deck in the Deck Builder',
    gemReward: 15,
    icon: '🃏',
  },
  {
    id: 'visit_collection',
    label: 'Check Your Cards',
    description: 'Visit your card collection today',
    gemReward: 10,
    icon: '📖',
  },
]

/** Total gems earnable from all daily quests in a single day */
export const TOTAL_DAILY_GEMS = DAILY_QUESTS.reduce((sum, q) => sum + q.gemReward, 0)

// ─── Date helper ─────────────────────────────────────────────────────────────

function todayStr(): string {
  return new Date().toISOString().slice(0, 10) // YYYY-MM-DD in UTC
}

// ─── Store ────────────────────────────────────────────────────────────────────

interface QuestStore {
  /** questId → "YYYY-MM-DD" of the day it was completed */
  completions: Record<string, string>

  /**
   * Mark a quest as done for today and award its gem reward.
   * No-op if the quest is already completed today or doesn't exist.
   */
  completeQuest: (id: string) => void

  /** Whether the given quest was already completed today */
  isCompletedToday: (id: string) => boolean

  /** Count how many quests were completed today */
  completedTodayCount: () => number
}

export const useQuestStore = create<QuestStore>()(
  persist(
    (set, get) => ({
      completions: {},

      completeQuest: (id) => {
        const today = todayStr()
        if (get().completions[id] === today) return // already done

        const quest = DAILY_QUESTS.find(q => q.id === id)
        if (!quest) return

        set((s) => ({ completions: { ...s.completions, [id]: today } }))
        useCollectionStore.getState().addGems(quest.gemReward)
      },

      isCompletedToday: (id) => get().completions[id] === todayStr(),

      completedTodayCount: () => {
        const today = todayStr()
        return Object.values(get().completions).filter(d => d === today).length
      },
    }),
    { name: 'tcg-quests' },
  ),
)
