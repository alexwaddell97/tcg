// Types
export type { Card, CardDefinition, CardType, CardEffect, Rarity } from './types/card.ts'
export type { GameState, GameAction, GamePhase, PlayerState, BoardCreature, GameLogEntry } from './types/game.ts'
export type { Room, LobbyPlayer, RoomStatus } from './types/lobby.ts'
export type { ClientToServerEvents, ServerToClientEvents, SocketData } from './types/socket.ts'

// Constants
export { STARTING_HEALTH, MAX_HAND_SIZE, STARTING_HAND_SIZE, MAX_FIELD_SIZE, DECK_SIZE, MAX_COPIES_PER_CARD, MAX_COPIES_LEGENDARY } from './constants/game.ts'
export { CARD_DATABASE } from './constants/cards.ts'

// Utils
export { shuffle, drawCards } from './utils/deck.ts'
export { canPlayCard, canAttack, isValidPlay } from './utils/validation.ts'
