import React, { useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CURRENT_SEASON, seasonLevel } from '../lib/seasonPass.ts'
import {
  Sword,
  Trophy,
  Star,
  Sparkle,
  X,
  ChartBar,
  ShieldCheckered,
  ArrowsClockwise,
} from '@phosphor-icons/react'
import { useAuthStore } from '../stores/useAuthStore.ts'
import { useCollectionStore } from '../stores/useCollectionStore.ts'
import { DAILY_QUESTS, TOTAL_DAILY_GEMS } from '../lib/quests.ts'
import { useDailyQuests } from '../hooks/useQuestProgress.ts'
import QuestList from '../components/quests/QuestList.tsx'
import type { QuestProgress } from '../lib/quests.ts'
import { connectSocket } from '../lib/socket.ts'
import Button from '../components/ui/Button.tsx'
import { ARENA_CARD_DATABASE as CARD_DATABASE, PROFILE_AVATARS, getProfileTitle, ownsProfileCosmetic } from '@tcg/shared'
import { UI_ASSETS } from '../lib/uiAssets.ts'
import ArenaFrame from '../components/ui/ArenaFrame.tsx'
import ProfileAvatar from '../components/ui/ProfileAvatar.tsx'
import ProfileCosmeticPicker from '../components/ui/ProfileCosmeticPicker.tsx'
import { HomeNewsPanel, HomeNewsDialog } from '../components/ui/HomeNews.tsx'
import HomeIcon from '../components/ui/HomeIcon.tsx'
import MusicControls from '../components/audio/MusicControls.tsx'

// ─── Palette tokens ───────────────────────────────────────────────────────────
// Shared gold/blue theme lives in art-direction.css (--ae-gold, --ae-pale, --ae-ink, --ae-line, --ae-muted).
// Champion Gold #D8A44C | Ancient Gold #F2C979 accent the XP bar and a few gold highlights below.

const RANK_TIERS = ['Bronze','Silver','Gold','Platinum','Diamond','Master']
const HOME_MENUS = [
  { label: 'Deck Builder', icon: 'decks', path: '/deck-builder' },
  { label: 'Collection', icon: 'collection', path: '/collection' },
  { label: 'Shop', icon: 'shop', path: '/shop' },
  { label: 'Daily Quests', icon: 'quests', path: '/quests' },
] as const

// ─── Sub-components ───────────────────────────────────────────────────────────

function XpBar({ pct }: { pct: number }) {
  return (
    <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #B57A2A 0%, #D8A44C 60%, #F2C979 100%)', boxShadow: '0 0 8px rgba(216,164,76,0.5)' }}
      />
    </div>
  )
}

// ─── Shared bottom-sheet wrapper ─────────────────────────────────────────────

function BottomSheet({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="ae-sheet-backdrop" onClick={onClose}>
      <div className="ae-sheet" onClick={e => e.stopPropagation()}>
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
  progress,
  onViewAll,
}: {
  onClose: () => void
  questsDoneToday: number
  allQuestsDone: boolean
  progress: QuestProgress
  onViewAll: () => void
}) {
  return (
    <BottomSheet onClose={onClose}>
      <div className="ae-sheet-head">
        <h3><ArrowsClockwise size={14} className="ae-sheet-icon" weight="duotone" />Daily Quests</h3>
        <div className="flex items-center gap-3">
          <button onClick={onViewAll} className="text-xs transition-colors" style={{ color: 'var(--ae-gold)' }}>View all</button>
          <button onClick={onClose} className="ae-sheet-close"><X size={18} weight="bold" /></button>
        </div>
      </div>
      <div className="ae-sheet-body">
        <div className="flex flex-col gap-1.5">
          <QuestList quests={DAILY_QUESTS} progress={progress} currency="gems"/>
        </div>
        <div className="flex items-center justify-between pt-1" style={{ borderTop: '1px solid #92734726' }}>
          <span className="text-xs" style={{ color: 'var(--ae-muted)' }}>{questsDoneToday} / {DAILY_QUESTS.length} completed today</span>
          <span className="font-semibold text-xs" style={{ color: allQuestsDone ? '#4ade80' : '#79bdd3' }}>
            {allQuestsDone ? '✓ All done!' : `💎 up to +${TOTAL_DAILY_GEMS} today`}
          </span>
        </div>
      </div>
    </BottomSheet>
  )
}

