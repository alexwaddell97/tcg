import { applyCardVariant, sanitizeCardVariants } from '../constants/cardVariants.ts'
import { sanitizePlayerCosmetics } from '../constants/profileCosmetics.ts'
import type { ArenaAbility, Card, CardDefinition } from '../types/card.ts'
import type { Room } from '../types/lobby.ts'
import type { ArenaQuestMetrics } from '../types/quests.ts'
import type { GameAction, GameState, PlayerState } from '../types/game.ts'
import type { ArenaIndex, ArenaLocation, ArenaPlay, ArenaRule, ArenaSlotIndex, ArenaTurnSubmission } from '../types/arena.ts'
import { ARENA_CARD_DATABASE, ARENA_LOCATIONS, ARENA_STARTER_DECK, ARENA_STARTING_HAND, ARENA_MAX_HAND, ARENA_TURNS, ARENA_SLOTS, ARENAS_PER_MATCH, getArenaDeckError } from '../constants/arena.ts'
import { getArenaCardPower, getArenaLocationPower, getArenaMatchScore, getArenaPlanError } from './arena.ts'
import { shuffle } from './deck.ts'
import { getArenaAbilities } from './arenaAbilities.ts'
import { ARENA_TOKEN_DATABASE } from '../constants/arenaExpansion.ts'
import { EMBERLING } from '../constants/arenaRelics.ts'
import { CARD_PLAY_XP, sanitizeCardBorders } from '../constants/cardMastery.ts'
import { ARENA_POSITIONS, getArenaFormation, getArenaNeighbours, resolveArenaPlaySlots } from './arenaFormation.ts'

type PendingCard = { card: Card; locationIndex: ArenaIndex; slotIndex?: ArenaSlotIndex }
type BoardCard = { card: Card; owner: string; location: ArenaLocation }
const instance = (definition: CardDefinition): Card => ({ ...structuredClone(definition), instanceId: crypto.randomUUID(), questProgress: 0, isTransformed: false, powerBonus: 0, cosmeticBorder: 'bronze' })

/** The server and local practice use the same rules and private-hand boundaries. */
export class ArenaEngine {
  private state: GameState
  private hands = new Map<string, Card[]>()
  private decks = new Map<string, Card[]>()
  private plans = new Map<string, ArenaPlay[]>()
  private pending = new Map<string, PendingCard[]>()
  private drawTransmutes = new Map<string, number>()
  private forgeTriggers = new Set<string>()
  private spellTriggers = new Set<string>()
  private bellmarshSpells = new Map<string, Card>()
  private unspentAether = new Map<string, number>()
  private relicReactions: { owner: string; card: Card; location: ArenaLocation; type: ArenaAbility['type'] }[] = []
  private startingDecks = new Map<string, Set<string>>()
  private playedCards = new Map<string, Set<string>>()
  private finishedNaturally = false
  private finishedAt = 0
  private questMetrics = new Map<string, ArenaQuestMetrics>()
  private masteryMatchId = crypto.randomUUID()
  onStateChange: (() => void) | null = null

  constructor(room: Room, options: { shuffle?: boolean; locationRules?: readonly ArenaRule[] } = {}) {
    if (room.players.length !== 2 || room.players[0].id === room.players[1].id) throw new Error('An arena match needs two different players.')
    if (options.locationRules && (options.locationRules.length !== ARENAS_PER_MATCH || new Set(options.locationRules).size !== ARENAS_PER_MATCH || options.locationRules.some(rule => !ARENA_LOCATIONS.some(location => location.rule === rule)))) throw new Error('Choose three different arena rules.')
    const players: Record<string, PlayerState> = {}
    for (const player of room.players) {
      const error = getArenaDeckError(player.deckDefinitionIds)
      if (error) throw new Error(error)
      const ids = player.deckDefinitionIds ?? ARENA_STARTER_DECK
      const borders = sanitizeCardBorders(player.cardBorders, ids)
      const variants = sanitizeCardVariants(player.cardVariants, ids)
      this.startingDecks.set(player.id, new Set(ids))
      this.playedCards.set(player.id, new Set())
      this.questMetrics.set(player.id, { unitsPlayed: 0, spellsPlayed: 0, aetherSpent: 0, arenasWon: 0, powerArenas: 0, matchesWon: 0 })
      const cards = ids.map(id => ({ ...instance(applyCardVariant(ARENA_CARD_DATABASE.find(card => card.definitionId === id)!, variants[id])), cosmeticBorder: borders[id] }))
      const deck = options.shuffle === false ? cards : shuffle(cards)
      this.hands.set(player.id, deck.splice(0, ARENA_STARTING_HAND))
      this.decks.set(player.id, deck)
      players[player.id] = { id: player.id, displayName: player.displayName, ...sanitizePlayerCosmetics(player), rank: player.rank ?? 'Initiate',
        handCount: ARENA_STARTING_HAND, deckCount: deck.length, isConnected: true, hasPassed: false, roundWins: 0, chosenLocationIds: ['the_forge', 'the_sanctum'] }
    }
    // Sample without replacement; the deterministic override is used only by fixtures/previews.
    const definitions = options.locationRules ? options.locationRules.map(rule => ARENA_LOCATIONS.find(location => location.rule === rule)!)
      : (options.shuffle === false ? ARENA_LOCATIONS : shuffle(ARENA_LOCATIONS)).slice(0, ARENAS_PER_MATCH)
    const locations: ArenaLocation[] = definitions.map((definition, index) => ({ ...definition, index: index as ArenaIndex,
      revealTurn: index + 1, revealed: index === 0, cards: Object.fromEntries(room.players.map(player => [player.id, []])) }))
    this.state = { roomId: room.id, boardType: 'arena', phase: 'planning', turn: 1, round: 1, players,
      activePlayerId: room.players[0].id, pendingPlays: {}, startedAt: Date.now(), log: [],
      arena: { totalTurns: ARENA_TURNS, energy: 1, locations, lockedIn: Object.fromEntries(room.players.map(player => [player.id, false])), revealFirstPlayerId: room.players[0].id, lastRevealTurn: 0 } }
    room.players.forEach(player => this.draw(player.id, 1))
    this.log('Six turns. Win two arenas. Lock in your cards to reveal together.')
  }

