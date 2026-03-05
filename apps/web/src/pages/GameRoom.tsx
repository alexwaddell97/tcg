import { useState, useEffect, useRef } from 'react'
import { Crown, Sword } from '@phosphor-icons/react'
import { useNavigate } from 'react-router-dom'
import { useGameStore } from '../stores/useGameStore.ts'
import { useAuthStore } from '../stores/useAuthStore.ts'
import { useCollectionStore } from '../stores/useCollectionStore.ts'
import { getSocket } from '../lib/socket.ts'
import GameBoard from '../components/game/GameBoard.tsx'
import PlayerHand from '../components/game/PlayerHand.tsx'
import ActionBar from '../components/game/ActionBar.tsx'
import GameLog from '../components/game/GameLog.tsx'
import GameOptionsOverlay from '../components/game/GameOptionsOverlay.tsx'
import { cn } from '../lib/cn.ts'
import type { PlayerState, GameState } from '@tcg/shared'

interface RoundEndSummary {
  round: number
  myTotal: number
  opponentTotal: number
  myDisplayName: string
  opponentDisplayName: string
  myRoundWins: number
  opponentRoundWins: number
  /** true = I won, false = opponent won, null = tie */
  iWon: boolean | null
}

const AUTO_DISMISS_MS = 3500
const INTRO_DISMISS_MS = 5000

const COIN_FLIP_START_MS = 600
const COIN_FLIP_DURATION_MS = 2400
const COIN_LAND_MS = COIN_FLIP_START_MS + COIN_FLIP_DURATION_MS

function GameStartOverlay({
  opponentName,
  myGoesFirst,
  onDismiss,
}: {
  myName: string
  opponentName: string
  myGoesFirst: boolean
  onDismiss: () => void
}) {
  const [flipping, setFlipping] = useState(false)
  const [landed, setLanded] = useState(false)
  const [progress, setProgress] = useState(100)

  // Final angle: 8 full rotations + 0 for heads (front), +180 for tails (back)
  const finalRotation = 8 * 360 + (myGoesFirst ? 0 : 180)

  useEffect(() => {
    const flipTimer = setTimeout(() => setFlipping(true), COIN_FLIP_START_MS)
    const landTimer = setTimeout(() => setLanded(true), COIN_LAND_MS)
    const start = Date.now() + COIN_LAND_MS
    let rafId: number
    const tick = () => {
      const elapsed = Date.now() - start
      const remaining = Math.max(0, 100 - (elapsed / (INTRO_DISMISS_MS - COIN_LAND_MS)) * 100)
      setProgress(remaining)
      if (elapsed < INTRO_DISMISS_MS - COIN_LAND_MS) rafId = requestAnimationFrame(tick)
      else onDismiss()
    }
    const progressTimer = setTimeout(() => { rafId = requestAnimationFrame(tick) }, COIN_LAND_MS)
    return () => {
      clearTimeout(flipTimer)
      clearTimeout(landTimer)
      clearTimeout(progressTimer)
      cancelAnimationFrame(rafId)
    }
  }, [])

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-black/85 backdrop-blur-md"
      onClick={landed ? onDismiss : undefined}
    >
      <div className="flex flex-col items-center gap-5" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex flex-col items-center gap-1">
          <p className="text-stone-500 text-xs uppercase tracking-[0.3em] font-semibold">Coin Flip</p>
          <h2 className="text-2xl font-black text-amber-100 tracking-tight">Who goes first?</h2>
        </div>

        {/* Coin */}
        <div className="relative w-40 h-40" style={{ perspective: '700px' }}>
          {/* Glow under coin */}
          <div
            className="absolute inset-0 rounded-full blur-xl transition-opacity duration-700"
            style={{
              background: landed
                ? myGoesFirst ? 'radial-gradient(circle, #fbbf2480 0%, transparent 70%)' : 'radial-gradient(circle, #78716c40 0%, transparent 70%)'
                : 'radial-gradient(circle, #fbbf2440 0%, transparent 70%)',
              opacity: flipping ? 1 : 0.3,
            }}
          />
          <div
            className="w-full h-full"
            style={{
              transformStyle: 'preserve-3d',
              transform: flipping ? `rotateX(${finalRotation}deg)` : 'rotateX(0deg)',
              transition: flipping ? `transform ${COIN_FLIP_DURATION_MS}ms cubic-bezier(0.15, 0.6, 0.35, 1)` : 'none',
            }}
          >
            {/* Heads — Crown (front face) */}
            <div
              className="absolute inset-0 rounded-full border-[5px] border-amber-400 flex items-center justify-center"
              style={{
                backfaceVisibility: 'hidden',
                background: 'radial-gradient(circle at 35% 35%, #fcd34d, #d97706 60%, #92400e)',
                boxShadow: '0 0 0 2px #451a0380, inset 0 2px 8px #fef3c740, inset 0 -4px 8px #92400e80',
              }}
            >
              <Crown size={64} weight="fill" className="text-amber-900 drop-shadow-sm" />
            </div>

            {/* Tails — Sword (back face) */}
            <div
              className="absolute inset-0 rounded-full border-[5px] border-stone-500 flex items-center justify-center"
              style={{
                backfaceVisibility: 'hidden',
                transform: 'rotateX(180deg)',
                background: 'radial-gradient(circle at 35% 35%, #a8a29e, #57534e 60%, #292524)',
                boxShadow: '0 0 0 2px #1c191780, inset 0 2px 8px #d6d3d140, inset 0 -4px 8px #29252480',
              }}
            >
              <Sword size={56} weight="fill" className="text-stone-800 drop-shadow-sm" />
            </div>
          </div>
        </div>

        {/* Result */}
        <div
          className="flex flex-col items-center gap-1 transition-all duration-500"
          style={{ opacity: landed ? 1 : 0, transform: landed ? 'translateY(0)' : 'translateY(6px)' }}
        >
          <p className={`text-2xl font-black tracking-tight ${myGoesFirst ? 'text-amber-200' : 'text-stone-300'}`}>
            {myGoesFirst ? 'You go first!' : `${opponentName} goes first!`}
          </p>
          <p className="text-stone-500 text-xs uppercase tracking-widest">
            {myGoesFirst ? 'Heads' : 'Tails'}
          </p>
        </div>

        {/* Auto-dismiss progress bar */}
        <div
          className="flex flex-col items-center gap-1 transition-all duration-500"
          style={{ opacity: landed ? 1 : 0 }}
        >
          <div className="w-40 h-0.5 bg-stone-800 rounded-full overflow-hidden">
            <div className="h-full bg-amber-600/60 transition-none" style={{ width: `${progress}%` }} />
          </div>
          <p className="text-stone-600 text-xs">Click to begin</p>
        </div>
      </div>
    </div>
  )
}

