# Native mobile development

Arena Eternal uses Capacitor 8 for iOS and Android. Both native projects live in `apps/web` and package the existing React game, local practice engine, artwork and audio. The browser and Electron workflows remain separate. App identifier: `com.arenaeternal.game` (confirm ownership and final identifier before registering store apps).

## Current status

- iOS Xcode project generated using Swift Package Manager; Android Gradle project generated.
- Native apps use hash routing so nested screens and relative artwork URLs remain on the bundled asset root. Browser routing is unchanged.
- Native app background/foreground events pause and resume music and sound effects alongside browser visibility events.
- iOS uses the local `ArenaAudio` Capacitor plugin backed by `AVAudioPlayer` for music and effects. Music volume/finale fades and effects volume use native player gain rather than iOS HTML media volume; effects need no Web Audio gesture unlock. The existing manifest, mute preferences, playlist and voice cancellation remain shared. Browser, Electron and Android retain their existing audio players. Simulator and connected iPhone 14 Pro diagnostics confirm successful native effect completion. Audio paths canonicalize both the bundle root and requested file before containment checks, handling physical-device `/private` aliases and trailing separators.
- No backend configured means practice-only mobile preview. Matchmaking explains this rather than trying the phone's localhost.
- iOS opts into `viewport-fit=cover` at startup and uses the `native-ios` CSS class to inset board controls, home content and inspection/result dialogs while artwork fills the display. The practice board subtracts its safe-area-aware header from the available height. Android retains Capacitor's native inset handling and its original viewport configuration. Validate physical devices as well as simulator rotation.
- Production web bundle and native asset sync verified. Xcode 26.6 and the iOS 26.5 runtime are installed. Swift dependencies resolve, and the iPhone 17 Pro simulator build succeeds with signing disabled. The app installs and launches in that simulator. A signed physical-device build also installs and runs on the connected iPhone 14 Pro. TestFlight/IPA distribution and Android Studio/SDK setup remain outstanding.
- Native launcher icons and launch screens are still Capacitor templates. Store signing, billing, accounts/cloud saves, reconnect recovery and store submissions are separate milestones.

## Prerequisites

Use Node 22+, pnpm, Xcode 26+ for iOS, and Android Studio 2025.2.1+ with Android SDK 36 and its bundled JDK for Android. The generated Android project targets API 36 and supports API 24+. The iOS project targets iOS 15+.

See [Capacitor environment setup](https://capacitorjs.com/docs/getting-started/environment-setup). Install the IDEs first; select Xcode's developer directory and configure an iOS simulator or Android virtual device. Native builds may download Swift/Gradle dependencies. Physical iPhone installation also requires selecting an Apple signing team in Xcode.

## Build and run

From the repository root:

```sh
pnpm install
pnpm mobile:sync
pnpm mobile:ios
# Or:
pnpm mobile:android
```

`mobile:sync` builds with Vite's `mobile` mode and copies assets/plugins into both projects. Run it after web code, assets, native config or plugin changes. Then select a simulator/device and Run in the IDE. No running Vite server is needed.

If the system still selects Command Line Tools, prefix Xcode commands with `DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer` without changing the system-wide selection.

Once devices are configured, the CLI alternatives are `pnpm mobile:run:ios` and `pnpm mobile:run:android`; both rebuild and sync first. `pnpm mobile:build` only creates the web bundle. Do not use a plain `cap sync` after a browser build: it would copy whichever bundle is currently in `dist`.

## Multiplayer server

Copy `apps/web/.env.mobile.example` to `apps/web/.env.mobile.local`. Leave the URL blank for offline practice, or set:

```dotenv
VITE_SERVER_URL=https://your-game-server.example.com
```

This is a public build-time setting, never a secret. Use a deployed backend or an explicitly configured HTTPS development endpoint reachable from the device. The build rejects HTTP, localhost and URLs containing credentials, queries or fragments. It does not weaken Android cleartext restrictions or iOS transport security. Rebuild/sync after editing the URL.

The backend must allow both native origins: `capacitor://localhost` (iOS) and `https://localhost` (Android). They are included in the development defaults. When setting `CORS_ORIGINS` in deployment, include them explicitly alongside your web origin, separated by commas. CORS is not authentication; production accounts and server-controlled ownership/rewards still need implementing.

## First-device checks

1. Launch with networking disabled; open collection and complete a practice match.
2. Inspect cards, drag cards, open dialogs and use Android Back; check portrait and landscape, keyboard, notch and home indicator clearance.
3. Lock/background and resume during music, card reveals and score counting; check that audio stops in background and resumes correctly.
4. With a backend configured, join a match from two devices and test connection loss. Do not treat wrapper setup as reconnect support.
5. Check memory, heat and animation smoothness on a lower-end phone. The current public asset folder is approximately 241 MB uncompressed; optimise and remove development-only assets before store distribution.

Local saves are device-specific and may be lost when uninstalling. The wrapper does not add cloud progression or secure the existing local economy. Keep real purchases unavailable until those systems are ready.

Native project source is version-controlled; copied web bundles, SDK paths, build outputs and signing keys are ignored. Generated plugin paths are refreshed by `mobile:sync` after dependency changes.
