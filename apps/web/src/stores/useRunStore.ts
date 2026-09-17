import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { RunState } from '@tcg/shared'
import type { GladiatorClassId } from '@tcg/shared'
import {
  startRun,
  enterNode,
  resolveCombatVictory,
  pickCardReward,
  campfireRest,
  campfireSmith,
  shopBuyCard,
  shopBuyRelic,
  shopBuyPotion,
  shopBuyEquipment,
  shopRemoveCard,
  leaveShop,
  resolveEvent,
  forgeEquipment,
} from '../engine/runEngine.ts'
import { playCard, endPlayerTurn, usePotionInCombat } from '../engine/combatEngine.ts'

interface RunStoreState {
  run: RunState | null
  // ─── Run lifecycle ────────────────────────────────────────────────
  beginRun: (classId?: GladiatorClassId) => void
  abandonRun: () => void

  // ─── Map navigation ───────────────────────────────────────────────
  selectNode: (nodeId: string) => void

  // ─── Combat actions ───────────────────────────────────────────────
  playCardInCombat: (cardInstanceId: string) => void
  endTurn: () => void
  usePotionSlot: (slot: number) => void

  // ─── After combat ─────────────────────────────────────────────────
  selectCardReward: (cardId: string | null) => void

  // ─── Campfire ─────────────────────────────────────────────────────
  restAtCampfire: () => void
  smithAtCampfire: (cardInstanceId: string) => void
  forgeAtCampfire: (equipmentId: string) => void

  // ─── Shop ─────────────────────────────────────────────────────────
  buyCard: (cardId: string) => void
  buyRelic: (relicId: string) => void
  buyPotion: (potionId: string) => void
  buyEquipment: (equipmentId: string) => void
  removeCardAtShop: (cardInstanceId: string) => void
  exitShop: () => void

  // ─── Event ────────────────────────────────────────────────────────
  makeEventChoice: (index: number) => void
}

export const useRunStore = create<RunStoreState>()(
  persist(
    (set, get) => ({
      run: null,

      beginRun: (classId = 'murmillo') => {
        set({ run: startRun(classId) })
      },

      abandonRun: () => {
        set({ run: null })
      },

      selectNode: (nodeId) => {
        const { run } = get()
        if (!run || run.phase !== 'map') return
        set({ run: enterNode(run, nodeId) })
      },

      playCardInCombat: (cardInstanceId) => {
        const { run } = get()
        if (!run || !run.activeCombat) return
        if (run.activeCombat.phase !== 'player_turn') return

        const newCombat = playCard(run.activeCombat, cardInstanceId, run.relics)

        // Update ink bottle counter if used
        const inkBottle = run.relics.find((r) => r.definitionId === 'ink_bottle')
        let relics = run.relics
        if (inkBottle) {
          const newCounter = (inkBottle.counter + 1) % 10
          relics = relics.map((r) =>
            r.definitionId === 'ink_bottle' ? { ...r, counter: newCounter } : r
          )
        }

        // Horn cleat: only fires first 3 turns — counter is decremented on use
        // (handled in combatEngine init + startPlayerTurn via log tagging)

        let newRun: RunState = { ...run, activeCombat: newCombat, relics }

        // Combat ended in victory?
        if (newCombat.phase === 'victory') {
          newRun = resolveCombatVictory(newRun, newCombat)
        } else if (newCombat.phase === 'defeat') {
          newRun = { ...newRun, phase: 'game_over', activeCombat: null, completedAt: Date.now(), isVictory: false }
        }

        set({ run: newRun })
      },

      endTurn: () => {
        const { run } = get()
        if (!run || !run.activeCombat) return
        if (run.activeCombat.phase !== 'player_turn') return

        let newCombat = endPlayerTurn(run.activeCombat, run.relics)

        // Update horn cleat counter (decrement if > 0 whenever turn starts)
        let relics = run.relics
        const hornCleat = relics.find((r) => r.definitionId === 'horn_cleat')
        if (hornCleat && hornCleat.counter > 0) {
          relics = relics.map((r) =>
            r.definitionId === 'horn_cleat' ? { ...r, counter: r.counter - 1 } : r
          )
        }

        // Centennial puzzle: first time HP drops below 50%, gain 3 energy
        const puzzle = relics.find((r) => r.definitionId === 'centennial_puzzle')
        if (puzzle && puzzle.counter === 0 && newCombat.playerHp < newCombat.playerMaxHp * 0.5) {
          newCombat = { ...newCombat, energy: newCombat.energy + 3 }
          relics = relics.map((r) =>
            r.definitionId === 'centennial_puzzle' ? { ...r, counter: 1 } : r
          )
        }

        let newRun: RunState = { ...run, activeCombat: newCombat, relics }

        if (newCombat.phase === 'victory') {
          newRun = resolveCombatVictory(newRun, newCombat)
        } else if (newCombat.phase === 'defeat') {
          newRun = { ...newRun, phase: 'game_over', activeCombat: null, completedAt: Date.now(), isVictory: false }
        }

        set({ run: newRun })
      },

      usePotionSlot: (slot) => {
        const { run } = get()
        if (!run) return
        const potionId = run.potions[slot]
        if (!potionId) return

        let newRun = run

        if (run.activeCombat) {
          const newCombat = usePotionInCombat(run.activeCombat, potionId, run.relics)
          newRun = { ...run, activeCombat: newCombat }
        } else {
          // Health potion outside combat
          if (potionId === 'health_potion') {
            const amount = Math.floor(run.maxHp * 0.5)
            newRun = { ...run, hp: Math.min(run.maxHp, run.hp + amount) }
          }
        }

        // Remove potion from slot
        const potions = [...newRun.potions]
        potions[slot] = null
        set({ run: { ...newRun, potions } })
      },

      selectCardReward: (cardId) => {
        const { run } = get()
        if (!run || run.phase !== 'card_reward') return
        set({ run: pickCardReward(run, cardId) })
      },

      restAtCampfire: () => {
        const { run } = get()
        if (!run || run.phase !== 'campfire') return
        set({ run: campfireRest(run) })
      },

      smithAtCampfire: (cardInstanceId) => {
        const { run } = get()
        if (!run || run.phase !== 'campfire') return
        set({ run: campfireSmith(run, cardInstanceId) })
      },

      forgeAtCampfire: (equipmentId: string) => {
        const { run } = get()
        if (!run || run.phase !== 'campfire') return
        set({ run: forgeEquipment(run, equipmentId) })
      },

      buyCard: (cardId) => {
        const { run } = get()
        if (!run) return
        set({ run: shopBuyCard(run, cardId) })
      },

      buyRelic: (relicId) => {
        const { run } = get()
        if (!run) return
        set({ run: shopBuyRelic(run, relicId) })
      },

      buyPotion: (potionId) => {
        const { run } = get()
        if (!run) return
        set({ run: shopBuyPotion(run, potionId, -1) })
      },

      buyEquipment: (equipmentId: string) => {
        const { run } = get()
        if (!run) return
        set({ run: shopBuyEquipment(run, equipmentId) })
      },

      removeCardAtShop: (cardInstanceId) => {
        const { run } = get()
        if (!run) return
        set({ run: shopRemoveCard(run, cardInstanceId) })
      },

      exitShop: () => {
        const { run } = get()
        if (!run) return
        set({ run: leaveShop(run) })
      },

      makeEventChoice: (index) => {
        const { run } = get()
        if (!run || run.phase !== 'event') return
        set({ run: resolveEvent(run, index) })
      },
    }),
    {
      name: 'gladiator-run',
      // Only persist the run state (not action functions)
      partialize: (state) => ({ run: state.run }),
    }
  )
)
