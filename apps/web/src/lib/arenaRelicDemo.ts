import { ARENA_STARTER_DECK, ArenaEngine } from '@tcg/shared'
import type { ArenaIndex, ArenaSlotIndex, Room } from '@tcg/shared'

/** Real six-turn setup: no collection, currency or mastery mutations. */
export function createArenaRelicDemo() {
  const deck = (first: string[]) => [...new Set([...first, ...ARENA_STARTER_DECK])].slice(0, 12)
  const room: Room = { id: crypto.randomUUID(), name: 'Relics preview', hostId: 'you', status: 'in_progress', maxPlayers: 2, isPrivate: true, createdAt: 0,
    players: ['you', 'bot'].map(id => ({ id, displayName: id === 'you' ? 'You' : 'Sparring partner', avatarId: id === 'you' ? 'archivist' : 'guardian', isReady: true,
      deckDefinitionIds: deck(id === 'you' ? ['aether_battery', 'war_standard', 'spellfont', 'warding_bell', 'village_scout', 'bone_knight', 'ember_incubator', 'temper', 'iron_golem']
        : ['village_scout', 'bone_knight', 'iron_golem', 'salt_hex']) })) }
  const engine = new ArenaEngine(room, { shuffle: false })
  type Play = [string, ArenaIndex, ArenaSlotIndex?]
  const turn = (a: Play[], b: Play[] = []) => {
    for (const [id, cards] of [['you', a], ['bot', b]] as const) {
      const state = engine.getStateFor(id)
      const plays = cards.map(([definitionId, locationIndex, slotIndex]) => {
        const card = state.hand!.find(card => card.definitionId === definitionId)
        if (!card) throw new Error(`Missing preview card: ${definitionId}`)
        return { cardInstanceId: card.instanceId, locationIndex, slotIndex }
      })
      const result = engine.processAction({ type: 'commit_turn', playerId: id, submission: { turn: state.turn, plays }, timestamp: 0 })
      if (!result.success) throw new Error(result.error)
    }
  }
  turn([['aether_battery', 0, 0]], [['village_scout', 0, 0]])
  turn([['war_standard', 0, 2]], [['bone_knight', 1, 0]])
  turn([['spellfont', 1, 1], ['village_scout', 2, 1]], [['iron_golem', 2, 0]])
  turn([['warding_bell', 2, 2]])
  turn([['ember_incubator', 2, 3], ['bone_knight', 1, 0]])
  const before = engine.getStateFor('you')
  turn([['iron_golem', 0, 1], ['temper', 1]], [['salt_hex', 2]])
  return { before, after: engine.getStateFor('you') }
}
