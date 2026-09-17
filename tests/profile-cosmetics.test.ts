import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { before, test } from 'node:test'
import { ArenaEngine, PROFILE_AVATARS, PROFILE_TITLES, getProfileAvatar, getProfileTitle, restoreProfileCosmetics, sanitizePlayerCosmetics } from '../packages/shared/src/index.ts'
import type { Room } from '../packages/shared/src/index.ts'
import { SEASON_REWARD_TRACK } from '../apps/web/src/lib/seasonPass.ts'

// Profile persistence is tested in memory, without changing the browser's selections.
const memory = new Map<string, string>([['tcg-auth', JSON.stringify({ version: 0, state: { displayName: 'Existing player', avatarEmoji: '🛡️', rank: 'Veteran', playerId: 'saved-player' } })]])
Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
  getItem: (key: string) => memory.get(key) ?? null,
  setItem: (key: string, value: string) => { memory.set(key, value) },
  removeItem: (key: string) => { memory.delete(key) },
} })
Object.defineProperty(globalThis, 'window', { configurable: true, value: { localStorage: globalThis.localStorage } })
let useAuthStore: typeof import('../apps/web/src/stores/useAuthStore.ts').useAuthStore
before(async () => { ({ useAuthStore } = await import('../apps/web/src/stores/useAuthStore.ts')) })

test('emoji profiles migrate to artwork without changing identity or granting premium cosmetics', () => {
  const state = useAuthStore.getState()
  assert.equal(state.avatarId, 'guardian')
  assert.equal(state.titleId, 'initiate')
  assert.equal(state.displayName, 'Existing player')
  assert.equal(state.rank, 'Veteran')
  assert.equal(state.playerId, 'saved-player')
  assert.deepEqual(state.ownedAvatars, {})
  assert.deepEqual(state.ownedTitles, {})
  assert.equal('avatarEmoji' in state, false)
})

test('portraits resolve to existing artwork and pass rewards use the same cosmetic catalogue', () => {
  assert.equal(new Set(PROFILE_AVATARS.map(avatar => avatar.id)).size, PROFILE_AVATARS.length)
  assert.equal(new Set(PROFILE_TITLES.map(title => title.id)).size, PROFILE_TITLES.length)
  for (const avatar of PROFILE_AVATARS) assert.ok(existsSync(`apps/web/public${avatar.imageUrl}`))
  for (const { premium } of SEASON_REWARD_TRACK) {
    if (premium.kind === 'avatar') {
      assert.equal(premium.imageUrl, getProfileAvatar(premium.id)?.imageUrl)
      assert.equal(premium.position, getProfileAvatar(premium.id)?.position)
      assert.equal(getProfileAvatar(premium.id)?.starter, false)
    } else if (premium.kind === 'title') {
      assert.equal(premium.name, getProfileTitle(premium.id)?.name)
      assert.equal(getProfileTitle(premium.id)?.starter, false)
    }
  }
})

test('equipping checks ownership; unlocked rewards and selections persist independently', async () => {
  const state = () => useAuthStore.getState()
  state().setAvatar('envoy')
  state().setTitle('wanderer')
  state().setAvatar('sp-regent-portrait')
  state().setTitle('sp-timebender')
  assert.equal(state().avatarId, 'envoy')
  assert.equal(state().titleId, 'wanderer')
  state().unlockProfileCosmetic('avatar', 'sp-regent-portrait')
  state().unlockProfileCosmetic('title', 'sp-timebender')
  assert.equal(state().avatarId, 'envoy', 'earning a reward must not replace the equipped portrait')
  state().setAvatar('sp-regent-portrait')
  state().setTitle('sp-timebender')
  await useAuthStore.persist.rehydrate()
  assert.equal(state().avatarId, 'sp-regent-portrait')
  assert.equal(state().titleId, 'sp-timebender')
  state().setAvatar('https://example.com/image.png')
  state().unlockProfileCosmetic('title', 'invented')
  assert.equal(state().avatarId, 'sp-regent-portrait')
  assert.deepEqual(state().ownedTitles, { 'sp-timebender': true })
  state().setTitle(null)
  await useAuthStore.persist.rehydrate()
  assert.equal(state().titleId, null)
  assert.deepEqual(state().ownedTitles, { 'sp-timebender': true })
})

test('invalid or unowned saved selections fall back safely', () => {
  assert.deepEqual(restoreProfileCosmetics({ avatarId: 'sp-regent-portrait', titleId: 'sp-timebender', ownedAvatars: { unknown: true }, ownedTitles: { 'sp-timebender': 'true' } }), {
    avatarId: 'archivist', titleId: null, ownedAvatars: {}, ownedTitles: {},
  })
  assert.deepEqual(sanitizePlayerCosmetics({ avatarId: 'https://example.com/portrait', titleId: '<script>' }), { avatarId: 'archivist', titleId: null })
  assert.deepEqual(restoreProfileCosmetics({ ownedAvatars: Object.create({ 'sp-regent-portrait': true }) }).ownedAvatars, {})
})

test('both match perspectives preserve their own and their opponent’s snapshotted profile', () => {
  const room: Room = { id: 'profile-test', name: 'Profiles', hostId: 'a', status: 'in_progress', maxPlayers: 2, isPrivate: true, createdAt: 0,
    players: [
      { id: 'a', displayName: 'Alice', avatarId: 'oracle', titleId: 'challenger', isReady: true },
      { id: 'b', displayName: 'Bob', avatarId: 'sp-regent-portrait', titleId: 'sp-timebender', isReady: true },
    ] }
  const engine = new ArenaEngine(room)
  room.players[0].avatarId = 'guardian'
  for (const viewer of ['a', 'b']) {
    const { players } = engine.getStateFor(viewer)
    assert.equal(players.a.avatarId, 'oracle')
    assert.equal(players.a.titleId, 'challenger')
    assert.equal(players.b.avatarId, 'sp-regent-portrait')
    assert.equal(players.b.titleId, 'sp-timebender')
    assert.equal(players.a.avatarEmoji, undefined)
  }
})
