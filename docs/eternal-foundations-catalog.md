# Eternal Foundations — playable catalog

Generated from the shipped definitions by `node --import tsx scripts/foundations-catalog.ts`. Design rationale: [set design](eternal-foundations-design.md).

140 collectible base cards: 96 units, 30 spells, 14 relics. 31 cosmetic variants; generated tokens are excluded.

Core, Expanded and Eternal are acquisition sets. Rarity does not grant extra stats. The eight packages share support cards and can be mixed in a twelve-card, single-copy deck.

## Starter packages

### Transmutation

Use Chalk Apprentice and Mercury Scholar to convert awkward printed stats into playable costs. Hold Silver Equation for expensive low-power units. Regent is an option, not the only enabler; Glass Familiar grows and Alloy Guardian protects an early investment.

**Deck:** Chalk Apprentice, Village Scout, Silver Equation, Mercury Scholar, Candle Tender, Glass Familiar, Alloy Guardian, Ascended Prophet, Gilded Oracle, Paradox Regent, Philosopher Engine, Prism Titan.

**Printed cost curve (1–6):** 3 / 2 / 2 / 3 / 1 / 1.

**Other builds:** Trail Wisp / Glass Dragoon plus Phase Walk for a movement hybrid; Refracting Lens plus utility spells for repeatable transformed draws. Remove a large finisher to make room for these support cards.

**Decisions:** Transmutation uses current power when swapping. Hand boosts can increase the resulting cost. Play cheap bodies when setup would concede too much tempo; keep hand space for draws.

Authored six-turn example, verified with natural draws in the engine. Arena letters are A–C. This is one legal draw order, not a guarantee for a shuffled hand.

| Turn | Plays in reveal order |
|---|---|
| 1 | Chalk Apprentice → A |
| 2 | Mercury Scholar → B |
| 3 | Glass Familiar → B; Village Scout → A |
| 4 | Paradox Regent → C |
| 5 | Philosopher Engine → A; Alloy Guardian → C; Candle Tender → A |
| 6 | Gilded Oracle → B; Ascended Prophet → C |

### Sabotage

False Standard and Thorn Seeder establish useful bodies. Tainted Idol supplies cards for Exile Ritual or Inversion Rite; it is not a compulsory turn-one play. Cache followed by a spell plants a persistent Burden. Envoy and Duke threaten space as well as power.

**Deck:** Tainted Idol, Candle Tender, Inversion Rite, Exile Ritual, False Standard, Thorn Seeder, Oathbreaker Duke, Ashen Envoy, Smuggled Contract, Tax Collector, Court of Thorns, Contraband Cache.

**Printed cost curve (1–6):** 3 / 5 / 2 / 1 / 1 / 0.

**Other builds:** Oathbound Scavenger / Revenant remove unwanted bodies; Masked Ferryman gives another send effect. Debt Collector or Death Reaper converts enemy negatives into your own power. Smuggler Vault supports a friendly-token version.

**Decisions:** Check enemy space before sending. A failed defection leaves its negative power with you. A Cursed Offering vanishes after its controller casts a spell; a Burden remains. Mirror Reservoir reverses the value of enemy negative power.

Authored six-turn example, verified with natural draws in the engine. Arena letters are A–C. This is one legal draw order, not a guarantee for a shuffled hand.

| Turn | Plays in reveal order |
|---|---|
| 1 | Tainted Idol → B |
| 2 | False Standard → A |
| 3 | Contraband Cache → C |
| 4 | Burden → C; Exile Ritual → C; Ashen Envoy → B |
| 5 | Court of Thorns → A |
| 6 | Oathbreaker Duke → A; Inversion Rite → B |

### Affliction

Put an early body on the board, then aim Wither at a unit that will stay in play. Spread reductions to enable Debt Collector and Famine Sovereign. Miasma Lantern plus a cheap spell provides a midgame swing.

**Deck:** Blight Acolyte, Cinder Script, Salt Hex, Dusk Leech, Miasma Lantern, Rot Scribe, Hollow Choir, Unmaking, Plague Cartographer, Debt Collector, Famine Sovereign, Warding Bell.

**Printed cost curve (1–6):** 4 / 3 / 2 / 2 / 0 / 1.

**Other builds:** Plague Censer plus Cinder Script for Invocation; Ashen Envoy supplies a guaranteed negative target if the opponent has room. Pale Physician or Censer Warden protects your own copied power.

**Decisions:** Ward and Cleanse are available in the wider pool. Do not spend removal into an empty arena. Harvest values and the Mirror Reservoir rule need checking before the final turn.

Authored six-turn example, verified with natural draws in the engine. Arena letters are A–C. This is one legal draw order, not a guarantee for a shuffled hand.

| Turn | Plays in reveal order |
|---|---|
| 1 | Blight Acolyte → A |
| 2 | Dusk Leech → B |
| 3 | Rot Scribe → B |
| 4 | Miasma Lantern → B; Salt Hex → B; Cinder Script → B |
| 5 | Hollow Choir → A; Unmaking → A |
| 6 | Famine Sovereign → C |

### Conduits

Candle Tender, Temper and Prism Initiate prepare a high-current-power unit. Copy that investment with Vessel of Echoes, transfer it with Current Runner, or distribute it at the end with Last Light Beacon. Titan rewards building before doubling.

**Deck:** Candle Tender, Warding Bell, Temper, Prism Initiate, Current Runner, Ember Conduit, Marrow Engine, Vessel of Echoes, Arcane Echo, Sunwell Keeper, Last Light Beacon, Prism Titan.

**Printed cost curve (1–6):** 3 / 4 / 2 / 1 / 1 / 1.

**Other builds:** Master Forger / Bastion Architect with relics; Horizon Rider with movement; Ascended Prophet and low printed-power units for Transmutation.

**Decisions:** Copying uses a snapshot of current power. Reveal order matters. Keep an inexpensive recipient for transfers, and avoid concentrating all your investment where a single reduction wins the arena.

Authored six-turn example, verified with natural draws in the engine. Arena letters are A–C. This is one legal draw order, not a guarantee for a shuffled hand.

| Turn | Plays in reveal order |
|---|---|
| 1 | Candle Tender → A |
| 2 | Prism Initiate → B |
| 3 | Current Runner → B; Temper → A |
| 4 | Sunwell Keeper → B |
| 5 | Last Light Beacon → C |
| 6 | Prism Titan → C |

### Formation

