import { ARENA_STARTER_DECK, ArenaEngine } from '@tcg/shared'
import type { ArenaArchetype, ArenaIndex, ArenaRule, ArenaSlotIndex, GameState, Room } from '@tcg/shared'

/** Both new lineups resolve through the real engine without awarding preview rewards. */
export function createArenaLocationsDemo(lineup: 'formation' | 'tricks'): { before: GameState; after: GameState } {
  const rules: ArenaRule[] = lineup === 'formation' ? ['chainbridge', 'leyline_nexus', 'ashen_orchard'] : ['bellmarsh', 'mirror_reservoir', 'gilded_exchange']
  const first = lineup === 'formation' ? ['village_scout', 'bone_knight', 'iron_golem', 'candle_tender', 'ritual_caster'] : ['village_scout', 'tainted_idol', 'bone_knight', 'temper', 'ashen_envoy']
  const deck = (first: string[]) => [...new Set([...first, ...ARENA_STARTER_DECK])].slice(0, 12)
  const room: Room = { id: crypto.randomUUID(), name: 'Arena effects preview', hostId: 'you', status: 'in_progress', maxPlayers: 2, isPrivate: true, createdAt: 0,
    players: ['you', 'bot'].map(id => ({ id, displayName: id === 'you' ? 'You' : 'Sparring partner', avatarId: id === 'you' ? 'archivist' : 'guardian', isReady: true,
      deckDefinitionIds: deck(id === 'you' ? first : ['village_scout', 'bone_knight', 'iron_golem', 'temper']) })) }
  const engine = new ArenaEngine(room, { shuffle: false, locationRules: rules })
  type Play = [string, ArenaIndex, ArenaSlotIndex?]
  const turn = (a: Play[] = [], b: Play[] = []) => {
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
  if (lineup === 'formation') {
    turn([['village_scout', 1, 0]], [['village_scout', 0, 0]])
    turn([['bone_knight', 0, 1]], [['bone_knight', 2, 0]])
    turn([['iron_golem', 0, 0]], [['iron_golem', 1, 0]])
  } else {
    turn([['village_scout', 0, 0]], [['village_scout', 1, 0]])
    turn([['tainted_idol', 2, 3]], [['bone_knight', 2, 3]])
    turn([['bone_knight', 1, 0]], [['iron_golem', 1, 1]])
  }
  const before = engine.getStateFor('you')
  if (lineup === 'formation') turn([['candle_tender', 0, 2], ['ritual_caster', 1, 1]])
  else turn([['temper', 0], ['ashen_envoy', 1, 1]], [['temper', 0]])
  return { before, after: engine.getStateFor('you') }
}

/** Real final-turn resolutions for reviewing each visual language in isolation. */
export function createArenaArchetypeDemo(archetype: ArenaArchetype): { before: GameState; after: GameState } {
  const finishers: Record<ArenaArchetype, [string, ArenaIndex][]> = {
    transmutation: [['mercury_scholar', 1], ['silver_equation', 0]],
    sabotage: [['thorn_seeder', 0], ['ashen_envoy', 1]],
    affliction: [['unmaking', 0], ['rot_scribe', 1]],
    conduits: [['current_runner', 1], ['sunwell_keeper', 0]],
    formation: [['bridge_marshal', 0], ['hold_the_line', 0]],
    wayfarers: [['waystone_pilgrim', 0], ['wayward_current', 0]],
    invocation: [['rune_attendant', 0], ['cinder_script', 0]],
    stewardship: [['chain_anchor', 0], ['master_forger', 0]],
  }
  const deck = (first: string[]) => [...new Set([...first, ...ARENA_STARTER_DECK])].slice(0, 12)
  const room: Room = { id: crypto.randomUUID(), name: `${archetype} preview`, hostId: 'you', status: 'in_progress', maxPlayers: 2, isPrivate: true, createdAt: 0,
    players: ['you', 'bot'].map(id => ({ id, displayName: id === 'you' ? 'You' : 'Sparring partner', avatarId: id === 'you' ? 'archivist' : 'guardian', isReady: true,
      deckDefinitionIds: deck(['village_scout', 'mountain_hermit', ...(id === 'you' ? finishers[archetype].map(([card]) => card) : [])]) })) }
  const engine = new ArenaEngine(room, { shuffle: false })
  const commit = (id: string, cards: [string, ArenaIndex][] = []) => {
    const state = engine.getStateFor(id)
    const plays = cards.map(([definitionId, locationIndex]) => {
      const card = state.hand!.find(card => card.definitionId === definitionId)
      if (!card) throw new Error(`Missing preview card: ${definitionId}`)
      return { cardInstanceId: card.instanceId, locationIndex }
    })
    const result = engine.processAction({ type: 'commit_turn', playerId: id, submission: { turn: state.turn, plays }, timestamp: 0 })
    if (!result.success) throw new Error(result.error)
  }
  commit('you', [['village_scout', 0]]); commit('bot', [['village_scout', 0]])
  commit('you', [['mountain_hermit', 1]]); commit('bot', [['mountain_hermit', 1]])
  while (engine.getStateFor('you').turn < 6) { commit('you'); commit('bot') }
  const before = engine.getStateFor('you')
  commit('you', finishers[archetype]); commit('bot')
  return { before, after: engine.getStateFor('you') }
}

/** A repeatable final turn with a drain, spells, movement and end-of-turn growth. */
export function createArenaEffectsDemo(): { before: GameState; after: GameState } {
  const deck = (first: string[]) => [...new Set([...first, ...ARENA_STARTER_DECK])].slice(0, 12)
  const room: Room = { id: crypto.randomUUID(), name: 'Effects preview', hostId: 'you', status: 'in_progress', maxPlayers: 2, isPrivate: true, createdAt: 0,
    players: [
      { id: 'you', displayName: 'You', avatarId: 'archivist', isReady: true, deckDefinitionIds: deck(['village_scout', 'mountain_hermit', 'temper', 'phase_walk', 'arcane_echo']) },
      { id: 'bot', displayName: 'Sparring partner', avatarId: 'guardian', isReady: true, deckDefinitionIds: deck(['village_scout', 'mountain_hermit', 'banshee_queen']) },
    ] }
  const engine = new ArenaEngine(room, { shuffle: false })
  const commit = (id: string, cards: [string, ArenaIndex][]) => {
    const state = engine.getStateFor(id)
    const plays = cards.map(([definitionId, locationIndex]) => ({ cardInstanceId: state.hand!.find(card => card.definitionId === definitionId)!.instanceId, locationIndex }))
    const result = engine.processAction({ type: 'commit_turn', playerId: id, submission: { turn: state.turn, plays }, timestamp: 0 })
    if (!result.success) throw new Error(result.error)
  }
  commit('you', [['village_scout', 0]]); commit('bot', [['village_scout', 1]])
  commit('you', [['mountain_hermit', 1]]); commit('bot', [['mountain_hermit', 0]])
  while (engine.getStateFor('you').turn < 6) { commit('you', []); commit('bot', []) }
  const before = engine.getStateFor('you')
  commit('you', [['temper', 1], ['phase_walk', 0], ['arcane_echo', 0]])
  commit('bot', [['banshee_queen', 0]])
  return { before, after: engine.getStateFor('you') }
}

export function createArenaEndingDemo(outcome: 'victory' | 'defeat' | 'draw' = 'victory'): { before: GameState; after: GameState } {
  const room: Room = { id: crypto.randomUUID(), name: 'Ending preview', hostId: 'you', status: 'in_progress', maxPlayers: 2, isPrivate: true, createdAt: 0,
    players: ['you', 'bot'].map(id => ({ id, displayName: id === 'you' ? 'You' : 'Sparring partner', avatarId: id === 'you' ? 'archivist' : 'guardian', isReady: true })) }
  const engine = new ArenaEngine(room, { shuffle: false })
  const commit = (id: string, locationIndex?: ArenaIndex) => {
    const state = engine.getStateFor(id)
    const plays = locationIndex === undefined ? [] : [{ cardInstanceId: state.hand!.find(card => card.definitionId === 'village_scout')!.instanceId, locationIndex }]
    const result = engine.processAction({ type: 'commit_turn', playerId: id, submission: { turn: state.turn, plays }, timestamp: 0 })
    if (!result.success) throw new Error(result.error)
  }
  commit('you', outcome === 'defeat' ? 1 : 0)
  commit('bot', outcome === 'victory' ? 1 : 0)
  while (engine.getStateFor('you').turn < 6) { commit('you'); commit('bot') }
  const before = engine.getStateFor('you')
  commit('you'); commit('bot')
  return { before, after: engine.getStateFor('you') }
}
