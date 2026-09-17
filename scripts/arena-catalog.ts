import { writeFileSync } from 'node:fs'
import { ARENA_ARCHETYPES, ARENA_ARCHETYPE_DECKS, ARENA_CARD_DATABASE, ARENA_EXPANSION_CARDS, ARENA_TOKEN_DATABASE } from '../packages/shared/src/index.ts'

const lines = [
  '# Shattered Pacts', '',
  '48 new collectible cards, with 12 primary cards in each archetype. Two additional tokens can be generated during matches. All 48 cards and both tokens have dedicated full-bleed artwork; see [the artwork archive](../output/shattered-pacts-art/README.md) for originals and prompts. See [the balance notes](arena-balance.md) for curves, package options and validation.', '',
  '## Try the decks', '',
  'Enter the Arena lists all five starters beside your saved decks. Choose one to play immediately, or customize a copy. Deck Builder also offers the four archetype templates. Untouched copies of the original four expansion starters update automatically; renamed or edited decks keep their composition.', '',
  '## Rules', '',
  '- Starting decks contain 12 distinct collectible cards. Generated tokens can repeat during a match and cannot enter starting decks.',
  '- Negative power subtracts from arena scores. A score of −2 beats −5.',
  '- Transmutation swaps eligible units’ current hand/deck power and cost, clamps the new cost to 0–6 and happens once per card. Spells and already transmuted units are skipped. Equal-power hand targets prefer higher cost, then hand order.',
  '- Both players’ committed units reserve their spaces. Defect, Exile and Plant cannot displace a committed play. Failed Defect remains on its original side.',
  '- Current-power effects include board support and location bonuses. Copies and Equalize use snapshots. Transferred power is spent and cannot be restored by Cleanse.',
  '- Ward blocks hostile power reductions. Siphon gains only power actually removed. Wither ticks at the end of the turn it is applied and the following turn.',
  '- Pale Physician and Cleansing Flame cleanse the weakest afflicted ally. Censer Warden cleanses the whole friendly arena. Cleanse preserves buffs and printed negative power; Invert instead turns a negative current value positive.',
  '- Debt Collector gains +2 per negative enemy, or +1 per other enemy with an applied reduction. An enemy is counted once. Debt Broker rewards negative enemies only.',
  '- Miasma Lantern and Ember Conduit react once per turn while in play. Their first cast here consumes the reaction even if no valid target exists. Spell effects, Sanctum and Offering removal resolve before reactions.',
  '- Final distribution follows turn-six Wither and Growth. Results wait for all effects and score animations. Board target ties use arena order, then placement order.', '',
]
for (const family of ARENA_ARCHETYPES) {
  lines.push(`## ${family.name}`, '', '| Card | Cost | Power | Rarity | Type | Rules |', '|---|---:|---:|---|---|---|')
  for (const card of ARENA_EXPANSION_CARDS.filter(card => card.arenaArchetypes?.[0] === family.id)) {
    lines.push(`| ${card.name} | ${card.cost} | ${card.power} | ${card.rarity} | ${card.type} | ${card.description} |`)
  }
  const deck = ARENA_ARCHETYPE_DECKS.find(deck => deck.id === family.id)!
  lines.push('', `**Starter deck:** ${deck.cards.map(id => ARENA_CARD_DATABASE.find(card => card.definitionId === id)!.name).join(', ')}.`, '')
}
lines.push('## Generated units', '')
for (const card of ARENA_TOKEN_DATABASE) lines.push(`- **${card.name}** · ${card.cost} cost / ${card.power} power. ${card.description}`)
writeFileSync('docs/shattered-pacts.md', lines.join('\n') + '\n')
