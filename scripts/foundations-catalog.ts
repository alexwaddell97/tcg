import { writeFileSync, existsSync, statSync, readFileSync, readdirSync } from 'node:fs'
import { ARENA_CARD_DATABASE, ARENA_TOKEN_DATABASE, ARENA_ARCHETYPE_DECKS, CARD_VARIANTS, getArenaAbilities } from '../packages/shared/src/index.ts'
import { FOUNDATION_CURVES } from './foundations-curves.ts'

const cards = [...ARENA_CARD_DATABASE].sort((a, b) => a.cost - b.cost || a.name.localeCompare(b.name))
const cardName = (id: string) => [...cards, ...ARENA_TOKEN_DATABASE].find(card => card.definitionId === id)!.name
const assetPath = (url: string) => `apps/web/public/${url.replace(/^\.?\//, '')}`
const guides: Record<string, { plan: string; alternatives: string; caution: string }> = {
  transmutation: {
    plan: 'Use Chalk Apprentice and Mercury Scholar to convert awkward printed stats into playable costs. Hold Silver Equation for expensive low-power units. Regent is an option, not the only enabler; Glass Familiar grows and Alloy Guardian protects an early investment.',
    alternatives: 'Trail Wisp / Glass Dragoon plus Phase Walk for a movement hybrid; Refracting Lens plus utility spells for repeatable transformed draws. Remove a large finisher to make room for these support cards.',
    caution: 'Transmutation uses current power when swapping. Hand boosts can increase the resulting cost. Play cheap bodies when setup would concede too much tempo; keep hand space for draws.',
  },
  sabotage: {
    plan: 'False Standard and Thorn Seeder establish useful bodies. Tainted Idol supplies cards for Exile Ritual or Inversion Rite; it is not a compulsory turn-one play. Cache followed by a spell plants a persistent Burden. Envoy and Duke threaten space as well as power.',
    alternatives: 'Oathbound Scavenger / Revenant remove unwanted bodies; Masked Ferryman gives another send effect. Debt Collector or Death Reaper converts enemy negatives into your own power. Smuggler Vault supports a friendly-token version.',
    caution: 'Check enemy space before sending. A failed defection leaves its negative power with you. A Cursed Offering vanishes after its controller casts a spell; a Burden remains. Mirror Reservoir reverses the value of enemy negative power.',
  },
  affliction: {
    plan: 'Put an early body on the board, then aim Wither at a unit that will stay in play. Spread reductions to enable Debt Collector and Famine Sovereign. Miasma Lantern plus a cheap spell provides a midgame swing.',
    alternatives: 'Plague Censer plus Cinder Script for Invocation; Ashen Envoy supplies a guaranteed negative target if the opponent has room. Pale Physician or Censer Warden protects your own copied power.',
    caution: 'Ward and Cleanse are available in the wider pool. Do not spend removal into an empty arena. Harvest values and the Mirror Reservoir rule need checking before the final turn.',
  },
  conduits: {
    plan: 'Candle Tender, Temper and Prism Initiate prepare a high-current-power unit. Copy that investment with Vessel of Echoes, transfer it with Current Runner, or distribute it at the end with Last Light Beacon. Titan rewards building before doubling.',
    alternatives: 'Master Forger / Bastion Architect with relics; Horizon Rider with movement; Ascended Prophet and low printed-power units for Transmutation.',
    caution: 'Copying uses a snapshot of current power. Reveal order matters. Keep an inexpensive recipient for transfers, and avoid concentrating all your investment where a single reduction wins the arena.',
  },
  formation: {
    plan: 'Place Flank units at positions 1 or 4. Place Linked units between occupied positions. Relics make efficient neighbours; Bridge Marshal connects two units. Hold the Line and Grand Convergence reward filling a lane.',
    alternatives: 'Close Ranks or Homeward Call can repair a spread-out board. Ritual Caster is a cheaper full-arena payoff. Warding Bell answers Affliction, while Break Standard opens a relic-heavy opponent.',
    caution: 'Position means the shared 1→2→3→4 track on both screen layouts. A removed relic also removes its adjacency support. Save room for Banner Heir rather than filling every position with setup.',
  },
  wayfarers: {
    plan: 'Deploy Trail Wisp and Crossing Guard before moving them. Compass pays off a successful Journey in its own arena. Phase Walk pulls the weakest unit from another arena; Wayward Current sends the weakest unit here to the next arena.',
    alternatives: 'Glass Dragoon bridges Transmutation and movement; Chaos Drake / Void Leviathan reward isolating a lane. Formation cards reward controlling the newly occupied position.',
    caution: 'Journey is a one-time activation, not a bonus per move. Keep a destination open. A five-cost Wandering Colossus on turn five leaves turn six available to move it; a six-cost version would have lacked that support window.',
  },
  invocation: {
    plan: 'Build Rune Attendant, Glyph Scholar or Ember Conduit before spending utility spells. Spread engines when one arena is full. Archmage plus a later spell supports a second arena; draw spells help find the next turn, not cards playable during the current resolution.',
    alternatives: 'Refracting Lens for Transmutation, Contraband Cache for Sabotage, or Plague Censer for Affliction. Swap one engine and one spell as a pair rather than replacing all the units.',
    caution: 'New spell engines trigger once per turn, in their own arena. All plays are committed together: drawn cards enter the next planning hand. A full hand wastes excess draws.',
  },
  stewardship: {
    plan: 'Scrap Custodian and Chain Sentinel give relics immediate recipients. Place War Standard between units. Salvage Rite trades an old relic for a card and power; Master Forger, Architect and Igna turn remaining relics into scoring power.',
    alternatives: 'Warding Bell / Restoration against Affliction; Codex of Ages with several cheap spells; Lord of Bones with Ember Incubator for a generated-unit build. Relic Diver provides salvage on a body when space is available.',
    caution: 'Relics have zero power and consume one of four positions. The starter keeps seven units so it can actually score. Dispel removes the cheapest relic, with position breaking ties; queued cards still need an empty position when the plan is committed.',
  },
}

