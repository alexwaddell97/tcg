// Types
export type { Card, CardDefinition, CardType, Keyword, Rarity, QuestDefinition, SpellEffect, SpellEffectType } from './types/card.ts'
export type { GameState, GameAction, GamePhase, PlayerState, PendingPlay, GameLogEntry } from './types/game.ts'
export type { LocationDefinition, LaneState, LocationHalf, LocationEffect, LocationEffectType, LocationTheme, PlacedCard } from './types/location.ts'
export type { Room, LobbyPlayer, RoomStatus } from './types/lobby.ts'
export type { ClientToServerEvents, ServerToClientEvents, SocketData } from './types/socket.ts'

// Constants
export {
  TURNS_PER_ROUND,
  TOTAL_ROUNDS,
  ROUNDS_TO_WIN,
  GOLD_BUDGET,
  STARTING_HAND_SIZE,
  ROUND_DRAW_SIZE,
  MAX_HAND_SIZE,
  MAX_LOCATION_SLOTS,
  DECK_SIZE,
  MAX_COPIES_PER_CARD,
  MAX_COPIES_LEGENDARY,
  LOCATIONS_PER_PLAYER,
  LOCATIONS_IN_GAME,
} from './constants/game.ts'
export { CARD_DATABASE } from './constants/cards.ts'
export { LOCATION_DATABASE, NEUTRAL_LOCATION_DATABASE } from './constants/locations.ts'

// Utils
export { shuffle, drawCards } from './utils/deck.ts'
export { canPlayCard, canPlaceAtLane, isValidDeckLocation } from './utils/validation.ts'
