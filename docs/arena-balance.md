# Arena balance and deck packages

This pass fixes missing setup, weak fallback plays and excessive power swings across Shattered Pacts. All four starters have been rebuilt and played through six turns using the actual match engine, normal draws and legal energy budgets. The [full card catalog](shattered-pacts.md) contains the current stats and rules.

The initial decks were not equally coherent. Sabotage had several ways to send cards away but little useful fodder; Conduits moved and copied power without enough ways to build it. Transmutation often failed when its setup arrived late. Affliction's small reductions struggled to enable Harvest, while its six-cost finisher was disproportionately strong.

## What changed

| Package | Setup and support | Payoff and fallback |
|---|---|---|
| Transmutation | Chalk Apprentice and Mercury Scholar have useful bodies. Lead to Gold now replaces itself. Paradox Regent transmutes the deck and immediately draws a card for the following turn. | Glass Familiar grows even without a swap. Alloy Guardian, Gilded Oracle and Philosopher Engine have Rally bonuses while retaining low printed power for cheap transmutation. Oracle always draws one, plus another when transmuted. Village Scout and Wandering Blade provide early plays; Censer Warden protects the investment. |
| Sabotage | Tainted Idol draws two. False Standard is a 2/3 that creates its own Burden. Exile Ritual costs one, and Inversion Rite offers a second use for a negative ally. Thorn Seeder and Splinter Agent retain respectable bodies if their Offerings are cleared. | Ashen Envoy is 3/−5; Oathbreaker Duke is 4/−7, opening an earlier disruption turn and two-card finishes. Court of Thorns is 5/6 and plants persistent −1 Burdens in the other arenas. Debt Collector turns established negative enemies into your own power. |
| Affliction | Blight Acolyte is a one-cost opener, Dusk Leech and Miasma Lantern have better bodies, Rot Scribe applies two points of Wither twice, and Unmaking costs two. | Debt Collector earns +1 from an enemy with an applied reduction even before it goes negative, or +2 if it is negative; each enemy counts once. Famine's extreme ceiling is reduced. Cleansing Flame supplies a cheap defensive spell and reactor trigger. |
| Conduits | Candle Tender and Marrow Engine supply real power. Prism Initiate buffs the highest-current-power unit in hand rather than automatically strengthening the smallest copying card. Temper and Arcane Echo support the spell reactor. | Sunwell Keeper has more power to echo, Last Light Beacon has a meaningful final distribution, and Prism Titan has a stronger natural finish. Vessel of Echoes rewards an established source. Transfer and Consume let the deck redistribute its investment or clear a slot. |

Prism Initiate is now primarily a Conduits card and Vessel of Echoes primarily a Transmutation card. Both packages still have twelve primary collectible cards; support tags retain their cross-package uses.

## Six-turn examples

These are tested examples with deliberately ordered decks, not guaranteed opening hands. Cards enter through normal draws and abilities; none are injected into a hand. The opponent also plays a normal six-turn curve. Arena 1 is Forge, 2 is Sanctum and 3 is Summit in these examples. The randomized diagnostics below vary the arena order.

| Turn | Transmutation | Sabotage | Affliction | Conduits |
|---|---|---|---|---|
| 1 | Chalk Apprentice → 1 | Tainted Idol → 2 | Village Scout → 1 | Candle Tender → 1 |
| 2 | Mercury Scholar → 2 | False Standard → 1 | Dusk Leech → 2 | Prism Initiate → 2, preparing Sunwell in hand |
| 3 | Transmuted Glass Familiar → 2; Village Scout → 1 | Generated Burden → 3, then Exile Ritual → 3; Thorn Seeder → 1 | Rot Scribe → 2 | Current Runner → 2; Temper → 1 |
| 4 | Paradox Regent → 3 | Ashen Envoy → 2; Spark Sprite → 3 | Miasma Lantern, Salt Hex, Blight Acolyte → 2, in that order | Imbued Sunwell Keeper → 2 |
| 5 | Transmuted Philosopher Engine → 1; transmuted Alloy Guardian → 3 | Court of Thorns → 1 | Hollow Choir, then Unmaking → 1 | Last Light Beacon → 3 |
| 6 | Transmuted Gilded Oracle → 2; Censer Warden → 3 | Debt Collector → 1; Inversion Rite → 2 to turn the remaining Idol positive | Famine Sovereign → 3 | Prism Titan → 3; Beacon distributes after the turn |

