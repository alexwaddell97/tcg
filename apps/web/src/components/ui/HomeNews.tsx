import { useEffect, useRef } from 'react'
import { X } from '@phosphor-icons/react'
import { Link } from 'react-router-dom'
import { CURRENT_SEASON } from '../../lib/seasonPass.ts'
import { UI_ASSETS } from '../../lib/uiAssets.ts'
import HomeIcon from './HomeIcon.tsx'
import './HomeNews.css'

const HOME_NEWS = [
  {
    id: 'shattered-pacts', category: 'Season 01', title: CURRENT_SEASON.name,
    summary: 'Season quests and the reward track.', image: UI_ASSETS.locations.sanctum,
    changes: [
      'Six weekly season quests award 200 XP each. Complete gameplay objectives to progress through 20 levels.',
      'Free rewards grant gems. Premium rewards include two cards, avatars, titles, a card back and alternate artwork.',
      'Premium rewards are available to preview; purchasing is not yet available.',
    ],
    link: '/shop?tab=pass', linkLabel: 'View season pass',
  },
  {
    id: 'profiles', category: 'Patch notes', title: 'Profiles & cosmetics',
    summary: 'Artwork avatars and player titles.',
    changes: [
      'Six artwork portraits replace the emoji avatars. Choose an avatar and title from your home profile.',
      'Your selections appear in practice and multiplayer matches. The priority highlight shows who reveals first.',
      'Season avatars and titles appear in the picker and can be equipped once earned.',
    ],
  },
  {
    id: 'arena-clash', category: 'Patch notes', title: 'Arena Clash',
    summary: 'Match rules and deck building.',
    changes: [
      'Three arenas, six turns. Win two arenas to take the match.',
      'Queue cards with aether, then reveal when both players lock in.',
      'Build a deck of 12 different cards. Each arena holds four units per player.',
      'Rally rewards playing from behind; Pressure rewards a lead.',
    ],
  },
]

export function HomeNewsPanel({ onOpen }: { onOpen: (id: string) => void }) {
  return <aside className="ae-home-news" aria-label="News and patch notes">
    <header><HomeIcon name="news"/><h2>News &amp; patch notes</h2></header>
    <div className="ae-home-news-entries">{HOME_NEWS.map((entry, index) => <button key={entry.id} className={`ae-home-news-entry ${index === 0 ? 'is-featured' : ''}`} onClick={() => onOpen(entry.id)} aria-label={`Read ${entry.title} ${entry.category === 'Patch notes' ? 'patch notes' : 'news'}`}>
      {'image' in entry && <img src={entry.image} alt="" loading="lazy"/>}
      <span className="ae-home-news-copy"><span className="ae-home-news-category">{entry.category}</span><strong>{entry.title}</strong><span className="ae-home-news-summary">{entry.summary}</span><HomeIcon name="arrow"/></span>
    </button>)}</div>
    <button className="ae-home-news-all" onClick={() => onOpen('all')}>All updates <span aria-hidden="true">→</span></button>
  </aside>
}

export function HomeNewsDialog({ selectedId, onClose }: { selectedId: string; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const entries = selectedId === 'all' ? HOME_NEWS : HOME_NEWS.filter(entry => entry.id === selectedId)
  useEffect(() => { const node = dialog.current!; node.showModal(); return () => node.close() }, [])
  return <dialog ref={dialog} className="ae-news-dialog" aria-labelledby="home-news-heading" onCancel={onClose} onClick={event => { if (event.target === event.currentTarget) onClose() }}>
    <header><h2 id="home-news-heading">News &amp; patch notes</h2><button aria-label="Close news" onClick={onClose}><X size={20}/></button></header>
    <div className="ae-news-dialog-body">{entries.map(entry => <article key={entry.id}>
      <p className="ae-home-news-category">{entry.category}</p><h3>{entry.title}</h3>
      <ul>{entry.changes.map(change => <li key={change}>{change}</li>)}</ul>
      {'link' in entry && <Link to={entry.link!} onClick={onClose}>{entry.linkLabel} <span aria-hidden="true">→</span></Link>}
    </article>)}</div>
  </dialog>
}
