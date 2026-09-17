import { DEFAULT_AVATAR_ID, getProfileAvatar } from '@tcg/shared'
import './ProfileAvatar.css'

export default function ProfileAvatar({ avatarId, label, className = '' }: { avatarId?: string; label?: string; className?: string }) {
  const avatar = getProfileAvatar(avatarId) ?? getProfileAvatar(DEFAULT_AVATAR_ID)!
  return <span className={`ae-portrait ${className}`} role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true}
    style={{ backgroundImage: `url(${avatar.imageUrl})`, backgroundPosition: avatar.position }}/>
}