Transmutation spends 19 of 21 available energy in this line; the other three spend 21. Discounts create alternative plays rather than an obligation to spend every point. The relevant exact draw orders live in [the curve tests](../tests/arena-expansion.test.ts).

Plan hand effects a turn ahead: cards committed this turn have already left your hand before effects resolve. Drawing or transmuting a card does not let you add it to the current locked plan. For example, the Sunwell line works because Sunwell remains in hand on turn two; committing it together with Prism Initiate would miss Imbue.

## Options within each package

These are legal one-copy replacements for the current starters. They are tuning options with explicit costs, not separately proven competitive deck lists.

| Starter | Remove | Add | Reason and tradeoff |
|---|---|---|---|
| Transmutation: hand preparation | Censer Warden, Wandering Blade | Lead to Gold, Quicksilver Archivist | More control over cheap transformations and an extra hand enabler. Keep Silver Equation. Gives up defence and immediate early power. |
| Transmutation: more prepared draws | Censer Warden | Crucible Seer | Another body that prepares the next two eligible draws. Less protection against Affliction. |
| Sabotage: more ways to send | Oathbreaker Duke | Masked Ferryman | A positive three-cost body and a second sender for Idol, Burdens or afflicted allies. Gives up the larger independent Defect play. |
| Sabotage: hand pressure | False Standard, Spark Sprite | Counterfeit Courier, Hollow Gift | Both add Burdens to the enemy hand, with a cantrip to find later plays. Gives up your own generated fodder and an immediate one-cost scoring unit. |
| Affliction: stronger recovery | Plague Cartographer | Pale Physician | A two-cost body that removes one ally's reductions and Wither. Easier to pair with another card, but loses cross-arena pressure. |
| Affliction: extra spell access | Plague Cartographer | Hollow Gift | A cheap cantrip that also pressures hand space. Helps trigger Lantern across turns; cannot trigger it twice in the same turn. Loses a four-cost body. |
| Conduits: copying bodies | Ember Conduit, Arcane Echo | Mirror Squire, Iron Golem | Adds a dependable power source and another copier. Place Mirror with the intended source and avoid a weaker ally stealing its target. Gives up the repeatable spell engine. |
| Conduits: protect the investment | Village Scout | Pale Physician | More recovery for a boosted source. Gives up a one-cost opener and some speed. |

Key decisions that should remain meaningful:

- False Standard's Burden is +1 beside Standard, or −1 elsewhere before bonuses. Keep it, consume it, invert it or send it away. Standard's support does not follow a sent token to the opponent.
- A Cursed Offering is cleared by an ordinary spell in its arena. Court's Burdens persist, but Purge and Consume can remove them. Tokens cannot displace an already committed enemy unit.
- Defect can fail when the enemy side fills. Inversion Rite can salvage a negative card left on your side, including a failed Duke. Positive Forge/Summit bonuses make a negative Defector less damaging; consider the arena before committing it.
- Affliction rewards spreading reductions before Harvest, or concentrating them to cross zero. Ward prevents reductions; small Cleanse effects restore one ally, while Censer Warden restores the whole friendly arena.
- Conduits needs recipients in the other arenas for Beacon. Copying or doubling snapshots current power, so the order of buffs, transfers and copies matters. Consume frees a slot but does not create extra power from a positive source by itself.
- Transmuting a negative Defector turns its power positive without removing Defect. It is usually a poor cross-package target. Tainted Idol has no Defect and is a much safer transmutation bridge.

## Power budgets and counters

Famine Sovereign was a 6/4 siphoning two from every enemy here: against four unwarded cards it added 12 friendly power and removed eight, a **20-point swing**. It is now a 6/5 siphoning one: nine friendly power and four removed, a **13-point swing**, before location/support bonuses. It still rewards a populated enemy arena without eclipsing the entire setup package.

