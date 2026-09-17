import { useId } from 'react'
import './HomeIcon.css'

export type HomeIconName = 'arena' | 'practice' | 'decks' | 'collection' | 'shop' | 'quests' | 'gems' | 'settings' | 'news' | 'title' | 'arrow'

/** Original menu emblems: engraved gold, dark enamel and cut aether crystal. */
export default function HomeIcon({ name, className = '' }: { name: HomeIconName; className?: string }) {
  const id = `home-${useId().replace(/:/g, '')}`
  const gold = `url(#${id}-gold)`, blue = `url(#${id}-blue)`, ink = `url(#${id}-ink)`
  return <svg className={`ae-home-emblem ae-home-emblem-${name} ${className}`} viewBox="0 0 64 64" fill="none" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
    <defs>
      <linearGradient id={`${id}-gold`} x1="12" y1="7" x2="49" y2="58" gradientUnits="userSpaceOnUse"><stop stopColor="#fff1c4"/><stop offset=".35" stopColor="#dabc79"/><stop offset=".62" stopColor="#9e7643"/><stop offset="1" stopColor="#edce8f"/></linearGradient>
      <linearGradient id={`${id}-blue`} x1="23" y1="13" x2="43" y2="51" gradientUnits="userSpaceOnUse"><stop stopColor="#dbfcff"/><stop offset=".45" stopColor="#81cddd"/><stop offset="1" stopColor="#346781"/></linearGradient>
      <linearGradient id={`${id}-ink`} x1="18" y1="8" x2="46" y2="58" gradientUnits="userSpaceOnUse"><stop stopColor="#33515e"/><stop offset="1" stopColor="#0d1b29"/></linearGradient>
    </defs>
    <IconArt name={name} gold={gold} blue={blue} ink={ink}/>
  </svg>
}

