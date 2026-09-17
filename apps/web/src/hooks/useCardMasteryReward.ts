import { useCollectionStore } from '../stores/useCollectionStore.ts'
import { useEffect } from 'react'
import type { GameState } from '@tcg/shared'
import { useCardMasteryStore } from '../stores/useCardMasteryStore.ts'

export function useCardMasteryReward(state?: GameState | null) {
  const reward = state?.phase === 'game_over' ? state.arena?.masteryReward : undefined
  const quest = state?.phase === 'game_over' ? state.arena?.questReceipt : undefined
  const receipt = useCardMasteryStore(store => store.lastReward?.matchId === reward?.matchId ? store.lastReward : null)
  useEffect(() => {
    if (reward) useCardMasteryStore.getState().claimReward(reward)
    if (quest) useCollectionStore.getState().recordQuestMatch(quest)
  }, [reward, quest])
  return receipt
}
