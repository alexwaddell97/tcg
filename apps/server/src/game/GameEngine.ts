import { v4 as uuid } from 'uuid'
import type {
  GameState, GameAction, PlayerState, PendingPlay,
  Card, LaneState, LocationHalf, PlacedCard,
} from '@tcg/shared'
import type { Room } from '@tcg/shared'
import {
  STARTING_HAND_SIZE, ROUND_DRAW_SIZE,
  TURNS_PER_ROUND, TOTAL_ROUNDS, ROUNDS_TO_WIN,
  MAX_LOCATION_SLOTS, MAX_HAND_SIZE,
  CARD_DATABASE, LOCATION_DATABASE, shuffle,
} from '@tcg/shared'

// Default location pairs assigned to players until deck builder exists
const DEFAULT_LOCATION_PAIRS: [string, string][] = [
  ['the_forge', 'the_rift'],
  ['the_summit', 'the_graveyard'],
]

// Transform target IDs — excluded from starter decks
const TRANSFORM_TARGETS = new Set(
  CARD_DATABASE.flatMap(d => d.quest ? [d.quest.transformsToId] : [])
)

export class GameEngine {
  private state: GameState
  private playerHands: Map<string, Card[]> = new Map()
  private playerDecks: Map<string, Card[]> = new Map()
  // Tracks which players have acted this full-turn
  private actedThisTurn = new Set<string>()
  // Who starts each full-turn (alternates each turn, flips each round)
  private turnStartPlayerId = ''
  // Cards played this turn per player (for chain_draw effect)
  private cardsPlayedThisTurn = new Map<string, number>()
  // Called by the socket layer after each state change so async round advances can re-broadcast
  onStateChange: (() => void) | null = null

  constructor(room: Room) {
    const playerIds = room.players.map(p => p.id)

    const locationPairs: [string, string][] = room.players.map(
      (_, i) => DEFAULT_LOCATION_PAIRS[i % DEFAULT_LOCATION_PAIRS.length]
    )

    // Build 2 lanes: each lane has one half per player
    // Lane k → halves[player_i] = locationPairs[i][k]
    const lanes: LaneState[] = [0, 1].map((laneIndex) => {
      const halves: Record<string, LocationHalf> = {}
      for (let i = 0; i < room.players.length; i++) {
        const p = room.players[i]
        const defId = locationPairs[i][laneIndex]
        const def = LOCATION_DATABASE.find(l => l.definitionId === defId)!
        halves[p.id] = { ...def, placed: [], power: 0 }
      }
      return { laneIndex: laneIndex as 0 | 1, revealedOnRound: 1, halves }
    })

    const players: Record<string, PlayerState> = {}
    const pendingPlays: Record<string, PendingPlay | null> = {}

    for (let i = 0; i < room.players.length; i++) {
      const p = room.players[i]
      const chosenLocationIds = locationPairs[i]

      let deck: Card[]
      if (p.deckDefinitionIds && p.deckDefinitionIds.length > 0) {
        deck = shuffle(
          p.deckDefinitionIds
            .map(defId => CARD_DATABASE.find(def => def.definitionId === defId))
            .filter((def): def is NonNullable<typeof def> => def != null)
            .map(def => ({
              ...def,
              instanceId: uuid(),
              questProgress: 0,
              isTransformed: false,
              powerBonus: 0,
            }))
        )
      } else {
        const eligible = CARD_DATABASE.filter(def =>
          !TRANSFORM_TARGETS.has(def.definitionId) &&
          (def.affinity.length === 0 || def.affinity.some(a => chosenLocationIds.includes(a)))
        )
        deck = shuffle(
          eligible.flatMap(def =>
            Array.from({ length: 2 }, (): Card => ({
              ...def,
              instanceId: uuid(),
              questProgress: 0,
              isTransformed: false,
              powerBonus: 0,
            }))
          )
        ).slice(0, 20)
      }

      const hand = deck.slice(0, STARTING_HAND_SIZE)
      const remaining = deck.slice(STARTING_HAND_SIZE)

      this.playerHands.set(p.id, hand)
      this.playerDecks.set(p.id, remaining)

      players[p.id] = {
        id: p.id,
        displayName: p.displayName,
        avatarEmoji: p.avatarEmoji ?? '🧙',
        rank: p.rank ?? 'Initiate',
        handCount: hand.length,
        deckCount: remaining.length,
        isConnected: true,
        hasPassed: false,
        roundWins: 0,
        chosenLocationIds,
      }

      pendingPlays[p.id] = null
    }

    this.turnStartPlayerId = playerIds[0]
    this.state = {
      roomId: room.id,
      phase: 'planning',
      round: 1,
      turn: 1,
      lanes,
      pendingPlays,
      players,
      activePlayerId: playerIds[0],
      log: [{
        id: uuid(),
        timestamp: Date.now(),
        message: `Game started! Round 1 begins. Lanes: ${lanes.map(l =>
          Object.values(l.halves).map(h => h.name).join(' vs ')
        ).join(' | ')}.`,
        type: 'system',
      }],
      startedAt: Date.now(),
    }
  }