Place Flank units at positions 1 or 4. Place Linked units between occupied positions. Relics make efficient neighbours; Bridge Marshal connects two units. Hold the Line and Grand Convergence reward filling a lane.

**Deck:** Iron Flanker, Chain Anchor, Hold the Line, Chain Sentinel, Warding Bell, Break Standard, Bridge Marshal, Shield Warden, Linebreaker, Bastion Architect, Banner Heir, Grand Convergence.

**Printed cost curve (1–6):** 5 / 1 / 3 / 2 / 1 / 0.

**Other builds:** Close Ranks or Homeward Call can repair a spread-out board. Ritual Caster is a cheaper full-arena payoff. Warding Bell answers Affliction, while Break Standard opens a relic-heavy opponent.

**Decisions:** Position means the shared 1→2→3→4 track on both screen layouts. A removed relic also removes its adjacency support. Save room for Banner Heir rather than filling every position with setup.

Authored six-turn example, verified with natural draws in the engine. Arena letters are A–C. This is one legal draw order, not a guarantee for a shuffled hand.

| Turn | Plays in reveal order |
|---|---|
| 1 | Iron Flanker → A, position 1 |
| 2 | Chain Sentinel → A, position 3 |
| 3 | Chain Anchor → A, position 2; Warding Bell → A, position 4 |
| 4 | Linebreaker → B, position 1 |
| 5 | Banner Heir → B, position 4 |
| 6 | Shield Warden → B, position 2; Grand Convergence → B |

### Wayfarers

Deploy Trail Wisp and Crossing Guard before moving them. Compass pays off a successful Journey in its own arena. Phase Walk pulls the weakest unit from another arena; Wayward Current sends the weakest unit here to the next arena.

**Deck:** Trail Wisp, Phase Walk, Wayward Current, Crossing Guard, Pilgrim Compass, Close Ranks, Waystone Pilgrim, Open Horizon, Horizon Rider, Linebreaker, Rift Herald, Wandering Colossus.

**Printed cost curve (1–6):** 3 / 4 / 1 / 2 / 2 / 0.

**Other builds:** Glass Dragoon bridges Transmutation and movement; Chaos Drake / Void Leviathan reward isolating a lane. Formation cards reward controlling the newly occupied position.

**Decisions:** Journey is a one-time activation, not a bonus per move. Keep a destination open. A five-cost Wandering Colossus on turn five leaves turn six available to move it; a six-cost version would have lacked that support window.

Authored six-turn example, verified with natural draws in the engine. Arena letters are A–C. This is one legal draw order, not a guarantee for a shuffled hand.

| Turn | Plays in reveal order |
|---|---|
| 1 | Trail Wisp → A, position 1 |
| 2 | Crossing Guard → A, position 2 |
| 3 | Pilgrim Compass → B, position 2; Phase Walk → B |
| 4 | Horizon Rider → A, position 3 |
| 5 | Wandering Colossus → C, position 1 |
| 6 | Rift Herald → C, position 2; Wayward Current → A |

### Invocation

Build Rune Attendant, Glyph Scholar or Ember Conduit before spending utility spells. Spread engines when one arena is full. Archmage plus a later spell supports a second arena; draw spells help find the next turn, not cards playable during the current resolution.

**Deck:** Rune Attendant, Cinder Script, Mana Surge, Measured Cast, Glyph Scholar, Ember Conduit, Miasma Lantern, Spellfont, Arcane Echo, Frost Elder, Archmage, Grand Convergence.

**Printed cost curve (1–6):** 4 / 5 / 1 / 1 / 1 / 0.

**Other builds:** Refracting Lens for Transmutation, Contraband Cache for Sabotage, or Plague Censer for Affliction. Swap one engine and one spell as a pair rather than replacing all the units.

**Decisions:** New spell engines trigger once per turn, in their own arena. All plays are committed together: drawn cards enter the next planning hand. A full hand wastes excess draws.

Authored six-turn example, verified with natural draws in the engine. Arena letters are A–C. This is one legal draw order, not a guarantee for a shuffled hand.

| Turn | Plays in reveal order |
|---|---|
| 1 | Rune Attendant → A, position 1 |
| 2 | Glyph Scholar → A, position 2 |
| 3 | Ember Conduit → A, position 3; Cinder Script → A |
| 4 | Spellfont → A, position 4; Arcane Echo → A |
| 5 | Archmage → B, position 1 |
| 6 | Frost Elder → B, position 2; Mana Surge → B |

### Stewardship

Scrap Custodian and Chain Sentinel give relics immediate recipients. Place War Standard between units. Salvage Rite trades an old relic for a card and power; Master Forger, Architect and Igna turn remaining relics into scoring power.

**Deck:** Scrap Custodian, Chain Anchor, Chain Sentinel, Linebreaker, War Standard, Ember Incubator, Relic Diver, Master Forger, Salvage Rite, Null Sigil, Bastion Architect, Igna Unchained.

**Printed cost curve (1–6):** 3 / 5 / 1 / 2 / 1 / 0.

**Other builds:** Warding Bell / Restoration against Affliction; Codex of Ages with several cheap spells; Lord of Bones with Ember Incubator for a generated-unit build. Relic Diver provides salvage on a body when space is available.

**Decisions:** Relics have zero power and consume one of four positions. The starter keeps seven units so it can actually score. Dispel removes the cheapest relic, with position breaking ties; queued cards still need an empty position when the plan is committed.

Authored six-turn example, verified with natural draws in the engine. Arena letters are A–C. This is one legal draw order, not a guarantee for a shuffled hand.

| Turn | Plays in reveal order |
|---|---|
| 1 | Scrap Custodian → A, position 1 |
| 2 | War Standard → A, position 2 |
| 3 | Chain Sentinel → A, position 3; Chain Anchor → A, position 4 |
| 4 | Salvage Rite → A; Master Forger → B, position 1 |
| 5 | Igna Unchained → B, position 3 |
| 6 | Bastion Architect → C, position 1; Ember Incubator → B, position 2 |

## Complete card list

