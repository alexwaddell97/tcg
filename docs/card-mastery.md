# Card mastery and borders

Each collectible card earns **20 XP when it is played in a completed six-turn arena match**, once per definition per match. This includes spells and cards that change sides or leave play. Queuing a card without revealing it does not count. Generated tokens, unplayed cards, previews and matches ended by retreat award no XP. Practice and multiplayer use the same reward calculation; the outcome does not affect XP.

| Level | Border | Total XP | Matches with the card played |
| --- | --- | --- | --- |
| 1 | Bronze | 0 | 0 |
| 2 | Silver | 20 | 1 |
| 3 | Jade | 80 | 4 |
| 4 | Arcane | 180 | 9 |
| 5 | Sunfire | 360 | 18 |
| 6 | Eternal | 700 | 35 |

Open a card's **Borders** control in Collection, Deck Builder or the full-screen catalog viewer. Every border can be previewed. Unlocked borders are free to equip, and the newest unlock is equipped automatically unless the player pins a specific border. XP caps at the final tier. Mastery does not change power, energy cost, deck legality, card rarity or collection ownership.

The shared arena engine snapshots each player's equipped borders at match creation. Cosmetics remain attached to the original card through reveals, movement and ownership changes. Private hand cosmetics remain private. Generated cards receive Bronze. The end-of-match overlay shows a compact mastery reward summary after the existing reveal and score animations.

## Persistence and artwork variants

Progress and appearance preferences live in the separate `tcg-card-mastery` local store, following the current collection/deck storage model. They survive refreshes in the same browser. Match claims are idempotent; each engine instance creates a unique reward identifier, including rematches in the same room. Only the viewer's played definitions are included in their reward.

Mastery is keyed by the **base card definition ID**, never by artwork URL or match instance. Shop artwork variants reference that same base definition and use an independent appearance selection; swapping art does not duplicate cards in decks or reset mastery. Original artwork remains selectable. Match payloads send known variant IDs, and the engine snapshots each player’s artwork before drawing cards. These locally persisted purchases follow the current collection economy; server-verified account entitlements remain future work.

This is local progression, not account-backed inventory. The server validates cosmetic identifiers against the six known borders and only accepts choices for the submitted deck, but does not verify cosmetic ownership against an account database. Before cross-device accounts or paid cosmetics, move XP, claims and unlock verification to authenticated server storage. Do not treat local XP as authoritative for purchases or competitive rewards.

## Verification

`tests/card-mastery.test.ts` covers tier boundaries, locked equips, default and pinned choices, saved-state sanitation, idempotent claims, XP caps, tokens, spells, Defect, retreats, private views and unique rematches. The real two-client socket test in `tests/arena.test.ts` checks border snapshots, reveal propagation and each player's played-card rewards over a full match.

The accepted collection and pack direction is recorded in [collection-and-variants.md](collection-and-variants.md): singleton base-card ownership, one reward per pack, and cosmetic artwork variants with a drop tier rarer than legendary.
