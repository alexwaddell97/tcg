import type { PlayerState } from '@tcg/shared'
import { getProfileTitle, sanitizePlayerCosmetics } from '@tcg/shared'
import ProfileAvatar from '../ui/ProfileAvatar.tsx'

/** Profiles share the existing header space. Priority changes emphasis, not size. */
export default function ArenaPlayerProfile({ player, yours, priority }: { player: PlayerState; yours?: boolean; priority: boolean }) {
  const name = player.displayName.trim() || (yours ? 'You' : 'Opponent')
  const cosmetics = sanitizePlayerCosmetics(player)
  const title = getProfileTitle(cosmetics.titleId)?.name
  return <div className={`clash-player-profile ${yours ? 'is-yours' : 'is-opponent'} ${priority ? 'has-priority' : ''}`} role="group"
    aria-label={`${yours ? 'Your' : 'Opponent'} profile: ${name}${priority ? ', reveals first' : ''}`} title={`${name}${priority ? ' · Reveals first this turn' : ''}`}>
    <span className="clash-player-avatar"><ProfileAvatar avatarId={cosmetics.avatarId} label={yours ? 'Your avatar' : `${name}'s avatar`}/><i className="clash-priority-mark" aria-hidden="true"/></span>
    <span className="clash-player-copy"><strong dir="auto">{name}</strong>{title && <span className="clash-player-title">{title}</span>}<small>{priority ? 'Reveals first' : yours ? 'You' : 'Opponent'}</small></span>
  </div>
}
