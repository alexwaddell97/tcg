import { useState } from 'react'
import type { Card, GameState, HexCoord } from '@tcg/shared'
import { HexBoard } from './HexBoard.tsx'
import GameBoard from './GameBoard.tsx'
import { UI_ASSETS } from '../../lib/uiAssets.ts'

interface MatchBoardProps {
  gameState: GameState
  playerId: string
  hand: Card[]
  canAct: boolean
  error?: string | null
  onPlace: (cardId: string, target: number | HexCoord) => void
  onPass: () => void
  onSurrender: () => void
  onExit: () => void
}

export default function MatchBoard({ gameState, playerId, hand, canAct, error, onPlace, onPass, onSurrender, onExit }: MatchBoardProps) {
  const [showRules, setShowRules] = useState(false)
  const me = gameState.players[playerId]
  const opponent = Object.values(gameState.players).find((player) => player.id !== playerId)
  const isHex = gameState.boardType === 'hex'
  const cells = isHex ? Object.values(gameState.hexBoard ?? {}) : gameState.board ?? []
  const score = (id?: string) => cells.filter((cell) => cell?.card && cell.ownerId === id).length
  const over = gameState.phase === 'game_over'
  const lastEntry = gameState.log.at(-1)
  const winner = gameState.winner ? gameState.players[gameState.winner] : undefined

  return <main className="multiplayer-room">
    <header className="match-header">
      <div className="match-brand"><img src={UI_ASSETS.logo} alt="Arena Eternal" className="match-brand-logo" /><div><p className="arena-label">{isHex ? 'Hex Triple Triad' : 'Triple Triad'}</p><h1 className="match-title">The battlefield</h1></div></div>
      <div className="match-score" aria-label={`Board control: you ${score(playerId)}, opponent ${score(opponent?.id)}`}>
        <div className="match-player mine"><span className="match-player-name">◆ {me?.displayName ?? 'You'}</span><strong>{score(playerId)}</strong></div>
        <div className="match-score-divider">/</div>
        <div className="match-player opponent"><span className="match-player-name">◇ {opponent?.displayName ?? 'Opponent'}</span><strong>{score(opponent?.id)}</strong></div>
      </div>
      <button className="arena-button" aria-expanded={showRules} onClick={() => setShowRules(!showRules)}>{showRules ? 'Close rules' : 'How to play'}</button>
    </header>
    {showRules && <aside className="match-rules" aria-label="Game rules">
      <h2>Place. Capture. Control.</h2>
      <p>Take turns placing one of your five cards on an empty {isHex ? 'hex' : 'cell'}. Cards keep their orientation.</p>
      <p>Compare each touching side. A higher value captures the opposing card; equal values hold. A means 10.</p>
      <p>Captured cards attack their neighbours too, creating chains. {isHex && 'Select a card and hover over a hex to preview the captures.'}</p>
      <p>The match ends when the board fills or both hands are empty. Most controlled cards wins; remaining hand strength breaks a tie. Equal scores and strength draw.</p>
      <p>Pass to keep your hand for later. An empty hand is skipped automatically.</p>
    </aside>}
    {error && <p className="match-error" role="alert">{error}</p>}
    {isHex ? <HexBoard gameState={gameState} myPlayerId={playerId} myCards={hand} opponentCardCount={opponent?.handCount ?? 0} canAct={canAct} onPlaceCard={onPlace} />
      : <GameBoard gameState={gameState} myPlayerId={playerId} myCards={hand} opponentCardCount={opponent?.handCount ?? 0} canAct={canAct} onPlaceCard={onPlace} />}
    <footer className="match-footer">
      <div aria-live="polite"><p className="match-turn">{over ? 'Match complete' : `Turn ${gameState.turn} · ${gameState.activePlayerId === playerId ? 'Your turn' : `${opponent?.displayName ?? 'Opponent'}’s turn`}`}</p>
        {lastEntry && <p className="match-log">{lastEntry.message}</p>}
      </div>
      {!over && <div className="flex gap-2"><button className="arena-button" onClick={onPass} disabled={!canAct}>Pass turn</button><button className="arena-button" onClick={onSurrender}>Surrender</button></div>}
    </footer>
    {over && <section className="match-result" aria-label="Match result" aria-live="polite">
      <div><h2>{!winner ? 'A hard-fought draw' : winner.id === playerId ? 'Victory' : `${winner.displayName} wins`}</h2><p className="match-log">Final control · {score(playerId)} – {score(opponent?.id)}</p></div>
      <button className="arena-button" onClick={onExit}>Back to lobby</button>
    </section>}
  </main>
}
