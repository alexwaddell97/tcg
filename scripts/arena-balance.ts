/** Reproducible balance diagnostics, not an estimate of human ladder win rates.
 * Each chooser sees only its own hand, its deck composition and the public board.
 * It previews ordered plans against an opponent who passes; future draws are sampled
 * from the known remaining composition, never from the actual shuffled deck order.
 */
import { writeFileSync } from 'node:fs'
import { ARENA_ARCHETYPE_DECKS, ARENA_CARD_DATABASE, ARENA_STARTER_DECK, ARENA_LOCATIONS, ARENA_POSITIONS, ArenaEngine,
  getArenaAbilities, getArenaCardPower, getArenaLocationPower, getArenaPlanError } from '../packages/shared/src/index.ts'
import type { ArenaIndex, ArenaPlay, Card, GameState, Room } from '../packages/shared/src/index.ts'

const options = Object.fromEntries(process.argv.slice(2).map(arg => arg.replace(/^--/, '').split('=')))
const samples = Number(options.samples ?? 3), seed = Number(options.seed ?? 7319)
const definitions = new Map(ARENA_CARD_DATABASE.map(card => [card.definitionId, card]))
const decks = [{ id: 'balanced', name: 'Arena Starter', cards: ARENA_STARTER_DECK }, ...ARENA_ARCHETYPE_DECKS].filter(deck => !options.decks || options.decks.split(',').includes(deck.id))
function random(seed: number) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t ^= t + Math.imul(t ^ t >>> 7, 61 | t); return ((t ^ t >>> 14) >>> 0) / 4294967296 } }
function shuffled<T>(array: T[], rng: () => number) { const copy = [...array]; for (let i = copy.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [copy[i], copy[j]] = [copy[j], copy[i]] } return copy }
function card(id: string, index: number): Card { return { ...structuredClone(definitions.get(id)!), instanceId: `sample-${index}-${id}`, questProgress: 0, isTransformed: false, powerBonus: 0 } }
function room(a: string[], b: string[]): Room { return { id: 'diagnostic', name: 'Balance diagnostic', hostId: 'a', status: 'in_progress', maxPlayers: 2, isPrivate: true, createdAt: 0,
  players: [{ id: 'a', displayName: 'A', isReady: true, deckDefinitionIds: a }, { id: 'b', displayName: 'B', isReady: true, deckDefinitionIds: b }] } }

function preview(view: GameState, owner: string, plays: ArenaPlay[], remaining: string[]) {
  const other = owner === 'a' ? 'b' : 'a'
  // Test-only fixture: build from the viewer's public snapshot, not a live engine.
  const state = structuredClone({ ...view, phase: 'planning' as const, log: [], arena: { ...view.arena!, lastReveal: undefined,
    lockedIn: { a: false, b: false }, committedPlays: [] } })
  const simulation = Object.assign(new ArenaEngine(room(ARENA_STARTER_DECK, ARENA_STARTER_DECK), { shuffle: false }), {
    state, hands: new Map([[owner, structuredClone(view.hand!)], [other, []]]),
    decks: new Map([[owner, remaining.map(card)], [other, []]]), plans: new Map(), pending: new Map(),
    drawTransmutes: new Map([[owner, view.arena!.transmutesPending ?? 0]]), forgeTriggers: new Set(), spellTriggers: new Set(), onStateChange: null,
  })
  simulation.processAction({ type: 'commit_turn', playerId: owner, timestamp: 0, submission: { turn: view.turn, plays } })
  simulation.processAction({ type: 'commit_turn', playerId: other, timestamp: 0, submission: { turn: view.turn, plays: [] } })
  return simulation.getStateFor(owner)
}
function score(view: GameState, owner: string, turn: number) {
  const other = owner === 'a' ? 'b' : 'a', remaining = 6 - turn
  let value = 0
  const gaps = view.arena!.locations.map(site => getArenaLocationPower(site, owner) - getArenaLocationPower(site, other))
  for (const gap of gaps) value += Math.tanh(gap / (4 + remaining)) * (remaining ? 6 : 12) + gap * .12
  if (!remaining) return value + (view.winner === owner ? 40 : view.winner === other ? -40 : 0)
  for (const site of view.arena!.locations) for (const { card } of site.cards[owner]) {
    const abilities = getArenaAbilities(card)
    value += abilities.reduce((n, ability) => n + (ability.type === 'grow' ? ability.value * remaining * .4 : ability.timing === 'spell' ? remaining * .35 : 0), 0)
    if (getArenaCardPower(site, owner, card) <= 0 && card.type === 'unit') value -= .25
    if (card.type === 'relic') value += abilities.reduce((n, ability) => n +
      (ability.type === 'incubate' ? Math.min(5, remaining * 2) * .5 : ability.type === 'adjacent_aura' ? ability.value * remaining * .2 : ability.type === 'warding_bell' ? .35 : ability.type === 'aether_battery' ? (card.arenaRelicCharge ?? 0) * .25 : 0), 0)
    if (!card.arenaMoved && view.hand!.some(held => getArenaAbilities(held).some(ability => ability.type === 'move' || ability.type === 'march'))) {
      value += abilities.filter(ability => ability.type === 'moved_power').reduce((sum, ability) => sum + ability.value * .4, 0)
    }
  }
  for (const card of view.hand!) {
    value += .4 + Math.max(0, card.powerBonus) * .25
    if (card.arenaTransmuted) value += Math.max(0, (definitions.get(card.definitionId)?.cost ?? card.cost) - card.cost) * .45
  }
  value += (view.arena!.transmutesPending ?? 0) * Math.min(remaining, 2) * .4
  return value
}
function choose(view: GameState, owner: string, remaining: string[]) {
  const cache = new Map<string, { plays: ArenaPlay[]; value: number }>()
  const evaluate = (plays: ArenaPlay[]) => {
    const key = plays.map(play => `${play.cardInstanceId}@${play.locationIndex}:${play.slotIndex ?? 'spell'}`).join('/')
    if (!cache.has(key)) cache.set(key, { plays, value: score(preview(view, owner, plays, remaining), owner, view.turn) })
    return cache.get(key)!
  }
  let best = evaluate([]), beam = [best]
  for (let depth = 0; depth < view.hand!.length; depth++) {
    const candidates: typeof beam = []
    for (const entry of beam) for (const card of view.hand!) for (const site of view.arena!.locations) for (const slotIndex of card.type === 'spell' ? [undefined] : ARENA_POSITIONS) {
      const plays = [...entry.plays, { cardInstanceId: card.instanceId, locationIndex: site.index, slotIndex }]
      if (getArenaPlanError(view, owner, view.hand!, plays)) continue
      const candidate = evaluate(plays); candidates.push(candidate)
      if (candidate.value > best.value + .001) best = candidate
    }
    beam = candidates.sort((a, b) => b.value - a.value).slice(0, 2)
    if (!beam.length) break
  }
  return best.plays
}

