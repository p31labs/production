# Mobile Blueprint — locked strategy for the P31 Capital Machine

> Four decisions, locked. The monetization portal goes to mobile as a hardened
> PWA first, then a Capacitor shell — one web codebase (React 19 + Vite) to
> iOS, Android, and mobile web. Finance-first, Android-first, universal links
> on a custom domain. This doc is the contract; every phase below is gated by
> it.

## Locked decisions

### Decision 1 — Capacitor + hardened PWA (NOT React Native)
Capacitor wraps the existing web codebase (React 19 + Vite) to reach iOS,
Android, and PWA from one codebase. React Native would require a full rewrite
plus crypto polyfills for the x402/ML-DSA/SD-JWT stack already shipping in the
Worker + React. The repo already proves the pattern:
`/home/p31/meatspace/bonding/apps/mobile` is a Capacitor 8 shell (android +
ios dirs, `@capacitor/*: ^8.4.0`). 2026 guidance — "Capacitor for wrapping
existing web apps": one web codebase to both app stores + mobile web, no
rewrite.

### Decision 2 — Monetization portal first (finance-first)
Coinbase's Base App pivoted from social-first to transaction-first (Jesse
Pollak, Jan 2026): social features "didn't work"; users judge apps on
liquidity, price discovery, and wallet UX. The monetization portal is already
transaction-first — revenue, positions, opportunities, billing, invoices. Build
the mobile shell once here, then apply it to every portal that shares the same
suite shell.

### Decision 3 — Android-first + iOS-ready
Android APK is free to build and distribute (sideload or Play, $25 one-time);
iOS costs $99/yr recurring. Google developer verification starts Sept 30 2026 —
an identity check, not a store gate. A PWA is installable on both platforms with
no store at all. Defer iOS until demand is proven or a grant covers the $99.

### Decision 4 — Custom domain for universal links (monetization.p31ca.org)
Deep links drive up to 4x higher conversion (AppsFlyer), +51% conversion
(Moburst), up to 2.5x retention (Adapty), and 41.8% of Western-European fintech
owned-media conversions are web-to-app (AppsFlyer). Universal links require a
custom domain — `*.workers.dev` cannot serve the iOS AASA or Android
`assetlinks.json`. `p31ca.org` already exists (workspace/design use it); adding
`monetization.p31ca.org` is a DNS + wrangler route change, $0.

## Current-state audit (verified)
- Monetization portal has **no** web manifest, icons, or service worker —
  `public/` ships only `favicon.svg`.
- `MobileBottomNav` is emoji-only (no labels), appears only at `max-width:
  768px`, and has no `env(safe-area-inset-*)` handling — content sits under the
  home indicator and gesture bar on modern phones.
- The suite shell is shared across portals → one mobile upgrade lifts them all.
- Bonding app (`meatspace/bonding/apps/mobile`) is the existing Capacitor
  pattern to copy.

## Phased roadmap

| Phase | Deliverable | Cost |
|---|---|---|
| 0 | Subdomain + AASA + `assetlinks.json` — **DONE 2026-09-25**: `monetization.p31ca.org` live; SPA fallback deep-links all 13 surfaces; `.well-known` served (AASA + assetlinks placeholders pending native cert fingerprints) | 2h / $0 |
| 1 | PWA manifest + icons + service worker + safe-area insets — **DONE** | 1d / $0 |
| 2 | Real 4-tab finance-first bottom nav (labels + icons) — **DONE** | 1d / $0 |
| 3 | Capacitor shell (copy bonding pattern) — **scaffolded** (`mobile/`) | 1d / $0 |
| 4 | Behavioral prefetch — score = conversionRate × visibility; Base App cut nav blocking 80–100% — **DONE** (idle + hover) | 2d / $0 |
| 5 | Progressive KYC gate — tiered flows convert 2–4x better than flat — **DONE 2026-09-25**: `src/lib/kyc.ts` (Tier 0 browse / Tier 1 identity / Tier 2 `p31.identity` credential in the Phenix wallet) + `src/components/KycGate.tsx` wired into Profile "Trust & Access" | 1d / $0 |
| 6 | Spoon dial in tab bar (unique moat) — **DONE** (FloatingSpoonDial) | 1d / $0 |
| 7 | Android APK build — **DONE 2026-09-25**: signed release APK built (`dist/P31-Capital-1.0.0.apk`, 3.98M) with non-root JDK21 + SDK34 at `~/.local`; release signing config in `app/build.gradle`; assetlinks fingerprint live + matches the APK cert → Android App Links work | 1d / $0 |
| 8 | iOS TestFlight — **`ios/` project generated + runbook in `mobile/README.md`**; build requires macOS + Apple Developer ($99/yr) — deferred until demand or grant | $99/yr |

