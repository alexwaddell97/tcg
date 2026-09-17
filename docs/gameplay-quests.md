# Gameplay quests

All regular and season quests require actions or results inside Arena matches. Visiting menus, crafting cards, opening packs and editing decks no longer grant quest rewards. Already earned gems, season XP and reward claims are retained; the old `tcg-quests` menu-completion record is no longer used.

## Daily quests

Reset at 00:00 UTC. Rewards credit automatically once per objective per day; the total budget remains 70 gems.

| Objective | Gems |
| --- | ---: |
| Play 12 units | 20 |
| Cast 4 spells | 15 |
| Spend 20 aether | 10 |
| Win 3 arenas | 25 |

## Season quests

While the current season is active, six weekly objectives are shown on both the Quests page and the Season Pass tab. Each grants 200 season XP when completed, for 1,200 XP per week. Weeks reset seven days after the season starts and finish at the season boundary. The 20-level pass needs 3,800 XP; the four-week season offers 4,800 XP. Premium purchasing remains unavailable, but progression and free rewards remain available.

- Play 40 units.
- Cast 12 spells.
- Spend 80 aether.
- Win 12 arenas.
- Finish 4 arenas with at least 20 power.
- Win 4 matches.

Season XP has no per-match award. Partial objective progress earns no XP. Existing XP and reward claims survive weekly resets; quest counts and completed objectives reset for the new week. Earned level rewards remain claimable after the season ends, but quests cannot gain progress or XP outside the season.

## Attribution and persistence

The shared Arena engine counts only explicit card plays. Units spawned directly onto the board do not count as played cards. Cards explicitly played from hand (including generated cards) and defectors count for the player who played them. Aether uses the actual committed card costs before reveal effects. Arena wins use strict final power leads (ties do not count); high-power objectives use final resolved totals after all effects. Match wins use the engine's normal winner and tiebreak rules.

Receipts are emitted only after a natural six-turn finish, to the relevant player. Practice and multiplayer use the same logic. Retreats and spectators receive no receipt. Progress is credited after match completion, and the result overlay shows gems or season XP awarded for newly completed quests.

The collection store saves objective progress, reward balances and processed receipt IDs in one update. Remounts, duplicate socket updates and reloads cannot grant the same match twice. A receipt's finish timestamp determines its eligibility: an old-day receipt cannot earn new-day gems and an old-week receipt cannot earn new-week season XP. Known metric bounds are checked before processing. This follows the current local collection economy; account-backed, server-verified reward ownership remains future work.
