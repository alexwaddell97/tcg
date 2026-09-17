# Background music

The three original MP3s in `apps/web/public/music` form a continuous playlist: Sanctum Overture, Beyond the Rift, then Graveyard Vigil, repeating in that order. The in-game titles reference the Sanctum, Rift and Graveyard affinities; the source filenames preserve the original track identities. Track metadata and ordering live in `src/lib/music.ts`. The files are streamed one at a time; the player does not preload the full playlist.

`BackgroundMusic` mounts once above the routes, so navigation between menus, shops and matches preserves playback and track position. Playback starts on the first pointer or keyboard interaction, subject to browser autoplay restrictions. Hidden pages pause; returning resumes only after the player has been unlocked. Muting pauses at the current position.

Audio settings are available on the home footer, menu and lobby headers, pack opening, and match footer, with separate music and sound-effects sections. Music volume defaults to 25%; mute and volume persist in `tcg-music`. Next track advances without changing mute. The dialog's Play button retries blocked or failed playback. No collection or account data is changed. See `sound-effects.md` for the game cues and replacement workflow.

The controller ignores stale play promises after pause, skip or disposal. Missing tracks are skipped, with a bounded stop if all three fail. React StrictMode and hot reload clean up the previous player and listeners.

Final score counting fades BGM out over 1.5 seconds. It remains paused while the victory/defeat cue plays, then resumes from the same playlist position with a 1.8-second fade. Leaving/restarting the match restores it early. This temporary mix is independent of the saved volume/mute preference and is never persisted. A muted, missing or cancelled result cue also releases the hold. Music is paused on the development Sound library page for isolated auditioning.