  getStateFor(playerId: string): GameState {
    return {
      ...this.state,
      hand: this.playerHands.get(playerId) ?? [],
    }
  }

  processAction(action: GameAction): { success: boolean; error?: string; newState: GameState } {
    const player = this.state.players[action.playerId]
    if (!player) return { success: false, error: 'Player not found', newState: this.state }

    switch (action.type) {
      case 'place_card': {
        if (this.state.phase !== 'planning') {
          return { success: false, error: 'Not in planning phase', newState: this.state }
        }
        if (this.state.activePlayerId !== action.playerId) {
          return { success: false, error: 'Not your turn', newState: this.state }
        }
        if (player.hasPassed) {
          return { success: false, error: 'You have passed this round', newState: this.state }
        }
        if (!action.cardInstanceId || action.laneIndex === undefined) {
          return { success: false, error: 'Missing card or lane', newState: this.state }
        }
        if (action.slotIndex === undefined || action.slotIndex < 0 || action.slotIndex >= MAX_LOCATION_SLOTS) {
          return { success: false, error: 'Invalid slot index', newState: this.state }
        }

        const hand = this.playerHands.get(action.playerId) ?? []
        const card = hand.find(c => c.instanceId === action.cardInstanceId)
        if (!card) return { success: false, error: 'Card not in hand', newState: this.state }

        const lane = this.state.lanes[action.laneIndex]
        if (!lane) return { success: false, error: 'Lane not in play', newState: this.state }
        const half = lane.halves[action.playerId]
        if (!half) return { success: false, error: 'No lane half for player', newState: this.state }
        if (half.placed.length >= MAX_LOCATION_SLOTS) return { success: false, error: 'Lane is full', newState: this.state }
        if (half.placed.some(pc => pc.slotIndex === action.slotIndex)) return { success: false, error: 'Slot is already occupied', newState: this.state }

        const play: PendingPlay = { cardInstanceId: action.cardInstanceId, laneIndex: action.laneIndex, slotIndex: action.slotIndex }
        this.applyPlay(action.playerId, play)
        this.state.pendingPlays[action.playerId] = play
        this.advanceAfterAction(action.playerId)
        break
      }

      case 'pass_turn': {
        if (this.state.phase !== 'planning') {
          return { success: false, error: 'Not in planning phase', newState: this.state }
        }
        if (this.state.activePlayerId !== action.playerId) {
          return { success: false, error: 'Not your turn', newState: this.state }
        }
        if (player.hasPassed) {
          return { success: false, error: 'Already passed this round', newState: this.state }
        }

        this.addLog(`${player.displayName} skips this turn.`, 'action')
        this.advanceAfterAction(action.playerId)
        break
      }

      case 'pass_round': {
        if (this.state.phase !== 'planning') {
          return { success: false, error: 'Not in planning phase', newState: this.state }
        }
        if (this.state.activePlayerId !== action.playerId) {
          return { success: false, error: 'Not your turn', newState: this.state }
        }
        if (player.hasPassed) {
          return { success: false, error: 'Already passed this round', newState: this.state }
        }

        player.hasPassed = true
        this.addLog(`${player.displayName} passes the round.`, 'action')
        this.advanceAfterAction(action.playerId)
        break
      }

      case 'surrender': {
        const winnerId = Object.keys(this.state.players).find(id => id !== action.playerId)!
        this.state.winner = winnerId
        this.state.phase = 'game_over'
        this.addLog(`${player.displayName} surrendered.`, 'action')
        break
      }

      default:
        return { success: false, error: 'Unknown action', newState: this.state }
    }

    return { success: true, newState: this.state }
  }