  getStateFor(playerId: string): GameState {
    const view = structuredClone(this.state)
    view.viewerPlayerId = view.players[playerId] ? playerId : undefined
    view.hand = structuredClone(this.hands.get(playerId) ?? [])
    view.arena!.transmutesPending = this.drawTransmutes.get(playerId) ?? 0
    view.arena!.committedPlays = structuredClone(this.plans.get(playerId) ?? [])
    if (this.finishedNaturally && this.playedCards.has(playerId)) {
      view.arena!.masteryReward = { matchId: `${this.masteryMatchId}:${playerId}`, cards: [...this.playedCards.get(playerId)!].map(definitionId => ({ definitionId, xp: CARD_PLAY_XP })) }
      view.arena!.questReceipt = { matchId: `${this.masteryMatchId}:${playerId}`, finishedAt: this.finishedAt, metrics: structuredClone(this.questMetrics.get(playerId)!) }
    }
    // Future rules and the other player's submitted cards stay server-side.
    for (const location of view.arena!.locations) {
      if (!location.revealed) {
        location.definitionId = 'unrevealed'
        location.name = 'Uncharted arena'
        location.description = `Reveals on turn ${location.revealTurn}. You can play here now.`
        delete location.rule
      }
    }
    return view
  }

  processAction(action: GameAction): { success: boolean; error?: string; newState: GameState } {
    const fail = (error: string) => ({ success: false, error, newState: this.getStateFor(action.playerId) })
    if (!this.state.players[action.playerId]) return fail('Player not found.')
    if (this.state.phase === 'game_over') return fail('Match has already ended.')
    if (action.type === 'surrender') {
      this.state.winner = Object.keys(this.state.players).find(id => id !== action.playerId)
      this.state.phase = 'game_over'
      this.state.players[this.state.winner!].roundWins = 1
      this.log(`${this.state.players[action.playerId].displayName} retreated.`)
    } else if (action.type === 'commit_turn') {
      const submission = action.submission as ArenaTurnSubmission | undefined
      if (!submission || submission.turn !== this.state.turn) return fail('That plan belongs to an earlier turn. Review your current hand.')
      const error = getArenaPlanError(this.state, action.playerId, this.hands.get(action.playerId)!, submission.plays)
      if (error) return fail(error)
      this.plans.set(action.playerId, resolveArenaPlaySlots(this.state.arena!.locations, action.playerId, this.hands.get(action.playerId)!, submission.plays))
      this.state.arena!.lockedIn[action.playerId] = true
      if (Object.values(this.state.arena!.lockedIn).every(Boolean)) this.resolveTurn()
    } else return fail('Choose your cards and lock in the turn.')
    return { success: true, newState: this.getStateFor(action.playerId) }
  }

  isGameOver(): { over: boolean; winnerId?: string; reason?: string } {
    return this.state.phase === 'game_over' ? { over: true, winnerId: this.state.winner, reason: 'match_complete' } : { over: false }
  }