const results = decks.map(deck => ({ id: deck.id, games: 0, wins: 0, draws: 0, energy: [0, 0, 0, 0, 0, 0], passes: [0, 0, 0, 0, 0, 0], power: 0, plays: 0 }))
const matchups: { a: string; b: string; winsA: number; draws: number; games: number }[] = []
const traces: unknown[] = []
for (let a = 0; a < decks.length; a++) for (let b = a + 1; b < decks.length; b++) {
  const matchup = { a: decks[a].id, b: decks[b].id, winsA: 0, draws: 0, games: samples * 2 }
  for (let run = 0; run < samples; run++) for (let seat = 0; seat < 2; seat++) {
    const rng = random(seed + a * 10000 + b * 1000 + run * 10)
    const lists = [shuffled(decks[a].cards, rng), shuffled(decks[b].cards, rng)]
    const pairing = seat ? [b, a] : [a, b]
    const engine = new ArenaEngine(room(lists[seat], lists[1 - seat]), { shuffle: false, locationRules: shuffled([...ARENA_LOCATIONS], rng).slice(0, 3).map(site => site.rule) })
    const seen = { a: new Set<string>(), b: new Set<string>() }, trace: unknown[] = []
    for (let turn = 1; turn <= 6; turn++) {
      const plans = ['a', 'b'].map((owner, index) => {
        const view = engine.getStateFor(owner)
        view.hand!.forEach(card => seen[owner as 'a' | 'b'].add(card.definitionId))
        const unknown = shuffled(decks[pairing[index]].cards.filter(id => !seen[owner as 'a' | 'b'].has(id)), random(seed + turn))
        const plays = choose(view, owner, unknown)
        const used = plays.reduce((sum, play) => sum + view.hand!.find(card => card.instanceId === play.cardInstanceId)!.cost, 0)
        results[pairing[index]].energy[turn - 1] += used
        results[pairing[index]].passes[turn - 1] += Number(!plays.length)
        results[pairing[index]].plays += plays.length
        trace.push({ turn, deck: decks[pairing[index]].id, energy: used,
          plays: plays.map(play => `${view.hand!.find(card => card.instanceId === play.cardInstanceId)!.name} → arena ${play.locationIndex + 1}${play.slotIndex === undefined ? '' : `, position ${play.slotIndex + 1}`}`) })
        return plays
      })
      plans.forEach((plays, index) => {
        const outcome = engine.processAction({ type: 'commit_turn', playerId: index ? 'b' : 'a', timestamp: 0, submission: { turn, plays } })
        if (!outcome.success) throw new Error(outcome.error)
      })
    }
    const final = engine.getStateFor('a')
    pairing.forEach((deck, index) => { const owner = index ? 'b' : 'a'; results[deck].games++; results[deck].wins += Number(final.winner === owner); results[deck].draws += Number(!final.winner); results[deck].power += final.arena!.locations.reduce((sum, site) => sum + getArenaLocationPower(site, owner), 0) })
    matchup.winsA += Number(final.winner === (seat ? 'b' : 'a')); matchup.draws += Number(!final.winner)
    if (!run && !seat) traces.push({ pairing: [decks[a].id, decks[b].id], turns: trace, winner: final.winner ? decks[pairing[final.winner === 'a' ? 0 : 1]].id : 'draw' })
  }
  matchups.push(matchup)
  process.stderr.write(`${matchup.a} / ${matchup.b}: ${matchup.winsA}-${matchup.games - matchup.winsA - matchup.draws} (${matchup.draws} draws)\n`)
}
const output = { method: 'Public-information two-branch beam, real engine, sampled own draws, opponent passes in previews; directional only.', seed, samples,
  results: results.map(row => ({ ...row, winRate: +((row.wins + row.draws / 2) / row.games * 100).toFixed(1), energy: row.energy.map(n => +(n / row.games).toFixed(2)), passes: row.passes.map(n => +(n / row.games * 100).toFixed(1)), power: +(row.power / row.games).toFixed(1), plays: +(row.plays / row.games).toFixed(1) })), matchups, traces }
if (options.output) writeFileSync(options.output, JSON.stringify(output, null, 2) + '\n')
console.log(JSON.stringify(output.results, null, 2))
