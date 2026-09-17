import { useId, useLayoutEffect, useState } from 'react'
import type { RefObject } from 'react'
import type { ArenaPlaybackFrame } from '../../lib/arenaPlayback.ts'
import { getConduitLinks } from '../../lib/arenaPresentation.ts'

interface ThreadPath { id: string; d: string; sx: number; sy: number; tx: number; ty: number }

export default function ArenaEffectLinks({ frame, board, reducedMotion }: { frame?: ArenaPlaybackFrame; board: RefObject<HTMLElement | null>; reducedMotion: boolean }) {
  const id = useId().replace(/:/g, '')
  const [geometry, setGeometry] = useState<{ frameId: string; width: number; height: number; paths: ThreadPath[] } | null>(null)
  useLayoutEffect(() => {
    const host = board.current
    if (!host || !frame || frame.phase !== 'effect' || reducedMotion) { setGeometry(null); return }
    const links = getConduitLinks(frame.event, frame.changes)
    if (!links.length) { setGeometry(null); return }
    const measure = () => {
      const bounds = host.getBoundingClientRect()
      const nodes = new Map<string, HTMLElement>()
      host.querySelectorAll<HTMLElement>('[data-card-id], [data-effect-source]').forEach(node => nodes.set(node.dataset.effectSource ?? node.dataset.cardId!, node))
      const paths = links.flatMap((link, index) => {
        const from = nodes.get(link.from)?.getBoundingClientRect(), to = nodes.get(link.to)?.getBoundingClientRect()
        if (!from || !to) return []
        const sx = from.x - bounds.x + from.width * .82, sy = from.y - bounds.y + from.height * .15
        const tx = to.x - bounds.x + to.width * .82, ty = to.y - bounds.y + to.height * .15
        const bend = Math.min(65, Math.max(18, Math.abs(tx - sx) * .15))
        return [{ id: `${index}`, sx, sy, tx, ty, d: `M${sx} ${sy}Q${(sx + tx) / 2} ${(sy + ty) / 2 - bend} ${tx} ${ty}` }]
      })
      setGeometry({ frameId: frame.id, width: bounds.width, height: bounds.height, paths })
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(host)
    return () => observer.disconnect()
  }, [frame, board, reducedMotion])
  if (!geometry?.paths.length || geometry.frameId !== frame?.id) return null
  return <svg key={frame.id} className="clash-conduit-threads" viewBox={`0 0 ${geometry.width} ${geometry.height}`} fill="none" aria-hidden="true">
    <defs>{geometry.paths.map(path => <linearGradient key={path.id} id={`${id}-${path.id}`} gradientUnits="userSpaceOnUse" x1={path.sx} y1={path.sy} x2={path.tx} y2={path.ty}><stop stopColor="#b98136"/><stop offset=".6" stopColor="#ffe5a3"/><stop offset="1" stopColor="#fffae7"/></linearGradient>)}</defs>
    {geometry.paths.map(path => <g key={path.id}>
      <path className="clash-conduit-thread-halo" d={path.d} stroke={`url(#${id}-${path.id})`}/>
      <path className="clash-conduit-thread" pathLength="1" d={path.d} stroke={`url(#${id}-${path.id})`}/>
      <path className="clash-conduit-pulse" pathLength="1" d={path.d} stroke="#fff8d9"/>
      <circle className="clash-conduit-arrival" cx={path.tx} cy={path.ty} r="5" stroke="#ffe6a6"/>
    </g>)}
  </svg>
}