  isGameOver(): { over: boolean; winnerId?: string; reason?: string } {
    if (this.state.phase === 'game_over') {
      return { over: true, winnerId: this.state.winner, reason: 'match_complete' }
    }
    return { over: false }
  }

  // ─── Private ───────────────────────────────────────────────────────────────

  private advanceAfterAction(actedPlayerId: string): void {
    this.actedThisTurn.add(actedPlayerId)
    const playerIds = Object.keys(this.state.players)
    const otherPlayerId = playerIds.find(id => id !== actedPlayerId)!

    // If the other player has passed the round, count them as acted too
    if (this.state.players[otherPlayerId].hasPassed) {
      this.actedThisTurn.add(otherPlayerId)
    }

    const allActed = playerIds.every(pid => this.actedThisTurn.has(pid))

    if (allActed) {
      // Both players have had their turn — clear pending, advance full turn
      for (const pid of playerIds) this.state.pendingPlays[pid] = null
      this.actedThisTurn.clear()
      this.cardsPlayedThisTurn.clear()
      this.advanceTurn()
    } else {
      // Hand off to the other player
      this.state.activePlayerId = otherPlayerId
    }
  }

  private nextFirstActor(): string {
    const playerIds = Object.keys(this.state.players)
    const notPassed = playerIds.filter(pid => !this.state.players[pid].hasPassed)
    // If one player has passed, the other always goes
    if (notPassed.length <= 1) return notPassed[0] ?? playerIds[0]
    // Otherwise use the tracked turn-start player (alternates each full turn)
    return this.turnStartPlayerId
  }

  private applyPlay(playerId: string, play: PendingPlay): void {
    const hand = this.playerHands.get(playerId) ?? []
    const cardIdx = hand.findIndex(c => c.instanceId === play.cardInstanceId)
    if (cardIdx === -1) return

    const card = hand[cardIdx]
    const lane = this.state.lanes[play.laneIndex]
    if (!lane) return
    const half = lane.halves[playerId]
    if (!half) return

    const player = this.state.players[playerId]

    hand.splice(cardIdx, 1)
    this.playerHands.set(playerId, hand)
    player.handCount = hand.length

    half.placed.push({ card, ownerId: playerId, placedOnTurn: this.state.turn, slotIndex: play.slotIndex })
    this.addLog(`${player.displayName} played ${card.name} to Lane ${play.laneIndex + 1} (${half.name}).`, 'action')

    // Challenger: pull opponent's weakest non-Elusive from their OTHER lane half
    if (card.keywords.includes('challenger')) {
      this.applyChallenger(playerId, play.laneIndex)
    }

    // Spell on-play effects
    if (card.type === 'spell' && card.spellEffect) {
      this.applySpellEffect(playerId, card, lane, play.laneIndex)
      half.placed = half.placed.filter(pc => pc.card.instanceId !== card.instanceId)
    }

    // spell_empower: each spell played here gives all your units at this half +1 power
    if (half.effect.type === 'spell_empower' && card.type === 'spell') {
      for (const placed of half.placed) {
        placed.card.powerBonus = (placed.card.powerBonus ?? 0) + half.effect.value
      }
    }

    // chain_draw: draw 1 if 2+ cards played this turn
    const count = (this.cardsPlayedThisTurn.get(playerId) ?? 0) + 1
    this.cardsPlayedThisTurn.set(playerId, count)
    if (half.effect.type === 'chain_draw' && count >= 2) {
      this.drawCard(playerId)
    }

    // Quest triggers
    const trigger = card.type === 'unit' ? 'on_unit_played' : 'on_spell_played'
    this.checkQuestProgress(playerId, trigger)

    if (half.placed.length >= MAX_LOCATION_SLOTS) {
      this.checkQuestProgress(playerId, 'on_location_filled')
    }

    this.computeLocationPower()
  }

  private advanceTurn(): void {
    const allPassed = Object.values(this.state.players).every(p => p.hasPassed)

    if (allPassed || this.state.turn >= TURNS_PER_ROUND) {
      this.endRound()
      return
    }

    this.state.turn += 1

    // Same player starts each turn within a round (alternation happens at round boundaries in startNextRound)
    this.state.activePlayerId = this.nextFirstActor()
    this.state.phase = 'planning'
  }

