import { useEffect, useId, useRef } from 'react'
import type { CSSProperties } from 'react'
import { getArenaLocationPower, getArenaMatchScore } from '@tcg/shared'
import type { GameState } from '@tcg/shared'
import { UI_ASSETS } from '../../lib/uiAssets.ts'
import type { MasteryReceipt } from '../../stores/useCardMasteryStore.ts'
import CardMasteryReward from './CardMasteryReward.tsx'
import { arenaVerdict } from './ArenaFinale.tsx'
import './ArenaResultScreen.css'
import { useCollectionStore } from '../../stores/useCollectionStore.ts'
import '../quests/Quests.css'

interface Props {
  state: GameState
  playerId: string
  opponentId: string
  receipt?: MasteryReceipt | null
  onClose: () => void
  onExit: () => void
}

/** A top-layer result scene; the board beneath retains its exact geometry. */
export default function ArenaResultScreen({ state, playerId, opponentId, receipt, onClose, onExit }: Props) {
  const ref = useRef<HTMLDialogElement>(null)
  const continueRef = useRef<HTMLButtonElement>(null)
  const titleId = useId()
  const questReward = useCollectionStore(store => store.lastQuestReward?.matchId === state.arena?.questReceipt?.matchId ? store.lastQuestReward : null)
  const outcome = state.winner === playerId ? 'victory' : state.winner ? 'defeat' : 'draw'
  const title = outcome === 'victory' ? 'Victory' : outcome === 'defeat' ? 'Defeat' : 'Draw'
  const completed = state.arena!.lastReveal?.turn === state.arena!.totalTurns
  const mine = getArenaMatchScore(state, playerId), theirs = getArenaMatchScore(state, opponentId)
  const reason = !completed ? (outcome === 'victory' ? 'Opponent retreated' : outcome === 'defeat' ? 'You retreated' : '')
    : mine.locations === theirs.locations ? (mine.power === theirs.power ? 'Equal arenas. Equal power.' : `Decided by total power · ${mine.power}–${theirs.power}`) : ''
  useEffect(() => {
    const node = ref.current!
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    node.showModal()
    continueRef.current?.focus({ preventScroll: true })
    return () => { node.close(); previousFocus?.focus({ preventScroll: true }) }
  }, [])
  return <dialog ref={ref} className={`arena-result is-${outcome} ${receipt?.cards.length ? 'has-rewards' : ''}`} aria-labelledby={titleId} onCancel={onClose}>
    <div className="arena-result-atmosphere" aria-hidden="true"><div className="arena-result-aura"/><div className="arena-result-light"/>
      {Array.from({ length: 14 }, (_, i) => <i key={i} style={{ '--spark-x': `${12 + i * 5.8}%`, '--spark-delay': `${i % 5 * .14}s`, '--spark-drift': `${(i % 2 ? -1 : 1) * (18 + i * 3)}px` } as CSSProperties}/>)}</div>
    <button className="arena-result-close" aria-label="Close result and view board" onClick={onClose}><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 6L18 18M18 6L6 18"/></svg></button>
    <div className="arena-result-stage">
      <header className="arena-result-hero">
        <div className="arena-result-relic" aria-hidden="true"><img src={UI_ASSETS.results[outcome]} alt="" draggable={false}/></div>
        <p className="arena-result-brand">Arena Eternal</p>
        <h2 id={titleId}>{title}</h2>
        <div className="arena-result-flourish" aria-hidden="true"><span/><svg viewBox="0 0 42 18" fill="none"><path d="M1 9H12L21 1L30 9L21 17L12 9M30 9H41M17 9L21 5L25 9L21 13Z"/></svg><span/></div>
      </header>
      <div className="arena-result-details">
        {completed && <section className="arena-result-recap" aria-label="Arena results">
          <ol>{state.arena!.locations.map(location => {
            const verdict = arenaVerdict(location, playerId, opponentId)
            const ownPower = getArenaLocationPower(location, playerId), enemyPower = getArenaLocationPower(location, opponentId)
            return <li key={location.index} className={`result-arena verdict-${verdict}`} style={{ '--score-digits': Math.max(2, String(ownPower).length, String(enemyPower).length) } as CSSProperties} aria-label={`${location.name}: you ${ownPower}, opponent ${enemyPower}, ${verdict}`}>
              <div className="result-arena-art" aria-hidden="true">{location.rule && <img src={UI_ASSETS.locations[location.rule]} alt=""/>}</div>
              <h3>{location.name}</h3>
              <div className="result-arena-powers" aria-hidden="true"><strong className={`is-yours ${verdict === 'won' ? 'is-leading' : ''}`}>{ownPower}</strong><span>/</span><strong className={`is-theirs ${verdict === 'lost' ? 'is-leading' : ''}`}>{enemyPower}</strong></div>
              <span className="result-arena-line" aria-hidden="true"/>
            </li>
          })}</ol>
          <p className="arena-result-legend"><span>You</span><i>/</i><span>Opponent</span></p>
        </section>}
        {reason && <p className="arena-result-reason">{reason}</p>}
        <CardMasteryReward receipt={receipt}/>
        {questReward && (questReward.gems > 0 || questReward.xp > 0) && <p className="ae-match-quest-reward" role="status">Quest rewards · {[questReward.gems > 0 ? `+${questReward.gems} gems` : '', questReward.xp > 0 ? `+${questReward.xp} season XP` : ''].filter(Boolean).join(' · ')}</p>}
        <div className="arena-result-actions">
          <button ref={continueRef} className="arena-result-continue" onClick={onExit}><span>Back to home</span><svg viewBox="0 0 26 16" fill="none" aria-hidden="true"><path d="M1 8H24M18 2L24 8L18 14"/></svg></button>
          <button className="arena-result-view-board" onClick={onClose}>View board</button>
        </div>
      </div>
    </div>
  </dialog>
}
