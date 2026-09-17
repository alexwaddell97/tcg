import { getDeckCardVariants } from '../stores/useCollectionStore.ts'
import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ARENA_ARCHETYPE_DECKS, ARENA_STARTER_DECK, ArenaEngine, getArenaDeckError } from '@tcg/shared'
import type { ArenaTurnSubmission, Room } from '@tcg/shared'
import { getDeckCardBorders } from '../stores/useCardMasteryStore.ts'
import { useCardMasteryReward } from '../hooks/useCardMasteryReward.ts'
import { choosePracticePlays } from '../lib/arenaPracticeBot.ts'
import ArenaBoard from '../components/game/ArenaBoard.tsx'
import { useDeckStore } from '../stores/useDeckStore.ts'
import { useAuthStore } from '../stores/useAuthStore.ts'

function createPractice(requestedDeck?: string[]) {
  const { decks, activeDeckId } = useDeckStore.getState()
  const { displayName, avatarId, titleId, rank } = useAuthStore.getState()
  const selected = decks.find(deck => deck.id === activeDeckId)
  const deckIds = selected ? Object.entries(selected.cards).flatMap(([id, count]) => Array<string>(count).fill(id)) : undefined
  const validDeck = requestedDeck && !getArenaDeckError(requestedDeck) ? requestedDeck : deckIds && !getArenaDeckError(deckIds) ? deckIds : undefined
  const rival = ARENA_ARCHETYPE_DECKS[Math.floor(Math.random() * ARENA_ARCHETYPE_DECKS.length)]
  const room: Room = { id: crypto.randomUUID(), name: 'Practice', hostId: 'you', status: 'in_progress', maxPlayers: 2, isPrivate: true, createdAt: Date.now(),
    players: [{ id: 'you', displayName: displayName.trim() || 'You', avatarId, titleId, rank, isReady: true, deckDefinitionIds: validDeck, cardBorders: getDeckCardBorders(validDeck ?? ARENA_STARTER_DECK), cardVariants: getDeckCardVariants(validDeck ?? ARENA_STARTER_DECK) }, { id: 'bot', displayName: 'Sparring partner', avatarId: 'guardian', titleId: 'challenger', isReady: true, deckDefinitionIds: rival.cards }] }
  return new ArenaEngine(room)
}


export default function ArenaPractice() {
  const navigate = useNavigate()
  const { state: navigationState } = useLocation()
  const requestedDeck: string[] | undefined = Array.isArray(navigationState?.deckDefinitionIds) && navigationState.deckDefinitionIds.every((id: unknown) => typeof id === 'string') ? navigationState.deckDefinitionIds : undefined
  const [engine] = useState(() => createPractice(requestedDeck))
  const [state, setState] = useState(() => engine.getStateFor('you'))
  const masteryReward = useCardMasteryReward(state)
  const [error, setError] = useState<string | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [engine])
  const commit = (submission: ArenaTurnSubmission) => {
    const result = engine.processAction({ type: 'commit_turn', playerId: 'you', submission, timestamp: Date.now() })
    if (!result.success) { setError(result.error ?? 'Review your turn.'); return }
    setError(null)
    setState(engine.getStateFor('you'))
    timer.current = setTimeout(() => {
      const botView = engine.getStateFor('bot')
      engine.processAction({ type: 'commit_turn', playerId: 'bot', submission: { turn: botView.turn, plays: choosePracticePlays(botView) }, timestamp: Date.now() })
      setState(engine.getStateFor('you'))
    }, 650)
  }
  return <div className="practice-screen">
    <div className="h-8 flex items-center justify-center gap-6 bg-stone-950 text-[10px] text-stone-400"><span>Practice · earns card mastery</span><button onClick={() => navigate('/')}>Main menu</button></div>
    <ArenaBoard masteryReward={masteryReward} key={state.roomId} gameState={state} playerId="you" canAct={!state.arena!.lockedIn.you && state.phase === 'planning'} error={error}
      onCommit={commit} onSurrender={() => { if (timer.current) clearTimeout(timer.current); engine.processAction({ type: 'surrender', playerId: 'you', timestamp: Date.now() }); setState(engine.getStateFor('you')) }} onExit={() => navigate('/')} />
  </div>
}