Miasma Lantern and Ember Conduit trigger once per turn while present, preventing a pile of cheap spells from repeatedly multiplying their effects in a single turn. The first cast while they are present consumes the reaction even if it has no valid target; the limit resets next turn.

Pale Physician and Cleansing Flame now cleanse only the weakest afflicted ally. The dedicated Censer Warden retains the whole-arena cleanse. Printed negative power is never a debuff to cleanse, and power spent by Transfer is not recoverable this way.

Philosopher Engine remains printed 5/2: it becomes 2/5 when transmuted. Its Rally +3 makes the untransmuted version useful when behind without accidentally increasing its swapped cost. Glass Familiar trades some instant transformed power for Growth, and Oracle supplies a draw even when the setup is missed.

Wandering Blade's Rally and Thunder Hawk's Pressure each lose one bonus power. They remain straightforward curve options, but the original starter receives less efficient unconditional-feeling pressure from always finding a suitable arena.

## Match diagnostics

The diagnostic uses the real engine for every turn, all ten pairings among the five starters, both player seats, seeded shuffled decks and shuffled arena order. A public-information bot previews legal ordered plans using a two-branch search. It knows its own remaining deck composition but samples future draws rather than reading the real draw order or enemy hand.

The policy assumes the opponent passes during each preview and does not plan multi-turn combinations. It therefore favours immediate power, undervalues some setup and hand denial, and can miss counterplay. These figures are directional diagnostics, **not estimates of human win rates**. Seed 7319 was used during tuning; seed 314159 is a second shuffle sample and was also inspected during tuning, so neither is a blind holdout.

| Starter | Original, seed 7319 | Revised, seed 7319 | Revised, seed 314159 |
|---|---:|---:|---:|
| Arena Starter | 90.0% | 54.7% | 55.0% |
| Transmutation | 57.5% | 51.9% | 61.9% |
| Sabotage | 21.6% | 41.3% | 43.8% |
| Affliction | 48.1% | 44.7% | 38.1% |
| Conduits | 32.8% | 57.5% | 51.2% |

The first two columns contain 400 matches each, 160 appearances per deck. The second revised sample contains 200 matches, 80 appearances per deck. Draws count as half a win. The **600 revised matches** were run against the final card definitions and starter lists.

Turn-four average energy use in the main sample rises from 3.26 to 3.78 for Transmutation and 3.50 to 3.86 for Sabotage. Neither revised starter passes a turn from turn four onward in that sample. Spending all energy is not itself a balance target, especially with transmutation discounts.

The largest unresolved concern is matchup spread. Sabotage is still weaker overall and beats Affliction much more consistently than Transmutation. Its Conduits result also varies sharply between the samples (7/40 versus 12/20), showing why a single aggregate is insufficient. Affliction trails in the second sample; Transmutation's cheap finish is strong there. Human games should next check these matchups, whether token clearing is too cheap, and how often a late enabler or an occupied enemy arena strands a payoff. This pass improves the packages and narrows the original starter's dominance; it does not establish final competitive balance.

The [saved diagnostics](arena-balance-results.json) include both result sets, matchup records and sample turn traces. Reproduce a revised run with:

```sh
pnpm balance:arena --samples=20 --seed=7319 --output=/tmp/arena-balance.json
pnpm balance:arena --samples=10 --seed=314159 --output=/tmp/arena-balance-validation.json
```

## Validation and saved decks

- 67 automated tests pass, including all four natural-draw curves, private hands, card capacity, counter interactions, once-per-turn reactions, signed power, final effect playback, multiplayer completion and deck migration.
- The web production build and server type check pass. The build retains its existing large-bundle warning.
- Starting decks remain twelve distinct collectible cards. Generated units remain outside the collection and can repeat during play.
- Lobby and Deck Builder use the revised shared templates. Untouched copies of the original expansion starters update once through the saved-deck migration. Edited or renamed decks keep their composition, identity and selection; current card balance still applies.

Regenerate the card reference after future balance changes with `node --import tsx scripts/arena-catalog.ts`.
