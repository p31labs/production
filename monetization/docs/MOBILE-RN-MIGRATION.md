# React Native Migration — the gated forward path to native parity

> This is NOT a rewrite, and NOT a plan to start now. `MOBILE-BLUEPRINT.md`
> locks Capacitor + PWA as the current mobile strategy; this doc is the FORWARD
> path to RN+Hermes native, intentionally gated on scale triggers. One operator,
> $0 budget, live revenue tracks — nothing here may halt them. Read the gate
> (section 2) before the phases (section 5).

## 1. Why this doc exists — the honest verdict

The Capacitor/WebView ceiling is real and measurable: a wrapped web app ships a
TTI of ~2.8s and touch latency of 100–300ms, because every tap crosses the
WebView bridge through a DOM that was never built for it. React Native on the
New Architecture (Hermes + JSI + TurboModules + Fabric) runs the same UI at a
~1.1s TTI and 16–60ms touch latency — native gestures, no bridge jank, JIT/bytecode
off the main thread.

Every comparable app already made this call. Coinbase rebuilt in React Native
(InfoQ writeup of the migration); the Base App runs React Native with
behavioral prefetch; Claude's mobile clients are RN native. React Native 0.84
(Feb 2026) made Hermes **V1 the default engine**, with JSI, TurboModules, and
Fabric as the shipped configuration — the "New Architecture" is now just
"the architecture." RN is no longer a gamble; the only question is *when* a
budget and a user base make the port worthwhile.

The verdict: the current Capacitor shell is the correct, cheapest rail for the
installable-web phase of the business. It has a ceiling. This doc exists so that
when a trigger fires, the path to native is already written and phased — not so
that we start today.

## 2. The gate — do not start until a trigger fires

This work is gated. Do not begin Phase R1 until **one** of these triggers is
true:

1. **A measured real-user base that justifies it.** A sustained, verified
   mobile engagement number (e.g. weekly active installs on the Capacitor/PWA
   build past a threshold you set on first baseline — see section 8) — not
   downloads, *retained users who transact*.
2. **A grant landing that funds the migration.** NSF PESOSE ($300K track,
   `docs/NSF-PESOSE.md`), Base Builder ($5K, `docs/BASE-BUILDER-GRANT.md`), or
   Digital Science Catalyst (£25K, `docs/DIGITAL-SCIENCE-GRANT.md`) — a funded
   window that pays for the rebuild without touching the revenue tracks.
3. **Bazaar indexing driving real x402 traffic.** When the Bazaar
   (`docs/BAZAAR-UNLOCK.md`) routes enough paid calls that a native surface
   becomes the difference between keeping and losing users on mobile.

One operator + $0 budget means the migration must not halt the revenue tracks.
If no trigger fires, the answer stays: **Capacitor + PWA, keep shipping the web
portal.**

## 3. What ports (reusable — do not rebuild)

The RN shell inherits everything that is already portable, so the port is a
re-theme, not a re-authoring:

- **OKLCH design tokens.** `@p31ca/design-core` ships as CSS custom properties
  — mechanically portable to a RN theme map (`tokens.ts` → `StyleSheet`
  factory). Same colors, same Quantum-Material surfaces.
- **Zustand stores.** State logic is framework-agnostic; copy the store files
  unchanged.
- **TanStack Query cache keys.** The query key graph is the contract with the
  Workers API — shared verbatim (`revenueSummaryQuery`, `positionsQuery`,
  `opportunitiesQuery`, `btcpayInvoicesQuery`, ...). The RN app and the web app
  read the *same* keys from the *same* `p31-monetization` / `revenue-sink` /
  `revenue-ledger` API.
- **The spoon/capacity model.** `data-spoons` + `--motion-scale` semantics port
  to a context + animated scale; the reduced-motion and capacity rules are
  behavior, not markup.
- **The 4-flagship tab IA.** `MobileBottomNav` already proves the finance-first
  IA: home · revenue · positions · opportunities. That is the bottom-tab map.
- **The prefetch pattern.** Base App's behavioral prefetch — score =
  conversionRate × visibility, gated by IntersectionObserver — ports as-is to
  `onViewableItemsChanged` / focus-driven prefetch.

## 4. What must be rebuilt (not portable)

These are genuinely new work; they are the bulk of the timeline:

