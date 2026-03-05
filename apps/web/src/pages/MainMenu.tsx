import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Sword,
  User,
  Trophy,
  CardsThree,
  Star,
  Sparkle,
  Globe,
  HouseLine,
  CheckCircle,
  Circle,
  X,
  ChartBar,
  ShieldCheckered,
  ArrowsClockwise,
  WifiHigh,
  WifiSlash,
  DiamondsFour,
} from '@phosphor-icons/react'
import { cn } from '../lib/cn.ts'
import { useAuthStore } from '../stores/useAuthStore.ts'
import { useCollectionStore } from '../stores/useCollectionStore.ts'
import { useQuestStore, DAILY_QUESTS } from '../stores/useQuestStore.ts'
import { connectSocket } from '../lib/socket.ts'
import Button from '../components/ui/Button.tsx'
import { CARD_DATABASE } from '@tcg/shared'

// Full-art wide images used as menu background
const FULL_ART_BG = [
  './cards/full/archmage.jpeg',
  './cards/full/frost-elder.jpeg',
  './cards/full/death-reaper.jpeg',
  './cards/full/rift-herald.jpeg',
]

// ─── Main component ───────────────────────────────────────────────────────────

const AVATARS = ['🧙','🧙‍♀️','🧝','🧝‍♀️','🐉','🦩','🐺','🦅','⚔️','🏹','🛡️','🔮','🌙','☀️','🔥','❄️']

const PATCH_NOTES = [
  {
    version: 'v0.4.0',
    date: 'Feb 25 2026',
    tag: 'NEW',
    tagColor: 'bg-emerald-600 text-emerald-100',
    changes: [
      'Added 30+ cards across 6 factions',
      'Keywords now have real engine effects (Resilient, Challenger, Overwhelm, Elusive)',
      'Spell effects: draw, power boost, power drain',
      'Pokémon Pocket–style rarity frames with animated glow',
      'Holographic sheen on Rare/Legendary cards',
    ],
  },
  {
    version: 'v0.3.2',
    date: 'Feb 18 2026',
    tag: 'FIX',
    tagColor: 'bg-amber-700 text-amber-100',
    changes: [
      'Fixed card placement slot validation',
      'Resolved round timer sync between clients',
      'Lobby room list now updates in real-time',
    ],
  },
  {
    version: 'v0.3.0',
    date: 'Feb 10 2026',
    tag: 'UPDATE',
    tagColor: 'bg-blue-700 text-blue-100',
    changes: [
      'Deck Builder with full card browser',
      'Card Viewer with keyword explanations',
      'Improved game log readability',
    ],
  },
]

const RANK_TIERS = ['Bronze','Silver','Gold','Platinum','Diamond','Master']

// ─── Sub-components ───────────────────────────────────────────────────────────

