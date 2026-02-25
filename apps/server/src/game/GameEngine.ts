import { v4 as uuid } from 'uuid'
import type { GameState, GameAction, PlayerState, Room, Card } from '@tcg/shared'
import { STARTING_HEALTH, STARTING_HAND_SIZE, CARD_DATABASE, shuffle } from '@tcg/shared'

export class GameEngine {
  private state: GameState
  private playerHands: Map<string, Card[]> = new Map()
  private playerDecks: Map<string, Card[]> = new Map()

  constructor(room: Room) {
    const players: Record<string, PlayerState> = {}

    for (const p of room.players) {
      // Build a simple starter deck for each player
      const deck = shuffle(
        CARD_DATABASE.flatMap(def =>
          Array.from({ length: 4 }, () => ({
            ...def,
            id: uuid(),
          }))
        ).slice(0, 30)
      )

      const hand = deck.slice(0, STARTING_HAND_SIZE)
      const remaining = deck.slice(STARTING_HAND_SIZE)

      this.playerHands.set(p.id, hand)
      this.playerDecks.set(p.id, remaining)

      players[p.id] = {
        id: p.id,
        displayName: p.displayName,
        health: STARTING_HEALTH,
        maxHealth: STARTING_HEALTH,
        mana: 1,
        maxMana: 1,
        handCount: hand.length,
        deckCount: remaining.length,
        graveyardCount: 0,
        field: [],
        isConnected: true,
      }
    }

    this.state = {
      roomId: room.id,
      phase: 'main',
      turn: 1,
      activePlayerId: room.players[0].id,
      players,
      log: [
        {
          id: uuid(),
          timestamp: Date.now(),
          message: 'Game started!',
          type: 'system',
        },
      ],
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
    if (!player) {
      return { success: false, error: 'Player not found', newState: this.state }
    }

    switch (action.type) {
      case 'end_turn': {
        if (this.state.activePlayerId !== action.playerId) {
          return { success: false, error: 'Not your turn', newState: this.state }
        }
        this.advanceTurn()
        break
      }
      case 'surrender': {
        this.state.phase = 'game_over'
        const winnerId = Object.keys(this.state.players).find(id => id !== action.playerId)!
        this.state.winner = winnerId
        this.addLog(`${player.displayName} surrendered.`, 'action')
        break
      }
      case 'play_card': {
        if (this.state.activePlayerId !== action.playerId) {
          return { success: false, error: 'Not your turn', newState: this.state }
        }
        if (this.state.phase !== 'main') {
          return { success: false, error: 'Can only play cards in main phase', newState: this.state }
        }
        const result = this.playCard(action.playerId, action.cardInstanceId!)
        if (!result.success) return { ...result, newState: this.state }
        break
      }
      default:
        return { success: false, error: 'Unknown action', newState: this.state }
    }

    return { success: true, newState: this.state }
  }

  private playCard(playerId: string, cardInstanceId: string): { success: boolean; error?: string } {
    const hand = this.playerHands.get(playerId) ?? []
    const cardIndex = hand.findIndex(c => c.id === cardInstanceId)
    if (cardIndex === -1) return { success: false, error: 'Card not in hand' }

    const card = hand[cardIndex]
    const player = this.state.players[playerId]

    if (player.mana < card.cost) return { success: false, error: 'Not enough mana' }

    // Remove from hand
    hand.splice(cardIndex, 1)
    this.playerHands.set(playerId, hand)
    player.handCount = hand.length
    player.mana -= card.cost

    if (card.type === 'creature' && card.power !== undefined && card.toughness !== undefined) {
      player.field.push({
        card,
        ownerId: playerId,
        instanceId: uuid(),
        canAttack: false, // Summoning sickness
        tapped: false,
        currentPower: card.power,
        currentToughness: card.toughness,
      })
    }

    this.addLog(`${player.displayName} played ${card.name}.`, 'action')
    return { success: true }
  }

  private advanceTurn() {
    const playerIds = Object.keys(this.state.players)
    const currentIndex = playerIds.indexOf(this.state.activePlayerId)
    const nextIndex = (currentIndex + 1) % playerIds.length

    if (nextIndex === 0) {
      this.state.turn += 1
    }

    const nextPlayerId = playerIds[nextIndex]
    this.state.activePlayerId = nextPlayerId
    this.state.phase = 'main'

    const nextPlayer = this.state.players[nextPlayerId]
    const newMaxMana = Math.min(this.state.turn, 10)
    nextPlayer.maxMana = newMaxMana
    nextPlayer.mana = newMaxMana

    // Untap all creatures
    nextPlayer.field.forEach(c => {
      c.tapped = false
      c.canAttack = true
    })

    // Draw a card
    const deck = this.playerDecks.get(nextPlayerId) ?? []
    if (deck.length > 0) {
      const drawn = deck.shift()!
      const hand = this.playerHands.get(nextPlayerId) ?? []
      hand.push(drawn)
      this.playerHands.set(nextPlayerId, hand)
      this.playerDecks.set(nextPlayerId, deck)
      nextPlayer.handCount = hand.length
      nextPlayer.deckCount = deck.length
    }

    this.addLog(`${nextPlayer.displayName}'s turn.`, 'system')
  }

  private addLog(message: string, type: 'action' | 'system' | 'chat') {
    this.state.log.push({
      id: uuid(),
      timestamp: Date.now(),
      message,
      type,
    })
    // Keep log from growing too large
    if (this.state.log.length > 100) {
      this.state.log = this.state.log.slice(-100)
    }
  }

  isGameOver(): { over: boolean; winnerId?: string; reason?: string } {
    if (this.state.phase === 'game_over' && this.state.winner) {
      return { over: true, winnerId: this.state.winner, reason: 'surrender' }
    }
    for (const [id, player] of Object.entries(this.state.players)) {
      if (player.health <= 0) {
        const winnerId = Object.keys(this.state.players).find(pid => pid !== id)!
        return { over: true, winnerId, reason: 'health_depleted' }
      }
    }
    return { over: false }
  }
}
