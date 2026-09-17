import type { CSSProperties } from 'react'
import type { ArenaRule } from '@tcg/shared'
import './ArenaAtmosphere.css'

const PARTICLES = [7, 22, 36, 49, 63, 77, 88, 95]

/** Decorative layers stay outside layout and pointer hit-testing. */
export default function ArenaAtmosphere({ rule, paused }: { rule?: ArenaRule; paused: boolean }) {
  return <div className={`clash-atmosphere atmosphere-${rule ?? 'unknown'} ${paused ? 'is-paused' : ''}`} aria-hidden="true">
    <div className="clash-atmosphere-haze"/>
    {rule && <div className="clash-atmosphere-particles">{PARTICLES.map((x, index) => <i key={x} style={{ '--mote-x': `${x}%`, '--mote-delay': `${-index * 2.7}s`, '--mote-duration': `${11 + index % 4 * 2}s`, '--mote-drift': `${(index % 2 ? -1 : 1) * (9 + index * 3)}px` } as CSSProperties}/>)}</div>}
  </div>
}