  private resolveTurn() {
    this.forgeTriggers.clear()
    this.spellTriggers.clear()
    this.bellmarshSpells.clear()
    const arena = this.state.arena!
    // Stabilize any older positionless snapshot before a removal can leave a hole.
    for (const location of arena.locations) for (const cards of Object.values(location.cards)) {
      getArenaFormation(cards).forEach((placed, slot) => { if (placed) placed.slotIndex = slot as ArenaSlotIndex })
    }
    const ids = Object.keys(this.state.players)
    this.state.phase = 'reveal'
    const first = arena.revealFirstPlayerId
    const order = [first, ids.find(id => id !== first)!]
    arena.lastReveal = { turn: this.state.turn, initialLocations: this.publicLocations(), events: [] }
    // Remove all committed cards first so draws respect the true hand size.
    this.pending.clear()
    const toReveal = this.pending
    for (const id of ids) {
      const hand = this.hands.get(id)!
      const plan = this.plans.get(id) ?? []
      toReveal.set(id, plan.map(play => ({ card: hand.find(card => card.instanceId === play.cardInstanceId)!, locationIndex: play.locationIndex, slotIndex: play.slotIndex })))
      // Capture the committed costs before any reveal can modify cards.
      this.questMetrics.get(id)!.aetherSpent += toReveal.get(id)!.reduce((sum, entry) => sum + entry.card.cost, 0)
      this.unspentAether.set(id, Math.max(0, arena.energy - toReveal.get(id)!.reduce((sum, entry) => sum + entry.card.cost, 0)))
      this.hands.set(id, hand.filter(card => !plan.some(play => play.cardInstanceId === card.instanceId)))
      this.syncCounts(id)
    }
    this.log(`Turn ${this.state.turn} revealed. ${this.state.players[first].displayName} reveals first.`)
    for (const id of order) {
      const entries = toReveal.get(id)!
      const held = !entries.length
      while (entries.length) {
        const entry = entries.shift()!
        this.revealCard(id, entry.card, arena.locations[entry.locationIndex], entry.slotIndex)
      }
      if (held) this.log(`${this.state.players[id].displayName} held their cards.`)
    }
    this.resolveEndOfTurn(order)
    arena.lastRevealTurn = this.state.turn
    this.plans.clear()
    if (this.state.turn === ARENA_TURNS) { this.finish(); return }
    this.state.turn++
    arena.energy = this.state.turn
    arena.revealFirstPlayerId = ids.find(id => id !== first)!
    this.state.activePlayerId = arena.revealFirstPlayerId
    for (const location of arena.locations) if (!location.revealed && location.revealTurn <= this.state.turn) {
      location.revealed = true
      arena.lastReveal.events.push({ id: crypto.randomUUID(), kind: 'location', locationIndex: location.index, locations: this.publicLocations() })
      this.log(`${location.name} opens: ${location.description}`)
    }
    for (const id of ids) { arena.lockedIn[id] = false; this.draw(id, 1) }
    this.state.phase = 'planning'
  }

  private revealCard(playerId: string, card: Card, location: ArenaLocation, slotIndex?: ArenaSlotIndex) {
    // Board spawns do not pass through this method; cards played from hand count for their player.
    const metrics = this.questMetrics.get(playerId)!
    if (card.type === 'unit') metrics.unitsPlayed++
    if (card.type === 'spell') metrics.spellsPlayed++
    if (!card.arenaToken && this.startingDecks.get(playerId)?.has(card.definitionId)) this.playedCards.get(playerId)!.add(card.definitionId)
    const opponentId = this.opponent(playerId)
    const lead = getArenaLocationPower(location, playerId) - getArenaLocationPower(location, opponentId)
    const revealedCard = structuredClone(card)
    const effects: ArenaAbility['type'][] = []
    const relicSources: string[] = []
    let locationRule: ArenaRule | undefined
    const beforeDraw = this.state.players[playerId].deckCount
    if (card.type !== 'spell') location.cards[playerId].push({ card, placedOnTurn: this.state.turn, slotIndex })
    const arrival = this.publicLocations()
    const forgeKey = `${playerId}:${location.index}`
    if (card.type === 'unit' && location.revealed && location.rule === 'forge' && !this.forgeTriggers.has(forgeKey)) {
      card.powerBonus++
      this.forgeTriggers.add(forgeKey)
    }
    if (card.type === 'unit' && location.revealed && location.rule === 'leyline_nexus' && slotIndex !== undefined && slotIndex > 0) {
      const donor = getArenaFormation(location.cards[playerId])[slotIndex - 1]
      if (donor?.card.type === 'unit') {
        // Friendly expenditure may go negative and cannot be recovered by Cleanse.
        donor.card.powerBonus -= 2
        card.powerBonus += 2
        effects.push('transfer')
        locationRule = location.rule
      }
    }
    if (card.type === 'unit') for (const source of this.adjacentCards(playerId, location, card)) {
      if (!getArenaAbilities(source.card).some(ability => ability.type === 'aether_battery') || !source.card.arenaRelicCharge) continue
      card.powerBonus += source.card.arenaRelicCharge
      source.card.arenaRelicCharge = 0
      effects.push('aether_battery')
      relicSources.push(source.card.instanceId)
      this.relicReactions.push({ ...source, type: 'aether_battery' })
    }
    if (card.type === 'spell' && location.revealed && location.rule === 'bellmarsh') {
      const key = `${playerId}:${location.index}`
      if (!this.bellmarshSpells.has(key)) this.bellmarshSpells.set(key, card)
    }
    for (const ability of getArenaAbilities(card)) {
      if (!ability.timing && this.applyAbility(playerId, card, location, ability, lead)) effects.push(ability.type)
    }
    if (card.type === 'spell') {
      if (location.revealed && location.rule === 'sanctum') location.cards[playerId].filter(entry => entry.card.type === 'unit').forEach(entry => { entry.card.powerBonus++ })
      // Offerings are cleared by their current controller, including on a full board.
      location.cards[playerId] = location.cards[playerId].filter(entry => entry.card.definitionId !== 'cursed_offering')
    }
    this.state.arena!.lastReveal!.events.push({ id: crypto.randomUUID(), kind: 'card', playerId, card: revealedCard,
      locationIndex: location.index, arrival, locations: this.publicLocations(), abilityTriggered: effects.length > 0,
      effects, locationRule, relicSources, drawCount: beforeDraw - this.state.players[playerId].deckCount })
    this.flushRelicReactions()
    if (card.type === 'spell') {
      for (const { card: reactor } of [...location.cards[playerId]]) {
        for (const ability of getArenaAbilities(reactor).filter(effect => effect.timing === 'spell')) {
          const triggerKey = `${reactor.instanceId}:${ability.type}`
          if (ability.oncePerTurn && this.spellTriggers.has(triggerKey)) continue
          // The first cast consumes the reaction, even when there is no valid target.
          if (ability.oncePerTurn) this.spellTriggers.add(triggerKey)
          const deckBefore = this.state.players[playerId].deckCount
          if (this.applyAbility(playerId, reactor, location, ability)) this.recordTrigger(playerId, reactor, location, ability.type, false, deckBefore - this.state.players[playerId].deckCount)
          this.flushRelicReactions()
        }
      }
    }
    this.log(`${this.state.players[playerId].displayName} played ${card.name} at ${location.revealed ? location.name : `arena ${location.index + 1}`}.`)
  }