function RoundEndOverlay({ summary, onDismiss }: { summary: RoundEndSummary; onDismiss: () => void }) {
  const [progress, setProgress] = useState(100)

  useEffect(() => {
    const start = Date.now()
    const raf = () => {
      const elapsed = Date.now() - start
      const remaining = Math.max(0, 100 - (elapsed / AUTO_DISMISS_MS) * 100)
      setProgress(remaining)
      if (elapsed < AUTO_DISMISS_MS) requestAnimationFrame(raf)
      else onDismiss()
    }
    const id = requestAnimationFrame(raf)
    return () => cancelAnimationFrame(id)
  }, [])

  const heading =
    summary.iWon === true ? 'Round Won!' :
    summary.iWon === false ? 'Round Lost' :
    'Tie Round'
  const headingColor =
    summary.iWon === true ? 'text-emerald-400' :
    summary.iWon === false ? 'text-red-400' :
    'text-amber-400'
  const bgAccent =
    summary.iWon === true ? 'from-emerald-900/60' :
    summary.iWon === false ? 'from-red-900/60' :
    'from-amber-900/60'
  const barColor =
    summary.iWon === true ? 'bg-emerald-400' :
    summary.iWon === false ? 'bg-red-400' :
    'bg-amber-400'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onDismiss}
    >
      <div
        className={`relative w-72 md:w-80 rounded-2xl border border-stone-700/80 bg-linear-to-b ${bgAccent} to-stone-950 shadow-2xl overflow-hidden`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Progress bar */}
        <div className="h-1 bg-stone-800 w-full">
          <div
            className={`h-full ${barColor} transition-none`}
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="p-6 flex flex-col items-center gap-5">
          {/* Round label */}
          <p className="text-stone-400 text-xs uppercase tracking-widest font-semibold">
            Round {summary.round} Complete
          </p>

          {/* Win/Loss heading */}
          <h2 className={`text-4xl font-black tracking-tight ${headingColor}`}>
            {heading}
          </h2>

          {/* Score breakdown */}
          <div className="w-full flex items-center justify-between gap-3">
            {/* Opponent */}
            <div className="flex-1 flex flex-col items-center gap-1">
              <p className="text-xs text-stone-400 truncate max-w-full">{summary.opponentDisplayName}</p>
              <p className={`text-3xl font-black tabular-nums ${summary.iWon === false ? 'text-red-400' : 'text-stone-400'}`}>
                {summary.opponentTotal}
              </p>
              <div className="flex gap-1">
                {Array.from({ length: 2 }).map((_, i) => (
                  <div key={i} className={`w-2.5 h-2.5 rounded-full ${i < summary.opponentRoundWins ? 'bg-red-400' : 'bg-stone-700'}`} />
                ))}
              </div>
            </div>

            {/* VS */}
            <div className="flex flex-col items-center gap-0.5">
              <span className="text-stone-600 text-sm font-bold">vs</span>
            </div>

            {/* Me */}
            <div className="flex-1 flex flex-col items-center gap-1">
              <p className="text-xs text-stone-400 truncate max-w-full">{summary.myDisplayName}</p>
              <p className={`text-3xl font-black tabular-nums ${summary.iWon === true ? 'text-emerald-400' : 'text-stone-400'}`}>
                {summary.myTotal}
              </p>
              <div className="flex gap-1">
                {Array.from({ length: 2 }).map((_, i) => (
                  <div key={i} className={`w-2.5 h-2.5 rounded-full ${i < summary.myRoundWins ? 'bg-emerald-400' : 'bg-stone-700'}`} />
                ))}
              </div>
            </div>
          </div>

          {/* Dismiss hint */}
          <p className="text-stone-600 text-xs">Click anywhere to continue</p>
        </div>
      </div>
    </div>
  )
}

// ─── Game Over Screen ────────────────────────────────────────────────────────

