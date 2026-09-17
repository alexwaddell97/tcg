# Relics

Relics are board cards with an aether cost and an ability, but no power. They use the same fixed formation positions and one-copy deck limit as units. Fourteen are collectible across the Core and Expanded sets through their packs. Collection and Deck Builder have a Card type → Relics filter.

| Card | Aether | Rarity | Effect |
| --- | --- | --- | --- |
| War Standard | 2 | Common | Adjacent friendly units have +2 ongoing power. |
| Spellfont | 2 | Uncommon | Each friendly spell cast here gives +1 to the lowest-power adjacent unit; ties favour the earlier position. |
| Warding Bell | 1 | Uncommon | Prevent the first enemy power reduction to an adjacent friendly unit each turn. |
| Ember Incubator | 2 | Rare | After two turn endings, including the turn played, replace itself with a 5-power Emberling in its position. |
| Aether Battery | 1 | Rare | Store unspent aether at each turn ending. Give all stored aether as power to the next adjacent friendly unit revealed, before its ability. |

| Contraband Cache | 3 | Rare | After your first spell here each turn, plant a −1 Burden on the enemy side if space remains. |

Contraband Cache replaces Spark Sprite in the Sabotage starter template. Existing saved decks are unchanged. Its first-spell trigger is consumed even if the enemy formation is full; queued positions remain protected.

These costs and values are an initial playtest package, not a competitive balance claim.

## Interactions

- Relics reserve positions while queued, count toward four occupied positions, preserve gaps and use the same desktop/mobile chain. They block incoming tokens from reserved positions.
- Relics contribute zero to scores, including Mirror Reservoir. Internally `power: 0` is a compatibility sentinel; it is not a targetable zero-power stat. Power buffs, reductions, copying, Transmute and other current-power selection ignore them.
- Power-targeting descriptions now say units. Solo checks whether the entire side contains only that card; United checks all four occupied positions, including relics.
- Relics count as occupied neighbours for Chainbridge, but cannot receive its bonus. They do not use Forge's first-unit trigger or donate power at Leyline Nexus. Ashen Orchard ignores relics when finding the lowest-power units and still includes every tied unit.
- Gilded Exchange now explicitly swaps **cards** in position 4. Relics retain their identity and stored charge when traded; their abilities then support their new controller.
- Warding Bell blocks an actual reduction, not targeting or the application of a Wither status. A prevented Siphon steals no power. Each Bell has one prevention per turn across its neighbours; changing owners does not refresh it. Native Ward does not consume Bell's prevention. Friendly power expenditure is not protected.
- Battery uses committed card costs, captured before reveal effects. It stores only its current controller's unspent aether, including the turn it was played. Only playing/revealing a unit triggers discharge; spells, relics, movement and generated units do not. Stored power can be doubled or copied by the arriving unit's normal ability.
- Relic turn-end effects resolve after ordinary card effects, then arena turn-end effects resolve. Emberling is a new generated unit, not a played card: it does not retrigger Forge or Leyline, count as a unit played, or award separate mastery. It can subsequently receive buffs and be purged like other generated units. It currently uses existing Forge Wraith art.
- Playing collectible relics earns the same played-card mastery as other cards and contributes to aether-spent quests. It does not count as playing a unit or casting a spell.

## Presentation and verification

Relic faces retain the existing aspect ratio, artwork, name and cost. A small pedestal emblem replaces the power shard. The stone base and teal details distinguish the type; Battery and Incubator show stored aether/countdown counters. The same face is used on the board, in hand, collection and packs.

`/board-preview` has a Relics board preset and a Relics effect demo. The demo plays a legal six-turn setup, then shows protection, Battery discharge, Spellfont and hatching before the final score ceremony. It does not alter collection, currency or mastery.

`tests/arena-relics.test.ts` covers placement, privacy, reserved positions, power immunity, targeting, ties, statuses, transfer of ownership, counters, animation order and the legal demo. The full suite also covers multiplayer.

Six paintings were generated with the built-in `image_gen` tool. [Contraband Cache prompt](../output/relics-v1/contraband-cache-prompt.json) and [original five prompts and sources](../output/relics-v1/prompts.json) are preserved with the [original PNGs](../output/relics-v1/README.md). Production JPEGs are in `apps/web/public/cards/relics/`, at 720 × 1080 pixels.
