import type { ArenaLocation, GameState } from '@tcg/shared'
import { getArenaLocationPower, getArenaMatchScore } from '@tcg/shared'
import './ArenaFinale.css'

export function arenaVerdict(location: ArenaLocation, playerId: string, opponentId: string) {
  const difference = getArenaLocationPower(location, playerId) - getArenaLocationPower(location, opponentId)
  return difference > 0 ? 'won' : difference < 0 ? 'lost' : 'tied'
}

export function ArenaScoreSummary({ state, playerId, opponentId }: { state: GameState; playerId: string; opponentId: string }) {
  const mine = getArenaMatchScore(state, playerId)
  const theirs = getArenaMatchScore(state, opponentId)
  return <div className="clash-score-summary" role="status" aria-label="Arena scores resolved">
    <div className="clash-finale-marks">{state.arena!.locations.map(location => {
      const verdict = arenaVerdict(location, playerId, opponentId)
      return <span key={location.index} className={`verdict-${verdict}`} aria-label={`${location.name}: ${verdict}`}>
        {verdict === 'won' ? '✓' : verdict === 'lost' ? '×' : '−'}
      </span>
    })}</div>
    {mine.locations === theirs.locations && <div className="clash-power-tiebreak"><p>Total power</p><div><span><b>{mine.power}</b><small>You</small></span><i>—</i><span><b>{theirs.power}</b><small>Opponent</small></span></div></div>}
  </div>
}