  private endRound(): void {
    this.state.phase = 'round_end'

    const playerIds = Object.keys(this.state.players)
    const [pA, pB] = playerIds

    // Graveyard recursion: return strongest fleeting card to hand (per half)
    for (const lane of this.state.lanes) {
      for (const [playerId, half] of Object.entries(lane.halves)) {
        if (half.effect.type !== 'recursion') continue
        const fleeting = half.placed.filter(pc => pc.card.keywords.includes('fleeting'))
        if (!fleeting.length) continue
        const strongest = fleeting.reduce((a, b) =>
          (a.card.power + (a.card.powerBonus ?? 0)) >= (b.card.power + (b.card.powerBonus ?? 0)) ? a : b
        )
        const hand = this.playerHands.get(playerId) ?? []
        hand.push(strongest.card)
        this.playerHands.set(playerId, hand)
        this.state.players[playerId].handCount = hand.length
        this.addLog(`${strongest.card.name} returned to ${this.state.players[playerId].displayName}'s hand.`, 'system')
      }
    }

    // Void removal: remove the single weakest unit across BOTH halves of the lane
    for (const lane of this.state.lanes) {
      let weakest: { pc: PlacedCard; playerId: string } | null = null
      let hasVoidEffect = false
      for (const [playerId, half] of Object.entries(lane.halves)) {
        if (half.effect.type === 'void_removal') hasVoidEffect = true
        for (const pc of half.placed) {
          const pwr = pc.card.power + (pc.card.powerBonus ?? 0)
          if (weakest === null || pwr < weakest.pc.card.power + (weakest.pc.card.powerBonus ?? 0)) {
            weakest = { pc, playerId }
          }
        }
      }
      if (hasVoidEffect && weakest) {
        lane.halves[weakest.playerId].placed = lane.halves[weakest.playerId].placed.filter(
          pc => pc.card.instanceId !== weakest!.pc.card.instanceId
        )
        this.addLog(`${weakest.pc.card.name} was consumed by The Void.`, 'system')
      }
    }

    this.computeLocationPower()

    // Lane-based round win: each lane winner = player with higher power in that lane
    const laneWins: Record<string, number> = { [pA]: 0, [pB]: 0 }
    for (const lane of this.state.lanes) {
      const pwrA = lane.halves[pA]?.power ?? 0
      const pwrB = lane.halves[pB]?.power ?? 0
      if (pwrA > pwrB) {
        laneWins[pA]++
        this.addLog(`${this.state.players[pA].displayName} wins Lane ${lane.laneIndex + 1} (${pwrA}–${pwrB}).`, 'system')
      } else if (pwrB > pwrA) {
        laneWins[pB]++
        this.addLog(`${this.state.players[pB].displayName} wins Lane ${lane.laneIndex + 1} (${pwrB}–${pwrA}).`, 'system')
      } else {
        this.addLog(`Lane ${lane.laneIndex + 1} is tied (${pwrA}–${pwrB}).`, 'system')
      }
    }

    // Round winner = player who won more lanes
    if (laneWins[pA] > laneWins[pB]) {
      this.state.players[pA].roundWins += 1
      this.addLog(`${this.state.players[pA].displayName} wins Round ${this.state.round}!`, 'system')
    } else if (laneWins[pB] > laneWins[pA]) {
      this.state.players[pB].roundWins += 1
      this.addLog(`${this.state.players[pB].displayName} wins Round ${this.state.round}!`, 'system')
    } else {
      this.addLog(`Round ${this.state.round} is a tie — no point awarded.`, 'system')
    }

    const matchWinner = Object.values(this.state.players).find(p => p.roundWins >= ROUNDS_TO_WIN)
    if (matchWinner || this.state.round >= TOTAL_ROUNDS) {
      if (matchWinner) {
        this.state.winner = matchWinner.id
      } else {
        const sorted = Object.values(this.state.players).sort((x, y) => y.roundWins - x.roundWins)
        if (sorted[0].roundWins > sorted[1].roundWins) this.state.winner = sorted[0].id
      }
      this.state.phase = 'game_over'
      return
    }

    // Broadcast round_end state first, then advance after a delay
    setTimeout(() => {
      this.startNextRound()
      this.onStateChange?.()
    }, 4000)
  }

