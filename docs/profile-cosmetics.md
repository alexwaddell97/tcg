# Profile cosmetics

Profiles use stable avatar and title IDs from `packages/shared/src/constants/profileCosmetics.ts`. Six starter portraits reuse the existing character artwork with portrait-specific crops. Initiate, Challenger and Wanderer are starter titles; a player can also choose no title.

The home avatar menu offers owned portraits and a link to the full picker. Profile settings show both owned and locked cosmetics. Selections persist in `tcg-auth`, whose version 1 migration replaces legacy emoji with an artwork portrait while preserving the player's name, rank and ID.

Season avatar/title rewards resolve through the same catalogue as the picker and match profiles. `unlockProfileCosmetic(kind, id)` is the idempotent grant entry point for future reward claims; it does not auto-equip a reward. Owned season cosmetics can be equipped from their reward preview. Premium purchasing is still unavailable, so free pass claims do not unlock premium portraits or titles.

Practice and matchmaking snapshot the selected IDs into each player's match profile. Both clients render their own and their opponent's portrait and title; priority remains a separate glow and label. Match payloads accept only known catalogue IDs, never custom image URLs or title text. As with the current collection, cosmetic ownership is stored locally; server-backed ownership checks will be required when paid rewards are enabled.

Validation: `tests/profile-cosmetics.test.ts` covers migration, asset references, ownership, grants, reloads and match snapshots. The multiplayer socket test in `tests/arena.test.ts` checks both profiles from both clients.