  private opponent(playerId: string) { return Object.keys(this.state.players).find(id => id !== playerId)! }
  private boardCards(owner: string, locations = this.state.arena!.locations): BoardCard[] {
    // Current-power targets require units; a relic does not have a zero-power stat.
    return locations.flatMap(location => location.cards[owner].filter(placed => placed.card.type === 'unit').map(({ card }) => ({ card, owner, location })))
  }
  private adjacentCards(owner: string, location: ArenaLocation, card: Card): BoardCard[] {
    const formation = getArenaFormation(location.cards[owner])
    const slot = formation.findIndex(placed => placed?.card.instanceId === card.instanceId)
    if (slot < 0) return []
    return getArenaNeighbours(slot as ArenaSlotIndex).flatMap(index => formation[index] ? [{ card: formation[index]!.card, owner, location }] : [])
  }
  private flushRelicReactions() {
    for (const { owner, card, location, type } of this.relicReactions.splice(0)) this.recordTrigger(owner, card, location, type)
  }
  private power(entry: BoardCard) { return getArenaCardPower(entry.location, entry.owner, entry.card) }
  private sorted(entries: BoardCard[], strongest = false) {
    const position = (entry: BoardCard) => getArenaFormation(entry.location.cards[entry.owner]).findIndex(placed => placed?.card.instanceId === entry.card.instanceId)
    return [...entries].sort((a, b) => (this.power(a) - this.power(b)) * (strongest ? -1 : 1) || a.location.index - b.location.index || position(a) - position(b))
  }
  private relocate(entry: BoardCard, destination: ArenaLocation) {
    const slot = this.freeSlot(entry.owner, destination)
    if (entry.location === destination || slot === undefined) return false
    const placed = entry.location.cards[entry.owner].find(placed => placed.card.instanceId === entry.card.instanceId)!
    this.remove(entry)
    placed.slotIndex = slot
    placed.card.arenaMoved = true
    destination.cards[entry.owner].push(placed)
    return true
  }
  private hasSpace(owner: string, location: ArenaLocation) {
    return this.freeSlot(owner, location) !== undefined
  }
  private freeSlot(owner: string, location: ArenaLocation) {
    const formation = getArenaFormation(location.cards[owner])
    const reserved = new Set((this.pending.get(owner) ?? []).filter(entry => entry.locationIndex === location.index && entry.card.type !== 'spell').map(entry => entry.slotIndex))
    return ARENA_POSITIONS.find(slot => !formation[slot] && !reserved.has(slot))
  }
  private remove(entry: BoardCard) {
    entry.location.cards[entry.owner] = entry.location.cards[entry.owner].filter(placed => placed.card.instanceId !== entry.card.instanceId)
  }
  private protected(entry: BoardCard, source: string) {
    return entry.owner !== source && getArenaAbilities(entry.card).some(effect => effect.type === 'ward')
  }
  private afflict(entry: BoardCard, amount: number, source: string) {
    if (entry.card.type !== 'unit' || amount <= 0 || this.protected(entry, source)) return 0
    if (entry.owner !== source) {
      const bell = this.adjacentCards(entry.owner, entry.location, entry.card).find(neighbour =>
        neighbour.card.arenaRelicUsedTurn !== this.state.turn && getArenaAbilities(neighbour.card).some(ability => ability.type === 'warding_bell'))
      if (bell) {
        bell.card.arenaRelicUsedTurn = this.state.turn
        this.relicReactions.push({ ...bell, type: 'warding_bell' })
        return 0
      }
    }
    entry.card.powerBonus -= amount
    entry.card.arenaAffliction = (entry.card.arenaAffliction ?? 0) + amount
    return amount
  }
  private setPower(entry: BoardCard, value: number, source: string) {
    if (entry.card.type !== 'unit') return false
    const delta = value - this.power(entry)
    if (delta < 0) return this.afflict(entry, -delta, source) > 0
    entry.card.powerBonus += delta
    return delta !== 0
  }
  private transmute(card: Card) {
    if (card.type !== 'unit' || card.arenaTransmuted) return false
    const oldCost = card.cost
    card.cost = Math.max(0, Math.min(6, card.power + card.powerBonus))
    card.power = oldCost
    card.powerBonus = 0
    card.arenaAffliction = 0
    card.arenaWither = []
    card.arenaTransmuted = true
    return true
  }
  private handUnits(playerId: string, eligibleOnly = false) {
    return this.hands.get(playerId)!.filter(card => card.type === 'unit' && (!eligibleOnly || !card.arenaTransmuted))
      .sort((a, b) => a.power + a.powerBonus - b.power - b.powerBonus || b.cost - a.cost)
  }
  private enemies(playerId: string, location: ArenaLocation, ability: ArenaAbility) {
    const opponent = this.opponent(playerId)
    const sites = ability.target === 'other_arenas' ? this.state.arena!.locations.filter(site => site.index !== location.index) : [location]
    return sites.flatMap(site => {
      const candidates = this.boardCards(opponent, [site]).filter(entry => !this.protected(entry, playerId))
      if (ability.target === 'all') return candidates
      return this.sorted(candidates, ability.target !== 'weakest' && ability.target !== 'other_arenas').slice(0, 1)
    })
  }

