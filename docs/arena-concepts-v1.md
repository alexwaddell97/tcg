# Arena locations — first expansion

Status: implemented with individual artwork and reveal effects. Each new practice or multiplayer match chooses three distinct arenas uniformly from the full nine-arena pool. Forge, Sanctum and Summit remain in that pool. Selection happens once; arenas reveal on turns 1, 2 and 3. Gameplay correctness has been tested; competitive balance still needs playtesting.

[Concept art sheet](../output/arena-concepts-v1/concept-sheet.png) · [Imagegen prompt](../output/arena-concepts-v1/prompt.txt). Generated using the built-in image_gen tool.

This batch adds placement, redistribution of existing power, and timing decisions. Rules apply to both players. Position numbers always follow the same 1–2–3–4 chain on desktop and mobile; they never mean screen-left or back row.

## Formation arenas

| Arena | Rule shown in the popup | Intended decision |
| --- | --- | --- |
| Chainbridge | Your units with two occupied neighbouring positions have +2 power. | Build a connected formation or leave space for later plays. Only positions 2 and 3 can earn the bonus. |
| Leyline Nexus | Units revealed here take 2 power from your unit in the preceding position. | Choose which unit donates power and which receives it. Concentrate power for copying or doubling, or weaken a donor before sending it away. |
| Ashen Orchard | After each turn, your lowest-power units here gain +1 power. Includes ties. | Grow a weak unit or keep several allies at equal power to grow them together. |

## Timing and scoring arenas

| Arena | Rule shown in the popup | Intended decision |
| --- | --- | --- |
| Bellmarsh | After each turn, return the first spell you cast here that turn to your hand. | Choose which spell to reuse next turn, paying its aether cost again. |
| Mirror Reservoir | For this arena’s score, count negative unit power as positive. | A negative card can be an asset to keep; sending one to your opponent can help them. |
| Gilded Exchange | After turn 4, swap the cards in position 4 between players. | Offer a weak card, leave your position empty, or interfere with what the opponent intends to trade. |

Every arena has the same selection weight. Mirror Reservoir and Gilded Exchange can produce large reversals in Sabotage matchups. Bellmarsh's repeated draw, reduction and clearing spells are priorities for balance playtesting.

## Resolution details

These notes are for development and testing, not additional popup copy.

- **Chainbridge:** neighbouring positions must contain units on the same player's side. Count occupancy, not power; tokens count. The +2 is an ongoing location contribution, lost immediately if either neighbour disappears. No extra link connects positions 1 and 4. Maximum location contribution is +4 per side, before card effects that snapshot or amplify current power.
- **Leyline Nexus:** position 2 takes from 1, 3 from 2, 4 from 3; position 1 has no donor. No donor means no transfer. Transfer once when a unit is played and revealed, before its reveal ability, following the Forge's existing location-trigger timing. Moving or generating a unit here does not trigger it. This is intentional friendly power expenditure, not an enemy debuff: use the existing Transfer treatment for Ward and Cleanse. A donor may go negative; the transfer alone changes neither side's total power. Test amplification through Prism Titan, copying, and later Exile.
- **Ashen Orchard:** after ordinary end-turn card effects (including final-turn abilities), find each player's lowest current power independently. Every friendly unit tied at that minimum gains +1. Ignore relics. Choose all recipients before applying any gains, then animate them together. The gain is permanent; a new turn may choose different recipients. Negative power participates normally. Check both wide formations of equal-power units and the effect of growing planted negative units during balance playtests.
- **Bellmarsh:** remember each player's first spell cast here in reveal order. Return that same card once at the end of the turn, respecting the seven-card hand limit; if full, it remains spent. Return is not a draw, does not trigger draw effects, and preserves the card's existing cost and identity. It cannot be added to a plan already committed for this turn. No duplicate collectible is awarded. Check renewable Cleansing Flame, Salt Hex and draw spells especially carefully.
- **Mirror Reservoir:** compute each unit's normal current power first, then use its absolute value only for its contribution to this arena's total. Printed power, Wither, targets, copying and other abilities still use the actual signed current power. Leading/behind effects use the resulting arena total. Negative cards keep their signed badge and show a separate positive score contribution on the board and in card inspection.
- **Gilded Exchange:** resolve once after turn 4's ordinary card effects. Swap both position-4 occupants simultaneously, retaining unit power, relic charges and attached statuses; if only one is occupied, that unit changes sides into the empty opposing position 4. If both are empty, do nothing. Do not retrigger reveal abilities. Recalculate owner-dependent auras after the swap. This uses fixed position 4 on every viewport. Show the impending exchange on those two positions before it happens.

## Visual directions

| Arena | Main silhouette | Palette and setting |
| --- | --- | --- |
| Chainbridge | Four linked bridge spans and immense iron chains | Slate cliffs, bronze, amber light over a chasm |
| Leyline Nexus | A sequence of weathered standing stones connected by light | Basalt, verdigris, storm-indigo and silver aether |
| Ashen Orchard | A small living tree among pale dead trees | White bark, charcoal ash and ember leaves |
| Bellmarsh | A monumental cracked bell above water | Wet stone, reeds, sage green and blue dawn |
| Mirror Reservoir | A broken arch with an intact reflection | Moon-white marble, black water and plum shadows |
| Gilded Exchange | Two opposing trading plinths | Crimson awnings, tarnished brass and amber lanterns |

The original image sheet records the exploration. Six separate production paintings are now installed in the existing 3:2 location format. See the [artwork files and exact prompts](../output/arena-locations-v1/README.md). The location popup contains only artwork, name and its rule.

## Preview and validation

On `/board-preview`, the arena lineup selector shows original, formation, twist or random arenas. The effect selector includes Formation arenas and Twist arenas: select one and press Preview effects to run a real turn-4 resolution. Gilded Exchange marks position 4 before the trade. Arena effects resolve before the next turn or final score ceremony.

`tests/arena-locations.test.ts` covers arena selection, hidden rules, effect interactions, playback order, all 84 combinations of three arenas through six turns, and the two previews. Fixtures may explicitly select a triple; `shuffle: false` retains the original arenas for deterministic tests. Normal practice and multiplayer matches use the randomized pool.
