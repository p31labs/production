# P31 Capital — Native Shell

Capacitor 8 wrapper that packages the **p31-monetization** Vite build
(`@p31ca/monetization-portal`) as a native iOS/Android app. The mobile project
holds no app code of its own — it shells the portal's `dist/` output via
`webDir: ../dist` and exposes native plugins (App, StatusBar, SplashScreen,
Share, Haptics).

## Build

```bash
# 1. Build the portal so ../dist exists (run from repo root or this dir)
pnpm --dir .. build

# 2. Inside this directory
cd mobile
npm install
npm run icons                 # writes resources/ icons (see scripts/generate-mobile-icons.py)
npm run cap:add:android       # generates android/ project (one-time)
npm run cap:sync              # syncs web assets + plugins into native projects
npx cap open android          # opens Android Studio
```

The `release` script chains it all: `pnpm --dir .. build && npm run icons && npm run cap:sync`.

## Platform strategy

- **Android-first.** Free sideloading and Play distribution; no gatekeeper
  fee. Recommended path for iteration and internal rollouts.
- **iOS deferred.** Requires an Apple Developer account ($99/yr) and
  provisioning to run outside Xcode simulator. Add `npm run cap:add:ios` when
  that budget opens up.

## Universal links (deferred)

Deep links / universal links need a custom domain — **monetization.p31ca.org** —
hosting:

- `/.well-known/apple-app-site-association` (iOS)
- `/.well-known/assetlinks.json` (Android)

until then the app runs as a standalone WebView at its bundled `dist/` build.

## Native-feel wiring (Phase B)

> **Documentation only** — the portal worker edits the actual app code (`src/`).
> This section is the contract the Capacitor shell expects the portal to satisfy
> once the native plugins are synced. Every behavior must no-op gracefully on the
> pure-web (PWA) build; nothing below blocks the web bundle.

Add the two plugins the shell does not yet ship (`haptics` + `share` are already
in `mobile/package.json`):

```bash
npm i @capacitor/biometric @capacitor/preferences   # run inside mobile/
npm run cap:sync
```

Exact imports (drop into the file that wires native affordances):

```ts
import { Capacitor } from '@capacitor/core';
import { Haptics } from '@capacitor/haptics';
import { Share } from '@capacitor/share';
import { Preferences } from '@capacitor/preferences';
import { Biometric } from '@capacitor/biometric';
```

- **(a) Haptics** — `Haptics.impact()` on tab switch, `Haptics.selection()` on
  spoon-dial change. Guard each call with `Capacitor.isNativePlatform()`.
- **(b) Share** — the Revenue and Trust surfaces expose share affordances; route
  them through `Share.share()` for the native sheet (not `navigator.share`).
- **(c) Biometric gate** — gate profile re-entry behind `Biometric.check()`,
  with enrolled state persisted in `Preferences` so the prompt fires on
  re-entry, not on first visit.

```ts
// src/lib/native-feel.ts — shape only; the portal worker owns the real file
const native = () => Capacitor.isNativePlatform();

// (a) haptics — tab switch (impact) / spoon-dial change (selection)
export async function onTabSwitch() {
  if (!native()) return;
  await Haptics.impact({ style: Haptics.ImpactStyle.Light });
}
export async function onSpoonDialChange() {
  if (!native()) return;
  await Haptics.selection();
}

// (b) native share sheet (Revenue / Trust share affordances)
export async function shareSurface(title: string, text: string, url: string) {
  if (!native()) return; // PWA keeps its existing affordance
  await Share.share({ title, text, url });
}

// (c) biometric gate on profile re-entry (enroll once, verify on re-entry)
const GATE_KEY = 'p31:profile-gate';
export async function gateProfileReentry() {
  if (!native()) return;
  const { value } = await Preferences.get({ key: GATE_KEY });
  if (value !== 'enrolled') {
    const { available } = await Biometric.isAvailable();
    if (!available) return;
    await Biometric.check({ allowDialog: true, promptTitle: 'Enroll to secure P31 profile' });
    await Preferences.set({ key: GATE_KEY, value: 'enrolled' });
  }
  await Biometric.check({ allowDialog: true, promptTitle: 'Unlock P31 profile' });
}
```

Wire points: `MobileBottomNav` tab change → `onTabSwitch()`; spoon dial
`onChange` → `onSpoonDialChange()`; the Revenue / Trust surface share buttons →
`shareSurface(...)`; the profile route's re-entry guard → `gateProfileReentry()`.
## iOS setup (Phase 8 — requires macOS + Apple Developer account)

The `ios/` project is generated (`npx cap add ios`, `npx cap sync` done). Building
**requires macOS + Xcode** (cannot be done on Linux):

1. On a Mac: `cd mobile && npx cap open ios` (or `open ios/App/App.xcworkspace`).
2. In Xcode: set the Team (needs an Apple Developer account, $99/yr) and the
   bundle id `org.p31.capital`; the signing registers your `TEAMID`.
3. Fill the iOS AASA: replace `REPLACE_WITH_TEAMID` in
   `../public/.well-known/apple-app-site-association` with your team ID, rebuild
   the portal (`pnpm build:pwa`), and re-run `npx cap sync`.
4. Archive → TestFlight for internal testing, or App Store when ready.

Alternative while un-funded: distribute the PWA (installable on iOS via
"Add to Home Screen") — the manifest + service worker already make it
installable with offline support.
