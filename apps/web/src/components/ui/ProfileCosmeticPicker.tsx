import { LockSimple } from '@phosphor-icons/react'
import { Link } from 'react-router-dom'
import { PROFILE_AVATARS, PROFILE_TITLES, ownsProfileCosmetic } from '@tcg/shared'
import { useAuthStore } from '../../stores/useAuthStore.ts'
import { CURRENT_SEASON } from '../../lib/seasonPass.ts'
import ProfileAvatar from './ProfileAvatar.tsx'

export default function ProfileCosmeticPicker({ avatarId, titleId, onAvatar, onTitle, onClose }: {
  avatarId: string; titleId: string | null; onAvatar: (id: string) => void; onTitle: (id: string | null) => void; onClose: () => void
}) {
  const { ownedAvatars, ownedTitles } = useAuthStore()
  return <div className="ae-profile-cosmetics">
    <section aria-label="Avatar selection"><h3 className="ae-eyebrow">Avatar</h3>
      <div className="ae-profile-avatar-grid">{PROFILE_AVATARS.map(avatar => {
        const owned = ownsProfileCosmetic(avatar, ownedAvatars)
        return <button key={avatar.id} className="ae-profile-avatar-option" disabled={!owned} aria-pressed={avatarId === avatar.id} aria-label={`${avatar.name}${owned ? '' : ', locked season reward'}`} onClick={() => onAvatar(avatar.id)}>
          <span className="ae-profile-avatar-art"><ProfileAvatar avatarId={avatar.id}/>{!owned && <LockSimple aria-hidden="true" weight="fill"/>}</span><span>{avatar.name}</span>
        </button>
      })}</div>
    </section>
    <section aria-label="Title selection"><h3 className="ae-eyebrow">Title</h3>
      <div className="ae-profile-title-options"><button aria-pressed={titleId === null} onClick={() => onTitle(null)}>None</button>{PROFILE_TITLES.map(title => {
        const owned = ownsProfileCosmetic(title, ownedTitles)
        return <button key={title.id} disabled={!owned} aria-pressed={titleId === title.id} onClick={() => onTitle(title.id)}>{!owned && <LockSimple aria-hidden="true"/>}{title.name}</button>
      })}</div>
    </section>
    <p className="ae-profile-unlock-note">Locked rewards: <Link to="/shop?tab=pass" onClick={onClose}>{CURRENT_SEASON.name} season pass</Link>.</p>
  </div>
}
