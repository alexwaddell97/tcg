# Arena presentation

The board uses restrained aether haze and particles. Floor rings, orbital outlines and circular control trails have been removed. All decorative layers are absolute, ignore pointer events, and stay out of accessibility navigation. Card dimensions and the reserved hand area do not change during effects or the result ceremony.

- **Forge:** warm haze and rising embers.
- **Sanctum:** cool haze and floating motes.
- **Summit:** drifting snow.
- **Control:** leading power totals are highlighted directly on the arena scores.
- **Players:** the header shows your name and selected avatar on the left, and the opponent on the right. A gold frame, small diamond and “Reveals first” caption identify priority. This follows the displayed turn through playback, then switches when the next turn opens. The highlight clears for final scoring and completed matches. The fixed header height preserves card space on phones; long names truncate while retaining their full accessible label. Practice also uses the profile selected on the main menu.
- **Transmutation:** blue and gold shards exchange positions around an equation. Private hand effects animate only their public source.
- **Affliction:** the caster invokes a violet sigil; cards losing power develop brief edge fractures.
- **Sabotage:** a wax seal stamps the source and any spawned or transferred cards.
- **Conduits:** gold sigils and threads connect observed power gains. Transfers originate at the actual donor, which can differ from the card casting the ability.

`arenaPresentation.ts` derives effects from resolved events and power changes. It never reruns abilities or assumes a printed condition succeeded. `ARENA_PLAYBACK_TIMING` in `arenaPlayback.ts` gives ordinary cards 1.5 seconds including a 500ms entrance; complex effects get 2 seconds and effects across arenas, multiple abilities or three-plus targets get 2.5 seconds. Large draws can extend that budget until every card has arrived. Scores hold during the entrance, then update with signed deltas beside each total. The acting card has a stronger outline, affected cards remain highlighted, and power deltas stay readable through the effect. Final scores get one second each and a 1.1-second summary; the result waits for every frame, including growth and other end-of-turn effects.

Ambient motion pauses during reveals, inspection, dragging, hidden pages and completed matches. Reduced-motion preferences remove moving decoration while preserving the full playback timing, static source/target highlights, power changes, score deltas and control colours. Phone layouts use fewer particles.

In development, open `/board-preview`, select an archetype and press **Effects** to replay a real engine-generated final turn. Dismiss the result with **View board** before changing previews. **Ending** separately previews victory, defeat and draw, and **XP** adds a sample card reward receipt. These fixtures do not award card experience.

The result uses a dedicated full-screen dialog, with generated infinity-relic artwork, outcome-specific light and particles, a compact arena recap, optional earned rewards and exit actions. Retreats are identified separately and do not show a misleading score recap. Keyboard focus enters the main action; Escape and View board dismiss the scene. Compact landscape layouts place the crest alongside the recap. Motion stops after the entrance, and reduced-motion preferences remove animations. [Artwork, saved assets and generation prompts](../output/result-crests-v1/README.md).

### Card draws

The opening hand deals in sequence from the lower right, showing the existing card back before turning face-up into each reserved hand slot. Draws start 250ms apart and take 660ms each. New instance IDs animate once; routine state updates and card buffs do not redeal the hand. Turn draws wait until reveal playback finishes. Ability draws are released from the viewer's private final hand at their matching public draw event, and that effect reserves enough time for the staggered flights. Timing uses public draw counts so both players receive the same pacing without exposing opponent identities. Playing and inspecting pause during the deal; reduced motion uses a fade with the same stagger and total reading time. Hand slots and board dimensions stay fixed throughout.

### Turn announcements

Turns 1–6 receive a 2.5-second centered announcement after reveal effects settle and before the next draw. Turn 1 announces before any opening-hand cards are shown or dealt. It shows the incoming turn, the six-turn progress track, and available aether, with a warmer final-turn treatment. It uses an overlay so the board and hand retain their dimensions. Empty turns announce too; completed matches and duplicate updates do not. Reduced motion retains the reading time with a static presentation.