  private startNextRound(): void {
    // Keep Resilient cards across rounds; clear everything else
    for (const lane of this.state.lanes) {
      for (const half of Object.values(lane.halves)) {
        half.placed = half.placed
          .filter(pc => pc.card.keywords.includes('resilient'))
          .map(pc => ({ ...pc, card: { ...pc.card, powerBonus: 0 } }))
        half.power = 0
      }
    }

    const nextRound = (this.state.round + 1) as 1 | 2 | 3
    this.state.round = nextRound
    this.state.turn = 1
    this.state.phase = 'planning'

    for (const player of Object.values(this.state.players)) {
      player.hasPassed = false
    }

    for (const pid of Object.keys(this.state.pendingPlays)) {
      this.state.pendingPlays[pid] = null
    }
    this.actedThisTurn.clear()
    this.cardsPlayedThisTurn.clear()

    for (const pid of Object.keys(this.state.players)) {
      for (let i = 0; i < ROUND_DRAW_SIZE; i++) this.drawCard(pid)
    }

    // Alternate who starts next round
    const playerIds = Object.keys(this.state.players)
    this.turnStartPlayerId = playerIds.find(id => id !== this.turnStartPlayerId) ?? playerIds[0]
    this.state.activePlayerId = this.turnStartPlayerId

    this.addLog(`Round ${nextRound} begins! Board cleared.`, 'system')

    for (const pid of Object.keys(this.state.players)) {
      this.checkQuestProgress(pid, 'on_round_start')
    }

    this.computeLocationPower()
  }

  private computeLocationPower(): void {
    const playerIds = Object.keys(this.state.players)
    for (const lane of this.state.lanes) {
      for (const half of Object.values(lane.halves)) {
        if (lane.revealedOnRound > this.state.round) {
          half.power = 0
          continue
        }

        let total = 0
        for (const { card } of half.placed) {
          let power = card.power + (card.powerBonus ?? 0)
          if (half.effect.type === 'fleeting_amplify' && card.keywords.includes('fleeting')) {
            power *= half.effect.value
          }
          if (half.effect.type === 'resilient_power_gain' && card.keywords.includes('resilient')) {
            power += half.effect.value
          }
          total += power
        }

        if (half.effect.type === 'top_card_bonus' && half.placed.length > 0) {
          total += half.effect.value
        }

        half.power = Math.max(0, total)
      }

      // Overwhelm: if a player has an overwhelm unit and leads their half by 5+, +2 bonus
      for (const pid of playerIds) {
        const oppId = playerIds.find(id => id !== pid)!
        const myHalf = lane.halves[pid]
        const oppHalf = lane.halves[oppId]
        if (!myHalf || !oppHalf) continue
        const hasOverwhelm = myHalf.placed.some(pc => pc.card.keywords.includes('overwhelm'))
        if (hasOverwhelm && myHalf.power >= oppHalf.power + 5) {
          myHalf.power += 2
        }
      }
    }
  }

  private checkQuestProgress(
    playerId: string,
    trigger: 'on_unit_played' | 'on_spell_played' | 'on_round_start' | 'on_location_filled'
  ): void {
    for (const lane of this.state.lanes) {
      const half = lane.halves[playerId]
      if (!half) continue
      for (const placedCard of half.placed) {
        const card = placedCard.card
        if (!card.quest || card.isTransformed) continue
        if (card.quest.trigger !== trigger) continue
        card.questProgress += 1
        if (card.questProgress >= card.quest.threshold) {
          this.transformCard(card, half.name)
        }
      }
    }
  }

  private transformCard(card: Card, locationName: string): void {
    const targetDef = CARD_DATABASE.find(d => d.definitionId === card.quest!.transformsToId)
    if (!targetDef) return

    const { instanceId, questProgress, powerBonus } = card
    Object.assign(card, targetDef, { instanceId, questProgress, isTransformed: true, powerBonus: powerBonus ?? 0 })
    this.addLog(`${card.name} transformed at ${locationName}!`, 'action')
  }

