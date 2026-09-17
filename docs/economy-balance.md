# Acquisition economy — September 17, 2026

Target agreed: a player completing daily quests can save for an Eternal pack about once every two weeks. Implemented prices: **800 gems Expanded, 1,200 gems Eternal, 1,800 gems per shop variant**. Expanded is exactly two-thirds of Eternal, as requested. Core remains two free packs per week. Saved balances, existing ownership, quest payouts and the 100-gem starting balance are preserved.

Reproduce the calculations with `node --import tsx scripts/economy-audit.ts`. It reads the live catalog, prices, quests, pass rewards and initial store defaults without accessing player saves. Its seeded simulation runs 1,000 collections per set through the production pack-reward function.

## Income

| Source | Gems |
| --- | ---: |
| Complete all four daily quests | 70 per active day |
| Seven days of daily quests | 490 per week |
| Complete the free 28-day pass | 480 per season |
| Free pass, averaged over its full season | 120 per week |
| Daily player with a completed free pass | **610 per week / 2,440 per 28 days** |

The pass requires 19 completed season quests to reach level 20; it does not pay simply for playing matches. Six quests are available per week, so finishing the track takes at least part of week four. Its gems arrive as claimed tiers, rather than a daily allowance. The average daily earning rate for the model is `70 + 480 / 28 = 87.14` gems.

Only the current pass is implemented. Longer-term figures assuming 610 gems per week require future seasons to provide equivalent free rewards. Without another pass, income returns to 490 gems per week. The premium pass is unavailable and contributes **zero** to this model. Its preview contains 1,040 extra gems: if enabled unchanged with equivalent later passes, premium users would save for Eternal in about 9.7 days, in addition to receiving the two premium cards. Review that separately before enabling purchasing.

## Prices and saving time

These are average calendar days from a zero balance, spending every earned gem on the selected item. Buying one item delays the others; these rates cannot be added together.

| Item | Previous gems | Previous days | New gems | New days |
| --- | ---: | ---: | ---: | ---: |
| Expanded pack | 100 | 1.15 | **800** | **9.18** |
| Eternal pack | 150 | 1.72 | **1,200** | **13.77** |
| Shop art variant | 200 | 2.30 | **1,800** | **20.66** |

Eternal's price follows the target directly: `14 × 87.14 = 1,220`, rounded to 1,200. With daily quests alone it takes about 17.1 days. Expanded costs `1,200 × 2 / 3 = 800`, enforced as a ratio in the price definition. Variants become longer savings goals. Buying a variant costs the same as 2.25 Expanded packs or 1.5 Eternal packs.

## Collection time

There are 57 Core, 72 Expanded and 11 Eternal base cards. During Shattered Pacts, nine Eternal cards are pack-eligible; the other two enter on October 13 at 00:00 UTC. The old prices let players buy those nine in about 2.2 weeks if all income went there. Even at the old prices, the full collection took about 28 weeks because Core was limited to two free packs a week.

Packs skip owned base cards, so completing a set does not incur a growing duplicate penalty. The 1% eligible-art roll occasionally replaces a base card. Simulated mean pack counts to collect each entire base set are **57.574 Core, 72.665 Expanded and 11.041 Eternal**. The simulation freezes eligibility after the season ends to include all 140 cards. The modeled times below are budget estimates, not exact claim dates; all profiles complete the free pass and collect Core packs before the two-token cap pauses generation.

| Play pattern | Weekly gems with recurring free passes | Eternal saving time | All 140 base cards |
| --- | ---: | ---: | ---: |
| All daily quests, 7 days/week | 610 | 13.8 days | **116.9 weeks (~2.25 years)** |
| All daily quests, 4 days/week | 400 | 21 days | **178.2 weeks (~3.4 years)** |
| All daily quests, 3 days/week | 330 | 25.5 days | **216 weeks (~4.2 years)** |

For the daily player, the paid-set budget is `72.665 × 800 + 11.041 × 1,200 = 71,381.20` gems. Subtract the one-off 100 starting gems, then divide by 610: **116.85 weeks**. Core completes in parallel after about `(57.574 − 2 starting packs) / 2 = 27.79` weeks. This assumes no gems are spent on cosmetics and no more base cards are added. If no further free seasons are released, the daily player's estimate becomes **144.5 weeks** using the one current 480-gem pass, then daily quests only.

Cosmetic completion takes longer. The paid pools contain eight Expanded pack variants and one Eternal pack variant; Core contains eighteen. Once a base set is complete, its remaining pack variants are guaranteed until exhausted. Using packs for all pack-eligible artwork and buying the three shop-exclusive artworks costs exactly `80 × 800 + 12 × 1,200 + 3 × 1,800 = 83,800` gems, or about **137.2 weeks** after the starting balance at 610/week. Core's base cards and eighteen variants require 75 free packs, about 36.5 weeks after the two starting packs. The season-exclusive variant is excluded because premium is unavailable: this covers **30 of the 31 variants**, not all 31.

The shop now rotates three offers daily from all 30 non-season artworks, including those also available in packs. All shop offers cost 1,800 gems. The calculation above still uses packs for their eligible artwork; buying those variants directly is an optional, more expensive route once their base cards are owned. This does not change base-card acquisition rates.

## Gameplay implications

This ratio creates a multi-year collection, even with full daily rewards. The bottleneck is the 72-card Expanded set: it needs about 95 weeks of the daily player’s entire gem income by itself. That is the direct consequence of keeping Eternal at two weeks and Expanded at two-thirds of its price. These prices meet those targets but should not be mistaken for a one-year full-collection economy. New card releases will extend the times further unless there is a separate catch-up route, older cards rotate into Core, or first-time collection grants cover a meaningful share of the pool. For example, retaining these prices and reaching the full current set in one year would require about 1,371 total gems per week; that would shorten normal Eternal saving to roughly six days, so increasing universal income cannot preserve both targets. A targeted catch-up mechanic would need its own design. No such mechanic is added by this price change.

Ownership currently does not restrict deckbuilding or matchmaking, and starter templates are playable without granting their cards to the collection. Therefore these prices control the collection screen's progression, not which cards a player can bring to a match. Before enforcing acquisition for competitive play, grant a usable starter collection, retain a way to test archetypes in practice, and validate owned decks against authoritative account data. Existing players' decks should not become unusable without an explicit transition plan. This rebalance does not change those gameplay rules.

The shop's displayed pack prices now come from the same `PACK_PRICES` object used for payment, eliminating the separate UI price list.
