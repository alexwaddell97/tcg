import assert from 'node:assert/strict'
import { test } from 'node:test'
import { ArenaEngine, ARENA_ARCHETYPE_DECKS, ARENA_STARTER_DECK, getArenaPlanError } from '../packages/shared/src/index.ts'
import type { Room } from '../packages/shared/src/index.ts'
import { choosePracticePlays } from '../apps/web/src/lib/arenaPracticeBot.ts'

function match(deck: string[]) {
  const room: Room = { id: 'bot-test', name: 'Bot', hostId: 'you', status: 'in_progress', maxPlayers: 2, isPrivate: true, createdAt: 0,
    players: ['you', 'bot'].map(id => ({ id, displayName: id, isReady: true, deckDefinitionIds: id === 'bot' ? deck : ARENA_STARTER_DECK })) }
  return new ArenaEngine(room, { shuffle: false })
}
test('the practice opponent puts a flanker at an outer position', () => {
  const game = match(ARENA_ARCHETYPE_DECKS.find(deck => deck.id === 'formation')!.cards)
  const view = game.getStateFor('bot'), plan = choosePracticePlays(view)
  const flanker = plan.find(play => view.hand!.find(card => card.instanceId === play.cardInstanceId)?.definitionId === 'iron_flanker')!
  assert.ok(flanker)
  assert.ok(flanker.slotIndex === 0 || flanker.slotIndex === 3)
})
test('all eight practice decks submit legal ordered positions through a whole match', () => {
  for (const deck of ARENA_ARCHETYPE_DECKS) {
    const game = match(deck.cards)
    for (let turn = 1; turn <= 6; turn++) {
      const view = game.getStateFor('bot'), plan = choosePracticePlays(view)
      assert.equal(getArenaPlanError(view, 'bot', view.hand!, plan), null, `${deck.id}: turn ${turn}`)
      for (const owner of ['bot', 'you']) assert.equal(game.processAction({ type: 'commit_turn', playerId: owner, timestamp: 0,
        submission: { turn, plays: owner === 'bot' ? plan : [] } }).success, true)
    }
    assert.equal(game.getStateFor('bot').phase, 'game_over')
  }
})
