import type { CSSProperties } from 'react'
import type { ArenaRevealEvent } from '@tcg/shared'
import { ARENA_ABILITY_LABELS } from '@tcg/shared'
import type { ArenaEffectFamily } from '../../lib/arenaPresentation.ts'
import './ArenaRevealEffects.css'

export { getArenaEffectFamily as revealEffectTheme } from '../../lib/arenaPresentation.ts'
export function revealEffectLabel(event?: ArenaRevealEvent) {
  if (event?.kind === 'location') return 'Arena revealed'
  if (event?.kind === 'location-effect') return event.locationRule === 'bellmarsh' ? 'Spell returned' : event.locationRule === 'gilded_exchange' ? 'Exchange' : 'Growth'
  if (event?.kind === 'growth') return 'Growth'
  if (!event?.abilityTriggered) return ''
  const type = event.effects?.[0] ?? event.card?.arenaAbility?.type
  if (type === 'draw') return `Draw ${event.drawCount}`
  if (type === 'incubate' && (event.card?.arenaRelicCharge ?? 0) >= (event.card?.arenaAbility?.value ?? 2)) return 'Hatched'
  if (type === 'aether_battery' && !event.card?.arenaRelicCharge) return 'Aether released'
  return type ? ARENA_ABILITY_LABELS[type] : ''
}
export function RevealBurst({ family = 'power' }: { family?: ArenaEffectFamily }) {
  if (['transmutation', 'affliction', 'sabotage', 'conduits'].includes(family)) return <CardEffectTrace family={family} source/>
  return <span className="clash-reveal-burst" aria-hidden="true"><i className="clash-impact-ring" />{Array.from({ length: 6 }, (_, i) =>
    <i key={i} className="clash-impact-spark" style={{ '--spark-angle': `${i * 60 + 15}deg` } as CSSProperties} />)}</span>
}

export function CardEffectTrace({ family, source = false }: { family: ArenaEffectFamily; source?: boolean }) {
  return <span className={`clash-card-effect effect-${family} ${source ? 'is-source' : 'is-recipient'}`} aria-hidden="true">
    {family === 'transmutation' && <svg viewBox="0 0 100 150" fill="none">
      <ellipse className="clash-transmute-orbit" cx="50" cy="65" rx="38" ry="30" strokeDasharray="20 8 1 8"/>
      <path className="clash-transmute-equation" d="M40 61H60M40 70H60M50 47V40M50 84V91"/>
      <g className="clash-transmute-blue"><path d="M20 15L28 27L20 44L12 27Z" fill="#75d9ec" fillOpacity=".85" stroke="#defdff"/><path d="M20 15V44M12 27H28" stroke="#e6ffff" strokeWidth=".5"/></g>
      <g className="clash-transmute-gold"><path d="M80 15L88 27L80 44L72 27Z" fill="#f5b358" fillOpacity=".85" stroke="#fff1c9"/><path d="M80 15V44M72 27H88" stroke="#fff7df" strokeWidth=".5"/></g>
    </svg>}
    {family === 'affliction' && <svg viewBox="0 0 100 150" fill="none">
      {source ? <g className="clash-affliction-invocation"><circle cx="50" cy="70" r="26" stroke="currentColor" strokeWidth=".7" strokeDasharray="15 5 1 5"/><path d="M28 70L50 50L72 70L50 90ZM50 43V58M50 82V97M40 70H60" stroke="currentColor" strokeWidth="1"/></g> : <>
        <path className="clash-affliction-veins" pathLength="1" d="M3 15L10 29L5 40L14 54L8 66L16 79L8 93L11 105M9 38L20 33L25 44M14 54L25 58L20 69M8 93L22 96M97 136L88 122L94 107L85 94L93 79L85 67L94 52L89 39M88 122L77 116L72 123M85 94L74 89L79 76M85 67L74 62"/>
        <path className="clash-affliction-fracture" d="M37 5L46 14L41 22M65 145L58 136L63 128"/>
      </>}
    </svg>}
    {family === 'sabotage' && <svg viewBox="0 0 100 150" fill="none">
      <g className="clash-sabotage-seal">
        <path d="M37 91L31 122L44 115L51 124L57 94M59 91L69 118L73 107L83 110L68 84" fill="#541d31" stroke="#eaa17b" strokeWidth=".65"/>
        <path d="M50 48L60 52L70 52L74 62L80 70L75 80L73 90L62 93L53 99L43 94L32 93L28 82L22 74L27 64L30 54L41 53Z" fill="#7a293b" stroke="#ffc79b" strokeWidth="1.2"/>
        <circle cx="51" cy="74" r="18" stroke="#edb088" strokeWidth=".8"/>
        <path d="M38 69L51 62L64 69L59 82L51 88L43 82Z M43 70L48 73M54 73L59 70M47 81H55" stroke="#ffdcad" strokeWidth="1.5" strokeLinejoin="round"/>
      </g>
    </svg>}
    {family === 'conduits' && <svg viewBox="0 0 100 150" fill="none">
      <g className="clash-conduit-sigil">
        <path d="M50 33L81 72L50 110L19 72Z M50 43L72 72L50 100L28 72Z" stroke="currentColor" strokeWidth=".7"/>
        <circle cx="50" cy="72" r="13" stroke="currentColor" strokeWidth="1.2"/>
        <path d="M50 27V58M50 86V116M13 72H36M64 72H87" stroke="currentColor" strokeWidth=".8"/>
        <circle cx="50" cy="72" r="3" fill="#fff3cf"/>
      </g>
    </svg>}
  </span>
}
