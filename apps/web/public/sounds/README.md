# Replacing game sounds

Open http://localhost:5173/sound-library to hear every assigned sound and see its filename. The same page is linked from Audio settings during development. Background music pauses on this page; previewing doesn't change your saved volume or mute settings.

## Quick replacement

1. Add your WAV or MP3 to `apps/web/public/SE` (or `apps/web/public/sounds`).
2. Open **`apps/web/public/sounds/manifest.json`** and change the filename for the event you want. For example:

   `"draw": "/SE/my-card-draw.mp3"`

   A filename starting with `/` is relative to `public`. Other filenames are relative to `public/sounds`.
3. Refresh the game and Sound library. The new file is used without editing TypeScript or rebuilding the local dev server.

You can also overwrite the currently assigned WAV at the same path and simply refresh. Use a real WAV if keeping the `.wav` extension; don't just rename an MP3 extension. These project assets ship with the game, rather than being a browser-only override.

| Manifest key | Used for | Suggested length |
| --- | --- | --- |
| ui | Buttons, tabs, navigation and toggles | 0.1s |
| draw | Opening hand, turn and ability draws | 0.2–0.4s |
| place | Dropping a card onto the board | Up to 0.3s |
| reveal | A played card landing during resolution | Up to 0.4s |
| spell | Spells / arcane abilities | Up to 0.7s |
| power | Power, healing, ward and growth effects | Up to 0.7s |
| curse | Affliction and sabotage | Up to 0.7s |
| transmute | Transmutation and conduits | Up to 0.7s |
| arenaReveal | Arena turning face up | Full impact cue |
| score | Each final location spotlight | Up to 0.7s |
| turn | Turn announcement | Up to 2s |
| victory | Victory overlay | Full musical phrase |
| defeat | Defeat overlay | Full musical phrase |
| tie | Draw result music | 10s with a 2s fade |

Trim long leading silence and fade the end. Longer clips can be cut off when their animation ends. Recordings play at their original pitch; the three final score impacts increase slightly in volume. Effects volume is separate from music in Audio settings.

Victory and defeat cues can be longer: they play to completion while the result is displayed. BGM fades out over 1.5 seconds when final score counting begins, then fades back in over 1.8 seconds when the result cue finishes. Starting another match or leaving the board cancels the cue and restores BGM. Closing/reopening the result overlay doesn't restart its audio. Saved music volume and mute preferences stay unchanged; the playlist resumes from its paused position.

## Current recordings

The `recorded/` folder contains short, faded and volume-balanced copies of your MP3s. Your original files in `public/SE` are unchanged.

| Original | Assigned event |
| --- | --- |
| crash-sound.mp3 | Arena reveal (original MP3) |
| card-draw.mp3 | Draw |
| card-draw-2.mp3 | Placement and reveal |
| elemental_spell.mp3 | Spell |
| holy_healing_spell.mp3 | Power / healing |
| necro_spell_1.mp3 | Affliction / sabotage |
| pour_sound.mp3 | Transmutation |
| draw-sword.mp3 | New turn |
| victory-chime.mp3 | Victory music (7.2s prepared copy) |
| draw.mp3 | Draw result music (10s prepared copy, 2s fade) |
| defeat-chime.mp3 | Defeat music (11.3s prepared copy) |

The other two necromancy recordings are available for future alternatives. Final-score cues use the non-melodic wood/percussion placeholder. Victory/defeat keep their complete musical phrases, with leading/trailing silence trimmed and short boundary fades.

To change how the source MP3s are trimmed, edit `imports.json`, then run `python3 scripts/prepare-arena-sounds.py` from the project root (requires ffmpeg). This rewrites only the prepared files in `recorded/`.

`python3 scripts/generate-arena-sounds.py` creates missing synthesized fallback files. It preserves existing WAVs unless you explicitly add `--overwrite`.

UI clicks use a short, faded cut from the supplied card-placement recording. Replace `ui` in the manifest to change it. Disabled controls, drag releases, text fields and slider movements stay silent; `data-ui-sound="off"` opts a control out.

To regenerate only the draw cue: `python3 scripts/prepare-arena-sounds.py --only match-draw.wav`. Its recipe starts at 1.6s, lasts 10s, and fades over the final 2s; the original 22.5s MP3 is unchanged.
