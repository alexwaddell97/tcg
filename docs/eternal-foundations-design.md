# Eternal Foundations — 140-card set

## Design contract

140 collectible definitions, excluding generated tokens; 31 alternate illustrations with identical rules to their base card. Preserve existing definition IDs, ownership and illustrations. The four existing cosmetic illustrations count toward 31, including the season-exclusive Midnight Sovereign.

The set is designed as a connected pool, not eight isolated decks. Twelve unique cards per deck, six turns, three arenas, four ordered positions per player per arena. Mobile positions follow the same 1→2→3→4 track as desktop.

Target composition: 96 units, 30 spells, 14 relics. Fifty additions supply missing support and interaction. Core/Expanded/Eternal are acquisition sets, not increasing power budgets. Each strategy needs affordable enablers, useful cards without its headline legendary, and counters available outside Eternal.

## Packages and intersections

| Package | Plan | Shared tools | Counterplay |
|---|---|---|---|
| Transmutation | Invest early to change cost/current power; finish with several transformed units | Low-power Formation and Wayfarer units, hand refinement, current-power copying | Pressure early; hand capacity and draw timing constrain setup |
| Sabotage | Trade power for enemy space, then profit from negative units | Affliction harvesters; Invocation spells; Conduits consume/invert | Purge, spells clearing Offerings, movement away from clogged arenas |
| Affliction | Reduce current power, convert reductions to power or harvest | Sabotage targets; Invocation spell reactions; Conduits transfer | Ward, Cleanse, Warding Bell; negative-score Mirror Reservoir |
| Conduits | Build, copy and redistribute current power | Transmutation statlines, positional bonuses, relic bonuses | Affliction before copying; split investment across arenas |
| Formation | Choose ordered positions and neighbours; commit space for efficient power | Relics as neighbours, Wayfarers rearranging lanes, Conduits copying bonuses | Remove relics; threaten another arena; occupy scarce positions |
| Wayfarers | Move units between arenas; movement grants an ongoing payoff once | Formation edges, Conduits power transfer, low printed power for Transmutation | Occupied destinations, reserved positions, loss of local auras |
| Invocation | Play inexpensive utility spells around engines | Every spell package, relic spell reactions, Affliction | Engines need setup; once-per-turn reactions; finite hand/deck |
| Stewardship | Invest board space in relics, protect neighbours, reclaim spent relics | Formation adjacency, Invocation triggers, Conduits current power | Dispel, competing for four positions, slow setup |

## Rules and balance guardrails

- Existing on-reveal effects never repeat just because a card moves. Movement retains turn placed, ownership and statuses, and respects committed position reservations.
- Journey bonuses activate after a successful friendly move between arenas; they do not stack each move. Defect/Exile and the arena ownership swap are not journeys.
- Flank means position 1 or 4; Linked counts occupied adjacent positions along the track, including relics. No front/back rules.
- Reliquary bonuses count friendly relics in the same arena. Relics never acquire power from unit-targeted effects.
- Dispel removes the cheapest enemy relic here (position breaks ties); Salvage removes your cheapest relic here and draws one card. Removal is visible in reveal playback.
- New repeatable draw/debuff engines trigger once per turn. No repeated on-reveal copying, infinite spell loops, or permanently reducing an opponent's aether.
- Conditional power must earn its setup cost. High-cost vanilla cards remain credible. Existing generic duplication is revised into distinct support roles where it helps the whole set.
- Preserve the original nine arenas and evaluate decks across varied arena combinations, both reveal orders and shuffled draws.

## Validation and delivery

Generate a complete card catalog and deck/curve report from the actual definitions. Exercise every new mechanic with engine tests, including reservation failures, Ward, relic targets, current-power snapshots and turn-six playback. Use seeded self-play as a diagnostic, not a claim of human competitive balance. All 140 base cards and 31 variants must resolve to local artwork; variants change no gameplay fields and season artwork must remain outside shop/pack stock.

Art direction: retain the existing painterly fantasy base art; reuse nine unused matching character paintings. New base illustrations fill the remaining subjects. Variants use distinct thematic interpretations (ink, woodblock, stained glass, tapestry, dark folklore, porcelain), not recolouring filters. Store the exact generation prompts and asset mappings alongside this document.

## Completed implementation

