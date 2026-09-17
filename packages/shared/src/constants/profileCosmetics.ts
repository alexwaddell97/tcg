export interface ProfileAvatarDefinition {
  id: string
  name: string
  imageUrl: string
  position: string
  starter: boolean
}
export interface ProfileTitleDefinition { id: string; name: string; starter: boolean }

const portrait = (id: string, name: string, art: string, position: string, starter = true): ProfileAvatarDefinition =>
  ({ id, name, imageUrl: `/cards/shattered-pacts/${art}.webp`, position, starter })

export const PROFILE_AVATARS: readonly ProfileAvatarDefinition[] = [
  portrait('archivist', 'Quicksilver Archivist', 'quicksilver_archivist', '50% 7%'),
  portrait('guardian', 'Alloy Guardian', 'alloy_guardian', '43% 0%'),
  portrait('envoy', 'Ashen Envoy', 'ashen_envoy', '50% 5%'),
  portrait('oracle', 'Gilded Oracle', 'gilded_oracle', '50% 14%'),
  portrait('squire', 'Mirror Squire', 'mirror_squire', '44% 12%'),
  portrait('seer', 'Crucible Seer', 'crucible_seer', '50% 16%'),
  portrait('sp-regent-portrait', 'The Regent', 'paradox_regent', '50% 0%', false),
  portrait('sp-titan-portrait', 'Prismatic Guardian', 'prism_titan', '50% 14%', false),
]
export const PROFILE_TITLES: readonly ProfileTitleDefinition[] = [
  { id: 'initiate', name: 'Initiate', starter: true },
  { id: 'challenger', name: 'Challenger', starter: true },
  { id: 'wanderer', name: 'Wanderer', starter: true },
  { id: 'sp-timebender', name: 'Timebender', starter: false },
  { id: 'sp-pactbreaker', name: 'Pactbreaker', starter: false },
]
export const DEFAULT_AVATAR_ID = 'archivist'
export const getProfileAvatar = (id: unknown) => PROFILE_AVATARS.find(avatar => avatar.id === id)
export const getProfileTitle = (id: unknown) => PROFILE_TITLES.find(title => title.id === id)
export const ownsProfileCosmetic = (cosmetic: { id: string; starter: boolean } | undefined, owned: Record<string, true>) =>
  Boolean(cosmetic && (cosmetic.starter || Object.hasOwn(owned, cosmetic.id) && owned[cosmetic.id] === true))

/** Only catalogue IDs travel over the wire; artwork and title text are resolved locally. */
export function sanitizePlayerCosmetics(input: { avatarId?: unknown; titleId?: unknown; avatarEmoji?: unknown }) {
  const legacy = typeof input.avatarEmoji === 'string' && ['🛡️', '⚔️', '🏹'].includes(input.avatarEmoji) ? 'guardian' : DEFAULT_AVATAR_ID
  return { avatarId: getProfileAvatar(input.avatarId)?.id ?? legacy, titleId: getProfileTitle(input.titleId)?.id ?? null }
}

export function restoreProfileCosmetics(input: { avatarId?: unknown; titleId?: unknown; avatarEmoji?: unknown; ownedAvatars?: unknown; ownedTitles?: unknown }) {
  const restoreOwned = (value: unknown, catalogue: readonly { id: string }[]): Record<string, true> =>
    Object.fromEntries(catalogue.filter(item => value && typeof value === 'object' && Object.hasOwn(value, item.id) && (value as Record<string, unknown>)[item.id] === true).map(item => [item.id, true]))
  const ownedAvatars = restoreOwned(input.ownedAvatars, PROFILE_AVATARS)
  const ownedTitles = restoreOwned(input.ownedTitles, PROFILE_TITLES)
  const chosen = sanitizePlayerCosmetics(input)
  return {
    ownedAvatars, ownedTitles,
    avatarId: ownsProfileCosmetic(getProfileAvatar(chosen.avatarId), ownedAvatars) ? chosen.avatarId : DEFAULT_AVATAR_ID,
    titleId: input.titleId === undefined ? 'initiate' : ownsProfileCosmetic(getProfileTitle(chosen.titleId), ownedTitles) ? chosen.titleId : null,
  }
}