const RANK_STYLES: Record<string, { label: string; border: string; from: string; to: string }> = {
  Bronze:   { label: 'Bronze',   border: '#b45309', from: '#451a03', to: '#78350f' },
  Silver:   { label: 'Silver',   border: '#9ca3af', from: '#1f2937', to: '#374151' },
  Gold:     { label: 'Gold',     border: '#ca8a04', from: '#713f12', to: '#854d0e' },
  Platinum: { label: 'Platinum', border: '#06b6d4', from: '#083344', to: '#155e75' },
  Diamond:  { label: 'Diamond',  border: '#3b82f6', from: '#1e3a5f', to: '#1e40af' },
  Master:   { label: 'Master',   border: '#7c3aed', from: '#2e1065', to: '#4c1d95' },
}

function GameOverScreen({
  didWin,
  myState,
  opponentState,
  gameState,
  commendedBy,
  onReturn,
  onCommend,
}: {
  didWin: boolean
  myState: PlayerState
  opponentState: PlayerState
  gameState: GameState
  commendedBy: string | null
  onReturn: () => void
  onCommend: () => void
}) {
  const [revealed, setRevealed] = useState(false)
  const [rankAnimated, setRankAnimated] = useState(false)
  const [commendSent, setCommendSent] = useState(false)

  useEffect(() => {
    const t1 = setTimeout(() => setRevealed(true), 350)
    const t2 = setTimeout(() => setRankAnimated(true), 950)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [])

  const rpDelta = didWin ? 18 : -14
  const rank = myState.rank ?? 'Bronze'
  const rankStyle = RANK_STYLES[rank] ?? RANK_STYLES.Bronze
  const actionCount = gameState.log.filter(e => e.type === 'action').length
  // Base RP shown as 55 pre-game; clamp result to 0–100
  const rpBase = 55
  const rpAfter = Math.min(100, Math.max(0, rpBase + rpDelta))

  const accentColor  = didWin ? '#f59e0b' : '#ef4444'
  const accentGlow   = didWin ? 'rgba(245,158,11,0.22)' : 'rgba(239,68,68,0.18)'
  const accentShadow = didWin ? 'rgba(180,83,9,0.4)' : 'rgba(153,27,27,0.4)'
  const btnGradient  = didWin
    ? 'linear-gradient(135deg,#f59e0b 0%,#d97706 55%,#b45309 100%)'
    : 'linear-gradient(135deg,#dc2626 0%,#b91c1c 55%,#991b1b 100%)'

  const row = (opacity: number, delay: string) => ({
    opacity: revealed ? 1 : 0,
    transform: revealed ? 'translateY(0)' : 'translateY(14px)',
    transition: `opacity 0.55s ${delay}, transform 0.55s ${delay}`,
  })

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden"
      style={{
        background: didWin
          ? 'radial-gradient(ellipse at 50% 0%, #1c1000 0%, #0a0800 100%)'
          : 'radial-gradient(ellipse at 50% 0%, #1a0808 0%, #090606 100%)',
      }}
    >
      {/* Ambient top glow */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-125 h-52 pointer-events-none"
        style={{ background: `radial-gradient(ellipse, ${accentGlow} 0%, transparent 70%)` }}
      />

      {/* Commended banner */}
      {commendedBy && (
        <div
          className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2.5 px-5 py-2.5 rounded-2xl border whitespace-nowrap"
          style={{
            background: 'linear-gradient(135deg, #1e1b4b 0%, #2e1065 100%)',
            borderColor: '#7c3aed55',
            boxShadow: '0 4px 24px rgba(124,58,237,0.35)',
            animation: 'pack-card-enter 0.5s cubic-bezier(0.34,1.56,0.64,1) both',
          }}
        >
          <span className="text-lg">🙌</span>
          <span className="text-violet-200 text-sm font-semibold">
            <span className="text-violet-400">{commendedBy}</span> commended you!
          </span>
        </div>
      )}

      <div className="relative z-10 flex flex-col items-center gap-5 w-full max-w-sm px-5 py-10">

        {/* Result heading */}
        <div className="flex flex-col items-center gap-0.5" style={row(1, '0ms')}>
          <p className="text-stone-600 text-[0.6rem] uppercase tracking-[0.35em] font-semibold mb-1">
            Match Complete
          </p>
          <h1
            className="text-6xl font-black tracking-tight"
            style={{ color: accentColor, textShadow: `0 0 48px ${accentGlow}` }}
          >
            {didWin ? 'Victory' : 'Defeat'}
          </h1>
        </div>

        {/* Players vs row */}
        <div className="w-full flex items-center justify-between gap-3" style={row(1, '80ms')}>
          {/* Me */}
          <div className="flex flex-col items-center gap-1.5 flex-1">
            <div
              className="w-14 h-14 rounded-2xl border-2 flex items-center justify-center text-3xl"
              style={{
                borderColor: accentColor,
                background: `${accentColor}12`,
                boxShadow: `0 0 22px ${accentGlow}`,
              }}
            >
              {myState.avatarEmoji}
            </div>
            <p className="text-stone-200 font-bold text-sm truncate max-w-22.5 text-center leading-tight">
              {myState.displayName}
            </p>
            <div className="flex gap-1.5">
              {Array.from({ length: 2 }).map((_, i) => (
                <div
                  key={i}
                  className="w-3 h-3 rounded-full border-2"
                  style={{
                    background: i < myState.roundWins ? accentColor : 'transparent',
                    borderColor: i < myState.roundWins ? accentColor : '#44403c',
                  }}
                />
              ))}
            </div>
          </div>

          {/* Score */}
          <div className="flex flex-col items-center gap-0.5 shrink-0 px-2">
            <span className="text-stone-700 text-[0.6rem] font-bold uppercase tracking-widest">Rounds</span>
            <span className="text-stone-200 text-2xl font-black tabular-nums">
              {myState.roundWins} — {opponentState.roundWins}
            </span>
          </div>

          {/* Opponent */}
          <div className="flex flex-col items-center gap-1.5 flex-1">
            <div
              className="w-14 h-14 rounded-2xl border-2 border-stone-700 flex items-center justify-center text-3xl"
              style={{ background: 'rgba(68,64,60,0.12)' }}
            >
              {opponentState.avatarEmoji}
            </div>
            <p className="text-stone-500 font-semibold text-sm truncate max-w-22.5 text-center leading-tight">
              {opponentState.displayName}
            </p>
            <div className="flex gap-1.5">
              {Array.from({ length: 2 }).map((_, i) => (
                <div
                  key={i}
                  className="w-3 h-3 rounded-full border-2"
                  style={{
                    background: i < opponentState.roundWins ? '#78716c' : 'transparent',
                    borderColor: i < opponentState.roundWins ? '#78716c' : '#292524',
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Rank change card */}
        <div
          className="w-full rounded-2xl border overflow-hidden"
          style={{
            ...row(1, '160ms'),
            background: `linear-gradient(145deg, ${rankStyle.from}28 0%, #0f0e0c 100%)`,
            borderColor: `${rankStyle.border}45`,
          }}
        >
          <div
            className="px-4 py-2.5 flex items-center justify-between border-b"
            style={{ borderColor: `${rankStyle.border}22` }}
          >
            <div className="flex items-center gap-2">
              <span className="text-[0.7rem] font-black uppercase tracking-widest" style={{ color: rankStyle.border }}>
                {rankStyle.label}
              </span>
              <span className="text-stone-700 text-xs">Rank</span>
            </div>
            <span
              className="text-sm font-black"
              style={{ color: didWin ? '#4ade80' : '#f87171' }}
            >
              {didWin ? '+' : ''}{rpDelta} RP
            </span>
          </div>
          <div className="px-4 pb-3 pt-2.5 flex flex-col gap-2">
            <div className="flex justify-between text-[0.55rem] text-stone-700 uppercase tracking-widest">
              <span>0 RP</span>
              <span>Promotion at 100 RP</span>
            </div>
            <div className="relative w-full h-2 rounded-full bg-stone-900/80 overflow-hidden">
              {/* previous position marker */}
              <div
                className="absolute top-0 h-full rounded-full"
                style={{ width: `${rpBase}%`, background: `${rankStyle.border}30` }}
              />
              {/* animated fill */}
              <div
                className="absolute top-0 left-0 h-full rounded-full"
                style={{
                  width: rankAnimated ? `${rpAfter}%` : `${rpBase}%`,
                  transition: 'width 1.1s cubic-bezier(0.4, 0, 0.2, 1)',
                  background: `linear-gradient(to right, ${rankStyle.border}80, ${rankStyle.border})`,
                  boxShadow: `0 0 8px ${rankStyle.border}60`,
                }}
              />
              {/* change delta flash */}
              {rankAnimated && rpDelta > 0 && (
                <div
                  className="absolute top-0 h-full rounded-full"
                  style={{
                    left: `${rpBase}%`,
                    width: `${rpDelta}%`,
                    background: 'rgba(74,222,128,0.3)',
                    animation: 'reveal-flash 1.2s ease-out forwards',
                  }}
                />
              )}
            </div>
            <p className="text-center text-[0.6rem] text-stone-700">
              {didWin ? 'Win streak builds bonus RP' : 'Recover RP with your next win'}
            </p>
          </div>
        </div>

        {/* Stats row */}
        <div className="w-full grid grid-cols-3 gap-2" style={row(1, '250ms')}>
          {[
            { label: 'Rounds Won',  value: `${myState.roundWins} / ${gameState.round}` },
            { label: 'Actions',     value: String(actionCount) },
            { label: 'Turns',       value: String(gameState.turn) },
          ].map(stat => (
            <div
              key={stat.label}
              className="flex flex-col items-center gap-1 rounded-xl py-3 border"
              style={{ background: '#131110', borderColor: '#2a2520' }}
            >
              <span className="text-stone-100 font-black text-xl tabular-nums">{stat.value}</span>
              <span className="text-stone-600 text-[0.55rem] uppercase tracking-widest text-center">{stat.label}</span>
            </div>
          ))}
        </div>

        {/* Opponent's rank info line */}
        <p className="text-stone-700 text-xs" style={row(1, '320ms')}>
          Opponent rank: <span className="text-stone-500 font-semibold">{opponentState.rank ?? 'Unranked'}</span>
        </p>

        {/* CTA buttons */}
        <div className="w-full flex flex-col gap-2" style={row(1, '380ms')}>
          {/* Commend button */}
          <button
            onClick={() => { if (!commendSent) { setCommendSent(true); onCommend() } }}
            disabled={commendSent}
            className="w-full py-3 rounded-2xl font-semibold text-sm tracking-wide transition-all duration-150 relative overflow-hidden flex items-center justify-center gap-2"
            style={commendSent
              ? { background: '#1e1b4b', border: '1px solid #7c3aed55', color: '#7c3aed', cursor: 'default' }
              : { background: 'linear-gradient(135deg,#1e1b4b 0%,#2e1065 100%)', border: '1px solid #7c3aed66', color: '#c4b5fd', boxShadow: '0 2px 14px rgba(124,58,237,0.3)', cursor: 'pointer' }
            }
          >
            {!commendSent && <span className="absolute inset-0 bg-linear-to-b from-white/8 to-transparent pointer-events-none" />}
            <span className="text-base leading-none">{commendSent ? '✓' : '🙌'}</span>
            {commendSent
              ? `Commended ${opponentState.displayName} · +5 💎`
              : `Commend ${opponentState.displayName} · +5 💎`
            }
          </button>

          <button
            onClick={onReturn}
            className="w-full py-3.5 rounded-2xl font-bold text-stone-950 text-sm tracking-wide transition-all duration-150 hover:brightness-110 hover:scale-[1.02] active:scale-[0.98] relative overflow-hidden"
            style={{ background: btnGradient, boxShadow: `0 4px 22px ${accentShadow}, inset 0 1px 0 rgba(255,255,255,0.2)` }}
          >
            <span className="absolute inset-0 bg-linear-to-b from-white/15 to-transparent pointer-events-none" />
            Return to Lobby
          </button>
        </div>

      </div>
    </div>
  )
}

export default function GameRoom() {
  const navigate = useNavigate()
  const gameState = useGameStore((s) => s.gameState)
  const myHand = useGameStore((s) => s.myHand)
  const isGameOver = useGameStore((s) => s.isGameOver)
  const winnerId = useGameStore((s) => s.winnerId)
  const commendedBy = useGameStore((s) => s.commendedBy)
  const selectedCardId = useGameStore((s) => s.selectedCardId)
  const selectCard = useGameStore((s) => s.selectCard)
  const reset = useGameStore((s) => s.reset)
  const opponentDisconnected = useGameStore((s) => s.opponentDisconnected)
  const playerId = useAuthStore((s) => s.playerId)
  const displayName = useAuthStore((s) => s.displayName)
  const addGems = useCollectionStore((s) => s.addGems)
  const [roundEndSummary, setRoundEndSummary] = useState<RoundEndSummary | null>(null)
  const [showGameStart, setShowGameStart] = useState(false)
  const [showOptions, setShowOptions] = useState(false)
  const prevPhaseRef = useRef<string | null>(null)
  const gameStartShownRef = useRef(false)

  // Escape key opens options overlay
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowOptions(o => !o)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  if (!gameState) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0d0906' }}>
        <p className="text-stone-400">No active game. Redirecting…</p>
      </div>
    )
  }

  const myState = playerId
    ? gameState.players[playerId]
    : Object.values(gameState.players).find((p) => p.displayName === displayName)

  const opponentState = Object.values(gameState.players).find(
    (p) => p.id !== myState?.id
  )

  // A player can act when it's the planning phase, it's their turn, and they haven't passed
  const isMyTurn = myState ? gameState.activePlayerId === myState.id : false
  const hasSubmitted = !isMyTurn  // waiting = it's not your turn
  const canAct = gameState.phase === 'planning' && !myState?.hasPassed && isMyTurn

  // Total power across all lanes — computed early so effects can snapshot it
  const myTotal = gameState.lanes.reduce((sum, lane) => sum + (lane.halves[myState?.id ?? '']?.power ?? 0), 0)
  const opponentTotal = opponentState
    ? gameState.lanes.reduce((sum, lane) => sum + (lane.halves[opponentState.id]?.power ?? 0), 0)
    : 0
  const myAhead = myTotal > opponentTotal
  const opponentAhead = opponentTotal > myTotal

  const handleLaneClick = (laneIndex: 0 | 1, slotIndex: number) => {
    if (!selectedCardId) return
    getSocket().emit('game:place_card', { cardInstanceId: selectedCardId, laneIndex, slotIndex })
    selectCard(null)
  }

  const handleLaneDrop = (laneIndex: 0 | 1, slotIndex: number, cardInstanceId: string) => {
    if (!canAct) return
    getSocket().emit('game:place_card', { cardInstanceId, laneIndex, slotIndex })
    selectCard(null)
  }

  // Show game-start intro once on first load
  useEffect(() => {
    if (!gameStartShownRef.current && gameState && gameState.round === 1 && gameState.turn === 1 && gameState.phase === 'planning') {
      gameStartShownRef.current = true
      setShowGameStart(true)
    }
  }, [!!gameState])

  // Detect round_end phase transition and capture snapshot for overlay
  useEffect(() => {
    const prev = prevPhaseRef.current
    prevPhaseRef.current = gameState.phase
    if (gameState.phase === 'round_end' && prev !== 'round_end') {
      setRoundEndSummary({
        round: gameState.round,
        myTotal,
        opponentTotal,
        myDisplayName: myState?.displayName ?? 'You',
        opponentDisplayName: opponentState?.displayName ?? 'Opponent',
        myRoundWins: myState?.roundWins ?? 0,
        opponentRoundWins: opponentState?.roundWins ?? 0,
        iWon: myTotal > opponentTotal ? true : opponentTotal > myTotal ? false : null,
      })
    }
    if (gameState.phase === 'planning' && prev === 'round_end') {
      // Overlay auto-dismisses via its own timer; this is a fallback clear
      setRoundEndSummary(null)
      return
    }
  }, [gameState.phase])

  // Auto-pass the round when the player runs out of cards
  useEffect(() => {
    if (
      myHand.length === 0 &&
      gameState?.phase === 'planning' &&
      myState &&
      !myState.hasPassed
    ) {
      getSocket().emit('game:pass_round')
    }
  }, [myHand.length, gameState?.phase, myState?.hasPassed])

  const handlePassTurn = () => getSocket().emit('game:pass_turn')
  const handlePassRound = () => getSocket().emit('game:pass_round')
  const handleSurrender = () => getSocket().emit('game:surrender')

  if (isGameOver && gameState) {
    const didWin = winnerId === myState?.id
    const oppState = Object.values(gameState.players).find(p => p.id !== myState?.id)
    if (myState && oppState) {
      return (
        <GameOverScreen
          didWin={didWin}
          myState={myState}
          opponentState={oppState}
          gameState={gameState}
          commendedBy={commendedBy}
          onReturn={() => { reset(); navigate('/lobby') }}
          onCommend={() => {
            getSocket().emit('game:commend')
            addGems(5)
          }}
        />
      )
    }
  }

  const opponentPending = opponentState ? gameState.pendingPlays[opponentState.id] : null

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden" style={{ background: '#0d0906' }}>

      {/* ─── Main content: col on mobile, three-column row on desktop ─── */}
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden">

        {/* ══ DESKTOP LEFT PANEL: player stats ══ */}
        <aside
          className="hidden lg:flex flex-col w-56 xl:w-64 shrink-0 border-r border-stone-800/60 overflow-y-auto"
          style={{ background: 'rgba(13,9,6,0.97)' }}
        >
          <div className="flex flex-col gap-4 p-4 h-full">

            {/* Round tracker + options */}
            <div className="flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className={`w-2 h-2 rounded-full transition-colors ${i < gameState.round ? 'bg-amber-500' : 'bg-stone-800'}`} />
                  ))}
                </div>
                <span className="text-stone-600 text-[10px] font-bold uppercase tracking-widest">
                  R{gameState.round} · T{gameState.turn}
                </span>
              </div>
              <button
                onClick={() => setShowOptions(true)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-stone-500 hover:text-stone-300 hover:bg-stone-800/50 transition-colors"
                title="Options (Esc)"
              >
                <span className="text-sm leading-none">☰</span>
              </button>
            </div>

            {/* ── Opponent section ── */}
            <div className="flex flex-col gap-3 pb-5 border-b border-stone-800/60 shrink-0">
              <p className="text-[10px] font-bold uppercase tracking-widest text-stone-700">Opponent</p>
              {opponentState ? (
                <>
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-stone-800 border border-stone-700/60 flex items-center justify-center text-xl shrink-0 select-none">
                      {opponentState.avatarEmoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-stone-200 text-sm font-semibold truncate leading-tight">{opponentState.displayName}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-stone-600 text-[10px] uppercase tracking-wider">{opponentState.rank}</span>
                        {!opponentState.isConnected && <span className="text-red-600 text-[9px]">● offline</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      {Array.from({ length: 2 }).map((_, i) => (
                        <div key={i} className={`w-4 h-4 rounded-full border-2 transition-colors ${i < opponentState.roundWins ? 'bg-red-400 border-red-500' : 'border-stone-700'}`} />
                      ))}
                      <span className="text-stone-700 text-[9px] ml-0.5 uppercase tracking-widest">wins</span>
                    </div>
                    <span className={`text-3xl font-black tabular-nums leading-none ${opponentAhead ? 'text-red-400' : 'text-stone-600'}`}>{opponentTotal}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col items-center gap-0.5 bg-stone-900/80 rounded-lg py-2 border border-stone-800/60">
                      <span className="text-stone-200 text-sm font-bold tabular-nums">{opponentState.deckCount}</span>
                      <span className="text-stone-600 text-[9px] uppercase tracking-widest">Deck</span>
                    </div>
                    <div className="flex flex-col items-center gap-0.5 bg-stone-900/80 rounded-lg py-2 border border-stone-800/60">
                      <span className="text-stone-200 text-sm font-bold tabular-nums">{opponentState.handCount}</span>
                      <span className="text-stone-600 text-[9px] uppercase tracking-widest">Hand</span>
                    </div>
                  </div>
                  <div className="h-4 flex items-center">
                    {opponentState.hasPassed && <span className="text-stone-500 text-[10px] italic">passed this round</span>}
                    {!opponentState.hasPassed && opponentPending !== null && (
                      <span className="text-amber-400 text-[10px] animate-pulse flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse inline-block" />playing…
                      </span>
                    )}
                    {!opponentState.hasPassed && opponentPending === null && (
                      <span className="text-stone-700 text-[10px]">thinking…</span>
                    )}
                  </div>
                </>
              ) : (
                <p className="text-stone-700 text-sm">Waiting for opponent…</p>
              )}
            </div>

            {/* ── VS score strip ── */}
            <div className="flex flex-col items-center gap-1.5 py-1 shrink-0">
              <div className="flex items-baseline gap-4">
                <span className={`text-2xl font-black tabular-nums leading-none ${opponentAhead ? 'text-red-400' : 'text-stone-700'}`}>{opponentTotal}</span>
                <div className="flex flex-col items-center gap-0.5">
                  <span className="text-stone-700 font-bold text-[10px] uppercase tracking-widest">vs</span>
                  {gameState.phase === 'planning' && (
                    <span className={`text-[9px] font-bold uppercase tracking-wide ${gameState.activePlayerId === myState?.id ? 'text-emerald-500' : 'text-red-500'}`}>
                      {gameState.activePlayerId === myState?.id ? 'your turn' : 'their turn'}
                    </span>
                  )}
                  {gameState.phase === 'round_end' && <span className="text-[9px] font-bold uppercase text-amber-500">round end</span>}
                </div>
                <span className={`text-2xl font-black tabular-nums leading-none ${myAhead ? 'text-emerald-400' : 'text-stone-700'}`}>{myTotal}</span>
              </div>
              <div className="w-full flex rounded-full overflow-hidden h-1 bg-stone-800">
                {(myTotal + opponentTotal) > 0 && (
                  <div
                    className="h-full transition-all duration-500 bg-emerald-600"
                    style={{ width: `${Math.round((myTotal / (myTotal + opponentTotal)) * 100)}%` }}
                  />
                )}
              </div>
            </div>

            {/* ── My section ── */}
            {myState && (
              <div className="flex flex-col gap-3 pt-5 border-t border-stone-800/60 shrink-0">
                <p className="text-[10px] font-bold uppercase tracking-widest text-stone-700">You</p>
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-stone-800 border border-stone-700/60 flex items-center justify-center text-xl shrink-0 select-none">
                    {myState.avatarEmoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-stone-200 text-sm font-semibold truncate leading-tight">{myState.displayName}</p>
                    <p className="text-stone-600 text-[10px] uppercase tracking-wider">{myState.rank}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    {Array.from({ length: 2 }).map((_, i) => (
                      <div key={i} className={`w-4 h-4 rounded-full border-2 transition-colors ${i < myState.roundWins ? 'bg-emerald-400 border-emerald-500' : 'border-stone-700'}`} />
                    ))}
                    <span className="text-stone-700 text-[9px] ml-0.5 uppercase tracking-widest">wins</span>
                  </div>
                  <span className={`text-3xl font-black tabular-nums leading-none ${myAhead ? 'text-emerald-400' : 'text-stone-600'}`}>{myTotal}</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col items-center gap-0.5 bg-stone-900/80 rounded-lg py-2 border border-stone-800/60">
                    <span className="text-stone-200 text-sm font-bold tabular-nums">{myState.deckCount}</span>
                    <span className="text-stone-600 text-[9px] uppercase tracking-widest">Deck</span>
                  </div>
                  <div className="flex flex-col items-center gap-0.5 bg-stone-900/80 rounded-lg py-2 border border-stone-800/60">
                    <span className="text-stone-200 text-sm font-bold tabular-nums">{myHand.length}</span>
                    <span className="text-stone-600 text-[9px] uppercase tracking-widest">Hand</span>
                  </div>
                </div>
                <div className="h-4 flex items-center">
                  {myState.hasPassed && <span className="text-stone-500 text-[10px] italic">passed this round</span>}
                  {canAct && !myState.hasPassed && (
                    <span className="text-emerald-500 text-[10px] font-semibold flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />Your move
                    </span>
                  )}
                  {hasSubmitted && !myState.hasPassed && <span className="text-amber-400 text-[10px] animate-pulse">waiting…</span>}
                </div>
              </div>
            )}

          </div>
        </aside>

        {/* ══ CENTER: board + hand + action bar ══ */}
        <div className="flex-1 min-w-0 min-h-0 flex flex-col">
          {/* Board */}
          <div className="flex-1 min-h-0 flex items-center justify-center overflow-hidden p-2 lg:pt-4 lg:pb-2 pt-9 sm:pt-10">
            <div className="w-full h-full overflow-hidden">
              <GameBoard
                gameState={gameState}
                myPlayerId={myState?.id ?? ''}
                selectedCardId={selectedCardId}
                onLaneClick={handleLaneClick}
                onLaneDrop={handleLaneDrop}
              />
            </div>
          </div>

          {/* Hand + controls */}
          {myState && (
            <div className="shrink-0 flex flex-col items-center gap-1 pb-3 pt-1">
              <PlayerHand
                cards={myHand}
                canAct={canAct}
                onSelectCard={selectCard}
              />
              <div className="flex items-center w-full px-3">
                {/* My info — visible on mobile only */}
                <div className="flex items-center gap-2 flex-1 min-w-0 lg:invisible">
                  <div className="w-6 h-6 rounded-full bg-stone-800/70 border border-stone-600/40 flex items-center justify-center text-xs select-none shrink-0">
                    {myState.avatarEmoji}
                  </div>
                  <p className="text-stone-300/80 text-xs font-semibold flex items-center gap-1.5 truncate">
                    <span className="truncate">{myState.displayName}</span>
                    {myState.hasPassed && <span className="text-xs text-stone-500 italic shrink-0">passed</span>}
                    {hasSubmitted && !myState.hasPassed && <span className="text-xs text-amber-400 animate-pulse shrink-0">waiting…</span>}
                  </p>
                </div>
                <ActionBar
                  phase={gameState.phase}
                  hasPassed={myState.hasPassed}
                  hasSubmitted={hasSubmitted}
                  onPassTurn={handlePassTurn}
                  onPassRound={handlePassRound}
                />
                <div className="flex-1" />
              </div>
            </div>
          )}
        </div>

        {/* ══ DESKTOP RIGHT PANEL: game log ══ */}
        <aside
          className="hidden lg:flex flex-col w-64 xl:w-72 shrink-0 border-l border-stone-800/60 overflow-hidden"
          style={{ background: 'rgba(13,9,6,0.97)' }}
        >
          <div className="px-4 pt-4 pb-3 border-b border-stone-800/60 shrink-0 flex items-center justify-between">
            <p className="text-[10px] font-bold uppercase tracking-widest text-stone-600">Match Log</p>
            <span className="text-stone-800 text-[10px] tabular-nums">{gameState.log.length}</span>
          </div>
          <div className="flex-1 min-h-0 p-3">
            <GameLog entries={gameState.log} />
          </div>
        </aside>

      </div>

      {/* ─── Mobile: top HUD overlay (hidden on lg+) ─── */}
      <div
        className="lg:hidden fixed top-0 inset-x-0 z-30 flex items-start gap-3 px-3 pt-2 pb-6 pointer-events-none"
        style={{ background: 'linear-gradient(to bottom, rgba(13,9,6,0.88) 0%, rgba(13,9,6,0.50) 65%, transparent 100%)' }}
      >
        <div className="flex items-center gap-3 w-full pointer-events-auto">
          {/* Opponent info — left */}
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {opponentState ? (
              <>
                <div className="w-7 h-7 rounded-full bg-stone-800/70 border border-stone-600/40 flex items-center justify-center text-sm select-none shrink-0">
                  {opponentState.avatarEmoji}
                </div>
                <p className="text-stone-200/90 text-xs font-semibold leading-tight flex items-center gap-1.5 truncate">
                  <span className="text-red-600/60 shrink-0">⚔</span>
                  <span className="truncate">{opponentState.displayName}</span>
                  {opponentState.hasPassed && <span className="text-xs text-stone-500 italic shrink-0">passed</span>}
                  {opponentPending !== null && !opponentState.hasPassed && <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0" />}
                </p>
              </>
            ) : (
              <span className="text-stone-700 text-xs">Waiting for opponent…</span>
            )}
          </div>
          {/* Score — centre */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex flex-col items-center gap-px">
              <div className="flex gap-1">
                {Array.from({ length: 2 }).map((_, i) => (
                  <div key={i} className={`w-2 h-2 rounded-full ${i < (opponentState?.roundWins ?? 0) ? 'bg-red-400' : 'bg-stone-700/60'}`} />
                ))}
              </div>
              <span className={`text-2xl font-black tabular-nums leading-none ${opponentAhead ? 'text-red-400' : 'text-stone-500/80'}`}>{opponentTotal}</span>
            </div>
            <div className="flex flex-col items-center gap-px w-10">
              <span className="text-xs font-bold text-stone-500 uppercase tracking-widest">vs</span>
              {gameState.phase === 'planning' && (
                <span className={`text-xs font-semibold uppercase ${gameState.activePlayerId === myState?.id ? 'text-emerald-500' : 'text-red-500'}`}>
                  {gameState.activePlayerId === myState?.id ? 'yours' : 'theirs'}
                </span>
              )}
              {gameState.phase === 'round_end' && <span className="text-xs font-semibold uppercase text-amber-500">end</span>}
            </div>
            <div className="flex flex-col items-center gap-px">
              <span className={`text-2xl font-black tabular-nums leading-none ${myAhead ? 'text-emerald-400' : 'text-stone-500/80'}`}>{myTotal}</span>
              <div className="flex gap-1">
                {Array.from({ length: 2 }).map((_, i) => (
                  <div key={i} className={`w-2 h-2 rounded-full ${i < (myState?.roundWins ?? 0) ? 'bg-emerald-400' : 'bg-stone-700/60'}`} />
                ))}
              </div>
            </div>
          </div>
          {/* Right: R/T + options */}
          <div className="flex-1 flex items-center justify-end gap-2">
            <span className="text-stone-600/70 text-[10px] tabular-nums">R{gameState.round}·T{gameState.turn}</span>
            <button
              onClick={() => setShowOptions(true)}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-stone-500 hover:text-stone-300 hover:bg-stone-800/50 transition-colors"
              title="Options (Esc)"
            >
              <span className="text-sm leading-none">☰</span>
            </button>
          </div>
        </div>
      </div>

      {/* Opponent disconnected banner */}
      {opponentDisconnected && !isGameOver && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl bg-amber-900/90 border border-amber-600/60 text-amber-200 text-sm font-semibold shadow-xl backdrop-blur-sm flex items-center gap-2 pointer-events-none">
          <span className="text-amber-400">⚡</span>
          Opponent disconnected — awaiting resolution…
        </div>
      )}

      {/* Options overlay (Escape) */}
      {showOptions && (
        <GameOptionsOverlay
          onClose={() => setShowOptions(false)}
          onSurrender={handleSurrender}
        />
      )}

      {/* Game-start overlay */}
      {showGameStart && myState && opponentState && (
        <GameStartOverlay
          myName={myState.displayName}
          opponentName={opponentState.displayName}
          myGoesFirst={gameState.activePlayerId === myState.id}
          onDismiss={() => setShowGameStart(false)}
        />
      )}

      {/* Round-end overlay */}
      {roundEndSummary && (
        <RoundEndOverlay
          summary={roundEndSummary}
          onDismiss={() => setRoundEndSummary(null)}
        />
      )}

      {/* Selected card hint */}
      {selectedCardId && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-amber-500 text-stone-950 text-sm font-semibold shadow-lg pointer-events-none">
          Click a slot — or drag a card directly
        </div>
      )}
    </div>
  )
}
