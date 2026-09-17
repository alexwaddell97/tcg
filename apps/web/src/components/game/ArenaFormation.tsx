import { useLayoutEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { ARENA_POSITIONS, getArenaNeighbours } from '@tcg/shared'
import type { ArenaSlotIndex } from '@tcg/shared'
import './ArenaFormation.css'

interface Geometry { width: number; height: number; links: string[]; ends: { x: number; y: number; d: string }[] }

/** DOM order always follows the chain; CSS alone folds the last two positions on phones. */
export default function ArenaFormation({ yours, activeSlot, dragging, legalSlots, children, exchangePending = false }: {
  yours: boolean; activeSlot?: ArenaSlotIndex; dragging: boolean; legalSlots: ArenaSlotIndex[]; exchangePending?: boolean
  children: (slot: ArenaSlotIndex) => ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [hovered, setHovered] = useState<ArenaSlotIndex | undefined>()
  const [focused, setFocused] = useState<ArenaSlotIndex | undefined>()
  const [geometry, setGeometry] = useState<Geometry | null>(null)
  const selected = dragging ? activeSlot : hovered ?? focused
  const neighbours = selected === undefined ? [] : getArenaNeighbours(selected)
  useLayoutEffect(() => {
    const node = ref.current!
    const measure = () => {
      const rect = node.getBoundingClientRect()
      const positions = [...node.querySelectorAll<HTMLElement>(':scope > .clash-position')].map(slot => {
        const bounds = slot.getBoundingClientRect()
        return { x: bounds.x - rect.x + bounds.width / 2, y: bounds.y - rect.y + bounds.height / 2, left: bounds.x - rect.x, right: bounds.right - rect.x, top: bounds.y - rect.y, bottom: bounds.bottom - rect.y }
      })
      const folded = positions[0].y !== positions[3].y
      setGeometry({ width: rect.width, height: rect.height,
        // Only bridge the gaps, above card shadows but clear of art and borders.
        links: positions.slice(0, 3).map((from, index) => {
          const to = positions[index + 1]
          if (Math.abs(from.y - to.y) > 1) return `M${from.x} ${from.bottom + 1}V${to.top - 1}`
          return to.x > from.x ? `M${from.right + 1} ${from.y}H${to.left - 1}` : `M${from.left - 1} ${from.y}H${to.right + 1}`
        }),
        ends: [0, 3].map(index => { const point = positions[index]; const left = index === 0 || folded; const edge = left ? point.left : point.right; const x = edge + (left ? -3 : 3); return { x, y: point.y, d: `M${edge} ${point.y}H${x}` } }),
      })
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(node)
    return () => observer.disconnect()
  }, [])
  return <div className={`clash-side ${yours ? 'clash-side-yours' : 'clash-side-theirs'}`} data-formation-owner={yours ? 'you' : 'opponent'} aria-label={yours ? 'Your formation' : 'Opponent formation'}>
    <div ref={ref} className={`clash-slots ${yours ? 'is-yours' : 'is-theirs'}`}>
      {geometry && <svg className="clash-formation-track" viewBox={`0 0 ${geometry.width} ${geometry.height}`} fill="none" aria-hidden="true">
        {geometry.links.map((d, index) => <g key={index} className={selected === index || selected === index + 1 ? 'is-linked' : ''}><path className="clash-track-cut" d={d}/><path className="clash-track-line" d={d}/></g>)}
        {geometry.ends.map((end, index) => <g key={index}><path className="clash-track-line" d={end.d}/><path className="clash-track-end" d={`M${end.x} ${end.y - 2}l2 2 -2 2 -2 -2Z`}/></g>)}
      </svg>}
      {ARENA_POSITIONS.map(slot => <div key={slot} data-slot-index={slot} data-exchange-pending={exchangePending && slot === 3 || undefined} className={`clash-position ${selected === slot ? 'is-selected-position' : ''} ${neighbours.includes(slot) ? 'is-linked-position' : ''} ${dragging && legalSlots.includes(slot) ? 'is-legal-position' : ''} ${dragging && selected === slot && !legalSlots.includes(slot) && yours ? 'is-invalid-position' : ''}`}
        onPointerEnter={event => { if (event.pointerType !== 'touch') setHovered(slot) }} onPointerLeave={() => setHovered(undefined)}
        onFocus={() => setFocused(slot)} onBlur={() => setFocused(undefined)}>
        {children(slot)}<span className="clash-position-number" aria-hidden="true">{slot + 1}</span>
        {exchangePending && slot === 3 && <span className="clash-exchange-mark" title="Exchanges sides after turn 4" aria-label="Exchanges sides after turn 4">⇄</span>}
      </div>)}
    </div>
  </div>
}