  private applyAbility(playerId: string, card: Card, location: ArenaLocation, ability: ArenaAbility, lead = 0): boolean {
    if (ability.condition === 'transmuted' && !card.arenaTransmuted) return false
    const { type, value, target } = ability
    const opponent = this.opponent(playerId)
    const allies = this.boardCards(playerId, [location])
    const others = allies.filter(entry => entry.card.instanceId !== card.instanceId)
    const self = { card, owner: playerId, location }
    switch (type) {
      case 'flank': case 'linked': case 'moved_power': case 'relic_power': case 'journey_aura': return false // Scored dynamically, never copied into base power.
      case 'march': {
        const unit = this.sorted(allies)[0]
        return Boolean(unit && this.relocate(unit, this.state.arena!.locations[(location.index + 1) % 3]))
      }
      case 'dispel': case 'salvage': {
        const owner = type === 'dispel' ? opponent : playerId
        const relic = getArenaFormation(location.cards[owner]).filter(placed => placed?.card.type === 'relic')
          .sort((a, b) => a!.card.cost - b!.card.cost)[0]
        if (!relic) return false
        this.remove({ card: relic.card, owner, location })
        if (type === 'salvage') this.draw(playerId, 1)
        return true
      }
      case 'formation_boost': {
        const recipients = allies.filter(entry => this.adjacentCards(playerId, location, entry.card).length > 0)
        recipients.forEach(entry => { entry.card.powerBonus += value })
        return recipients.length > 0
      }
      case 'adjacent_aura': return this.adjacentCards(playerId, location, card).some(entry => entry.card.type === 'unit')
      case 'warding_bell': case 'incubate': case 'aether_battery': return false
      case 'spellfont': {
        const recipient = this.sorted(this.adjacentCards(playerId, location, card).filter(entry => entry.card.type === 'unit'))[0]
        if (!recipient) return false
        recipient.card.powerBonus += value
        return true
      }
      case 'rally': case 'pressure': case 'parity': {
        if (!(type === 'rally' ? lead < 0 : type === 'pressure' ? lead > 0 : lead === 0)) return false
        card.powerBonus += value; return true
      }
      case 'grow': return false // Only later turns trigger Growth.
      case 'ward': return true
      case 'aura': return others.length > 0
      case 'alone': return location.cards[playerId].length === 1
      case 'full': return location.cards[playerId].length === ARENA_SLOTS
      case 'transmuted_power': return Boolean(card.arenaTransmuted)
      case 'token_aura': return others.some(entry => entry.card.arenaToken)
      case 'draw': {
        const before = this.hands.get(playerId)!.length
        this.draw(playerId, value); return this.hands.get(playerId)!.length > before
      }
      case 'drain': case 'afflict_all': case 'siphon': case 'wither': {
        const enemies = this.enemies(playerId, location, type === 'afflict_all' ? { ...ability, target: 'all' } : ability)
        let removed = 0
        for (const entry of enemies) {
          if (type === 'wither') (entry.card.arenaWither ??= []).push({ sourcePlayerId: playerId, amount: value, remaining: 2 })
          else removed += this.afflict(entry, value, playerId)
        }
        if (type === 'siphon') card.powerBonus += removed
        return enemies.length > 0
      }
      case 'boost': {
        const recipient = target === 'self' ? self : this.sorted(target === 'weakest' ? others : allies, target !== 'weakest')[0]
        if (!recipient) return false
        recipient.card.powerBonus += value; return true
      }
      case 'boost_all': allies.forEach(entry => { entry.card.powerBonus += value }); return allies.length > 0
      case 'move': {
        const entry = this.sorted(this.boardCards(playerId).filter(entry => entry.location !== location))[0]
        return Boolean(entry && this.relocate(entry, location))
      }
      case 'transmute_hand': return this.handUnits(playerId, true).slice(0, value).map(card => this.transmute(card)).some(Boolean)
      case 'transmute_deck': return this.decks.get(playerId)!.map(card => this.transmute(card)).some(Boolean)
      case 'transmute_draw': this.drawTransmutes.set(playerId, (this.drawTransmutes.get(playerId) ?? 0) + value); return true
      case 'hand_weaken': case 'hand_boost': {
        const units = this.handUnits(playerId)
        const unit = target === 'strongest' ? [...units].sort((a, b) => b.power + b.powerBonus - a.power - a.powerBonus || b.cost - a.cost)[0] : units[0]
        if (!unit) return false
        if (type === 'hand_weaken') this.afflict({ card: unit, owner: playerId, location }, value, playerId)
        else unit.powerBonus += value
        return true
      }
      case 'defect': case 'send': {
        if (!this.hasSpace(opponent, location)) return false
        const entry = type === 'defect' ? allies.find(entry => entry.card.instanceId === card.instanceId)
          : this.sorted(others.filter(entry => this.power(entry) <= 0))[0]
        if (!entry) return false
        const placed = location.cards[playerId].find(placed => placed.card.instanceId === entry.card.instanceId)!
        placed.slotIndex = this.freeSlot(opponent, location)
        this.remove(entry); location.cards[opponent].push(placed); return true
      }
      case 'plant': {
        const sites = target === 'other_arenas' ? this.state.arena!.locations.filter(site => site.index !== location.index) : [location]
        let planted = false
        for (const site of sites) if (this.hasSpace(opponent, site)) {
          const token = ARENA_TOKEN_DATABASE.find(token => token.definitionId === (ability.token ?? 'cursed_offering'))!
          site.cards[opponent].push({ card: instance(token), placedOnTurn: this.state.turn, slotIndex: this.freeSlot(opponent, site) }); planted = true
        }
        return planted
      }
      case 'burden': {
        const recipient = target === 'self' ? playerId : opponent
        const hand = this.hands.get(recipient)!
        if (hand.length >= ARENA_MAX_HAND) return false
        hand.push(instance(ARENA_TOKEN_DATABASE[1])); this.syncCounts(recipient); return true
      }
      case 'purge': {
        const tokens = allies.filter(entry => entry.card.arenaToken)
        tokens.forEach(entry => this.remove(entry)); return tokens.length > 0
      }
      case 'harvest': {
        const gain = this.boardCards(opponent, [location]).reduce((sum, entry) => sum + (this.power(entry) < 0 ? value : target === 'afflicted' && (entry.card.arenaAffliction ?? 0) > 0 ? 1 : 0), 0)
        card.powerBonus += gain; return gain > 0
      }
      case 'cleanse': {
        let changed = false
        const recipients = target === 'weakest' ? this.sorted(allies.filter(entry => (entry.card.arenaAffliction ?? 0) > 0 || entry.card.arenaWither?.length)).slice(0, 1) : allies
        for (const entry of recipients) {
          const reduction = entry.card.arenaAffliction ?? 0
          if (reduction || entry.card.arenaWither?.length) changed = true
          entry.card.powerBonus += reduction; entry.card.arenaAffliction = 0; entry.card.arenaWither = []
        }
        return changed
      }
      case 'copy_power': {
        const source = this.sorted(others, target !== 'weakest')[0]
        return source ? this.setPower(self, this.power(source), playerId) : false
      }
      case 'transfer': {
        const source = this.sorted(allies, true)[0]
        const recipient = this.sorted(this.boardCards(playerId).filter(entry => entry.location !== location))[0]
        if (!source || !recipient) return false
        const amount = Math.min(value, Math.max(0, this.power(source)))
        source.card.powerBonus -= amount; recipient.card.powerBonus += amount; return amount > 0
      }
      case 'consume': {
        const source = this.sorted(others)[0]
        if (!source) return false
        const amount = Math.max(0, this.power(source))
        this.remove(source); card.powerBonus += amount; return true
      }
      case 'purify': {
        const source = this.sorted(allies)[0]
        return source && this.power(source) < 0 ? this.setPower(source, -this.power(source), playerId) : false
      }
      case 'equalize': {
        // Snapshot both sides before changing any card; an aura never feeds back into the calculation.
        const changes = [...allies, ...this.boardCards(opponent, [location])].map(entry => ({ entry, delta: value - this.power(entry) }))
        let changed = false
        for (const { entry, delta } of changes) {
          if (delta < 0) changed = this.afflict(entry, -delta, playerId) > 0 || changed
          else if (delta > 0) { entry.card.powerBonus += delta; changed = true }
        }
        return changed
      }
      case 'echo_power': {
        const recipient = this.sorted(others)[0]
        const amount = Math.max(0, this.power(self))
        if (!recipient || !amount) return false
        recipient.card.powerBonus += amount; return true
      }
      case 'distribute': {
        const recipients = this.state.arena!.locations.filter(site => site.index !== location.index)
          .flatMap(site => this.sorted(this.boardCards(playerId, [site])).slice(0, 1))
        const amount = Math.max(0, this.power(self))
        if (!recipients.length || !amount) return false
        card.powerBonus -= amount
        recipients.forEach((entry, i) => { entry.card.powerBonus += Math.floor(amount / recipients.length) + Number(i < amount % recipients.length) })
        return true
      }
      case 'double': { const amount = this.power(self); card.powerBonus += amount; return amount !== 0 }
    }
  }

