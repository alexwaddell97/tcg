import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { ArenaQuestReceipt } from '../packages/shared/src/index.ts'
import { CURRENT_SEASON, emptySeasonProgress, advanceSeasonQuests, claimFreeSeasonLevel, seasonLevel, SEASON_REWARD_TRACK, seasonQuestProgress } from '../apps/web/src/lib/seasonPass.ts'
const during = CURRENT_SEASON.startsAt + 1000
const receipt = (id: string, finishedAt = during): ArenaQuestReceipt => ({ matchId: id, finishedAt, metrics: { unitsPlayed: 10, spellsPlayed: 3, aetherSpent: 20, arenasWon: 3, powerArenas: 1, matchesWon: 1 } })

test('only completed gameplay quests give XP; finishing matches or partial objectives gives none', () => {
  const idle = receipt('idle'); for (const key of Object.keys(idle.metrics) as (keyof typeof idle.metrics)[]) idle.metrics[key] = 0
  let progress = advanceSeasonQuests(emptySeasonProgress(), idle, during).progress
  assert.equal(progress.xp, 0)
  for (let i = 0; i < 3; i++) progress = advanceSeasonQuests(progress, receipt(`match-${i}`), during).progress
  assert.equal(progress.xp, 0)
  assert.equal(progress.quests!.counts.season_units, 30)
  const completed = advanceSeasonQuests(progress, receipt('match-3'), during)
  assert.equal(completed.earnedXP, 1200)
  assert.equal(completed.progress.quests!.completed.length, 6)
  assert.equal(seasonLevel(completed.progress.xp), 7)
  assert.equal(advanceSeasonQuests(completed.progress, receipt('match-3'), during).progress, completed.progress)
  assert.equal(advanceSeasonQuests(completed.progress, receipt('extra'), during).earnedXP, 0)
})

test('weekly objectives reset independently of XP and reward claims; old matches cannot enter the next week', () => {
  let progress = { ...emptySeasonProgress(), xp: 600, claimed: [1, 2] }
  for (let i = 0; i < 4; i++) progress = advanceSeasonQuests(progress, receipt(`week-1-${i}`), during).progress
  const nextWeek = during + 7 * 86_400_000
  assert.deepEqual(seasonQuestProgress(progress, nextWeek), { week: 2, counts: {}, completed: [] })
  assert.equal(advanceSeasonQuests(progress, receipt('old-unseen'), nextWeek).progress, progress)
  for (let i = 0; i < 4; i++) progress = advanceSeasonQuests(progress, receipt(`week-2-${i}`, nextWeek), nextWeek).progress
  assert.equal(progress.xp, 3000)
  assert.deepEqual(progress.claimed, [1, 2])
  const thirdWeek = nextWeek + 7 * 86_400_000
  for (let i = 0; i < 4; i++) progress = advanceSeasonQuests(progress, receipt(`week-3-${i}`, thirdWeek), thirdWeek).progress
  assert.equal(progress.xp, 3800)
  assert.equal(seasonLevel(progress.xp), 20)
})

test('season boundaries reject early, late and invalid quest receipts', () => {
  const progress = emptySeasonProgress()
  for (const when of [CURRENT_SEASON.startsAt - 1, CURRENT_SEASON.endsAt]) {
    assert.equal(advanceSeasonQuests(progress, receipt('outside', when), when).progress, progress)
  }
  assert.equal(advanceSeasonQuests(progress, { ...receipt('invalid'), metrics: { ...receipt('x').metrics, aetherSpent: 10000 } }, during).progress, progress)
  assert.equal(advanceSeasonQuests(progress, receipt('finished-before', CURRENT_SEASON.startsAt - 1), during).progress, progress)
})

test('claims cannot repeat or skip levels; earned free rewards survive season end', () => {
  let progress = emptySeasonProgress()
  assert.equal(claimFreeSeasonLevel(progress, 2, during), null)
  assert.equal(claimFreeSeasonLevel(progress, 0, during), null)
  assert.equal(claimFreeSeasonLevel(progress, 1.5, during), null)
  assert.equal(claimFreeSeasonLevel(progress, 1, CURRENT_SEASON.startsAt - 1), null)
  const first = claimFreeSeasonLevel(progress, 1, during)!
  assert.deepEqual(first.reward, { kind: 'gems', amount: 20 })
  progress = first.progress
  assert.equal(claimFreeSeasonLevel(progress, 1, during), null)
  for (let i = 0; i < 4; i++) progress = advanceSeasonQuests(progress, receipt(`match-${i}`), during).progress
  assert.deepEqual(claimFreeSeasonLevel(progress, 5, CURRENT_SEASON.endsAt + 1000)!.reward, { kind: 'gems', amount: 40 })
  assert.equal(seasonLevel(999999), CURRENT_SEASON.levels)
  assert.equal(claimFreeSeasonLevel({ ...progress, xp: 999999 }, 21, during), null)
})

test('the pass has exactly two premium cards, all cosmetic types, and a gems-only free track', () => {
  assert.equal(SEASON_REWARD_TRACK.length, 20)
  assert.deepEqual(SEASON_REWARD_TRACK.map(tier => tier.level), Array.from({ length: 20 }, (_, i) => i + 1))
  assert.ok(SEASON_REWARD_TRACK.every(tier => tier.free.kind === 'gems' && tier.free.amount <= 40))
  assert.deepEqual(SEASON_REWARD_TRACK.filter(tier => tier.premium.kind === 'card').map(tier => tier.level), [1, 20])
  assert.deepEqual(new Set(SEASON_REWARD_TRACK.map(tier => tier.premium.kind)), new Set(['card', 'gems', 'title', 'avatar', 'card_back', 'variant']))
  const variants = SEASON_REWARD_TRACK.flatMap(tier => tier.premium.kind === 'variant' ? [tier.premium] : [])
  assert.equal(variants[0].definitionId, CURRENT_SEASON.featuredCard)
  assert.notEqual(variants[0].id, variants[0].definitionId)
})