// ─── Profile modal ────────────────────────────────────────────────────────────

function ProfileModal({
  onClose,
  displayName,
  avatarId,
  titleId,
  onSaveName,
  onSaveAvatar,
  onSaveTitle,
  initialTab = 'stats',
}: {
  onClose: () => void
  displayName: string
  avatarId: string
  titleId: string | null
  onSaveName: (n: string) => void
  onSaveAvatar: (a: string) => void
  onSaveTitle: (id: string | null) => void
  initialTab?: 'stats' | 'settings'
}) {
  const [editName, setEditName] = useState(displayName)
  const [editAvatar, setEditAvatar] = useState(avatarId)
  const [editTitle, setEditTitle] = useState(titleId)
  const [tab, setTab] = useState<'stats'|'collection'|'settings'>(initialTab)

  const ownedCount = CARD_DATABASE.length
  const legendaryCount = CARD_DATABASE.filter(c => c.rarity === 'legendary').length
  const rareCount = CARD_DATABASE.filter(c => c.rarity === 'rare').length

  const handleSave = () => {
    if (editName.trim()) onSaveName(editName.trim())
    onSaveAvatar(editAvatar)
    onSaveTitle(editTitle)
    onClose()
  }

  return (
    <div className="ae-sheet-backdrop" onClick={onClose}>
      <div className="ae-sheet ae-sheet-framed" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="relative px-6 pt-6 pb-4" style={{ borderBottom: '1px solid #92734740' }}>
          <button onClick={onClose} aria-label="Close profile" className="ae-sheet-close absolute top-5 right-6">
            <X size={20} weight="bold" />
          </button>
          <div className="flex items-center gap-4">
            <div className="ae-profile-preview-avatar"><ProfileAvatar avatarId={editAvatar} label="Your avatar"/></div>
            <div>
              <h2 className="text-xl font-bold">{displayName || 'Your profile'}</h2>
              {getProfileTitle(editTitle) && <p className="ae-profile-title">{getProfileTitle(editTitle)!.name}</p>}
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(198,163,101,0.15)', color: 'var(--ae-gold)', border: '1px solid rgba(198,163,101,0.4)' }}>
                  {RANK_TIERS[2]} IV
                </span>
                <span className="text-xs" style={{ color: 'var(--ae-muted)' }}>Level 12</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex" style={{ borderBottom: '1px solid #92734726' }}>
          {(['stats','collection','settings'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="flex-1 py-2.5 font-medium transition-colors capitalize"
              style={{
                color: tab === t ? 'var(--ae-gold)' : 'var(--ae-muted)',
                borderBottom: tab === t ? '2px solid var(--ae-gold)' : '2px solid transparent',
                fontSize: '0.7rem',
                letterSpacing: '0.05em',
              }}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="ae-sheet-body">
          {tab === 'stats' && (
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Games',    value: '47',   icon: <Sword size={18} style={{ color: 'var(--ae-gold)' }} weight="duotone" /> },
                  { label: 'Wins',     value: '29',   icon: <Trophy size={18} style={{ color: 'var(--ae-gold)' }} weight="duotone" /> },
                  { label: 'Win %',    value: '61%',  icon: <ChartBar size={18} style={{ color: '#4ade80' }} weight="duotone" /> },
                  { label: 'Rank',     value: 'Gold', icon: <ShieldCheckered size={18} style={{ color: 'var(--ae-gold)' }} weight="duotone" /> },
                  { label: 'Streak',   value: '3W',   icon: <Star size={18} style={{ color: 'var(--ae-gold)' }} weight="duotone" /> },
                  { label: 'Top fac.', value: 'Forge',icon: <Sparkle size={18} style={{ color: '#79bdd3' }} weight="duotone" /> },
                ].map(s => (
                  <div key={s.label} className="p-3 flex flex-col items-center gap-1 text-center" style={{ background: 'rgba(14,25,32,0.6)', border: '1px solid #92734726' }}>
                    {s.icon}
                    <p className="font-bold text-lg leading-none" style={{ color: '#e5d5b8' }}>{s.value}</p>
                    <p className="text-[0.6rem] uppercase tracking-wide" style={{ color: 'var(--ae-muted)' }}>{s.label}</p>
                  </div>
                ))}
              </div>
              <div className="p-3" style={{ background: 'rgba(14,25,32,0.5)', border: '1px solid #9273471a' }}>
                <p className="text-xs mb-1.5" style={{ color: 'var(--ae-muted)' }}>Level 12 — 3,240 / 4,000 XP</p>
                <XpBar pct={81} />
              </div>
            </div>
          )}

          {tab === 'collection' && (
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Cards owned', value: `${ownedCount}`, sub: `of ${ownedCount}`, col: '#e5d5b8' },
                  { label: 'Completion',  value: '100%', sub: 'all sets', col: '#4ade80' },
                  { label: 'Legendaries', value: String(legendaryCount), sub: 'owned', col: '#F2C979' },
                  { label: 'Rares',       value: String(rareCount), sub: 'owned', col: '#79bdd3' },
                ].map(s => (
                  <div key={s.label} className="p-3" style={{ background: 'rgba(14,25,32,0.6)', border: '1px solid #92734726' }}>
                    <p className="font-bold text-2xl leading-none" style={{ color: s.col }}>{s.value}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--ae-muted)' }}>{s.label}</p>
                    <p className="text-[0.6rem]" style={{ color: '#8a8064' }}>{s.sub}</p>
                  </div>
                ))}
              </div>
              <div className="p-3 flex items-center justify-between" style={{ background: 'rgba(14,25,32,0.5)', border: '1px solid #9273471a' }}>
                <div>
                  <p className="text-sm font-medium" style={{ color: '#e5d5b8' }}>Pack Tokens</p>
                  <p className="text-xs" style={{ color: 'var(--ae-muted)' }}>Open packs to expand your collection</p>
                </div>
                <span className="font-bold text-xl" style={{ color: '#F2C979' }}>3 🎴</span>
              </div>
            </div>
          )}

          {tab === 'settings' && (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="profile-display-name" className="ae-eyebrow">Display name</label>
                <input
                  id="profile-display-name"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  maxLength={20}
                  className="ae-input w-full text-sm"
                />
              </div>
              <ProfileCosmeticPicker avatarId={editAvatar} titleId={editTitle} onAvatar={setEditAvatar} onTitle={setEditTitle} onClose={onClose}/>
              <Button className="ae-button ae-button-primary" variant="primary" onClick={handleSave}>Save changes</Button>
            </div>
          )}
        </div>
        <ArenaFrame />
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function MainMenu() {
  const navigate = useNavigate()
  const { displayName, setDisplayName, avatarId, titleId, ownedAvatars, setAvatar, setTitle } = useAuthStore()
  const { gems, seasons } = useCollectionStore()
  const seasonXP = seasons[CURRENT_SEASON.id]?.xp ?? 0
  const passLevel = seasonLevel(seasonXP)
  const passLevelProgress = passLevel >= CURRENT_SEASON.levels ? 100 : (seasonXP % CURRENT_SEASON.xpPerLevel) / CURRENT_SEASON.xpPerLevel * 100
  const { progress: dailyProgress, count: questsDoneToday } = useDailyQuests()
  const [showProfile, setShowProfile] = useState(false)
  const [avatarPickerOpen, setAvatarPickerOpen] = useState(false)
  const avatarButton = useRef<HTMLButtonElement>(null)
  const [profileTab, setProfileTab] = useState<'stats' | 'settings'>('stats')
  const [showQuests, setShowQuests] = useState(false)
  const [newsId, setNewsId] = useState<string | null>(null)
  const allQuestsDone = questsDoneToday === DAILY_QUESTS.length
  const handleMultiplayer = () => {
    connectSocket()
    navigate('/lobby')
  }
  return <main className="ae-page ae-home">
    <header className="ae-home-top">
      <div className="ae-home-identity">
        <div className="ae-avatar-picker" onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setAvatarPickerOpen(false) }} onKeyDown={event => { if (event.key === 'Escape') { setAvatarPickerOpen(false); avatarButton.current?.focus() } }}>
          <button ref={avatarButton} className="ae-profile-avatar" aria-label="Choose avatar" aria-expanded={avatarPickerOpen} aria-controls="menu-avatar-options" onClick={() => setAvatarPickerOpen(open => !open)}><ProfileAvatar avatarId={avatarId}/><span className="ae-avatar-chevron" aria-hidden="true">⌄</span></button>
          {avatarPickerOpen && <div id="menu-avatar-options" className="ae-avatar-options" role="group" aria-label="Avatar options">{PROFILE_AVATARS.filter(avatar => ownsProfileCosmetic(avatar, ownedAvatars)).map(avatar => <button key={avatar.id} aria-label={`${avatar.name} avatar`} aria-pressed={avatarId === avatar.id} onClick={() => { setAvatar(avatar.id); setAvatarPickerOpen(false); avatarButton.current?.focus() }}><ProfileAvatar avatarId={avatar.id}/></button>)}<button className="ae-avatar-manage" onClick={() => { setAvatarPickerOpen(false); setProfileTab('settings'); setShowProfile(true) }}>Avatars &amp; titles →</button></div>}
        </div>
        <div className="ae-home-name"><label className="ae-username"><span>Username</span><input value={displayName} onChange={event => { setDisplayName(event.target.value) }} onBlur={() => setDisplayName(displayName.trim())} maxLength={20} placeholder="Your name" autoComplete="nickname" spellCheck={false} /></label><button className="ae-home-title" aria-label="Choose player title" onClick={() => { setProfileTab('settings'); setShowProfile(true) }}><HomeIcon name="title"/>{getProfileTitle(titleId)?.name ?? 'Choose title'}</button></div>
      </div>
      <div className="ae-home-wallet">
        <button className="ae-currency" onClick={() => navigate('/shop')} aria-label={`${gems} gems, open shop`}><HomeIcon name="gems"/><span><b>{gems.toLocaleString()}</b><small>Gems</small></span></button>
        <button className="ae-icon-button" aria-label="Profile settings" onClick={() => { setProfileTab('settings'); setShowProfile(true) }}><HomeIcon name="settings"/></button>
      </div>
    </header>
    <HomeNewsPanel onOpen={setNewsId}/>
    <section className="ae-home-center" aria-label="Play Arena Eternal">
      <h1><img src={UI_ASSETS.logo} alt="Arena Eternal" className="ae-home-logo" fetchPriority="high" draggable={false} /></h1>
      <div className="ae-home-actions">
        <button className="ae-button ae-button-primary" onClick={handleMultiplayer}><HomeIcon name="arena"/>Enter the Arena</button>
        <button className="ae-button" onClick={() => navigate('/practice')}><HomeIcon name="practice"/>Practice Arena Clash</button>
      </div>
      <nav className="ae-home-nav" aria-label="Game menus">
        {HOME_MENUS.map(({ label, icon, path }) => <button className="ae-nav-tile" key={path} onClick={() => navigate(path)}><HomeIcon name={icon}/><span>{label}</span><ArenaFrame /></button>)}
      </nav>
      <Link className="ae-home-season" to="/shop?tab=pass" aria-label={`Season pass: ${CURRENT_SEASON.name}, level ${passLevel}. View rewards`}>
        <img className="ae-home-season-icon" src={UI_ASSETS.seasonPassIcon} width={44} height={44} alt="" aria-hidden="true"/>
        <span className="ae-home-season-name"><small>Season pass</small><b>{CURRENT_SEASON.name}</b></span>
        <span className="ae-home-season-level">Level <b>{passLevel}</b></span><span aria-hidden="true">→</span>
        <span className="ae-home-season-progress" aria-hidden="true"><span style={{ width: `${passLevelProgress}%` }}/></span>
      </Link>
    </section>
    <footer className="ae-home-bottom"><button onClick={() => setShowQuests(true)}><HomeIcon name="quests"/>{allQuestsDone ? 'Daily quests complete' : `${questsDoneToday} / ${DAILY_QUESTS.length} daily quests complete`} →</button><MusicControls/><button onClick={() => setNewsId('all')}><HomeIcon name="news"/>News &amp; patch notes ↗</button></footer>
    {showQuests && <QuestsSheet onClose={() => setShowQuests(false)} questsDoneToday={questsDoneToday} allQuestsDone={allQuestsDone} progress={dailyProgress} onViewAll={() => { setShowQuests(false); navigate('/quests') }} />}
    {newsId && <HomeNewsDialog selectedId={newsId} onClose={() => setNewsId(null)}/>}
    {showProfile && <ProfileModal initialTab={profileTab} onClose={() => { setShowProfile(false) }} displayName={displayName} avatarId={avatarId} titleId={titleId} onSaveName={setDisplayName} onSaveAvatar={setAvatar} onSaveTitle={setTitle} />}
  </main>
}
