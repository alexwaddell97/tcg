/** Gameplay totals attributed to the player who actually played each card. */
export interface ArenaQuestMetrics {
  unitsPlayed: number
  spellsPlayed: number
  aetherSpent: number
  arenasWon: number
  powerArenas: number
  matchesWon: number
}
/** Issued only after a natural six-turn finish, never for spectators or retreats. */
export interface ArenaQuestReceipt {
  matchId: string
  finishedAt: number
  metrics: ArenaQuestMetrics
}
