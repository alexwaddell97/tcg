// Types
export type { ArenaQuestMetrics, ArenaQuestReceipt } from './types/quests.ts'
export { CARD_BORDERS, CARD_PLAY_XP, MAX_CARD_XP, isCardBorder, normalizeCardXP, getCardMasteryTier, isBorderUnlocked, getEquippedCardBorder, sanitizeCardBorders } from './constants/cardMastery.ts'
export type { CardBorderId, CardMastery, CardMasteryReward } from './constants/cardMastery.ts'
export type { Card, CardDefinition, CardType, CardFaceValues, HexCoord, HexFaceValues, Keyword, Rarity, QuestDefinition, SpellEffect, SpellEffectType, ArenaAbility, ArenaArchetype } from './types/card.ts'
export type { ArenaState, ArenaLocation, ArenaPlacedCard, ArenaPlay, ArenaTurnSubmission, ArenaIndex, ArenaSlotIndex, ArenaRule, ArenaReveal, ArenaRevealEvent } from './types/arena.ts'
export { ARENA_POSITIONS, getArenaNeighbours, getArenaFormation, resolveArenaPlaySlots } from './utils/arenaFormation.ts'
export { ARENA_TURNS, ARENA_DECK_SIZE, ARENA_STARTING_HAND, ARENA_MAX_HAND, ARENA_SLOTS, ARENAS_PER_MATCH, ARENA_CARD_DATABASE, ARENA_STARTER_DECK, ARENA_LOCATIONS, getArenaDeckError } from './constants/arena.ts'
export { getArenaCardPower, getArenaCardScore, getArenaLocationPower, getArenaMatchScore, getArenaPlanError } from './utils/arena.ts'
export { ArenaEngine } from './utils/ArenaEngine.ts'
export { ARENA_RELIC_CARDS, EMBERLING } from './constants/arenaRelics.ts'
export { getArenaRelicCounter } from './utils/arenaRelics.ts'
export type { GameState, GameAction, GamePhase, PlayerState, PendingPlay, GameLogEntry, TriadCellState, HexCellState } from './types/game.ts'
export type { LocationDefinition, LaneState, LocationHalf, LocationEffect, LocationEffectType, LocationTheme, PlacedCard } from './types/location.ts'
export type { Room, LobbyPlayer, RoomStatus } from './types/lobby.ts'
export type { ClientToServerEvents, ServerToClientEvents, SocketData } from './types/socket.ts'

// Singleplayer types
export type {
  StatusEffectId, StatusEffect,
  SPCardType, SPCardRarity, CardEffectType, CardEffect, SPCardDefinition, SPCardInstance,
  IntentType, EnemyIntent, EnemyMoveDefinition, EnemyDefinition, ActiveEnemy,
  RelicRarity, RelicDefinition, ActiveRelic,
  PotionRarity, PotionDefinition,
  MapNodeType, MapNode, ActMap,
  CombatLogEntry, CombatPhase, CombatState,
  RunPhase, ShopItem, ShopInventory, RunState,
  EquipmentSlot, EquipmentTier, EquipmentEffectType, EquipmentEffect, EquipmentDefinition,
  GladiatorClassId, GladiatorClassDefinition,
} from './types/singleplayer.ts'
export { WOUND_CARD_ID } from './types/singleplayer.ts'

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
export { GLADIATOR_CARD_DATABASE, STARTER_DECK_IDS, REWARD_POOL } from './constants/gladiatorCards.ts'
export { ENEMY_DATABASE, ACT_ENEMY_POOLS } from './constants/spEnemies.ts'
export { RELIC_DATABASE, POTION_DATABASE } from './constants/spRelics.ts'
export { EQUIPMENT_DATABASE, getEquipment } from './constants/spEquipment.ts'
export { GLADIATOR_CLASSES, CLASS_DATABASE } from './constants/spClasses.ts'

// Utils
export { shuffle, drawCards } from './utils/deck.ts'
export { canPlayCard, canPlaceAtLane, isValidDeckLocation } from './utils/validation.ts'
export { getTriadValues } from './utils/triad.ts'
export { getAllHexCoords, coordToKey, keyToCoord, getHexNeighbors, getNeighborDirection, getOppositeDirection, getHexValues, getHexCaptures, hexToPixel, isValidHexCoord } from './utils/hex.ts'

export { ARENA_EXPANSION_CARDS, ARENA_TOKEN_DATABASE, ARENA_ARCHETYPE_DECKS, ARENA_EXPANSION_NAME } from './constants/arenaExpansion.ts'
export { ARENA_FOUNDATION_CARDS } from './constants/arenaFoundations.ts'
export { ARENA_ARCHETYPES, ARENA_ABILITY_LABELS, getArenaAbilities, describeArenaAbility } from './utils/arenaAbilities.ts'

export { ARENA_CARD_SETS, ARENA_ETERNAL_CARD_IDS, arenaSetName, arenaCardSetName } from './constants/arenaSets.ts'
export { ARENA_SEASONS, CURRENT_SEASON, getExclusiveCardSeason } from './constants/arenaSeasons.ts'
export type { ArenaCardSet } from './constants/arenaSets.ts'

export { SHOP_CARD_VARIANTS, SHOP_VARIANT_POOL, SHOP_VARIANT_SLOTS, SHOP_ROTATION_INTERVAL_MS, getShopVariantRotation, PACK_CARD_VARIANTS, CARD_VARIANTS, SEASON_CARD_VARIANT, getCardVariant, applyCardVariant, sanitizeCardVariants } from './constants/cardVariants.ts'
export type { ShopCardVariant } from './constants/cardVariants.ts'
export { PROFILE_AVATARS, PROFILE_TITLES, DEFAULT_AVATAR_ID, getProfileAvatar, getProfileTitle, ownsProfileCosmetic, sanitizePlayerCosmetics, restoreProfileCosmetics } from './constants/profileCosmetics.ts'
export type { ProfileAvatarDefinition, ProfileTitleDefinition } from './constants/profileCosmetics.ts'
