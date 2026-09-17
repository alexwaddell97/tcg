import { useState } from 'react'
import { useCollectionStore } from '../../stores/useCollectionStore.ts'
import { CURRENT_SEASON, SEASON_REWARD_TRACK, emptySeasonProgress, seasonActive, seasonLevel } from '../../lib/seasonPass.ts'
import type { SeasonReward } from '../../lib/seasonPass.ts'
import ArenaCardFace from '../game/ArenaCardFace.tsx'
import { rewardCard, SeasonRewardDialog } from './SeasonReward.tsx'
import SeasonQuests from '../quests/SeasonQuests.tsx'
import SeasonRewardTrack from './SeasonRewardTrack.tsx'
import { useSeasonTime } from '../../hooks/useSeasonTime.ts'
import './Shop.css'

export default function SeasonPass() {
  const now = useSeasonTime()
  const progress = useCollectionStore(state => state.seasons[CURRENT_SEASON.id]) ?? emptySeasonProgress()
  const claim = useCollectionStore(state => state.claimSeasonLevel)
  const [inspecting, setInspecting] = useState<SeasonReward | null>(null)
  const level = seasonLevel(progress.xp)
  const active = seasonActive(now)
  const days = Math.max(0, Math.ceil((CURRENT_SEASON.endsAt - now) / 86_400_000))
  const maxXP = (CURRENT_SEASON.levels - 1) * CURRENT_SEASON.xpPerLevel
  const featured = SEASON_REWARD_TRACK.filter(tier => tier.premium.kind === 'card')
  const premiumContents = [
    ['card', 'cards'], ['title', 'titles'], ['avatar', 'avatars'], ['card_back', 'card back'], ['variant', 'art variant'],
  ].map(([kind, label]) => `${SEASON_REWARD_TRACK.filter(tier => tier.premium.kind === kind).length} ${label}`)

  return <section className="shop-season" aria-label="Season pass">
    <div className="shop-season-hero">
      <div className="shop-season-intro">
        <p className="shop-eyebrow">Season 01 · {active ? `${days} days remaining` : 'Season closed'}</p>
        <h2>{CURRENT_SEASON.name}</h2>
          <div className="shop-season-progress"><span>Level {level} / {CURRENT_SEASON.levels}</span><span>{progress.xp} / {maxXP} XP</span><progress max={maxXP} value={progress.xp} aria-label="Season experience"/></div>
          <p className="shop-season-note">Earn XP from season quests · 200 XP per level.</p>
        <div className="shop-pass-benefits"><span>Premium · Cards, cosmetics + gems</span><span>Free · Gems</span></div>
        <p className="shop-season-note">{now < CURRENT_SEASON.endsAt ? 'Cards are exclusive to this premium pass. They join Eternal packs when the season ends.' : 'This season’s cards are now available in Eternal packs.'}</p>
        <button className="ae-button" disabled>Premium pass unavailable</button>
      </div>
      <div className="shop-season-featured">{featured.map(tier => {
        const card = rewardCard(tier.premium)!
        return <div key={card.definitionId}>
          <button className="ae-card-control" aria-label={`Inspect ${card.name}`} onClick={() => setInspecting(tier.premium)}><ArenaCardFace card={card} variant="catalog" artOverride={card.imageUrl}/></button>
          <span>Premium · Level {tier.level}</span>
        </div>
      })}</div>
    </div>
      <SeasonQuests/>
      <section className="shop-season-included" aria-label="Premium pass contents">
        <h3>Premium rewards</h3>
        <ul>{premiumContents.map(label => <li key={label}>{label}</li>)}<li>Gems</li></ul>
      </section>
      <SeasonRewardTrack progress={progress} level={level} onClaim={claim} onInspect={setInspecting}/>
    {inspecting && <SeasonRewardDialog reward={inspecting} onClose={() => setInspecting(null)}/>}
  </section>
}