  private recordTrigger(playerId: string, card: Card, location: ArenaLocation, type: ArenaAbility['type'], growth = false, drawCount = 0) {
    this.state.arena!.lastReveal!.events.push({ id: crypto.randomUUID(), kind: growth ? 'growth' : 'trigger',
      playerId, card: structuredClone(card), locationIndex: location.index, locations: this.publicLocations(),
      abilityTriggered: true, effects: [type], ...(drawCount ? { drawCount } : {}) })
  }
  private resolveEndOfTurn(order: string[]) {
    for (const location of this.state.arena!.locations) for (const owner of order) for (const placed of [...location.cards[owner]]) {
      const { card } = placed
      if (card.type !== 'unit') continue
      let withered = false
      for (const status of card.arenaWither ?? []) {
        const amount = this.afflict({ card, owner, location }, status.amount, status.sourcePlayerId)
        status.remaining--
        if (amount) withered = true
      }
      card.arenaWither = card.arenaWither?.filter(status => status.remaining > 0)
      if (withered) this.recordTrigger(owner, card, location, 'wither')
      this.flushRelicReactions()
      for (const ability of getArenaAbilities(card)) if (ability.type === 'grow' && placed.placedOnTurn < this.state.turn) {
        card.powerBonus += ability.value
        this.recordTrigger(owner, card, location, 'grow', true)
      }
    }
    if (this.state.turn === ARENA_TURNS) for (const owner of order) for (const location of this.state.arena!.locations) {
      for (const { card } of [...location.cards[owner]]) for (const ability of getArenaAbilities(card).filter(effect => effect.timing === 'final')) {
        if (this.applyAbility(owner, card, location, ability)) this.recordTrigger(owner, card, location, ability.type)
        this.flushRelicReactions()
      }
    }
    this.resolveRelics(order)
    this.resolveLocationEffects(order)
  }