The shipped pool contains **140 collectible cards: 96 units, 30 spells, 14 relics**. Acquisition sets contain 57 Core, 72 Expanded and 11 Eternal cards. There are **31 alternate illustrations**: the existing three shop variants and one season variant, plus 27 pack variants. Tokens do not count toward 140, and variants never add a second gameplay copy.

Fifty new definitions complete the existing ninety. Forty-one new base illustrations and twenty-seven new alternate illustrations were generated with the built-in image generation tool. Nine previously unused character paintings were reused. Every runtime illustration was checked: 171 distinct image files, no missing assets or duplicate image hashes, and all files decode successfully. The 68 new images are 1024 × 1536 WebP assets totalling 22.74 MiB. Original PNGs and exact prompts are retained under `output/foundations-art`; see [asset audit](../output/foundations-art/validation.json).

The [complete catalog](eternal-foundations-catalog.md) includes actual rules text, costs, power, acquisition set, artwork links, eight twelve-card starters, alternative support pairs, counters, and a legal six-turn draw/placement example for every starter. The original Arena Starter also remains available. The practice opponent now evaluates explicit positions, adjacency, relics and movement payoffs.

Pack rewards are atomic: one purchase grants one unowned base card or one unowned variant for an owned base card, with no duplicate base card granted for variant art. Pack variants have a 1% roll while both pools have stock; when the base pool is complete, remaining eligible variants are guaranteed. Packs are unavailable when both pools are exhausted. The three shop-exclusive illustrations and season-exclusive art are excluded from packs. All 27 pack illustrations can also appear in the daily shop after their base cards release, at 1,800 gems each. The development-only `/pack-preview` page can preview all 27 pack variants without spending currency or changing ownership.

## Balance pass and limits

The initial mechanical review reduced Linebreaker from 4/5 to 4/4, made cheap Transmutation enablers available without requiring Regent, and gave Wandering Colossus a turn-five setup window. Stewardship was revised to seven units, three relics and two spells so its relics have scoring recipients. Contraband Cache now costs two aether, and Sabotage has an independent early body in Candle Tender. Reworked legacy cards provide Linked, Consume, Harvest and spell support instead of duplicating generic rally effects.

All eight starters have tested legal plans through turn six. These authored draw orders prove support timing and aether costs; they do not imply every shuffled opening draws its engine. Drawn cards enter the next planning phase, so spells cannot manufacture an extra play during the same resolution.

The final seeded diagnostic played 288 games, 64 appearances per deck, across all nine existing arenas and both player orders. It uses the real engine and a narrow two-branch search with sampled own draws. Its lookahead assumes the opponent passes, so these results are **not competitive win-rate estimates**. In particular, it struggles with setting up negative-power cards before sending them and overvalues immediate power. Full data: [final diagnostic](foundations-balance-final.json).

| Deck | Diagnostic score rate (draw = half) |
|---|---:|
| Arena Starter | 83.6% |
| Transmutation | 64.1% |
| Sabotage | 24.2% |
| Affliction | 46.9% |
| Conduits | 45.3% |
| Formation | 45.3% |
| Wayfarers | 39.8% |
| Invocation | 41.4% |
| Stewardship | 59.4% |

Human playtesting should begin with Sabotage versus the Arena Starter, then Wayfarers and Invocation versus fast generic power. The set has a playable initial balance pass; the simulation does not establish a finished competitive metagame. Investigate whether negative-power setup is too costly in actual play before increasing rewards for clogging enemy space. The catalog contains affordable alternatives and counters for those tests.

## Verification

- `pnpm test`: 231 tests passed, including all eight starter curves, movement/reservations, adjacency, relic removal, spell reactions, draw events, cosmetic eligibility, atomic pack rewards and multiplayer sockets.
- `pnpm type-check`: all three workspaces passed.
- `pnpm build`: web and multiplayer production builds passed. Server packaging now bundles shared TypeScript rules into its executable instead of emitting compiled files into the shared source directory. The compiled server booted and returned HTTP 200 from `/health`.
- `pnpm mobile:sync`: mobile production bundle built and assets/plugins synced to both iOS and Android projects. This does not install a new build on a physical phone.
- All 171 artwork files in each native project match the source SHA-256 hashes.
- `pnpm --filter @tcg/web electron:bundle`: desktop web bundle built successfully. Store submission and installer signing are outside this set update.
- Browser review: collection count and archetype filters, full card rules/art, all eight archetype starters in the lobby, and the alternate-art pack reveal.
