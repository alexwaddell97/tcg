# Shop and season pass

The Shop replaces Pack Opening; the old route remains available. The storefront leads with three distinct pack offers, followed by purchasable art variants and a free Core supply panel. The season pass is contained in its own tab. A compact home-page link shows the current season and the player's live level, opening `/shop?tab=pass` directly; tab selection survives reloads and browser back/forward navigation. The shop rotates three variants daily at 00:00 UTC for 1,800 gems each. The pool includes Winter Ink, Vermilion Tempest and Hollow Sentinel, plus the 27 pack artworks once their base cards are released. Their base cards must be owned; each variant can be purchased once and equipped separately. The season-pass variant is excluded from shop stock. Each pack grants one unowned base card exclusively from its named set. Core packs use free tokens; Expanded packs cost 800 gems and Eternal packs cost 1,200 gems. Exhausted pools cannot be purchased. Pack variants can drop for owned base cards once those cards are available in the pack pool. Each pack still grants exactly one reward.

Free Core packs refill every 84 hours (twice per week), with a maximum of two stored. New players start with two ready packs. Existing ready packs are preserved, and a running legacy 12-hour timer migrates with its fractional progress intact. Core timer speed-ups are removed.

## Daily variant rotation

Three offers are chosen from the non-season artwork pool using a fixed, shared UTC schedule. All players see the same offers; purchases, ownership, reopening the shop and changing timezone do not reroll them. Every eligible variant appears within ten days with the current catalog. The heading shows a countdown, refreshed each minute and immediately when the app resumes. At midnight the selection updates without reloading.

Purchase eligibility is checked against the live rotation at payment time. A preview left open over midnight remains inspectable, but expired offers cannot charge. Owned artwork remains freely equipable through Collection after it rotates away. Base-card ownership is still required. Buying a pack-eligible variant removes it from future pack drops, just like obtaining it in a pack.

Season-exclusive artwork never enters the shop. An ordinary variant of an active season card is held until that card's release date; Cathedral Giant enters after Shattered Pacts ends, while Midnight Sovereign stays exclusive. Stock has 29 eligible entries during the current season and 30 after it ends. Packs retain their existing 27-art catalog and 1% eligible-art chance.

## One currency: gems

Prices target about nine days of saving for Expanded, two weeks for Eternal and three weeks for a shop variant for a player completing daily quests and the free pass. See [economy-balance.md](economy-balance.md) for income, collection-time calculations and assumptions.

Crafting, manual duplicate refunds and the shard wallet have been removed. Daily quest currency and both season-pass currency tracks pay gems. Collection and Home show the same gem balance; missing cards link to the Shop or their exclusive premium pass. The existing free Core-pack allowance still replenishes twice weekly.

Collection save version 2 converts existing shards into gems at 1:1. Legacy duplicate cards are reduced to one owned copy, with their former refund value credited as gems: common 5, uncommon 15, rare 40, legendary 100 per excess copy. This conversion runs once and is persisted with the new version. Gem balances, free-pack timing, card ownership, variants, equipped art, quest progress and season claims survive the migration. Already-claimed season tiers cannot pay out again.

## Shattered Pacts season preview

Season 01 runs from September 15 to October 13, 2026 (UTC). It has 20 levels. Level 1 starts unlocked; each further level needs 200 XP. Season XP comes only from completing gameplay quests. Finishing a match on its own grants no season XP. Six weekly objectives each award 200 XP (1,200 per week), with weeks measured from the season start. Objectives reset weekly; existing XP, levels and claimed rewards remain intact. Progress is recorded after naturally completed six-turn matches, including practice. Match receipts are deduplicated; retreats and board previews do not count. Progress and rewards persist atomically alongside the collection. See [gameplay-quests.md](gameplay-quests.md).

The reward track uses a compact horizontal strip with aligned free and premium rows, fixed row labels, arrow/swipe navigation and a current-level shortcut. All 20 levels remain accessible on desktop and mobile, and cosmetic/card rewards open full-size previews. Free rewards show their claim, claimed or locked state directly on each tile.

Season-pass card rewards belong only to the premium track. Until their season ends, these cards cannot drop from any pack. Their destination set is Eternal, and they automatically enter its pack pool at the season's `endsAt` timestamp. For Shattered Pacts, Paradox Regent and Prism Titan release on **October 13, 2026 at 00:00 UTC**. Existing ownership is retained. Pack variants of these cards follow the same release date; the season-exclusive Midnight Sovereign artwork remains exclusive. The shared season history preserves each card's release date across future season changes, and an open shop refreshes at the boundary or when the app resumes.

The free track contains small currency rewards only. Every free level gives 20 gems, except multiples of five, which give 40 gems (480 total). All currency rewards grant gems, which can be spent on packs and shop variants. Previously claimed currency is retained and claimed levels cannot be claimed again. Claims are recorded with the currency grant and cannot repeat. Earned free rewards remain claimable after the season ends; XP stops accruing then.

The premium track is a visual preview only, with exactly two base-card rewards:

| Level | Premium reward |
| --- | --- |
| 1 | Paradox Regent — season-exclusive card, then Eternal |
| 3 | The Regent — avatar |
| 5 | Timebender — player title |
| 8 | Astral Covenant — card back |
| 11 | Prismatic Guardian — avatar |
| 14 | Pactbreaker — player title |
| 17 | Midnight Sovereign — Gothic stained-glass Paradox Regent variant |
| 20 | Prism Titan — season-exclusive card, then Eternal |

Other premium levels offer 80 gems, with 120 at levels 10 and 15 (1,040 total). The avatars use portraits from existing card art. Midnight Sovereign and Astral Covenant use new generated artwork under `apps/web/public/ui/seasons/shattered-pacts/`; generation prompts are recorded in `season-art-prompts.json`. Every non-currency reward opens a preview.

Cosmetics have stable IDs separate from base-card IDs. A variant retains the base definition, cost, power, abilities, deck-copy limit, and mastery; it is not a third card reward. Premium purchasing, premium claims and season cosmetic ownership/equipping remain unavailable. The separate shop variant catalogue supports gem purchases and equipping now. Future seasons, new exclusive cards, final premium reward values, and purchasing require separate implementation.

## Interface copy

Home and Shop use concise, functional copy: names, actions, prices, contents, progress and availability. Omit promotional subtitles, slogans, decorative section labels and narrative artwork descriptions from these screens. Keep gameplay rules and information needed to understand purchases or rewards.
