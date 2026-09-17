import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import HomeIcon from './HomeIcon.tsx'
import { UI_ASSETS } from '../../lib/uiAssets.ts'
import MusicControls from '../audio/MusicControls.tsx'

export default function ArenaMenuHeader({ title, subtitle, balance, currency, children }: { title: string; subtitle?: string; balance: number; currency: 'gems'; children?: ReactNode }) {
  return <header className="ae-page-header ae-support-header">
    <Link to="/" className="ae-header-logo" aria-label="Main menu"><img src={UI_ASSETS.logo} alt="Arena Eternal" /></Link>
    <div><h1>{title}</h1>{subtitle && <p>{subtitle}</p>}</div>
    <div className="ae-support-tools"><div className="ae-currency"><HomeIcon name="gems"/><span><b>{balance.toLocaleString()}</b><small>{currency}</small></span></div>{children}<MusicControls compact/><Link className="ae-button" to="/">Main menu</Link></div>
  </header>
}
