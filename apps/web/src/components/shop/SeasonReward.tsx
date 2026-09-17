import { useEffect, useRef } from 'react'
import { ARENA_CARD_DATABASE, getProfileAvatar, getProfileTitle, ownsProfileCosmetic } from '@tcg/shared'
import type { CardDefinition } from '@tcg/shared'
import type { SeasonReward as Reward } from '../../lib/seasonPass.ts'
import ArenaCardFace from '../game/ArenaCardFace.tsx'
import ProfileAvatar from '../ui/ProfileAvatar.tsx'
import HomeIcon from '../ui/HomeIcon.tsx'
import { useAuthStore } from '../../stores/useAuthStore.ts'

const rewardLabels: Record<Reward['kind'], string> = {
  gems: 'Gems', card: 'Card', title: 'Player title',
  avatar: 'Avatar', card_back: 'Card back', variant: 'Art variant',
}
export function rewardCard(reward: Reward): CardDefinition | undefined {
  if (reward.kind !== 'card' && reward.kind !== 'variant') return undefined
  const base = ARENA_CARD_DATABASE.find(card => card.definitionId === reward.definitionId)
  return base && (reward.kind === 'variant' ? { ...base, imageUrl: reward.imageUrl } : base)
}
export function rewardName(reward: Reward): string {
  if (reward.kind === 'gems') return `${reward.amount} gems`
  if (reward.kind === 'card') return rewardCard(reward)?.name ?? 'Card'
  return reward.name
}

function RewardArt({ reward }: { reward: Reward }) {
  const card = rewardCard(reward)
  if (card) return <span className="shop-reward-card-face"><ArenaCardFace card={card} variant="catalog" artOverride={card.imageUrl}/></span>
  if (reward.kind === 'avatar') return <span className="shop-reward-avatar"><ProfileAvatar avatarId={reward.id} label={`${reward.name} avatar`}/></span>
  if (reward.kind === 'card_back') return <img className="shop-reward-card-back" src={reward.imageUrl} alt={`${reward.name} card back`}/>
  if (reward.kind === 'title') return <span className="shop-reward-title"><span aria-hidden="true">✧</span><em>{reward.name}</em><span aria-hidden="true">✧</span></span>
  return <strong className="shop-reward-gems"><HomeIcon name="gems"/>{reward.kind === 'gems' ? reward.amount : ''}</strong>
}

export function SeasonRewardTile({ reward, onInspect }: { reward: Reward; onInspect: (reward: Reward) => void }) {
  if (reward.kind === 'gems') return <div className="shop-reward-content"><RewardArt reward={reward}/><span>gems</span></div>
  return <button className={`shop-reward-preview is-${reward.kind}`} onClick={() => onInspect(reward)} aria-label={`Preview ${rewardName(reward)} ${rewardLabels[reward.kind]}`}>
    <RewardArt reward={reward}/>
    {reward.kind !== 'title' && <b>{rewardName(reward)}</b>}
    <span>{rewardLabels[reward.kind]}</span>
  </button>
}

export function SeasonRewardDialog({ reward, onClose }: { reward: Reward; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const profile = useAuthStore()
  const owned = reward.kind === 'avatar' ? ownsProfileCosmetic(getProfileAvatar(reward.id), profile.ownedAvatars)
    : reward.kind === 'title' && ownsProfileCosmetic(getProfileTitle(reward.id), profile.ownedTitles)
  const equipped = reward.kind === 'avatar' ? profile.avatarId === reward.id : reward.kind === 'title' && profile.titleId === reward.id
  useEffect(() => { const node = dialog.current!; node.showModal(); return () => node.close() }, [])
  const card = rewardCard(reward)
  const explanation = reward.kind === 'variant' ? `Alternate art for ${card?.name}. Same stats, abilities and mastery.`
    : reward.kind === 'card_back' ? 'Replaces the design on the back of your cards.'
    : reward.kind === 'avatar' ? 'A portrait for your player profile.'
    : reward.kind === 'title' ? 'A title to display alongside your player name.'
    : card?.description ?? 'Gems for packs and art variants.'
  return <dialog ref={dialog} className="shop-reward-dialog" aria-label={`${rewardName(reward)} reward preview`} onCancel={onClose} onClick={event => { if (event.target === event.currentTarget) onClose() }}>
    <div className="shop-reward-dialog-body">
      <button className="shop-reward-close" aria-label="Close reward preview" onClick={onClose}>×</button>
      <p className="shop-eyebrow">Premium · {rewardLabels[reward.kind]}</p>
      <div className={`shop-reward-large is-${reward.kind}`}><RewardArt reward={reward}/></div>
      <h2>{rewardName(reward)}</h2>
      <p className="shop-reward-description">{explanation}</p>
      {owned ? <button className="ae-button" disabled={equipped} onClick={() => { if (reward.kind === 'avatar') profile.setAvatar(reward.id); else if (reward.kind === 'title') profile.setTitle(reward.id) }}>{equipped ? 'Equipped' : 'Equip'}</button>
        : <p className="shop-reward-unavailable">Preview only · Premium purchasing unavailable</p>}
    </div>
  </dialog>
}