| Card | Type | Aether | Power | Set / rarity | Packages | Ability |
|---|---|---:|---:|---|---|---|
| [Aether Battery](../apps/web/public/cards/relics/aether_battery-v1.jpg) | relic | 1 | — | expanded / rare | stewardship, conduits | After each turn, store your unspent aether. When you next reveal an adjacent friendly unit, spend all stored aether to give it that much power before its ability. |
| [Blight Acolyte](../apps/web/public/cards/shattered-pacts/blight_acolyte.webp) | unit | 1 | 1 | expanded / common | affliction | On Reveal: the weakest unwarded enemy unit here loses 2 power. |
| [Break Standard](../apps/web/public/cards/foundations/break_standard.webp) | spell | 1 | — | core / common | formation, stewardship | On Reveal: destroy the cheapest enemy relic here. Ties favour the earlier position. |
| [Candle Tender](../apps/web/public/cards/shattered-pacts/candle_tender.webp) | unit | 1 | 2 | expanded / common | conduits | On Reveal: give your weakest other unit here +1 power. |
| [Chain Anchor](../apps/web/public/cards/foundations/chain_anchor.webp) | relic | 1 | — | core / common | formation, stewardship | Ongoing: adjacent friendly units have +1 power. |
| [Chalk Apprentice](../apps/web/public/cards/shattered-pacts/chalk_apprentice.webp) | unit | 1 | 2 | expanded / common | transmutation | On Reveal: Transmute the next eligible unit you draw: swap cost and power (cost 0–6; once per card). |
| [Cinder Script](../apps/web/public/cards/foundations/cinder_script.webp) | spell | 1 | — | core / common | invocation, affliction | On Reveal: the strongest unwarded enemy unit here loses 1 power. On Reveal: give your weakest other unit here +1 power. |
| [Cleansing Flame](../apps/web/public/cards/shattered-pacts/cleansing_flame.webp) | spell | 1 | — | expanded / common | conduits, affliction | On Reveal: Purge all generated units on your side here. On Reveal: Cleanse your weakest afflicted unit here: remove applied power reductions and Wither, preserving buffs and printed negative power. |
| [Exile Ritual](../apps/web/public/cards/shattered-pacts/exile_ritual.webp) | spell | 1 | — | expanded / common | sabotage | On Reveal: Exile your weakest other unit here with 0 or less power to the opponent’s side, if there is an unreserved space. |
| [Hold the Line](../apps/web/public/cards/foundations/hold_the_line.webp) | spell | 1 | — | core / common | formation, invocation | On Reveal: give your units here with an occupied adjacent friendly position +1 power. |
| [Hollow Gift](../apps/web/public/cards/shattered-pacts/hollow_gift.webp) | spell | 1 | — | expanded / common | sabotage | On Reveal: add a Burden to the opponent’s hand, if space remains. It is a 0-cost, −1-power unit with no ability. On Reveal: draw 1 card (hand limit 7). |
| [Iron Flanker](../apps/web/public/cards/foundations/iron_flanker.webp) | unit | 1 | 1 | core / common | formation | Ongoing: +2 power in position 1 or 4. |
| [Lead to Gold](../apps/web/public/cards/shattered-pacts/lead_to_gold.webp) | spell | 1 | — | expanded / common | transmutation, affliction | On Reveal: the lowest-power unit in your hand loses 2 power. On Reveal: draw 1 card (hand limit 7). |
| [Liquid Potential](../apps/web/public/cards/foundations/liquid_potential.webp) | spell | 1 | — | expanded / uncommon | transmutation, invocation | On Reveal: the lowest-power unit in your hand loses 1 power. On Reveal: Transmute the next eligible unit you draw: swap cost and power (cost 0–6; once per card). |
| [Mana Surge](../apps/web/public/cards/mana-surge.png) | spell | 1 | — | core / common | invocation, transmutation | On Reveal: draw 2 cards (hand limit 7). |
| [Measured Cast](../apps/web/public/cards/foundations/measured_cast.webp) | spell | 1 | — | expanded / common | invocation, conduits | On Reveal: draw 1 card (hand limit 7). On Reveal: give the lowest-power unit in your hand +1 power. |
| [Phase Walk](../apps/web/public/cards/phase-walk.png) | spell | 1 | — | core / uncommon | wayfarers, invocation | On Reveal: move your weakest unit from another arena here, if space remains. |
| [Restoration](../apps/web/public/cards/foundations/restoration.webp) | spell | 1 | — | core / common | stewardship, conduits | On Reveal: Cleanse your units here: remove applied power reductions and Wither, preserving buffs and printed negative power. On Reveal: give your weakest other unit here +1 power. |
| [Rune Attendant](../apps/web/public/cards/foundations/rune_attendant.webp) | unit | 1 | 1 | core / common | invocation | After you cast a spell here, once per turn: this gains +1 power. |
| [Salt Hex](../apps/web/public/cards/shattered-pacts/salt_hex.webp) | spell | 1 | — | expanded / common | affliction | On Reveal: the weakest unwarded enemy unit here loses 3 power. |
| [Salvage Rite](../apps/web/public/cards/foundations/salvage_rite.webp) | spell | 1 | — | expanded / common | stewardship, invocation | On Reveal: destroy your cheapest relic here to draw 1 card. Ties favour the earlier position. On Reveal: give your weakest other unit here +2 power. |
| [Scrap Custodian](../apps/web/public/cards/foundations/scrap_custodian.webp) | unit | 1 | 1 | core / common | stewardship | Ongoing: +2 power for each friendly relic here. |
| [Smuggler Vault](../apps/web/public/cards/foundations/smuggler_vault.webp) | relic | 1 | — | expanded / uncommon | sabotage, stewardship | On Reveal: add a Burden to your hand, if space remains. It is a 0-cost, −1-power unit with no ability. Ongoing: your other generated units here have +2 power. |
| [Spark Sprite](../apps/web/public/cards/spark-sprite.png) | unit | 1 | 1 | core / common | formation | On Reveal: +2 power if this arena was tied before this card revealed. |
| [Tainted Idol](../apps/web/public/cards/shattered-pacts/tainted_idol.webp) | unit | 1 | -2 | expanded / common | sabotage, transmutation | On Reveal: draw 2 cards (hand limit 7). |
| [Temper](../apps/web/public/cards/temper.png) | spell | 1 | — | core / common | conduits, invocation | On Reveal: give your strongest unit here +3 power. |
| [Trail Wisp](../apps/web/public/cards/foundations/trail_wisp.webp) | unit | 1 | 1 | core / common | wayfarers, transmutation | Journey: +3 power after this unit moves between arenas. Does not stack; changing sides does not count. |
| [Village Scout](../apps/web/public/cards/village-scout.png) | unit | 1 | 2 | core / common | formation | Steady power. No ability. |
| [Warding Bell](../apps/web/public/cards/relics/warding_bell-v1.jpg) | relic | 1 | — | core / uncommon | stewardship, formation | Once each turn, prevent the first enemy power reduction to an adjacent friendly unit. |
| [Wayward Current](../apps/web/public/cards/foundations/wayward_current.webp) | spell | 1 | — | core / common | wayfarers, invocation | On Reveal: move your weakest unit here to the next arena (left → middle → right → left), if space remains. |
| [Apprentice Mage](../apps/web/public/cards/apprentice-mage.png) | unit | 2 | 1 | core / uncommon | formation, invocation | Ongoing: your other units here have +1 power. |
| [Arcane Echo](../apps/web/public/cards/arcane-echo.png) | spell | 2 | — | core / rare | invocation, conduits | On Reveal: give your units here +2 power. |
| [Bone Knight](../apps/web/public/cards/bone-knight.png) | unit | 2 | 3 | core / common | formation | Steady power. No ability. |
| [Borrowed Strength](../apps/web/public/cards/foundations/borrowed_strength.webp) | spell | 2 | — | expanded / uncommon | affliction, conduits | On Reveal: the strongest unwarded enemy unit here loses 3 power. On Reveal: give your weakest other unit here +2 power. |
| [Chain Sentinel](../apps/web/public/cards/foundations/chain_sentinel.webp) | unit | 2 | 2 | core / common | formation, stewardship | Ongoing: +1 power for each occupied adjacent friendly position (units or relics). |
| [Close Ranks](../apps/web/public/cards/foundations/close_ranks.webp) | spell | 2 | — | expanded / uncommon | formation, wayfarers | On Reveal: move your weakest unit from another arena here, if space remains. On Reveal: give your units here +1 power. |
| [Codex of Ages](../apps/web/public/cards/codex-of-ages.png) | relic | 2 | — | expanded / uncommon | invocation, stewardship | After you cast a spell here, once per turn: draw 1 card (hand limit 7). |
| [Contraband Cache](../apps/web/public/cards/relics/contraband_cache-v1.jpg) | relic | 2 | — | expanded / rare | sabotage, invocation, stewardship | After you cast a spell here, once per turn: Plant a −1 Burden on the enemy side here, if space remains. Burdens stay until removed by an effect. |
| [Counterfeit Courier](../apps/web/public/cards/shattered-pacts/counterfeit_courier.webp) | unit | 2 | 3 | expanded / common | sabotage | On Reveal: add a Burden to the opponent’s hand, if space remains. It is a 0-cost, −1-power unit with no ability. |
| [Crossing Guard](../apps/web/public/cards/foundations/crossing_guard.webp) | unit | 2 | 2 | core / common | wayfarers, formation | Journey: +3 power after this unit moves between arenas. Does not stack; changing sides does not count. |
| [Current Runner](../apps/web/public/cards/shattered-pacts/current_runner.webp) | unit | 2 | 3 | expanded / uncommon | conduits | On Reveal: transfer up to 2 positive power from your strongest unit here to your weakest unit in another arena. |
| [Dusk Leech](../apps/web/public/cards/shattered-pacts/dusk_leech.webp) | unit | 2 | 2 | expanded / uncommon | affliction, conduits | On Reveal: Siphon 1 power from the strongest unwarded enemy unit here: it loses it and this gains the amount removed. |
| [Ember Conduit](../apps/web/public/cards/shattered-pacts/ember_conduit.webp) | unit | 2 | 2 | expanded / uncommon | conduits | After you cast a spell here, once per turn: this gains +2 power. |
| [Ember Incubator](../apps/web/public/cards/relics/ember_incubator-v1.jpg) | relic | 2 | — | expanded / rare | stewardship, conduits | After 2 turn endings, destroy this and summon a 5-power Emberling in its position. Includes the turn played. |
| [False Standard](../apps/web/public/cards/shattered-pacts/false_standard.webp) | unit | 2 | 3 | expanded / rare | sabotage, conduits | Ongoing: your other generated units here have +2 power. On Reveal: add a Burden to your hand, if space remains. It is a 0-cost, −1-power unit with no ability. |
| [Forge Apprentice](../apps/web/public/cards/forge-apprentice.png) | unit | 2 | 2 | core / uncommon | formation | On Reveal: +2 power if you were leading here before this card revealed. |
| [Glyph Scholar](../apps/web/public/cards/foundations/glyph_scholar.webp) | unit | 2 | 1 | core / uncommon | invocation, transmutation | After you cast a spell here, once per turn: draw 1 card (hand limit 7). |
| [Grand Invocation](../apps/web/public/cards/grand-invocation.png) | spell | 2 | — | core / legendary | invocation | On Reveal: draw 3 cards (hand limit 7). |
| [Homeward Call](../apps/web/public/cards/foundations/homeward_call.webp) | spell | 2 | — | expanded / common | wayfarers, conduits | On Reveal: move your weakest unit from another arena here, if space remains. On Reveal: give your weakest other unit here +2 power. |
| [Inversion Rite](../apps/web/public/cards/shattered-pacts/inversion_rite.webp) | spell | 2 | — | expanded / common | conduits, sabotage, affliction | On Reveal: Invert your weakest unit here if its current power is negative, turning that number positive. |
| [Lingering Curse](../apps/web/public/cards/foundations/lingering_curse.webp) | spell | 2 | — | expanded / common | affliction, invocation | On Reveal: Wither the weakest unwarded enemy unit here: it loses 2 power at the end of this turn and the next. |
| [Mercury Scholar](../apps/web/public/cards/shattered-pacts/mercury_scholar.webp) | unit | 2 | 2 | expanded / uncommon | transmutation | On Reveal: Transmute the lowest-power eligible unit in your hand: swap cost and power (cost 0–6; once per card). |
| [Miasma Lantern](../apps/web/public/cards/shattered-pacts/miasma_lantern.webp) | unit | 2 | 2 | expanded / rare | affliction, conduits | After you cast a spell here, once per turn: Siphon 1 power from the strongest unwarded enemy unit here: it loses it and this gains the amount removed. |
| [Mirror Squire](../apps/web/public/cards/shattered-pacts/mirror_squire.webp) | unit | 2 | 2 | expanded / common | conduits, transmutation | On Reveal: set this card’s current power to your weakest other unit’s current power here. |
| [Mountain Hermit](../apps/web/public/cards/mountain-hermit.png) | unit | 2 | 1 | core / common | conduits, wayfarers | After each later turn, gain +1 power. |
| [Null Sigil](../apps/web/public/cards/foundations/null_sigil.webp) | spell | 2 | — | expanded / uncommon | stewardship, affliction | On Reveal: destroy the cheapest enemy relic here. Ties favour the earlier position. On Reveal: the strongest unwarded enemy unit here loses 2 power. |
| [Oathbound Scavenger](../apps/web/public/cards/foundations/oathbound_scavenger.webp) | unit | 2 | 3 | core / common | sabotage, conduits | On Reveal: Purge all generated units on your side here. On Reveal: give your weakest other unit here +1 power. |
| [Open Horizon](../apps/web/public/cards/foundations/open_horizon.webp) | spell | 2 | — | expanded / uncommon | wayfarers, invocation | On Reveal: move your weakest unit from another arena here, if space remains. On Reveal: draw 1 card (hand limit 7). |
| [Pale Physician](../apps/web/public/cards/shattered-pacts/pale_physician.webp) | unit | 2 | 3 | expanded / common | affliction, conduits | On Reveal: Cleanse your weakest afflicted unit here: remove applied power reductions and Wither, preserving buffs and printed negative power. |
| [Pilgrim Compass](../apps/web/public/cards/foundations/pilgrim_compass.webp) | relic | 2 | — | expanded / uncommon | wayfarers, stewardship | Ongoing: friendly units here that have moved between arenas have +2 power. |
| [Plague Censer](../apps/web/public/cards/foundations/plague_censer.webp) | relic | 2 | — | expanded / uncommon | affliction, invocation, stewardship | After you cast a spell here, once per turn: the weakest unwarded enemy unit here loses 1 power. |
| [Prism Initiate](../apps/web/public/cards/shattered-pacts/prism_initiate.webp) | unit | 2 | 2 | expanded / common | conduits | On Reveal: give the highest-power unit in your hand +2 power. |
| [Refracting Lens](../apps/web/public/cards/foundations/refracting_lens.webp) | relic | 2 | — | expanded / rare | transmutation, invocation, stewardship | After you cast a spell here, once per turn: Transmute the next eligible unit you draw: swap cost and power (cost 0–6; once per card). |
| [Relic Diver](../apps/web/public/cards/foundations/relic_diver.webp) | unit | 2 | 3 | expanded / uncommon | stewardship, invocation | On Reveal: destroy your cheapest relic here to draw 1 card. Ties favour the earlier position. |
| [Revenant](../apps/web/public/cards/revenant.png) | unit | 2 | 1 | core / uncommon | sabotage, conduits | On Reveal: Consume your weakest other unit here. Gain its positive current power, then remove it. |
| [Ritual Caster](../apps/web/public/cards/ritual-caster.png) | unit | 2 | 2 | core / common | formation, stewardship | Ongoing: +3 power while your side here is full. |
| [Silver Equation](../apps/web/public/cards/shattered-pacts/silver_equation.webp) | spell | 2 | — | expanded / rare | transmutation | On Reveal: Transmute the 2 lowest-power eligible units in your hand: swap cost and power (cost 0–6; once per card). |
| [Smuggled Contract](../apps/web/public/cards/foundations/smuggled_contract.webp) | spell | 2 | — | expanded / rare | sabotage, invocation | On Reveal: Plant a −1 Burden on the enemy side here, if space remains. Burdens stay until removed by an effect. On Reveal: draw 1 card (hand limit 7). |
| [Spellfont](../apps/web/public/cards/relics/spellfont-v1.jpg) | relic | 2 | — | core / uncommon | stewardship, invocation | After you cast a spell here, give your lowest-power adjacent unit +1 power. Ties favour the earlier position. |
| [Thorn Seeder](../apps/web/public/cards/shattered-pacts/thorn_seeder.webp) | unit | 2 | 3 | expanded / uncommon | sabotage | On Reveal: Plant a −2 Cursed Offering on the enemy side here, if space remains. It disappears when its controller casts a spell here. |
| [Unmaking](../apps/web/public/cards/shattered-pacts/unmaking.webp) | spell | 2 | — | expanded / common | affliction | On Reveal: all unwarded enemy units here lose 2 power. |
| [Wandering Blade](../apps/web/public/cards/wandering-blade.png) | unit | 2 | 2 | core / common | formation | On Reveal: +2 power if you were behind here before this card revealed. |
| [War Standard](../apps/web/public/cards/relics/war_standard-v1.jpg) | relic | 2 | — | core / common | stewardship, formation | Ongoing: adjacent friendly units have +2 power. |
| [Alloy Guardian](../apps/web/public/cards/shattered-pacts/alloy_guardian.webp) | unit | 3 | 2 | expanded / uncommon | transmutation | Ward: enemy effects cannot reduce this card’s power. On Reveal: +2 power if you were behind here before this card revealed. |
| [Ashen Envoy](../apps/web/public/cards/shattered-pacts/ashen_envoy.webp) | unit | 3 | -5 | expanded / uncommon | sabotage, affliction | On Reveal: Defect: switch to the opponent’s side here if there is an unreserved space. Otherwise, stay on your side. |
| [Bridge Marshal](../apps/web/public/cards/foundations/bridge_marshal.webp) | unit | 3 | 3 | core / uncommon | formation, conduits | Ongoing: adjacent friendly units have +1 power. |
| [Censer Warden](../apps/web/public/cards/shattered-pacts/censer_warden.webp) | unit | 3 | 3 | eternal / legendary | affliction | Ward: enemy effects cannot reduce this card’s power. On Reveal: Cleanse your units here: remove applied power reductions and Wither, preserving buffs and printed negative power. |
| [Crucible Seer](../apps/web/public/cards/shattered-pacts/crucible_seer.webp) | unit | 3 | 3 | expanded / uncommon | transmutation | On Reveal: Transmute the next 2 eligible units you draw: swap cost and power (cost 0–6; once per card). |
| [Debt Broker](../apps/web/public/cards/shattered-pacts/debt_broker.webp) | unit | 3 | 3 | expanded / rare | sabotage, affliction | On Reveal: add a Burden to the opponent’s hand, if space remains. It is a 0-cost, −1-power unit with no ability. On Reveal: gain +1 power for each enemy unit here with negative current power. |
| [Frost Sage](../apps/web/public/cards/frost-sage.png) | unit | 3 | 3 | core / uncommon | formation | On Reveal: +3 power if you were behind here before this card revealed. |
| [Gilded Astrolabe](../apps/web/public/cards/foundations/gilded_astrolabe.webp) | relic | 3 | — | expanded / rare | formation, stewardship, invocation | After you cast a spell here, once per turn: give your units here +1 power. |
| [Glass Familiar](../apps/web/public/cards/shattered-pacts/glass_familiar.webp) | unit | 3 | 2 | expanded / common | transmutation | Ongoing: +2 power if this card has been transmuted. After each later turn, gain +1 power. |
| [Grand Convergence](../apps/web/public/cards/foundations/grand_convergence.webp) | spell | 3 | — | expanded / rare | invocation, formation | On Reveal: give your units here +3 power. |
| [Hollow Choir](../apps/web/public/cards/shattered-pacts/hollow_choir.webp) | unit | 3 | 3 | expanded / uncommon | affliction | On Reveal: all unwarded enemy units here lose 1 power. |
| [Iron Golem](../apps/web/public/cards/iron-golem.png) | unit | 3 | 5 | core / common | conduits | Steady power. No ability. |
| [Marrow Engine](../apps/web/public/cards/shattered-pacts/marrow_engine.webp) | unit | 3 | 4 | expanded / uncommon | conduits, sabotage | On Reveal: Consume your weakest other unit here. Gain its positive current power, then remove it. |
| [Masked Ferryman](../apps/web/public/cards/shattered-pacts/masked_ferryman.webp) | unit | 3 | 4 | expanded / uncommon | sabotage | On Reveal: Exile your weakest other unit here with 0 or less power to the opponent’s side, if there is an unreserved space. |
| [Master Forger](../apps/web/public/cards/master-forger.png) | unit | 3 | 2 | core / uncommon | stewardship, conduits | Ongoing: +2 power for each friendly relic here. On Reveal: give your weakest other unit here +1 power. |
| [Rift Caller](../apps/web/public/cards/rift-caller.png) | unit | 3 | 3 | core / uncommon | invocation, transmutation | On Reveal: draw 1 card (hand limit 7). |
| [Rot Scribe](../apps/web/public/cards/shattered-pacts/rot_scribe.webp) | unit | 3 | 3 | expanded / uncommon | affliction | On Reveal: Wither the weakest unwarded enemy unit here: it loses 2 power at the end of this turn and the next. |
| [Shield Warden](../apps/web/public/cards/shield-warden.png) | unit | 3 | 2 | core / uncommon | formation, stewardship | Ongoing: +2 power for each occupied adjacent friendly position (units or relics). |
| [Splinter Agent](../apps/web/public/cards/shattered-pacts/splinter_agent.webp) | unit | 3 | 4 | expanded / rare | sabotage, affliction | On Reveal: Plant a −2 Cursed Offering on the enemy side here, if space remains. It disappears when its controller casts a spell here. On Reveal: the weakest unwarded enemy unit here loses 1 power. |
| [Sunken Reliquary](../apps/web/public/cards/foundations/sunken_reliquary.webp) | relic | 3 | — | expanded / rare | conduits, stewardship, invocation | After you cast a spell here, once per turn: give your weakest other unit here +2 power. |
| [Tax Collector](../apps/web/public/cards/foundations/tax_collector.webp) | unit | 3 | 3 | expanded / uncommon | sabotage, invocation, affliction | After you cast a spell here, once per turn: gain +1 power for each enemy unit here with negative current power. |
| [Vessel of Echoes](../apps/web/public/cards/shattered-pacts/vessel_of_echoes.webp) | unit | 3 | 0 | expanded / rare | transmutation, conduits | On Reveal: set this card’s current power to your strongest other unit’s current power here. |
| [Waystone Pilgrim](../apps/web/public/cards/foundations/waystone_pilgrim.webp) | unit | 3 | 3 | core / uncommon | wayfarers | On Reveal: move your weakest unit from another arena here, if space remains. |
| [Ascended Prophet](../apps/web/public/cards/ascended-prophet.png) | unit | 4 | 1 | expanded / rare | transmutation, conduits | Ongoing: +2 power if this card has been transmuted. On Reveal: give the lowest-power unit in your hand +2 power. |
| [Bastion Architect](../apps/web/public/cards/foundations/bastion_architect.webp) | unit | 4 | 4 | expanded / uncommon | formation, stewardship | Ongoing: +2 power for each friendly relic here. |
| [Chaos Drake](../apps/web/public/cards/chaos-drake.png) | unit | 4 | 5 | core / rare | wayfarers | Ongoing: +3 power while this is your only card here. |
| [Debt Collector](../apps/web/public/cards/shattered-pacts/debt_collector.webp) | unit | 4 | 4 | expanded / rare | affliction, sabotage | On Reveal: gain +2 power for each enemy unit here with negative current power. Gain +1 instead for each other enemy here with an applied power reduction. |
| [Equal Measure](../apps/web/public/cards/shattered-pacts/equal_measure.webp) | spell | 4 | — | expanded / rare | conduits | On Reveal: set every unit’s current power here to 3. Enemy Ward prevents reductions. |
| [Frost Elder](../apps/web/public/cards/frost-elder.png) | unit | 4 | 4 | expanded / rare | invocation, affliction | On Reveal: Cleanse your units here: remove applied power reductions and Wither, preserving buffs and printed negative power. After you cast a spell here, once per turn: the strongest unwarded enemy unit here loses 1 power. |
| [Gilded Oracle](../apps/web/public/cards/shattered-pacts/gilded_oracle.webp) | unit | 4 | 2 | expanded / rare | transmutation | On Reveal: draw 1 card (hand limit 7). On Reveal, if this card was transmuted: draw 1 card (hand limit 7). On Reveal: +1 power if you were behind here before this card revealed. |
| [Horizon Rider](../apps/web/public/cards/foundations/horizon_rider.webp) | unit | 4 | 4 | expanded / uncommon | wayfarers, conduits | Journey: +4 power after this unit moves between arenas. Does not stack; changing sides does not count. |
| [Linebreaker](../apps/web/public/cards/foundations/linebreaker.webp) | unit | 4 | 4 | core / common | formation, wayfarers | Ongoing: +3 power in position 1 or 4. |
| [Living Codex](../apps/web/public/cards/living-codex.png) | unit | 4 | 3 | core / legendary | invocation, transmutation | On Reveal: draw 2 cards (hand limit 7). |
| [Oathbreaker Duke](../apps/web/public/cards/shattered-pacts/oathbreaker_duke.webp) | unit | 4 | -7 | eternal / legendary | sabotage, affliction | On Reveal: Defect: switch to the opponent’s side here if there is an unreserved space. Otherwise, stay on your side. |
| [Paradox Regent](../apps/web/public/cards/shattered-pacts/paradox_regent.webp) | unit | 4 | 3 | eternal / legendary | transmutation | On Reveal: Transmute every eligible unit in your deck: swap cost and power (cost 0–6; once per card). On Reveal: draw 1 card (hand limit 7). |
| [Plague Cartographer](../apps/web/public/cards/shattered-pacts/plague_cartographer.webp) | unit | 4 | 4 | expanded / rare | affliction | On Reveal: the weakest unwarded enemy unit in each other arena loses 2 power. |
| [Quicksilver Archivist](../apps/web/public/cards/shattered-pacts/quicksilver_archivist.webp) | unit | 4 | 3 | expanded / rare | transmutation | On Reveal: Transmute the 2 lowest-power eligible units in your hand: swap cost and power (cost 0–6; once per card). |
| [Soul Collector](../apps/web/public/cards/soul-collector.png) | unit | 4 | 5 | core / rare | affliction, conduits | On Reveal: the strongest unwarded enemy unit here loses 2 power. |
| [Summit Prophet](../apps/web/public/cards/summit-prophet.png) | unit | 4 | 4 | core / legendary | invocation | On Reveal: draw 1 card (hand limit 7). |
| [Sunwell Keeper](../apps/web/public/cards/shattered-pacts/sunwell_keeper.webp) | unit | 4 | 3 | expanded / rare | conduits | On Reveal: give your weakest other unit here power equal to this card’s positive current power. |
| [The Undying](../apps/web/public/cards/the-undying.png) | unit | 4 | 4 | core / legendary | conduits | After each later turn, gain +2 power. |
| [Thunder Hawk](../apps/web/public/cards/thunder-hawk.png) | unit | 4 | 5 | core / uncommon | formation | On Reveal: +2 power if you were leading here before this card revealed. |
| [Ancient Guardian](../apps/web/public/cards/ancient-guardian.png) | unit | 5 | 8 | core / rare | conduits | Ward: enemy effects cannot reduce this card’s power. |
| [Archmage](../apps/web/public/cards/archmage.png) | unit | 5 | 4 | expanded / rare | invocation, conduits | After you cast a spell here, once per turn: give your units here +1 power. |
| [Banner Heir](../apps/web/public/cards/foundations/banner_heir.webp) | unit | 5 | 6 | expanded / rare | formation | Ongoing: +4 power while your side here is full. |
| [Banshee Queen](../apps/web/public/cards/banshee-queen.png) | unit | 5 | 6 | core / legendary | affliction | On Reveal: all unwarded enemy units here lose 1 power. |
| [Court of Thorns](../apps/web/public/cards/shattered-pacts/court_of_thorns.webp) | unit | 5 | 6 | eternal / legendary | sabotage | On Reveal: Plant a −1 Burden on the enemy side of each other arena, if space remains. Burdens stay until removed by an effect. |
| [Death Reaper](../apps/web/public/cards/death-reaper.png) | unit | 5 | 6 | expanded / rare | affliction, sabotage | After turn 6: gain +2 power for each enemy unit here with negative current power. |
| [Entropic Maw](../apps/web/public/cards/entropic-maw.png) | unit | 5 | 8 | core / legendary | formation | On Reveal: +3 power if you were leading here before this card revealed. |
| [Forge Wraith](../apps/web/public/cards/forge-wraith.png) | unit | 5 | 6 | core / legendary | affliction | On Reveal: the strongest unwarded enemy unit here loses 3 power. |
| [Glass Dragoon](../apps/web/public/cards/foundations/glass_dragoon.webp) | unit | 5 | 2 | expanded / rare | transmutation, wayfarers, formation | Ongoing: +2 power in position 1 or 4. Journey: +2 power after this unit moves between arenas. Does not stack; changing sides does not count. |
| [Igna Unchained](../apps/web/public/cards/igna-unchained.png) | unit | 5 | 6 | eternal / legendary | stewardship, conduits | Ongoing: +2 power for each friendly relic here. |
| [Last Light Beacon](../apps/web/public/cards/shattered-pacts/last_light_beacon.webp) | unit | 5 | 7 | eternal / legendary | conduits | After turn 6: distribute all this card’s positive current power evenly among your weakest units in the other arenas. Any extra point goes left first. |
| [Lord of Bones](../apps/web/public/cards/lord-of-bones.png) | unit | 5 | 5 | core / legendary | sabotage, stewardship | Ongoing: your other generated units here have +3 power. |
| [Philosopher Engine](../apps/web/public/cards/shattered-pacts/philosopher_engine.webp) | unit | 5 | 2 | eternal / legendary | transmutation, conduits | Ongoing: your other units here have +1 power. On Reveal: +3 power if you were behind here before this card revealed. |
| [Rift Herald](../apps/web/public/cards/rift-herald.png) | unit | 5 | 5 | expanded / rare | wayfarers, formation | On Reveal: move your weakest unit from another arena here, if space remains. On Reveal: +2 power if you were behind here before this card revealed. |
| [Rift Sovereign](../apps/web/public/cards/rift-sovereign.png) | unit | 5 | 6 | core / legendary | formation, wayfarers | Ongoing: your other units here have +1 power. |
| [Wandering Colossus](../apps/web/public/cards/foundations/wandering_colossus.webp) | unit | 5 | 6 | eternal / legendary | wayfarers | Journey: +5 power after this unit moves between arenas. Does not stack; changing sides does not count. |
| [Death Incarnate](../apps/web/public/cards/death-incarnate.png) | unit | 6 | 6 | eternal / legendary | affliction | On Reveal: the weakest unwarded enemy unit in each other arena loses 2 power. |
| [Famine Sovereign](../apps/web/public/cards/shattered-pacts/famine_sovereign.webp) | unit | 6 | 5 | eternal / legendary | affliction | On Reveal: Siphon 1 power from each unwarded enemy here: they lose it and this gains the amount removed. |
| [Glacier Sovereign](../apps/web/public/cards/glacier-sovereign.png) | unit | 6 | 9 | core / legendary | formation | On Reveal: +4 power if you were leading here before this card revealed. |
| [Igna, Eternal Flame](../apps/web/public/cards/igna-eternal-flame.png) | unit | 6 | 7 | core / legendary | formation, conduits | Ongoing: your other units here have +2 power. |
| [Ironclad Colossus](../apps/web/public/cards/ironclad-colossus.png) | unit | 6 | 12 | core / legendary | conduits | Steady power. No ability. |
| [Prism Titan](../apps/web/public/cards/shattered-pacts/prism_titan.webp) | unit | 6 | 4 | eternal / legendary | conduits, transmutation | On Reveal: double this card’s current power. |
| [The Archon](../apps/web/public/cards/the-archon.png) | unit | 6 | 6 | core / legendary | conduits | On Reveal: give your weakest other unit here power equal to this card’s positive current power. |
| [The Unbroken](../apps/web/public/cards/the-unbroken.png) | unit | 6 | 8 | core / legendary | formation | On Reveal: +5 power if you were behind here before this card revealed. |
| [Void Leviathan](../apps/web/public/cards/void-leviathan.png) | unit | 6 | 8 | core / legendary | wayfarers | Ongoing: +5 power while this is your only card here. |

