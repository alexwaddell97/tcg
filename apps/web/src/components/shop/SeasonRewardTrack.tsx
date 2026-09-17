import { useEffect, useRef, useState } from 'react'
import { CaretLeft, CaretRight, Check, LockSimple } from '@phosphor-icons/react'
import { CURRENT_SEASON, SEASON_REWARD_TRACK } from '../../lib/seasonPass.ts'
import type { SeasonProgress, SeasonReward } from '../../lib/seasonPass.ts'
import { SeasonRewardTile } from './SeasonReward.tsx'
import HomeIcon from '../ui/HomeIcon.tsx'

export default function SeasonRewardTrack({ progress, level, onClaim, onInspect }: {
  progress: SeasonProgress
  level: number
  onClaim: (level: number) => void
  onInspect: (reward: SeasonReward) => void
}) {
  const track = useRef<HTMLDivElement>(null)
  const [edges, setEdges] = useState({ start: true, end: false })
  const updateEdges = () => {
    const node = track.current
    if (node) setEdges({ start: node.scrollLeft < 2, end: node.scrollLeft + node.clientWidth >= node.scrollWidth - 2 })
  }
  const showLevel = (target: number) => {
    const node = track.current
    const tile = node?.querySelector<HTMLElement>(`[data-level="${target}"]`)
    if (node && tile) node.scrollTo({ left: tile.offsetLeft - (node.clientWidth - tile.offsetWidth) / 2 })
  }
  useEffect(() => {
    const node = track.current!
    const observer = new ResizeObserver(updateEdges)
    observer.observe(node)
    return () => observer.disconnect()
  }, [])
  useEffect(() => { showLevel(level); updateEdges() }, [level])
  const browse = (direction: number) => {
    const node = track.current
    if (node) node.scrollBy({ left: direction * node.clientWidth * .85, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' })
  }

  return <section className="shop-track" aria-label="Season reward track">
    <div className="shop-track-heading">
      <h3>Reward track</h3>
      <div className="shop-track-navigation">
        <button className="shop-track-current" onClick={() => showLevel(level)} aria-label={`Go to current level ${level}`}>Level {level}</button>
        <button disabled={edges.start} onClick={() => browse(-1)} aria-label="Previous rewards"><CaretLeft weight="bold"/></button>
        <button disabled={edges.end} onClick={() => browse(1)} aria-label="Next rewards"><CaretRight weight="bold"/></button>
      </div>
    </div>
    <div className="shop-track-layout">
      <div className="shop-track-labels" aria-hidden="true"><span>Level</span><span>Free</span><span>Premium</span></div>
      <div ref={track} className="shop-season-track" role="region" aria-label="Reward levels, scroll horizontally to browse" tabIndex={0} onScroll={updateEdges}>
        {SEASON_REWARD_TRACK.map(({ level: tier, free, premium }) => {
          const claimed = progress.claimed.includes(tier)
          const unlocked = tier <= level && Date.now() >= CURRENT_SEASON.startsAt
          const status = claimed ? 'Claimed' : unlocked ? 'Claim' : 'Locked'
          return <article key={tier} data-level={tier} aria-current={tier === level ? 'step' : undefined} className={`shop-season-level ${unlocked ? 'is-unlocked' : ''} ${claimed ? 'is-claimed' : ''}`} aria-label={`Level ${tier}`}>
            <header><b>{tier.toString().padStart(2, '0')}</b><span>{(tier - 1) * CURRENT_SEASON.xpPerLevel} XP</span></header>
            <div className="shop-reward-free">
              <button className="shop-track-claim" disabled={!unlocked || claimed} onClick={() => onClaim(tier)} aria-label={`${status} level ${tier}: ${free.amount} free gems`}>
                <strong className="shop-reward-gems"><HomeIcon name="gems"/>{free.amount}<span> gems</span></strong>
                <small>{claimed ? <Check weight="bold"/> : !unlocked ? <LockSimple/> : null}{status}</small>
              </button>
            </div>
            <div className={`shop-reward-premium reward-${premium.kind}`} aria-label="Premium reward preview"><SeasonRewardTile reward={premium} onInspect={onInspect}/></div>
          </article>
        })}
      </div>
    </div>
  </section>
}