function XpBar({ pct }: { pct: number }) {
  return (
    <div className="w-full h-1.5 rounded-full bg-stone-800 overflow-hidden">
      <div
        className="h-full rounded-full bg-linear-to-r from-amber-500 to-amber-300 transition-all duration-500"
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

function MissionRow({ questId, label, gemReward, done }: { questId: string; label: string; gemReward: number; done: boolean }) {
  return (
    <div className={cn('flex items-center gap-2 py-1.5 px-2 rounded-lg', done ? 'bg-emerald-950/40' : 'bg-stone-900/40')}>
      {done
        ? <CheckCircle size={16} className="text-emerald-400 shrink-0" weight="duotone" />
        : <Circle size={16} className="text-stone-600 shrink-0" weight="duotone" />
      }
      <span className={cn('flex-1 text-xs leading-tight', done ? 'text-stone-500 line-through' : 'text-stone-300')}>
        {label}
      </span>
      <span className={cn('text-[0.6rem] font-semibold shrink-0', done ? 'text-emerald-500' : 'text-violet-400')}>
        {done ? '✓ Done' : `+${gemReward} 💎`}
      </span>
    </div>
  )
}

// ─── Shared bottom-sheet wrapper ────────────────────────────────────────────────

function BottomSheet({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-lg bg-stone-950 border border-stone-700/60 rounded-t-2xl shadow-2xl overflow-hidden max-h-[80vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  )
}

// ─── Quests sheet ─────────────────────────────────────────────────────────────

function QuestsSheet({
  onClose,
  questsDoneToday,
  allQuestsDone,
  isCompletedToday,
  onViewAll,
}: {
  onClose: () => void
  questsDoneToday: number
  allQuestsDone: boolean
  isCompletedToday: (id: string) => boolean
  onViewAll: () => void
}) {
  return (
    <BottomSheet onClose={onClose}>
      <div className="px-5 py-4 border-b border-stone-800 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <ArrowsClockwise size={14} className="text-violet-500" weight="duotone" />
          <h3 className="text-sm font-semibold text-stone-200">Daily Quests</h3>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={onViewAll} className="text-xs text-violet-400 hover:text-violet-300 transition-colors">View all</button>
          <button onClick={onClose}><X size={18} className="text-stone-500 hover:text-stone-300" weight="bold" /></button>
        </div>
      </div>
      <div className="overflow-y-auto p-4 flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          {DAILY_QUESTS.map(q => (
            <MissionRow key={q.id} questId={q.id} label={q.label} gemReward={q.gemReward} done={isCompletedToday(q.id)} />
          ))}
        </div>
        <div className="flex items-center justify-between pt-1 border-t border-stone-800/60">
          <span className="text-stone-600 text-xs">{questsDoneToday} / {DAILY_QUESTS.length} completed today</span>
          <span className={cn('font-semibold text-xs', allQuestsDone ? 'text-emerald-400' : 'text-violet-400')}>
            {allQuestsDone ? '✓ All done!' : '💎 up to +70 today'}
          </span>
        </div>
      </div>
    </BottomSheet>
  )
}

// ─── Patch notes sheet ────────────────────────────────────────────────────────

