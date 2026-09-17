# Collection and pack design

Implemented collection and pack model.

- A player owns at most one copy of each base card. Repeated rewards must not create extra copies of that card.
- Each pack awards exactly one card reward.
- A pack can award alternate artwork for a card the player already owns.
- Alternate-art variants are rarer pack drops than legendary cards. The variant chance is 1% while both base-card and variant pools have stock.
- Variants are cosmetic versions of the same base card, not additional deck copies or stronger cards. Decks still allow one copy of the base card across all artwork versions.
- Artwork selection and border selection remain independent. All variants share the base card's mastery and progression, as specified in card-mastery.md.

Gems are the only spendable currency. Crafting and manual refunds are removed; existing shards convert 1:1 into gems on upgrading to collection save version 2. Legacy excess copies also convert once at their former refund values, preserving their value while retaining one copy of each card.

## Implemented: single-card packs

Packs draw exactly one unowned base card from their named set and save it as soon as the pack opens. Core packs are free, replenishing every 84 hours with a capacity of two. Expanded packs cost 800 gems; Eternal packs cost 1,200 gems. Core and Expanded use rarity weights of 60/25/12/3 for common/uncommon/rare/legendary, renormalized over eligible rarities. The current Eternal pool is entirely legendary. There is no cross-set fallback. Exhausted packs are disabled and do not spend currency. Legacy duplicate value is preserved by the gem conversion described above.

Packs can award one of 27 pack variants for an already-owned base card. Owned variants never repeat. When all available base cards in a set are owned, remaining eligible pack variants are guaranteed. Current season-pass cards and their pack variants unlock after the season ends; season-exclusive artwork and the three shop-exclusive illustrations remain outside pack stock.

## Implemented: shop artwork

The shop offers three cosmetic variants for **1,800 gems each**, rotating daily at **00:00 UTC**. Its pool includes Winter Ink (Frost Sage), Vermilion Tempest (Chaos Drake), Hollow Sentinel (Ancient Guardian), and all 27 pack illustrations once their base cards release. Season-exclusive art is never included. Every eligible illustration appears within ten days with the current catalog. Reloads and purchases do not reroll the offers; a countdown shows the next refresh. Players must own the base card; purchases never grant another base-card copy. Ownership and the gem debit are saved atomically. Repeat purchases and expired offers are rejected, including previews held open across midnight. Buying artwork that also drops from packs removes it from that player’s pack pool.

Purchased artwork can be equipped from its shop preview or the Artwork selector in the collection, deck builder and out-of-match card viewer. Owned artwork remains equipable after rotating out of the shop. Original artwork remains freely selectable. Artwork and borders are independent, share base-card mastery, and are snapshotted for each player when entering practice or matchmaking. The opponent sees the correct artwork after reveal.

The explicit shop catalogue excludes premium season rewards. Midnight Sovereign remains exclusive to the season-pass preview, with premium purchasing unavailable. Assets and generation prompts are recorded in `shop-variant-prompts.json`.

## Alternate-art direction

Alternate arts should typically offer a distinctly different style or thematic interpretation of the character. They should feel collectible at a glance, including at board size. A different pose, background or colour grade on the same painting style is usually insufficient.

Good directions include Gothic stained glass, ink or woodblock illustration, graphic comic art, storybook illustration, and character reinterpretations such as a corrupted ruler, spectral guardian or winter sovereign. Dark thematic twists are one option, not a requirement for every variant.

Preserve enough signature features to recognise the character, while allowing substantial changes to costume, mood, setting, silhouette and medium. Keep the normal card frame, name and stats readable; the variant remains the same base card with the same gameplay and mastery.

Midnight Sovereign now establishes this direction: a cursed, Gothic stained-glass Paradox Regent with a shattered hourglass, crimson eclipse and ravens. The earlier realistic night-scene image is retained as an unused asset; the pass uses `midnight-sovereign-v2.webp`.
