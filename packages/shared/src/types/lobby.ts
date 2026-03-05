export type RoomStatus = 'waiting' | 'in_progress' | 'finished'

export interface LobbyPlayer {
  id: string
  displayName: string
  isReady: boolean
  avatarEmoji?: string
  rank?: string
  deckId?: string
  deckDefinitionIds?: string[]
}

export interface Room {
  id: string
  name: string
  hostId: string
  status: RoomStatus
  players: LobbyPlayer[]
  maxPlayers: 2
  isPrivate: boolean
  createdAt: number
}