## Alternate artwork

Variants retain the base card’s cost, power, rules and mastery. The 27 new variants are pack rewards for already-owned base cards; the three existing featured-shop variants and one season-exclusive artwork remain in their respective sources.

| Card | Variant | Treatment | Source |
|---|---|---|---|
| Frost Sage | [Winter Ink](../apps/web/public/cards/variants/frost-sage-winter-ink.webp) | Brush & ink | shop |
| Chaos Drake | [Vermilion Tempest](../apps/web/public/cards/variants/chaos-drake-vermilion-tempest.webp) | Woodblock | shop |
| Ancient Guardian | [Hollow Sentinel](../apps/web/public/cards/variants/ancient-guardian-hollow-sentinel.webp) | Dark folklore | shop |
| Village Scout | [Lanternwood](../apps/web/public/cards/variants/village-scout-lanternwood.webp) | Layered paper | pack |
| Wandering Blade | [Moonlit Ronin](../apps/web/public/cards/variants/wandering-blade-moonlit-ronin.webp) | Brush & ink | pack |
| Shield Warden | [Brass Saint](../apps/web/public/cards/variants/shield-warden-brass-saint.webp) | Stained glass | pack |
| Thunder Hawk | [Storm Scroll](../apps/web/public/cards/variants/thunder-hawk-storm-scroll.webp) | Woodblock | pack |
| Iron Golem | [Porcelain Giant](../apps/web/public/cards/variants/iron-golem-porcelain-giant.webp) | Painted porcelain | pack |
| Forge Apprentice | [Ember Tapestry](../apps/web/public/cards/variants/forge-apprentice-ember-tapestry.webp) | Woven tapestry | pack |
| Temper | [Goldsmith’s Dream](../apps/web/public/cards/variants/temper-goldsmiths-dream.webp) | Illuminated miniature | pack |
| Igna, Eternal Flame | [Ash Queen](../apps/web/public/cards/variants/igna-eternal-flame-ash-queen.webp) | Charcoal & oil | pack |
| Ironclad Colossus | [Mossbound](../apps/web/public/cards/variants/ironclad-colossus-mossbound.webp) | Dark folklore | pack |
| Mountain Hermit | [Winter Pilgrim](../apps/web/public/cards/variants/mountain-hermit-winter-pilgrim.webp) | Ink on silk | pack |
| Spark Sprite | [Bottled Starlight](../apps/web/public/cards/variants/spark-sprite-bottled-starlight.webp) | Storybook gouache | pack |
| Phase Walk | [Paper Door](../apps/web/public/cards/variants/phase-walk-paper-door.webp) | Paper collage | pack |
| Bone Knight | [Marionette](../apps/web/public/cards/variants/bone-knight-marionette.webp) | Carved theatre | pack |
| Revenant | [Mourning Porcelain](../apps/web/public/cards/variants/revenant-mourning-porcelain.webp) | Gothic porcelain | pack |
| Mana Surge | [Celestial Map](../apps/web/public/cards/variants/mana-surge-celestial-map.webp) | Celestial engraving | pack |
| Arcane Echo | [Prism Nocturne](../apps/web/public/cards/variants/arcane-echo-prism-nocturne.webp) | Art deco | pack |
| Chalk Apprentice | [Chalk Dream](../apps/web/public/cards/variants/chalk-apprentice-chalk-dream.webp) | Pastel & chalk | pack |
| Mercury Scholar | [Quicksilver Mask](../apps/web/public/cards/variants/mercury-scholar-quicksilver-mask.webp) | Surreal oil | pack |
| Glass Familiar | [Paper Menagerie](../apps/web/public/cards/variants/glass-familiar-paper-menagerie.webp) | Origami | pack |
| Ashen Envoy | [Court of Ashes](../apps/web/public/cards/variants/ashen-envoy-court-of-ashes.webp) | Gothic etching | pack |
| Thorn Seeder | [Briar Doll](../apps/web/public/cards/variants/thorn-seeder-briar-doll.webp) | Needle-felt folklore | pack |
| Tainted Idol | [Festival Mask](../apps/web/public/cards/variants/tainted-idol-festival-mask.webp) | Painted folk wood | pack |
| Blight Acolyte | [Mushroom Court](../apps/web/public/cards/variants/blight-acolyte-mushroom-court.webp) | Botanical watercolour | pack |
| Dusk Leech | [Abyssal Jewel](../apps/web/public/cards/variants/dusk-leech-abyssal-jewel.webp) | Bioluminescent fantasy | pack |
| War Standard | [Fallen Banner](../apps/web/public/cards/variants/war-standard-fallen-banner.webp) | Woven tapestry | pack |
| Spellfont | [Moonwell](../apps/web/public/cards/variants/spellfont-moonwell.webp) | Glazed ceramic | pack |
| Prism Titan | [Cathedral Giant](../apps/web/public/cards/variants/prism-titan-cathedral-giant.webp) | Stained glass | pack |
| Paradox Regent | [Midnight Sovereign](../apps/web/public/ui/seasons/shattered-pacts/midnight-sovereign-v2.webp) | Gothic stained glass | season |

Exact prompts: [base art](../output/foundations-art/prompts.json), [variant art](../output/foundations-art/variant-prompts.json). The built-in image generation tool produced the new illustrations; existing artwork was preserved. Originals are retained separately from the WebP runtime assets.