  private resolveRelics(order: string[]) {
    for (const location of this.state.arena!.locations) for (const owner of order) for (const placed of [...location.cards[owner]]) {
      const { card } = placed
      if (card.type !== 'relic') continue
      for (const ability of getArenaAbilities(card)) {
        if (ability.type === 'aether_battery') {
          const amount = this.unspentAether.get(owner) ?? 0
          if (!amount) continue
          card.arenaRelicCharge = (card.arenaRelicCharge ?? 0) + amount
          this.recordTrigger(owner, card, location, 'aether_battery')
        }
        if (ability.type === 'incubate') {
          card.arenaRelicCharge = (card.arenaRelicCharge ?? 0) + 1
          if (card.arenaRelicCharge >= ability.value) {
            this.remove({ card, owner, location })
            location.cards[owner].push({ card: instance(EMBERLING), placedOnTurn: this.state.turn, slotIndex: placed.slotIndex })
          }
          this.recordTrigger(owner, card, location, 'incubate')
        }
      }
    }
  }

  private resolveLocationEffects(order: string[]) {
    for (const location of this.state.arena!.locations) {
      if (!location.revealed) continue
      const record = () => this.state.arena!.lastReveal!.events.push({ id: crypto.randomUUID(), kind: 'location-effect',
        locationIndex: location.index, locationRule: location.rule, abilityTriggered: true, locations: this.publicLocations() })
      if (location.rule === 'ashen_orchard') {
        // Snapshot each side's minimum before applying any gains, including every tied unit.
        const recipients = order.flatMap(owner => {
          const units = location.cards[owner].filter(placed => placed.card.type === 'unit').map(placed => ({ card: placed.card, power: getArenaCardPower(location, owner, placed.card) }))
          const lowest = Math.min(...units.map(unit => unit.power))
          return units.filter(unit => unit.power === lowest)
        })
        recipients.forEach(({ card }) => { card.powerBonus++ })
        if (recipients.length) record()
      }
      if (location.rule === 'bellmarsh') for (const owner of order) {
        const card = this.bellmarshSpells.get(`${owner}:${location.index}`)
        const hand = this.hands.get(owner)!
        if (!card || hand.length >= ARENA_MAX_HAND) continue
        hand.push(card)
        this.syncCounts(owner)
        this.state.arena!.lastReveal!.events.push({ id: crypto.randomUUID(), kind: 'location-effect', playerId: owner,
          card: structuredClone(card), returnToHand: true, locationIndex: location.index, locationRule: location.rule,
          abilityTriggered: true, locations: this.publicLocations() })
      }
      if (location.rule === 'gilded_exchange' && this.state.turn === 4 && !location.exchangeResolved) {
        const [a, b] = order
        const mine = getArenaFormation(location.cards[a])[3], theirs = getArenaFormation(location.cards[b])[3]
        location.cards[a] = location.cards[a].filter(placed => placed !== mine)
        location.cards[b] = location.cards[b].filter(placed => placed !== theirs)
        if (theirs) location.cards[a].push(theirs)
        if (mine) location.cards[b].push(mine)
        location.exchangeResolved = true
        record()
      }
    }
  }