function PatchNotesSheet({ onClose }: { onClose: () => void }) {
  return (
    <BottomSheet onClose={onClose}>
      <div className="px-5 py-4 border-b border-stone-800 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Star size={14} className="text-amber-500" weight="duotone" />
          <h3 className="text-sm font-semibold text-stone-200">Patch Notes</h3>
        </div>
        <button onClick={onClose}><X size={18} className="text-stone-500 hover:text-stone-300" weight="bold" /></button>
      </div>
      <div className="overflow-y-auto flex flex-col divide-y divide-stone-900/60">
        {PATCH_NOTES.map(patch => (
          <div key={patch.version} className="px-5 py-4 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-bold text-stone-200 text-sm">{patch.version}</span>
                <span className={cn('text-[0.55rem] font-bold px-1.5 py-px rounded-full uppercase tracking-wide', patch.tagColor)}>
                  {patch.tag}
                </span>
              </div>
              <span className="text-stone-600 text-[0.65rem]">{patch.date}</span>
            </div>
            <ul className="flex flex-col gap-1">
              {patch.changes.map((c, i) => (
                <li key={i} className="flex items-start gap-1.5 text-xs text-stone-400">
                  <span className="text-stone-700 mt-0.5 shrink-0">•</span>
                  <span className="leading-snug">{c}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
        <div className="px-5 py-4">
          <p className="text-[0.6rem] font-semibold uppercase tracking-wide text-stone-600 mb-2">Coming Soon</p>
          <ul className="flex flex-col gap-1.5">
            {['Singleplayer campaign','Ranked mode','More card factions','Pack opening'].map(item => (
              <li key={item} className="flex items-center gap-1.5 text-xs text-stone-600">
                <span className="w-1 h-1 rounded-full bg-stone-700 shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </BottomSheet>
  )
}

// ─── Profile modal ─────────────────────────────────────────────────────────────

function ProfileModal({
  onClose,
  displayName,
  avatarEmoji,
  onSaveName,
  onSaveAvatar,
}: {
  onClose: () => void
  displayName: string
  avatarEmoji: string
  onSaveName: (n: string) => void
  onSaveAvatar: (a: string) => void
}) {
  const [editName, setEditName] = useState(displayName)
  const [editAvatar, setEditAvatar] = useState(avatarEmoji)
  const [tab, setTab] = useState<'stats'|'collection'|'settings'>('stats')

  const ownedCount = CARD_DATABASE.length
  const legendaryCount = CARD_DATABASE.filter(c => c.rarity === 'legendary').length
  const rareCount = CARD_DATABASE.filter(c => c.rarity === 'rare').length

  const handleSave = () => {
    if (editName.trim()) onSaveName(editName.trim())
    onSaveAvatar(editAvatar)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-lg bg-stone-950 border border-stone-700/60 sm:rounded-2xl rounded-t-2xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="relative px-6 pt-6 pb-4 bg-linear-to-br from-stone-900 to-stone-950 border-b border-stone-800">
          <button onClick={onClose} className="absolute top-4 right-4 text-stone-500 hover:text-stone-300 transition-colors">
            <X size={20} weight="bold" />
          </button>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-stone-800 border-2 border-amber-500/40 flex items-center justify-center text-4xl shadow-lg shadow-amber-900/20">
              {editAvatar}
            </div>
            <div>
              <h2 className="text-xl font-bold text-amber-100">{displayName}</h2>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-900/60 text-amber-300 border border-amber-700/40">
                  {RANK_TIERS[2]} IV
                </span>
                <span className="text-stone-500 text-xs">Level 12</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-stone-800">
          {(['stats','collection','settings'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                'flex-1 py-2.5 text-sm font-medium transition-colors capitalize',
                tab === t ? 'text-amber-400 border-b-2 border-amber-400' : 'text-stone-500 hover:text-stone-300'
              )}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="p-6">
          {tab === 'stats' && (
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Games',    value: '47',   icon: <Sword size={18} className="text-amber-400" weight="duotone" /> },
                  { label: 'Wins',     value: '29',   icon: <Trophy size={18} className="text-amber-400" weight="duotone" /> },
                  { label: 'Win %',    value: '61%',  icon: <ChartBar size={18} className="text-emerald-400" weight="duotone" /> },
                  { label: 'Rank',     value: 'Gold', icon: <ShieldCheckered size={18} className="text-amber-400" weight="duotone" /> },
                  { label: 'Streak',   value: '3W',   icon: <Star size={18} className="text-amber-400" weight="duotone" /> },
                  { label: 'Top fac.', value: 'Forge',icon: <Sparkle size={18} className="text-orange-400" weight="duotone" /> },
                ].map(s => (
                  <div key={s.label} className="bg-stone-900/60 border border-stone-800 rounded-xl p-3 flex flex-col items-center gap-1 text-center">
                    {s.icon}
                    <p className="text-stone-100 font-bold text-lg leading-none">{s.value}</p>
                    <p className="text-stone-500 text-[0.6rem] uppercase tracking-wide">{s.label}</p>
                  </div>
                ))}
              </div>
              <div className="bg-stone-900/40 rounded-xl border border-stone-800 p-3">
                <p className="text-stone-400 text-xs mb-1.5">Level 12 — 3,240 / 4,000 XP</p>
                <XpBar pct={81} />
              </div>
            </div>
          )}

          {tab === 'collection' && (
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Cards owned', value: `${ownedCount}`, sub: `of ${ownedCount}`, color: 'text-stone-100' },
                  { label: 'Completion',  value: '100%', sub: 'all sets', color: 'text-emerald-400' },
                  { label: 'Legendaries', value: String(legendaryCount), sub: 'owned', color: 'text-amber-300' },
                  { label: 'Rares',       value: String(rareCount), sub: 'owned', color: 'text-blue-300' },
                ].map(s => (
                  <div key={s.label} className="bg-stone-900/60 border border-stone-800 rounded-xl p-3">
                    <p className={cn('font-bold text-2xl leading-none', s.color)}>{s.value}</p>
                    <p className="text-stone-400 text-xs mt-0.5">{s.label}</p>
                    <p className="text-stone-600 text-[0.6rem]">{s.sub}</p>
                  </div>
                ))}
              </div>
              <div className="bg-stone-900/40 rounded-xl border border-stone-800 p-3 flex items-center justify-between">
                <div>
                  <p className="text-stone-300 text-sm font-medium">Pack Tokens</p>
                  <p className="text-stone-500 text-xs">Open packs to expand your collection</p>
                </div>
                <span className="text-amber-300 font-bold text-xl">3 🎴</span>
              </div>
            </div>
          )}

          {tab === 'settings' && (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-stone-400 uppercase tracking-wide">Display name</label>
                <input
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  maxLength={20}
                  className="px-3 py-2 rounded-lg bg-stone-900 border border-stone-700 text-stone-100 text-sm focus:outline-none focus:border-amber-500"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-xs text-stone-400 uppercase tracking-wide">Avatar</label>
                <div className="grid grid-cols-6 sm:grid-cols-8 gap-1.5">
                  {AVATARS.map(emoji => (
                    <button
                      key={emoji}
                      onClick={() => setEditAvatar(emoji)}
                      className={cn(
                        'aspect-square rounded-lg text-xl flex items-center justify-center transition-all',
                        editAvatar === emoji
                          ? 'bg-amber-500/20 border-2 border-amber-400 scale-110'
                          : 'bg-stone-900 border border-stone-800 hover:border-stone-600'
                      )}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
              <Button variant="primary" onClick={handleSave}>Save changes</Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function MainMenu() {
  const navigate = useNavigate()
  const { displayName, setDisplayName, avatarEmoji, setAvatarEmoji, isConnected, setConnected } = useAuthStore()
  const shards = useCollectionStore(s => s.shards)
  const tokens = useCollectionStore(s => s.tokens)
  const gems = useCollectionStore(s => s.gems)
  const devCheat = useCollectionStore(s => s.devCheat)
  const isCompletedToday = useQuestStore(s => s.isCompletedToday)
  const completedTodayCount = useQuestStore(s => s.completedTodayCount)
  const [showProfile, setShowProfile] = useState(false)
  const [showQuests, setShowQuests] = useState(false)
  const [showPatchNotes, setShowPatchNotes] = useState(false)
  const [nameError, setNameError] = useState('')
  const [pendingMode, setPendingMode] = useState<'singleplayer'|null>(null)
  const [bgIndex, setBgIndex] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setBgIndex(i => (i + 1) % FULL_ART_BG.length), 5000)
    return () => clearInterval(id)
  }, [])

  const questsDoneToday = completedTodayCount()
  const allQuestsDone = questsDoneToday === DAILY_QUESTS.length

  const handleMultiplayer = () => {
    if (!displayName.trim()) { setNameError('Set a display name in your profile first.'); return }
    connectSocket()
    setConnected(true)
    navigate('/lobby')
  }

  return (
    <div
      className="relative min-h-screen flex flex-col overflow-hidden"
      style={{ background: 'radial-gradient(ellipse at 50% 30%, #1e1408 0%, #0d0906 60%, #060404 100%)' }}
    >
      {/* ── Full-art background cycling ── */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden>
        {FULL_ART_BG.map((src, i) => (
          <img
            key={src}
            src={src}
            className="absolute inset-0 w-full h-full object-cover scale-110"
            style={{
              opacity: i === bgIndex ? 0.1 : 0,
              filter: 'blur(2px)',
              transition: 'opacity 1.5s ease-in-out',
            }}
            draggable={false}
          />
        ))}
      </div>

      {/* Top bar */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-stone-900/60">
        {/* Left: logo (desktop) / avatar (mobile) */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowProfile(true)}
            className="lg:hidden w-8 h-8 rounded-lg bg-stone-800 border border-amber-600/30 flex items-center justify-center text-xl"
          >
            {avatarEmoji}
          </button>
          <Sword size={16} className="hidden lg:block text-amber-500/60" weight="duotone" />
          <span className="hidden lg:block text-xs font-semibold tracking-widest uppercase text-stone-600">Aetherblade</span>
          <span className="lg:hidden text-xs font-semibold text-stone-500 truncate max-w-25">{displayName || 'Anonymous'}</span>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 text-xs">
          <button
            onClick={() => navigate('/collection')}
            className="flex items-center gap-1.5 bg-stone-900/60 hover:bg-stone-900 border border-stone-800 hover:border-violet-700/50 rounded-full px-2.5 py-1 transition-colors"
          >
            <DiamondsFour size={12} weight="duotone" className="text-violet-400" />
            <span className="text-stone-300 font-semibold tabular-nums">{shards.toLocaleString()}</span>
            <span className="hidden sm:inline text-stone-600">shards</span>
          </button>
          <button
            onClick={() => navigate('/quests')}
            className="relative flex items-center gap-1.5 bg-stone-900/60 hover:bg-stone-900 border border-stone-800 hover:border-violet-700/50 rounded-full px-2.5 py-1 transition-colors"
          >
            <span className="text-sm leading-none">💎</span>
            <span className="text-violet-300 font-semibold tabular-nums">{gems}</span>
            <span className="hidden sm:inline text-stone-600">gems</span>
            {!allQuestsDone && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-violet-500 border border-stone-950" />
            )}
          </button>
          <div className="flex items-center gap-1">
            {isConnected
              ? <><WifiHigh size={14} className="text-emerald-500" weight="duotone" /><span className="hidden sm:inline text-emerald-600">Online</span></>
              : <><WifiSlash size={14} className="text-stone-600" weight="duotone" /><span className="hidden sm:inline text-stone-600">Offline</span></>
            }
          </div>
          <button
            onClick={devCheat}
            className="flex items-center gap-1 bg-rose-950/60 hover:bg-rose-900/60 border border-rose-800/60 rounded-full px-2 py-1 text-rose-400 hover:text-rose-300 transition-colors"
            title="DEV: max out all currency &amp; cards"
          >
            <span className="text-[0.6rem] font-bold uppercase tracking-wider">DEV</span>
          </button>
        </div>
      </div>

      {/* Responsive layout: single-col on mobile, 3-col on desktop */}
      <div className="flex-1 flex flex-col lg:grid lg:grid-cols-[280px_1fr_280px] overflow-y-auto lg:overflow-hidden lg:max-h-[calc(100vh-49px)]">        {/* ── Left: Profile + Daily Missions (desktop only) ── */}
        <div className="hidden lg:flex flex-col gap-4 p-5 border-r border-stone-900/60 overflow-y-auto">

          {/* Profile card */}
          <button
            onClick={() => setShowProfile(true)}
            className="group w-full bg-stone-900/50 hover:bg-stone-900 border border-stone-800 hover:border-amber-700/40 rounded-2xl p-4 flex flex-col gap-3 text-left transition-all duration-200"
          >
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-xl bg-stone-800 border-2 border-amber-600/30 group-hover:border-amber-500/60 flex items-center justify-center text-3xl shadow-lg shadow-black/40 transition-colors">
                {avatarEmoji}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-stone-100 leading-tight truncate">{displayName || 'Anonymous'}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[0.6rem] px-1.5 py-px rounded-full bg-amber-900/50 text-amber-400 border border-amber-800/40">Gold IV</span>
                  <span className="text-stone-600 text-xs">Lv.12</span>
                </div>
              </div>
              <User size={16} className="text-stone-600 group-hover:text-stone-400 transition-colors shrink-0" weight="duotone" />
            </div>
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between text-[0.65rem]">
                <span className="text-stone-500">3,240 / 4,000 XP</span>
                <span className="text-amber-600">81%</span>
              </div>
              <XpBar pct={81} />
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'Games', value: '47' },
                { label: 'Wins',  value: '29' },
                { label: 'Win%',  value: '61%' },
              ].map(s => (
                <div key={s.label} className="text-center">
                  <p className="text-stone-200 font-bold text-sm leading-none">{s.value}</p>
                  <p className="text-stone-600 text-[0.6rem] uppercase mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          </button>

          {/* Daily missions */}
          <div className="bg-stone-900/30 border border-stone-800/60 rounded-2xl p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ArrowsClockwise size={14} className="text-violet-500" weight="duotone" />
                <h3 className="text-xs font-semibold uppercase tracking-wide text-stone-400">Daily Quests</h3>
              </div>
              <button
                onClick={() => navigate('/quests')}
                className="text-[0.6rem] text-violet-500 hover:text-violet-300 transition-colors"
              >
                View all
              </button>
            </div>
            <div className="flex flex-col gap-1.5">
              {DAILY_QUESTS.map(q => (
                <MissionRow
                  key={q.id}
                  questId={q.id}
                  label={q.label}
                  gemReward={q.gemReward}
                  done={isCompletedToday(q.id)}
                />
              ))}
            </div>
            <div className="flex items-center justify-between pt-1 border-t border-stone-800/60">
              <span className="text-stone-600 text-xs">{questsDoneToday} / {DAILY_QUESTS.length} completed today</span>
              <span className={cn('font-semibold text-xs', allQuestsDone ? 'text-emerald-400' : 'text-violet-400')}>
                {allQuestsDone ? '✓ All done!' : `💎 up to +70 today`}
              </span>
            </div>
          </div>

          {/* Collection snapshot */}
          <div className="bg-stone-900/30 border border-stone-800/60 rounded-2xl p-4 flex flex-col gap-2">
            <div className="flex items-center gap-2 mb-1">
              <CardsThree size={14} className="text-blue-400" weight="duotone" />
              <h3 className="text-xs font-semibold uppercase tracking-wide text-stone-400">Collection</h3>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-stone-400">Cards owned</span>
              <span className="text-stone-200 font-medium">{CARD_DATABASE.length} / {CARD_DATABASE.length}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-stone-400">Legendaries</span>
              <span className="text-amber-300 font-medium">✦ {CARD_DATABASE.filter(c=>c.rarity==='legendary').length}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-stone-400">Pack tokens</span>
              <span className="text-amber-300 font-medium">🎴 {tokens} / 2</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-stone-400">Gems</span>
              <span className="text-violet-300 font-medium">💎 {gems}</span>
            </div>
            <button
              onClick={() => navigate('/pack-opening')}
              className="mt-1 w-full py-1.5 rounded-lg bg-blue-900/40 hover:bg-blue-900/70 border border-blue-800/40 text-blue-300 text-xs font-medium transition-colors"
            >
              Open a Pack
            </button>
          </div>
        </div>

        {/* ── Center: Hero + Play buttons ── */}
        <div className="flex flex-col items-center justify-center gap-6 sm:gap-8 px-4 py-8 sm:p-8 overflow-y-auto">

          {/* Logo */}
          <div className="flex flex-col items-center gap-2 select-none">
            <img
              src="./logo.png"
              alt="Aetherblade"
              className="w-48 sm:w-64 lg:w-72"
            />
            <p className="text-stone-600 text-xs sm:text-sm uppercase tracking-[0.2em] sm:tracking-[0.3em]">Trading Card Game</p>
          </div>

          {/* Primary play buttons */}
          <div className="flex flex-col gap-3 w-full max-w-xs sm:max-w-sm lg:max-w-xs">
            {nameError && (
              <div className="bg-red-950/60 border border-red-800/60 rounded-xl px-4 py-2.5 text-red-300 text-sm text-center">
                {nameError}
              </div>
            )}

            <button
              onClick={handleMultiplayer}
              className="relative w-full py-4 rounded-2xl overflow-hidden text-stone-950 font-bold text-base tracking-wide transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-3 group"
              style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 50%, #b45309 100%)', boxShadow: '0 4px 24px rgba(180,83,9,0.35), inset 0 1px 0 rgba(255,255,255,0.25)' }}
            >
              {/* sheen */}
              <span className="absolute inset-0 bg-linear-to-b from-white/15 to-transparent pointer-events-none" />
              <Globe size={20} weight="duotone" />
              Multiplayer
            </button>

            <button
              onClick={() => setPendingMode('singleplayer')}
              className="relative w-full py-4 rounded-2xl overflow-hidden text-stone-400 font-bold text-base tracking-wide transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-3 cursor-not-allowed"
              style={{ background: 'linear-gradient(135deg, #1c1917 0%, #292524 100%)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)', border: '1px solid rgba(68,64,60,0.6)' }}
              disabled
            >
              <span className="absolute inset-0 bg-linear-to-b from-white/4 to-transparent pointer-events-none" />
              <HouseLine size={20} weight="duotone" />
              Singleplayer
              <span className="text-[0.65rem] font-semibold text-stone-600 bg-stone-900 border border-stone-700/60 px-2 py-0.5 rounded-full">Soon</span>
            </button>
          </div>

          {/* Secondary actions */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 gap-2.5 w-full max-w-xs sm:max-w-sm lg:max-w-xs">
            {[
              {
                label: 'Deck Builder',
                icon: <CardsThree size={24} weight="duotone" className="text-emerald-300" />,
                style: { background: 'linear-gradient(145deg, #052e16 0%, #14532d 100%)', border: '1px solid rgba(22,101,52,0.7)', boxShadow: '0 2px 12px rgba(5,46,22,0.5), inset 0 1px 0 rgba(255,255,255,0.06)' },
                text: 'text-emerald-200',
                action: () => navigate('/deck-builder'),
              },
              {
                label: 'Pack Opening',
                icon: <Sparkle size={24} weight="duotone" className="text-blue-300" />,
                style: { background: 'linear-gradient(145deg, #172554 0%, #1e3a8a 100%)', border: '1px solid rgba(30,58,138,0.8)', boxShadow: '0 2px 12px rgba(23,37,84,0.5), inset 0 1px 0 rgba(255,255,255,0.06)' },
                text: 'text-blue-200',
                action: () => navigate('/pack-opening'),
              },
              {
                label: 'Collection',
                icon: <DiamondsFour size={24} weight="duotone" className="text-violet-300" />,
                style: { background: 'linear-gradient(145deg, #1e1b4b 0%, #2e1065 100%)', border: '1px solid rgba(76,29,149,0.7)', boxShadow: '0 2px 12px rgba(30,27,75,0.5), inset 0 1px 0 rgba(255,255,255,0.06)' },
                text: 'text-violet-200',
                action: () => navigate('/collection'),
              },
              {
                label: 'Daily Quests',
                icon: <Star size={24} weight="duotone" className="text-amber-300" />,
                style: { background: 'linear-gradient(145deg, #1c1407 0%, #451a03 100%)', border: '1px solid rgba(120,53,15,0.7)', boxShadow: '0 2px 12px rgba(28,20,7,0.5), inset 0 1px 0 rgba(255,255,255,0.06)' },
                text: 'text-amber-200',
                badge: !allQuestsDone,
                action: () => navigate('/quests'),
              },
            ].map(btn => (
              <button
                key={btn.label}
                onClick={btn.action}
                className="relative flex flex-col items-center gap-2 py-4 rounded-2xl transition-all duration-200 hover:scale-[1.04] hover:brightness-110 active:scale-[0.97]"
                style={btn.style}
              >
                <span className="absolute inset-0 rounded-2xl bg-linear-to-b from-white/8 to-transparent pointer-events-none" />
                {btn.icon}
                <span className={cn('text-xs font-semibold tracking-wide', btn.text)}>
                  {btn.label}
                </span>
                {'badge' in btn && btn.badge && (
                  <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-violet-400 shadow-[0_0_6px_2px_rgba(167,139,250,0.6)]" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* ── Right: Patch Notes (desktop only) ── */}
        <div className="hidden lg:flex flex-col border-l border-stone-900/60 overflow-y-auto">
          <div className="px-5 py-4 border-b border-stone-900/60 sticky top-0 bg-stone-950/80 backdrop-blur-sm z-10 flex items-center gap-2">
            <Star size={14} className="text-amber-500" weight="duotone" />
            <h3 className="text-xs font-semibold uppercase tracking-wide text-stone-400">Patch Notes</h3>
          </div>

          <div className="flex flex-col divide-y divide-stone-900/60 flex-1">
            {PATCH_NOTES.map(patch => (
              <div key={patch.version} className="px-5 py-4 flex flex-col gap-2 hover:bg-stone-900/20 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-stone-200 text-sm">{patch.version}</span>
                    <span className={cn('text-[0.55rem] font-bold px-1.5 py-px rounded-full uppercase tracking-wide', patch.tagColor)}>
                      {patch.tag}
                    </span>
                  </div>
                  <span className="text-stone-600 text-[0.65rem]">{patch.date}</span>
                </div>
                <ul className="flex flex-col gap-1">
                  {patch.changes.map((c, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-xs text-stone-400">
                      <span className="text-stone-700 mt-0.5 shrink-0">•</span>
                      <span className="leading-snug">{c}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Coming soon */}
          <div className="px-5 py-4 border-t border-stone-900/60">
            <p className="text-[0.6rem] font-semibold uppercase tracking-wide text-stone-600 mb-2">Coming Soon</p>
            <ul className="flex flex-col gap-1.5">
              {['Singleplayer campaign','Ranked mode','More card factions','Pack opening'].map(item => (
                <li key={item} className="flex items-center gap-1.5 text-xs text-stone-600">
                  <span className="w-1 h-1 rounded-full bg-stone-700 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

      </div>

      {/* ── Mobile bottom nav bar ── */}
      <div className="lg:hidden shrink-0 flex items-stretch border-t border-stone-900/60 bg-stone-950/95 backdrop-blur-sm">
        <button
          onClick={() => setShowProfile(true)}
          className="flex-1 flex flex-col items-center gap-1 py-3 text-stone-500 hover:text-amber-400 transition-colors active:scale-95"
        >
          <User size={20} weight="duotone" />
          <span className="text-[0.6rem] font-medium uppercase tracking-wide">Profile</span>
        </button>
        <button
          onClick={() => setShowQuests(true)}
          className="relative flex-1 flex flex-col items-center gap-1 py-3 text-stone-500 hover:text-violet-400 transition-colors active:scale-95"
        >
          <Star size={20} weight="duotone" />
          <span className="text-[0.6rem] font-medium uppercase tracking-wide">Quests</span>
          {!allQuestsDone && (
            <span className="absolute top-2 left-1/2 translate-x-2 w-2 h-2 rounded-full bg-violet-500 border border-stone-950" />
          )}
        </button>
        <button
          onClick={() => setShowPatchNotes(true)}
          className="flex-1 flex flex-col items-center gap-1 py-3 text-stone-500 hover:text-amber-400 transition-colors active:scale-95"
        >
          <Sparkle size={20} weight="duotone" />
          <span className="text-[0.6rem] font-medium uppercase tracking-wide">What's New</span>
        </button>
      </div>

      {/* Singleplayer: coming soon overlay */}
      {pendingMode === 'singleplayer' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={() => setPendingMode(null)}>
          <div className="bg-stone-950 border border-stone-700 rounded-2xl p-8 flex flex-col items-center gap-4 max-w-sm text-center shadow-2xl" onClick={e => e.stopPropagation()}>
            <HouseLine size={40} className="text-stone-500" weight="duotone" />
            <h2 className="text-xl font-bold text-stone-200">Singleplayer</h2>
            <p className="text-stone-500 text-sm leading-relaxed">The campaign and AI modes are coming in a future update. Jump into Multiplayer in the meantime!</p>
            <Button variant="secondary" onClick={() => setPendingMode(null)}>Got it</Button>
          </div>
        </div>
      )}

      {/* Quests sheet (mobile) */}
      {showQuests && (
        <QuestsSheet
          onClose={() => setShowQuests(false)}
          questsDoneToday={questsDoneToday}
          allQuestsDone={allQuestsDone}
          isCompletedToday={isCompletedToday}
          onViewAll={() => { setShowQuests(false); navigate('/quests') }}
        />
      )}

      {/* Patch notes sheet (mobile) */}
      {showPatchNotes && (
        <PatchNotesSheet onClose={() => setShowPatchNotes(false)} />
      )}

      {/* Profile modal */}
      {showProfile && (
        <ProfileModal
          onClose={() => setShowProfile(false)}
          displayName={displayName || 'Anonymous'}
          avatarEmoji={avatarEmoji}
          onSaveName={setDisplayName}
          onSaveAvatar={setAvatarEmoji}
        />
      )}
    </div>
  )
}