- **The 13 surfaces as RN components** — home, revenue, positions,
  opportunities, invoices, donations, billing, usage, ops, settings, profile,
  trust, community. React Native views, not HTML.
- **Navigation.** React Navigation bottom tabs (the 4-flagship IA), typed
  `RootTabParamList`, deep links mapped to the `monetization.p31ca.org` scheme.
- **FlatList virtualization** for the long surfaces — the revenue ledger
  (500-row default), positions, and opportunity lists. RN virtualizes; a mapped
  `ScrollView` does not.
- **Reanimated** for the spoon dial and tab transitions — the single moat that
  needs true 60fps, and the clearest win over the 100–300ms WebView ceiling.
- **Crypto polyfills.** The x402 / ML-DSA / SD-JWT stack already shipping in
  the Worker + web app needs native polyfills (per Coinbase CDP docs) — no
  `window.crypto` shortcuts exist in RN.
- **Hermes bytecode build** — the release build, per the 0.84 Hermes V1 default.

## 5. Phased port — a port, not a rewrite

Each phase ships and is usable alone; the web/Capacitor build stays the
distribution rail until R4.

| Phase | Scope | Notes |
|---|---|---|
| **R1** | Scaffold Expo + Hermes + New Architecture; port tokens + navigation + Home + Revenue | Prove the shell against the real API with the two flagship surfaces |
| **R2** | Positions / Opportunities / Trust — the data-heavy surfaces | FlatList + prefetch here; this is where native virtualization pays |
| **R3** | Remaining surfaces + spoon dial + behavioral prefetch | Feature parity with the web portal |
| **R4** | Wallet integration (Coinbase Mobile Wallet SDK / MWP) + biometrics | x402 flows on native; Face ID / fingerprint unlock |
| **R5** | Store distribution — Android Play + iOS App Store | Play $25 one-time, iOS $99/yr (already deferred in the blueprint) |

## 6. Timeline — solo-operator realistic

Solo-operator, in the evenings next to a live revenue track: **6–10 weeks** for
R1–R5. A funded team (grant-landed) publishes "3–6 weeks" for the same scope;
that estimate assumes people who do nothing else. Do **not** start gated work
until a trigger (section 2) fires — and when it does, freeze the phase at the
closest ship-able boundary (R1 and R2 each produce a usable build).

## 7. How the web / Capacitor path stays alive

The RN shell is **additive**, never a replacement-in-flight:

- The **PWA stays the installable web rail** — zero-friction install, no store,
  the product of record for anyone who finds P31 via the Bazaar or a link.
- The **Capacitor shell stays** until R4/R5 supersede it for a store audience.
- **One Workers API** serves both: `p31-monetization` + `revenue-sink` +
  `revenue-ledger`. The shared TanStack query keys (section 3) are the proof —
  the API is the contract, the clients are interchangeable views over it.

## 8. Measurement contract — before you are allowed to start

A migration without a before/after is not defensible. Before Phase R1:

- The current Capacitor build must have a **measured baseline** captured by
  `scripts/mobile-perf-audit.mjs` (the audit script — create it as part of R0)
  on a real device, not a desktop emulator.
- Baseline must include `window.__p31Perf` **INP and TTFD** (interaction-to-next-
  paint and time-to-first-display) on the served surface.

Reference budgets for the after-number (fintech standards): **TTID ≤1.1s P90,
TTFD ≤1.6s P90** — the exact numbers the RN/Hermes build is expected to beat,
and the WebView baseline is expected to miss. The before/after pair is the
deliverable that lets you decide, with data, whether R2 onward is worth the
remaining operator-hours.

## Key research citations (inline)

- Coinbase's React Native migration — InfoQ writeup (JSI/Fabric rationale).
- Base App behavioral prefetch, score = conversionRate × visibility, nav-block
  cut 80–100% — Base Engineering blog.
- Hermes V1 default + New Architecture (JSI, TurboModules, Fabric) shipped in RN
  0.84, Feb 2026.
- Fintech interaction budgets — TTID ≤1.1s P90, TTFD ≤1.6s P90.
- WebView touch latency 100–300ms vs RN/native 16–60ms.
- Crypto polyfills required in RN per Coinbase CDP documentation.
- Store fees: Google $25 one-time, Apple $99/yr.