  private publicLocations(): ArenaLocation[] {
    return structuredClone(this.state.arena!.locations).map(location => {
      if (location.revealed) return location
      const { rule: _rule, ...hidden } = location
      return { ...hidden, definitionId: 'unrevealed', name: 'Uncharted arena', description: `Reveals on turn ${location.revealTurn}. You can play here now.` }
    })
  }

  private draw(playerId: string, count: number) {
    const hand = this.hands.get(playerId)!
    const deck = this.decks.get(playerId)!
    const drawn = deck.splice(0, Math.min(count, Math.max(0, ARENA_MAX_HAND - hand.length)))
    for (const card of drawn) {
      const pending = this.drawTransmutes.get(playerId) ?? 0
      if (pending > 0 && this.transmute(card)) this.drawTransmutes.set(playerId, pending - 1)
    }
    hand.push(...drawn)
    this.syncCounts(playerId)
  }
  private syncCounts(playerId: string) {
    this.state.players[playerId].handCount = this.hands.get(playerId)!.length
    this.state.players[playerId].deckCount = this.decks.get(playerId)!.length
  }
  private finish() {
    this.finishedNaturally = true
    this.finishedAt = Date.now()
    const [a, b] = Object.keys(this.state.players)
    const scoreA = getArenaMatchScore(this.state, a)
    const scoreB = getArenaMatchScore(this.state, b)
    const difference = scoreA.locations - scoreB.locations || scoreA.power - scoreB.power
    this.state.winner = difference === 0 ? undefined : difference > 0 ? a : b
    this.state.phase = 'game_over'
    for (const id of [a, b]) {
      const metrics = this.questMetrics.get(id)!
      metrics.arenasWon = getArenaMatchScore(this.state, id).locations
      metrics.powerArenas = this.state.arena!.locations.filter(location => getArenaLocationPower(location, id) >= 20).length
      metrics.matchesWon = Number(this.state.winner === id)
    }
    if (this.state.winner) {
      this.state.players[this.state.winner].roundWins = 1
      this.log(`${this.state.players[this.state.winner].displayName} wins! Arenas ${scoreA.locations}–${scoreB.locations}, power ${scoreA.power}–${scoreB.power}.`)
    } else this.log('Equal arenas and total power. The match is a draw.')
  }
  private log(message: string) {
    this.state.log.push({ id: crypto.randomUUID(), timestamp: Date.now(), message, type: 'system' })
    this.state.log = this.state.log.slice(-100)
  }
}
