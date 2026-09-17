import { useId } from 'react'
import { CARD_BORDERS } from '@tcg/shared'
import type { CardBorderId } from '@tcg/shared'
import './CardBorders.css'

const OUTLINE = 'M18 3 H282 L297 18 V382 L282 397 H18 L3 382 V18 Z'
const INNER = 'M21 9 H279 L291 21 V379 L279 391 H21 L9 379 V21 Z'
const PALETTES: Record<CardBorderId, string[]> = {
  bronze: ['#fff0bd', '#9d733e', '#edc58c', '#684527', '#dcba79'],
  silver: ['#fff', '#718797', '#e7f6ff', '#647783', '#eefcff'],
  jade: ['#ddffe9', '#258268', '#a0ffc8', '#26634e', '#84f9bc'],
  arcane: ['#fbeaff', '#7247bd', '#e3caff', '#573589', '#d9baff'],
  sunfire: ['#ffffd3', '#bf631c', '#ffe7a0', '#a34b20', '#ffce6f'],
  eternal: ['#a9ffff', '#a387fa', '#fff2dc', '#e487c5', '#a5f9ff'],
}

/** Thin, layered metal with progressively richer corner work; no card layout changes. */
export default function CardBorderFrame({ border }: { border: CardBorderId }) {
  const id = useId().replace(/:/g, '')
  const level = CARD_BORDERS.find(tier => tier.id === border)!.level
  return <svg className={`ae-border ae-border-${border}`} viewBox="0 0 300 400" preserveAspectRatio="none" fill="none" aria-hidden="true">
    <defs>
      <linearGradient id={`${id}-metal`} x1="0" y1="0" x2="1" y2="1">
        {PALETTES[border].map((color, index) => <stop key={index} offset={`${index * 25}%`} stopColor={color} />)}
      </linearGradient>
      <linearGradient id={`${id}-gem`} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#fff"/><stop offset=".36" stopColor={PALETTES[border][2]}/><stop offset="1" stopColor={PALETTES[border][3]}/></linearGradient>
    </defs>
    <path d={OUTLINE} stroke="#09060c" strokeWidth={level > 2 ? 9 : 6}/>
    <path className="ae-border-metal" d={OUTLINE} stroke={`url(#${id}-metal)`} strokeWidth={level > 2 ? 4.8 : level === 2 ? 3.4 : 1.8}/>
    <path d={INNER} stroke={`url(#${id}-metal)`} strokeWidth=".8" opacity=".65"/>
    {level >= 3 && [false, true].flatMap(flipX => [false, true].map(flipY => <g key={`${flipX}-${flipY}`} transform={`translate(${flipX ? 300 : 0} ${flipY ? 400 : 0}) scale(${flipX ? -1 : 1} ${flipY ? -1 : 1})`}>
      <path d="M3 45 V18 L18 3 H47 L31 9 H21 L9 21 V32 Z" fill={`url(#${id}-metal)`}/>
      <path d="M13 19 L21 11 L23 21 L15 27 Z" fill={`url(#${id}-gem)`} stroke={PALETTES[border][3]} strokeWidth="1"/>
      {level >= 4 && <path d="M8 62 L13 48 L8 36 M37 8 L50 13 L64 8" stroke={`url(#${id}-metal)`} strokeWidth="1.5"/>}
      {level >= 5 && <path d="M4 89 L10 71 L14 78 L12 42 M43 12 L78 14 L70 10 L91 4" stroke={`url(#${id}-metal)`} strokeWidth="2"/>}
    </g>))}
    {level >= 4 && <g stroke={`url(#${id}-metal)`} fill={`url(#${id}-gem)`}>
      <path d="M130 5 L141 10 L150 4 L159 10 L170 5 M138 395 L150 389 L162 395"/>
      <path d="M146 7 L150 1 L154 7 L150 15 Z"/>
      {level >= 5 && <path d="M141 396 L150 383 L159 396 L150 399 Z"/>}
    </g>}
    {level === 6 && <path className="ae-border-shimmer" d={OUTLINE} stroke="#fff6ff" strokeWidth="2.2" strokeDasharray="36 1360"/>}
  </svg>
}