function IconArt({ name, gold, blue, ink }: { name: HomeIconName; gold: string; blue: string; ink: string }) {
  switch (name) {
    case 'arena': return <>
      <path d="M10 55V23L16 12h32l6 11v32Z" fill={ink} stroke={gold} strokeWidth="2.5"/>
      <path d="M17 53V25a15 15 0 0 1 30 0v28M7 55h50M12 24h7m26 0h7M16 17h7m18 0h7" stroke={gold} strokeWidth="3"/>
      <path d="M23 52V28a9 9 0 0 1 18 0v24" fill="#09151f" stroke="#a78d58" strokeWidth="1.5"/>
      <path d="m32 25 6 11-6 11-6-11Z" fill={blue}/><path d="m32 25-1 11 1 11 2-11Z" fill="#e8ffff" fillOpacity=".65"/>
      <path d="m32 3 6 7-6 7-6-7Z" fill={gold} stroke="#10232b" strokeWidth="1.5"/>
      <path d="M13 33v13m38-13v13" stroke="#6b8a8f" strokeWidth="2"/>
    </>
    case 'practice': return <>
      <path d="M12 13 32 6l20 7v21c0 12-12 20-20 25-8-5-20-13-20-25Z" fill={ink} stroke={gold} strokeWidth="2.5"/>
      <path d="m18 18 14-5 14 5v15c0 8-8 15-14 19-6-4-14-11-14-19Z" fill="#1a2b35" stroke="#b99e67" strokeWidth="1.4"/>
      <circle cx="32" cy="31" r="11" stroke={gold} strokeWidth="2"/><circle cx="32" cy="31" r="5" fill={blue}/>
      <path d="M29 34 51 12m-1-6 1 6 7 1-7 6-5-2-2-5Z" fill={gold} stroke={gold} strokeWidth="2.5"/>
      <path d="M20 43 16 47m28-4 4 4" stroke="#dbc189" strokeWidth="1.5"/>
    </>
    case 'decks': return <>
      <path d="m6 18 20-9 5 2 15 35-2 5-20 9-5-2L4 23Z" fill="#142934" stroke="#8c794f" strokeWidth="2"/>
      <path d="m20 8 22-3 5 4 6 40-4 5-22 3-5-4-6-40Z" fill={ink} stroke={gold} strokeWidth="2"/>
      <path d="M32 13h21l5 5v38l-5 5H32l-5-5V18Z" fill={ink} stroke={gold} strokeWidth="2.4"/>
      <path d="M33 19h19v35H33Z" stroke="#c0a76e" strokeOpacity=".55"/>
      <path d="m42.5 24 8 12-8 12-8-12Z" fill={blue} stroke={gold} strokeWidth="1.2"/>
      <path d="m42.5 24-1 12 1 12 2-12Z" fill="#ddfbff" fillOpacity=".65"/>
      <path d="M18 22 13 24l10 25m1-34 4-1" stroke="#ead39a" strokeWidth="1.5"/>
    </>
    case 'collection': return <>
      <path d="M5 13c10-4 18-3 27 2 9-5 17-6 27-2v40c-10-3-18-2-27 3-9-5-17-6-27-3Z" fill={ink} stroke={gold} strokeWidth="2.5"/>
      <path d="M9 17c8-2 14-1 20 2v31c-7-3-13-3-20-2Zm46 0c-8-2-14-1-20 2v31c7-3 13-3 20-2Z" fill="#192d39" stroke="#a28d5d" strokeWidth="1"/>
      <path d="M32 15v40M13 23l10 1v9l-10-1Zm28 1 10-1v9l-10 1ZM13 37l10 1v7l-10-1Zm28 1 10-1v7l-10 1Z" stroke={gold} strokeWidth="1.8"/>
      <path d="m18 25 3 3-3 3-3-3Zm28 0 3 3-3 3-3-3Z" fill={blue}/>
      <path d="m29 8 3-4 3 4v10l-3-2-3 2Z" fill={gold}/>
    </>
    case 'shop': return <>
      <path d="m9 27 6-12h34l6 12-5 8H14Z" fill={ink} stroke={gold} strokeWidth="2.2"/>
      <path d="M8 33h48v19l-5 5H13l-5-5Z" fill={ink} stroke={gold} strokeWidth="2.5"/>
      <path d="M8 38h48M16 35v18m32-18v18M11 49h5m32 0h5" stroke={gold} strokeWidth="2"/>
      <path d="m32 5 9 12-9 14-9-14Z" fill={blue} stroke="#c8eef1" strokeWidth="1.2"/>
      <path d="m23 17 9-2 9 2m-9-12-2 10 2 16 2-16Z" fill="#d5f8ff" fillOpacity=".5" stroke="#e0ffff" strokeOpacity=".55"/>
      <path d="M27 35h10v10l-5 4-5-4Z" fill={gold}/><path d="m32 38 2 3-2 3-2-3Z" fill="#102c3a"/>
      <path d="m15 6 1 4 4 1-4 1-1 4-1-4-4-1 4-1Zm35-2 1 4 4 1-4 1-1 4-1-4-4-1 4-1Z" fill="#ebd298"/>
    </>
    case 'quests': return <>
      <path d="M17 9h35v39c0 6-4 10-10 10H14V19Z" fill={ink} stroke={gold} strokeWidth="2.3"/>
      <path d="M18 9h-5a7 7 0 0 0-7 7v5h13v-5a7 7 0 0 1 7-7M11 47h30v4a7 7 0 0 0 7 7H15a7 7 0 0 1-7-7v-4Z" fill="#41515a" stroke={gold} strokeWidth="2"/>
      <path d="m24 22 2 2 4-5m-6 14 2 2 4-5M35 22h9M35 33h9" stroke={gold} strokeWidth="2.5"/>
      <path d="m45 46-5 15-4-5-6 2 5-16" fill="#365466" stroke={gold} strokeWidth="1.5"/>
      <path d="m43 38 5 4-1 7-6 4-6-4-1-7 5-4Z" fill={gold}/><path d="m41 41 4 5-4 4-4-4Z" fill={blue}/>
    </>
    case 'gems': return <>
      <path d="m20 8 24 1 13 15-6 21-20 15L10 43 7 23Z" fill={ink} stroke={gold} strokeWidth="2.5"/>
      <path d="m22 14 19 1 10 11-5 16-15 11-15-13-2-15Z" fill={blue} stroke="#caeff2" strokeWidth="1.2"/>
      <path d="m22 14 2 13 17-12-5 14 15-3-15 3-5 24-7-26-10-2m10 2 12 2 10 13" stroke="#e7ffff" strokeOpacity=".75" strokeWidth="1.4"/>
      <path d="m24 27 17-12-5 14-5 24Z" fill="#edffff" fillOpacity=".22"/>
      <path d="m53 3 1 5 5 1-5 1-1 5-1-5-5-1 5-1Z" fill={gold}/>
    </>
    case 'settings': return <>
      <path d="m26 5 12 0 2 7 6 3 7-2 6 10-5 5v8l5 5-6 10-7-2-6 3-2 7H26l-2-7-6-3-7 2-6-10 5-5v-8l-5-5 6-10 7 2 6-3Z" fill={ink} stroke={gold} strokeWidth="2.5"/>
      <circle cx="32" cy="32" r="16" stroke={gold} strokeWidth="2"/><path d="m32 19 9 13-9 13-9-13Z" fill={blue}/><path d="m32 19-2 13 2 13 2-13Z" fill="#eaffff" fillOpacity=".6"/>
      <path d="M31 8h2m19 13 1 2m-1 20-1 2M31 56h2M12 43l-1-2m1-20 1-2" stroke="#ead09c" strokeWidth="2"/>
    </>
    case 'news': return <>
      <path d="M11 10h37l5 5v37l-5 6H11l-5-6V16Z" fill={ink} stroke={gold} strokeWidth="2.3"/>
      <path d="M14 18h15v13H14Z" fill="#35505c" stroke={gold} strokeWidth="1.5"/>
      <path d="M35 19h9M35 26h9M14 38h23M14 45h18" stroke={gold} strokeWidth="2.3"/>
      <path d="M34 51c3-16 7-29 23-44 4 19-1 30-18 38Z" fill={blue} stroke={gold} strokeWidth="1.5"/>
      <path d="m34 51 18-34m-11 23 8-1m-5-6 7-2" stroke="#e3f6e5" strokeWidth="1.4"/>
    </>
    case 'title': return <>
      <path d="m11 32-7 16h16l12 10 12-10h16l-7-16Z" fill={ink} stroke={gold} strokeWidth="2.5"/>
      <path d="m13 12 9 7L32 5l10 14 9-7-4 26H17Z" fill={gold} stroke="#a98a50" strokeWidth="1.2"/>
      <path d="m32 16 6 8-6 8-6-8Z" fill={blue}/><path d="M21 44h22" stroke={gold} strokeWidth="2"/>
    </>
    case 'arrow': return <>
      <path d="M12 51 49 14M25 13h25v25" stroke={gold} strokeWidth="6"/><path d="m45 9 10 0v10" stroke="#ead49d" strokeWidth="2"/>
    </>
  }
}
