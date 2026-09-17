import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { Card, GameState, HexCoord } from '@tcg/shared'
import { CARD_DATABASE, coordToKey, getAllHexCoords, getHexCaptures, getHexValues } from '@tcg/shared'
import MatchBoard from '../components/game/MatchBoard.tsx'

// Development-only local hotseat preview using the same placement and capture rules.
function createPreview() {
  const hands: Record<string, Card[]> = {}
  const state: GameState = {
    roomId: 'preview', phase: 'planning', round: 1, turn: 1, boardType: 'hex',
    hexBoard: Object.fromEntries(getAllHexCoords().map((coord) => [coordToKey(coord), { coord }])),
    pendingPlays: {}, players: {}, activePlayerId: 'p1', startedAt: Date.now(),
    log: [{ id: 'start', timestamp: Date.now(), type: 'system', message: 'Local preview: control switches after each placement.' }],
  }
  for (const [index, id] of ['p1', 'p2'].entries()) {
    hands[id] = CARD_DATABASE.filter((card) => !card.isTransformTarget).slice(index * 5, index * 5 + 5).map((card, i) => ({
      ...card, instanceId: `${id}-${i}`, questProgress: 0, isTransformed: false, powerBonus: 0,
    }))
    state.players[id] = { id, displayName: index === 0 ? 'Azure' : 'Crimson', avatarId: index === 0 ? 'archivist' : 'guardian', rank: 'Initiate', handCount: 5, deckCount: 0, isConnected: true, hasPassed: false, roundWins: 0, chosenLocationIds: ['the_forge', 'the_rift'] }
  }
  return { state, hands }
}

export default function HexBoardPreview() {
  const [preview, setPreview] = useState(createPreview)
  const { state, hands } = preview
  const playerId = state.activePlayerId
  const next = (cardId?: string, target?: number | HexCoord) => setPreview((current) => {
    const copy = structuredClone(current)
    const { state: game, hands: cards } = copy
    const id = game.activePlayerId
    if (game.phase !== 'planning') return current
    if (cardId && Array.isArray(target)) {
      const card = cards[id].find((entry) => entry.instanceId === cardId)
      const key = coordToKey(target)
      if (!card || !game.hexBoard?.[key] || game.hexBoard[key].card) return current
      const captured = getHexCaptures(game.hexBoard, id, card, target)
      game.hexBoard[key] = { coord: target, ownerId: id, card }
      captured.forEach((cellKey) => { game.hexBoard![cellKey].ownerId = id })
      cards[id] = cards[id].filter((entry) => entry.instanceId !== cardId)
      game.players[id].handCount = cards[id].length
      game.log.push({ id: `turn-${game.turn}`, timestamp: Date.now(), type: 'action', message: `${game.players[id].displayName} played ${card.name}${captured.length ? ` · ${captured.length} captured` : ''}.` })
    }
    const other = id === 'p1' ? 'p2' : 'p1'
    if (Object.values(cards).every((hand) => hand.length === 0) || Object.values(game.hexBoard!).every((cell) => cell.card)) {
      game.phase = 'game_over'
      const score = (pid: string) => Object.values(game.hexBoard!).filter((cell) => cell.ownerId === pid).length
      const strength = (pid: string) => cards[pid].flatMap(getHexValues).reduce((sum, value) => sum + value, 0)
      const difference = score('p1') - score('p2') || strength('p1') - strength('p2')
      game.winner = difference === 0 ? undefined : difference > 0 ? 'p1' : 'p2'
    } else {
      game.activePlayerId = cards[other].length ? other : id
      game.turn++
    }
    return copy
  })
  return <div className="board-preview">
    <div className="h-8 flex items-center justify-center gap-4 text-[10px] text-stone-400 bg-stone-950 px-3">
      <span>Local hotseat preview</span><button onClick={() => setPreview(createPreview())}>Reset</button><Link to="/">Main menu</Link>
    </div>
    <MatchBoard key={state.roomId} gameState={state} playerId={playerId} hand={hands[playerId]} canAct={state.phase === 'planning'}
      onPlace={next} onPass={() => next()}
      onSurrender={() => setPreview((current) => ({ ...current, state: { ...current.state, phase: 'game_over', winner: playerId === 'p1' ? 'p2' : 'p1' } }))}
      onExit={() => setPreview(createPreview())} />
  </div>
}