Total build: ~9 days, $0 (+$25 Play fee optional, $99/yr iOS deferred).

## Metrics — before / after

| Metric | Before | After |
|---|---|---|
| Install friction | None (web only, no install affordance) | One-tap install via manifest (PWA) / store (Capacitor) |
| Deep link conversion | None (no universal links) | Custom-domain AASA + assetlinks, up to 4x conversion |
| Loading | Cold full reload | SW cache + behavioral prefetch |
| Onboarding drop-off | Flat KYC wall | Progressive tiered gate (2–4x better) |
| Native feel | No safe areas, emoji nav | Safe-area insets, real tabs, Capacitor shell |
| Distribution | Browser only | Android APK + PWA; iOS TestFlight deferred |

## Honest constraints
- **Universal links need a custom domain.** `*.workers.dev` can't serve AASA /
  `assetlinks.json` — the subdomain is a prerequisite for Phase 0, not optional.
- **iOS costs $99/yr + an Apple Developer account**; TestFlight builds are gated
  on that, plus App Review on release.
- **PWA on iOS has limits**: no Android-style install prompt, address-bar
  nuances, and SW/storage eviction rules differ. Capacitor exists to bridge
  this once iOS is funded.
- **Independent of the ~$0.02 funding gap.** This is distribution; the x402
  bootstrap problem is a separate track (see `BOOTSTRAP-FUNDS.md`).

## Key research citations (inline)
- Base App prefetching / nav-blocking cut 80–100% — Base Engineering blog.
- Deep links → up to 4x higher conversion — AppsFlyer.
- 51% conversion increase — Moburst.
- Up to 2.5x retention — Adapty.
- 41.8% of Western-European fintech owned-media conversions are web-to-app —
  AppsFlyer.
- Selfie-first KYC +20% completion — Jumio.
- Tiered KYC flows convert 2–4x better than flat — Zyphe.
- PWAs cost 30–75% less to build than native — Stintlief.
- Store fees: Apple $99/yr, Google $25 one-time — Javascript Playground 2026-08.

## Measurement

### Shell audit (server-side, datacenter → edge)

```bash
node scripts/mobile-perf-audit.mjs         # human table
node scripts/mobile-perf-audit.mjs --json  # machine output (exit code: 0 = pass)
```

Probes `/`, `/manifest.webmanifest`, `/sw.js`, `/icons/icon-192.png` for
DNS/TCP/TLS/TTFB and reports gzip sizes of the hashed JS/CSS assets extracted
from the served HTML. Shell budget: DNS ≤ 200ms · TCP ≤ 300ms · TLS ≤ 400ms ·
**TTFB < 800ms (exit gate)** · total ≤ 2500ms. This measures the shell only —
it cannot measure on-device interaction.

### On-device metrics (the 2026 fintech budget)

Phase B instrumentation exposes a global on every page plus a rolling ring
buffer:

```js
window.__p31Perf
// { ttfdMs, ttidMs, inpMs, navType, perfEntries: [...] }

JSON.parse(localStorage.getItem('p31:perf'))   // rolling device ring buffer
```

To read on a real device: run inside the Capacitor shell (or a Chrome DevTools
remote-debug session on the phone), open the app console, evaluate
`window.__p31Perf`; after a session, read `localStorage['p31:perf']`. Sample
**≥ 5 cold navigations** and compare the **P90**:

| Metric | 2026 fintech budget (P90) | Source |
|---|---|---|
| TTID — time to first interaction | ≤ 1.1 s | `window.__p31Perf.ttidMs` |
| TTFD — time to first display | ≤ 1.6 s | `window.__p31Perf.ttfdMs` |
| INP — interaction to next paint | report only (reference: CWV good ≤ 200ms) | `window.__p31Perf.inpMs` |
| Navigation type | — | `window.__p31Perf.navType` |