# Electron desktop

The desktop wrapper uses Electron 44 and packages the same React game as web/mobile. It loads bundled assets through the secure `arena://game/` protocol, including root-relative card art, UI textures, music and video. Hash routing keeps navigation and reloads on the asset root. No web server is needed for bundled practice play.

## Commands (repository root)

- `pnpm dev:electron`: runs Vite on dedicated port 5174 and opens Electron with hot reload. Closing Electron stops the paired development server. Run `pnpm dev:server` separately for local multiplayer.
- `pnpm start:electron`: builds the desktop bundle and launches it without Vite.
- `pnpm pack:electron`: creates an unpacked application in `dist-electron` for the current operating system.
- `pnpm build:electron:mac`: macOS DMG and ZIP.
- `pnpm build:electron:win`: Windows installer; validate on Windows before distribution.

The app has standard editing, reload and fullscreen menu commands. Developer tools are available in the development View menu. Desktop builds are independent of `mobile:sync`.

## Multiplayer and saves

Copy `apps/web/.env.desktop.example` to `.env.desktop.local` and set `VITE_SERVER_URL` before building. Blank means offline practice; the matchmaking screen explains that no server is configured. Use `http://localhost:3001` for local bundled testing or a deployed HTTPS endpoint for distribution. The development wrapper defaults to localhost automatically.

When overriding the backend's `CORS_ORIGINS`, include `arena://game` for packaged apps and `http://localhost:5174` for development. These are included in the server defaults. CORS does not replace authentication.

Collections/progression are stored locally in Electron's application profile. They are separate from browser/mobile saves. Changing from the old TCG/file origin does not migrate prototype saves. Accounts and cloud progression are still outstanding.

## Packaging status

macOS builds currently disable signing explicitly for local testing. Distribution requires configuring signing/notarization before public distribution. Windows and Linux require their own platform testing. This is an Electron app, not yet a Steamworks integration; achievements, Steam login, billing and depot setup remain separate work.

The renderer has no Node access, uses context isolation and sandboxing, and exposes only the two existing app-information IPC methods. External HTTP(S) links open in the system browser; other external schemes and in-app navigation to outside origins are blocked. The local protocol confines requests to the bundled web directory.

## Verification

On this Mac: desktop production build and unsigned arm64 `.app` packaging succeeded. Launched the packaged application through `arena://game/` and visually verified the home screen, artwork, navigation into practice and a turn announcement on the board. All 204 automated tests passed, including protocol asset resolution and traversal rejection. Windows/Linux installers and audio playback on other systems have not been verified.

## Opening sequence

Startup shows the Midas Games studio logo for about 1.7 seconds, then fades out over 0.75 seconds before the arena artwork fades in. Loading remains visible for at least 1.3 seconds; the menu mounts and paints beneath it before a 0.9-second fade. The progress bar counts the game module, core UI images and font readiness, rather than simulating download bytes. Noncritical images/font waits are bounded to six seconds; game-module failure offers Retry. The sequence runs once per page launch/reload, not on menu navigation. Reduced-motion preferences disable animated fades.

Fonts are now bundled locally. The initial HTML slate appears before React and the larger game chunk loads. Studio artwork is in apps/web/public/ui/studio/midas-games-v2.png; imagegen source and prompt are preserved under output/midas-logo-v1. Capacitor's OS launch screen remains a separate native asset.

The Midas Games v2 asset has verified alpha transparency. Startup no longer uses screen blending or a moving full-screen background. Core images are decoded before preparation completes, and the menu remains inert until the loading overlay finishes.

## Artwork preparation

Boot now warms the selected saved deck (or the basic starter), all arena location art and common card UI textures. Requests are deduplicated, limited to three concurrent decodes, and stop scheduling after seven seconds; in-flight images have four-second timeouts. Optional failures do not prevent launch. Decoded image references are retained under a 48 MiB estimated RGBA budget, with older entries evicted. This is a retention limit, not a total browser/GPU-memory guarantee. The loading bar reports completion of this preparation pass, including skipped/failed optional assets; it does not represent downloaded bytes.

Card video artwork only gets a source while intersecting the viewport, with the app active and reduced motion disabled. Leaving the viewport unloads the video decoder; returning starts its loop again. Posters remain available. No music/video playback is started during the loading screen. Static card images request asynchronous decoding. Browser inspection confirmed visible video playback and no sources on off-screen videos; frame-time improvements still need measuring on target devices.

Loading progress starts at zero: the measured game/artwork/font preparation now begins after the artwork screen finishes fading in, rather than during the studio slate. Cached assets may still complete quickly; the bar does not simulate extra work.

Background music now mounts above the boot/game boundary and activates when the artwork loading phase begins. It continues through the menu without replacing the audio element. Electron permits autoplay; browser autoplay rejection exposes Enable music on the loading screen. Saved mute/volume preferences remain respected. The studio slate stays silent.