const lines = ['# Eternal Foundations — playable catalog', '',
  'Generated from the shipped definitions by `node --import tsx scripts/foundations-catalog.ts`. Design rationale: [set design](eternal-foundations-design.md).', '',
  `${cards.length} collectible base cards: ${cards.filter(c => c.type === 'unit').length} units, ${cards.filter(c => c.type === 'spell').length} spells, ${cards.filter(c => c.type === 'relic').length} relics. ${CARD_VARIANTS.length} cosmetic variants; generated tokens are excluded.`, '',
  'Core, Expanded and Eternal are acquisition sets. Rarity does not grant extra stats. The eight packages share support cards and can be mixed in a twelve-card, single-copy deck.', '', '## Starter packages', '']
for (const deck of ARENA_ARCHETYPE_DECKS) {
  const definitions = deck.cards.map(id => cards.find(card => card.definitionId === id)!)
  const curve = FOUNDATION_CURVES.find(curve => curve.id === deck.id)!, guide = guides[deck.id]
  lines.push(`### ${deck.name}`, '', guide.plan, '',
    `**Deck:** ${deck.cards.map(cardName).join(', ')}.`, '',
    `**Printed cost curve (1–6):** ${[1, 2, 3, 4, 5, 6].map(cost => definitions.filter(card => card.cost === cost).length).join(' / ')}.`, '',
    `**Other builds:** ${guide.alternatives}`, '', `**Decisions:** ${guide.caution}`, '',
    'Authored six-turn example, verified with natural draws in the engine. Arena letters are A–C. This is one legal draw order, not a guarantee for a shuffled hand.', '', '| Turn | Plays in reveal order |', '|---|---|')
  curve.turns.forEach((plays, i) => lines.push(`| ${i + 1} | ${plays.map(([id, arena, position]) => `${cardName(id)} → ${String.fromCharCode(65 + arena)}${position === undefined ? '' : `, position ${position + 1}`}`).join('; ')} |`))
  lines.push('')
}
lines.push('## Complete card list', '', '| Card | Type | Aether | Power | Set / rarity | Packages | Ability |', '|---|---|---:|---:|---|---|---|')
for (const card of cards) lines.push(`| [${card.name}](../${assetPath(card.imageUrl)}) | ${card.type} | ${card.cost} | ${card.type === 'unit' ? card.power : '—'} | ${card.arenaSet} / ${card.rarity} | ${card.arenaArchetypes?.join(', ')} | ${card.description.replaceAll('|', '\\|')} |`)
lines.push('', '## Alternate artwork', '', 'Variants retain the base card’s cost, power, rules and mastery. The 27 new variants are pack rewards for already-owned base cards; the three existing featured-shop variants and one season-exclusive artwork remain in their respective sources.', '',
  '| Card | Variant | Treatment | Source |', '|---|---|---|---|')
for (const v of CARD_VARIANTS) lines.push(`| ${cardName(v.definitionId)} | [${v.name}](../${assetPath(v.imageUrl)}) | ${v.style} | ${v.source ?? 'shop'} |`)
lines.push('', 'Exact prompts: [base art](../output/foundations-art/prompts.json), [variant art](../output/foundations-art/variant-prompts.json). The built-in image generation tool produced the new illustrations; existing artwork was preserved. Originals are retained separately from the WebP runtime assets.', '')
writeFileSync('docs/eternal-foundations-catalog.md', lines.join('\n'))
const assets = [...cards.map(card => ({ id: card.definitionId, kind: 'base', url: card.imageUrl })), ...CARD_VARIANTS.map(v => ({ id: v.id, kind: 'variant', url: v.imageUrl }))]
const missing = assets.filter(asset => !existsSync(assetPath(asset.url)))
const report = { totals: { base: cards.length, variants: CARD_VARIANTS.length },
  cards: cards.map(card => ({ ...card, abilities: getArenaAbilities(card) })), decks: ARENA_ARCHETYPE_DECKS, curves: FOUNDATION_CURVES,
  variants: CARD_VARIANTS, assets: assets.map(a => ({ ...a, bytes: existsSync(assetPath(a.url)) ? statSync(assetPath(a.url)).size : 0 })), missing }
writeFileSync('docs/eternal-foundations-catalog.json', JSON.stringify(report, null, 2) + '\n')
const receipts = readdirSync('output/foundations-art/receipts').filter(name => name.endsWith('.json')).map(name => JSON.parse(readFileSync(`output/foundations-art/receipts/${name}`, 'utf8')))
writeFileSync('output/foundations-art/asset-receipts.json', JSON.stringify(receipts, null, 2) + '\n')
console.log(JSON.stringify({ base: cards.length, variants: CARD_VARIANTS.length, missing: missing.map(a => a.id) }))
if (missing.length) process.exitCode = 1