  // ─── Challenger ──────────────────────────────────────────────────────────────
  // Pulls opponent's weakest non-Elusive from their OTHER lane half into their half of this lane.
  private applyChallenger(playerId: string, laneIndex: 0 | 1): void {
    const playerIds = Object.keys(this.state.players)
    const opponentId = playerIds.find(id => id !== playerId)!
    const otherLaneIndex: 0 | 1 = laneIndex === 0 ? 1 : 0

    const otherLane = this.state.lanes[otherLaneIndex]
    const targetLane = this.state.lanes[laneIndex]
    if (!otherLane || !targetLane) return

    const sourceHalf = otherLane.halves[opponentId]
    const destHalf = targetLane.halves[opponentId]
    if (!sourceHalf || !destHalf) return

    let weakest: PlacedCard | null = null
    for (const pc of sourceHalf.placed) {
      if (pc.card.keywords.includes('elusive')) continue
      if (!weakest || (pc.card.power + (pc.card.powerBonus ?? 0)) < (weakest.card.power + (weakest.card.powerBonus ?? 0))) {
        weakest = pc
      }
    }

    if (!weakest) return

    sourceHalf.placed = sourceHalf.placed.filter(pc => pc.card.instanceId !== weakest!.card.instanceId)

    const usedSlots = new Set(destHalf.placed.map(pc => pc.slotIndex))
    const freeSlot = Array.from({ length: MAX_LOCATION_SLOTS }, (_, i) => i).find(i => !usedSlots.has(i))
    if (freeSlot === undefined) return

    destHalf.placed.push({ ...weakest, slotIndex: freeSlot })
    this.addLog(
      `Challenger dragged ${this.state.players[opponentId].displayName}'s ${weakest.card.name} to Lane ${laneIndex + 1}!`,
      'action'
    )
  }

  // ─── Spell effects ───────────────────────────────────────────────────────────
  private applySpellEffect(playerId: string, card: Card, lane: LaneState, laneIndex: number): void {
    const effect = card.spellEffect
    if (!effect) return

    const playerIds = Object.keys(this.state.players)
    const opponentId = playerIds.find(id => id !== playerId)!
    const myHalf = lane.halves[playerId]
    const oppHalf = lane.halves[opponentId]

    if (effect.type === 'draw') {
      for (let i = 0; i < effect.value; i++) this.drawCard(playerId)
      this.addLog(`${this.state.players[playerId].displayName} drew ${effect.value} card${effect.value > 1 ? 's' : ''}.`, 'system')

    } else if (effect.type === 'power_boost') {
      const ownPlaced = (myHalf?.placed ?? []).filter(pc => pc.card.type === 'unit')
      if (!ownPlaced.length) return
      const target = ownPlaced.reduce((best, cur) =>
        (cur.card.power + (cur.card.powerBonus ?? 0)) > (best.card.power + (best.card.powerBonus ?? 0)) ? cur : best
      )
      target.card.powerBonus = (target.card.powerBonus ?? 0) + effect.value
      this.addLog(`${target.card.name} gained +${effect.value} power in Lane ${laneIndex + 1}!`, 'system')

    } else if (effect.type === 'power_drain') {
      const oppPlaced = (oppHalf?.placed ?? []).filter(pc => pc.card.type === 'unit')
      if (!oppPlaced.length) {
        this.addLog(`${card.name} fizzled — no enemy units in Lane ${laneIndex + 1}.`, 'system')
        return
      }
      const target = oppPlaced.reduce((best, cur) =>
        (cur.card.power + (cur.card.powerBonus ?? 0)) > (best.card.power + (best.card.powerBonus ?? 0)) ? cur : best
      )
      target.card.powerBonus = (target.card.powerBonus ?? 0) - effect.value
      this.addLog(`${target.card.name} lost ${effect.value} power in Lane ${laneIndex + 1}!`, 'system')
    }
  }

  private drawCard(playerId: string): void {
    const hand = this.playerHands.get(playerId) ?? []
    if (hand.length >= MAX_HAND_SIZE) return
    const deck = this.playerDecks.get(playerId) ?? []
    if (!deck.length) return
    const [drawn, ...rest] = deck
    this.playerDecks.set(playerId, rest)
    hand.push({ ...drawn, powerBonus: 0 })
    this.playerHands.set(playerId, hand)
    this.state.players[playerId].handCount = hand.length
    this.state.players[playerId].deckCount = rest.length
  }

  private addLog(message: string, type: 'action' | 'system' | 'chat'): void {
    this.state.log.push({ id: uuid(), timestamp: Date.now(), message, type })
    if (this.state.log.length > 100) this.state.log = this.state.log.slice(-100)
  }
}
