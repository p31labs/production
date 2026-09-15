# 15 — Design-core divergences register

Status: living register. Every intentional fork QPJ keeps from `@p31/design-core`
lives here, with three fields: **what design-core ships**, **what QPJ needs
instead**, **why the difference is product, not laziness**. This is a review
surface — anyone may read an entry and challenge it.

The consolidation pass (docs `11`/`13`) adopted design-core's CommandPalette and
fixed the token gap that surfaced with it. What remains custom is listed below.

## Systemic: the theme + canon files are never loaded

- **What design-core ships:** `src/css/theme-*.css` palettes (sovereign per-portal
  looks, incl. `--p31-void`/`--p31-star-*`/`--p31-notif-*`), plus `canon.css`
  (the canonical product look) and `glass.css`/`quantum.css`/`ambient.css`.
- **What QPJ loads:** only `all.css` (`base → tokens → layout → recipes → motion →
  typography → chrome`) + `container.css`, layered under `src/index.css`.
- **Why product:** the sovereign aesthetic isn't the family look. QPJ rides its
  own `data-hue` (pickle H=75 default, per-passport shift) + `data-mode`
  (spark/maker/workshop) tokens. Loading themes would impose a foreign look.
- **Cost managed by:** `src/__tests__/token-audit.test.ts` — asserts every
  `var(--p31-*)` read across loaded design-core css + all `src/**/*.css`
  resolves to a definition, so a token that only exists in canon/theme files
  can never silently land undefined again. Adopted-token alignment lives in the
  "design-core loaded-tree alignment" block of `src/index.css`.

## Starfield — kept custom

- **What design-core ships:** `Starfield` composition (`spoons`/`voltage`/
  `safeMode` props) over the imperative `mountStarfield()` — the sovereign
  product's crisis-aware sky.
- **What QPJ needs instead:** a seeded, deterministic canvas where the only
  motion that stands out is the notification **burst** flare (fires from
  `useNotifStore`), with real reduced-motion stillness.
- **Why product:** the burst is QPJ-specific behavior, not chrome. The sovereign
  sky is a *chosen* aesthetic that isn't the family one — QPJ's is "a night-sky
  the passenger looks *through*", screened low-alpha in `--p31-star`.
- **Status:** PENDING taste test on `/street` with a 7–70yo phone screen. If
  design-core's canvas reads calmer, the burst subscription moves to a sibling
  `<StarfieldBursts />` and the custom canvas is deleted.

## Crisis floor — kept custom

- **What design-core ships:** a generic rest interstitial (`message`,
  `buttonLabel`, single `I'm Ready` via `p31-ready`), wired to `data-spoons="0"`.
- **What QPJ needs instead:** a three-action floor — **Rest the day**
  (refill + notice), **Keep going** (dismiss, no refill), **Switch lanes** — that
  engages **once per dip** (re-engages only after spoons climb back above 0).
- **Why product:** agency and once-per-dip calm aren't in the generic
  interstitial's interface; forcing the swap would delete shipped behavior.

## CommandPalette — adopted, one override

- **What design-core ships:** `CommandPalette` composition owning filter,
  keyboard nav, and the accessible `role="dialog"` listbox; the shell owns
  items + dispatch.
- **What QPJ does:** identical split via the `src/components/CommandPalette.tsx`
  bridge (⌘K trigger, `qpjCommands(mode)` mode-filtered items, pure
  `runQpjCommand` dispatch). No fork — adoption is the point.
- **Override:** `.cmdk-item.is-active` colors with `--p31-accent-contrast` on the
  family accent. design-core *does* define `--p31-void` (`base.css`,
  `#0A0A0F`) — QPJ simply prefers its own contrast token on a pickle-green
  active row. Cosmetic, intentional.
- **Cost managed by:** the same `token-audit.test.ts` guard.

## ThemeCharm — adopted Chameleon, one pack row on top

- **What design-core ships:** `Chameleon` (brand × world × age × sensory
  controls) with an *internal* open state — no API to add controls or open it
  programmatically.
- **What QPJ needs instead:** the same control with one extra tier at the top: a
  **Pack** row choosing the QPJ look (**Space ⭐** — the dark starfield sky, the
  default — or **Lantern 🏮** — the warm cream world that was QPJ's original
  first paint). The cream look is therefore a chooseable pack, never the boot
  default.
- **Why product:** the app now boots CSS-first on the dark space palette
  (`:root` in `src/index.css`, no flash), and `html[data-qpj-theme='lantern']`
  holds the cream set. `useThemeEffects` mirrors Chameleon's bridge pattern:
  subscribed after `applyTheme`, it re-asserts the active pack inline so a world
  swap can't leak a foreign palette in, and **workshop mode always forces Space**
  (creative surfaces stay on the starfield sky).
- **Cost managed by:** `ThemeCharm.tsx` reuses design-core chrome.css classes
  (`.chameleon-*`, `.world-dot`, `.brand-chip`, `.seg`, `.toggle`) and the
  theme-store (`THEME_TOKENS`, `resolveBrandTokens`); `chameleon-theme.test.tsx`
  covers pack boot defaults, lantern reassert-vs-world, and the workshop-pinned
  toggle. It's the only file allowed to name the brand pack (`Lantern`) — the
  `brand-scrub` allowlist.

## LOVE ledger — no design-core analog

- **What design-core ships:** nothing (no dual-currency chrome).
- **What QPJ needs:** the Paper XI micro — two pools (Sovereignty vest /
  Performance spend), care-score gate, 7-day decay.
- **Why product:** it's family memory, not chrome; `docs/14-LOVE-LEDGER.md`
  documents it. See also `/home/p31/P31-local-workspace/docs/LOVE_LITEPAPER.md`.

## Resolved — status token naming

QPJ's studio CSS read `--p31-status-warn` (a schema drift); design-core's
canonical token is `--p31-status-warning`. Aligned during the token audit —
`studio.css` now reads the canonical token. Kept here so the drift isn't
reintroduced.

## sovereign-core — vendored tarball, not registry

- **What the registry ships:** `@p31/sovereign-core@0.1.0` from npm (stale copy
  in the root pnpm store, missing `motionScale`, `soundScale`, `contrastTarget`,
  `density`, `breathPattern`, `zeitgeber`).
- **What QPJ uses:** `vendor/p31-sovereign-core-0.1.0.tgz`, packed from
  `/home/p31/P31-local-workspace/packages/sovereign-core` (the canonical source).
- **Why product:** the canonical source is actively developed alongside QPJ and
  other portals. A registry publish would lag. The `link:` protocol was tried but
  is fragile across fresh clones and `pnpm install` runs. The vendored tarball
  matches the existing pattern used for `@p31/design-core` and `@p31/ui`.
- **Cost managed by:** `sync:vendor` script regenerates the tarball from the
  canonical source. `v:gate` asserts the vendored version matches expectations.
  Update the tarball with `pnpm pack --pack-destination vendor/` in the canonical
  source, then re-commit.

## Env access — `import.meta.env` is canonical, `test.env` for edge tests

- **What design-core ships:** `import.meta.env` for Vite env vars.
- **What QPJ uses:** `import.meta.env` for Vite env vars. `process.env` is NOT
  used for env reads because Vite does not replace `process.env.VITE_*` at build
  time without an explicit `define` block, and Cloudflare Workers do not expose
  `process.env` at module scope.
- **Why product:** `import.meta.env` is statically replaced by Vite at transform
  time with literal values — the correct pattern for browser bundles and Worker
  deployments. Edge-mode tests use Vitest `test.env` projects in
  `vitest.config.ts` to set `VITE_P31_SUBSTRATE_URL` before module transform,
  enabling `vi.stubEnv`-free testing.
- **Cost managed by:** substrate tests split into `substrate.local.test.ts`
  (runs in `qpj:local` project) and `substrate.edge.test.ts` (runs in
  `qpj:edge` project). No runtime env patching, no `vi.resetModules`, no dynamic
  `import()`.
## WebSocket endpoints are read-only and unauthenticated

- **Design-core assumption:** per-passport isolation implies per-passport auth.
- **QPJ reality:** `wss://p31-dispatch.trimtab-signal.workers.dev/ws?passportId=X`
  is public. The dispatch `/ws` route forwards to the passport worker without
  the shared secret; the WS protocol (`ws-protocol.ts`) only exposes `ping`,
  `echo`, `subscribe`, `status`. `status` returns the last 5 builds for the
  passport in the URL.
- **Why product:** the substrate is family-scale; passport ids are semi-public
  (they appear in portal routes). Build IDs, statuses, and artifact keys are
  not secrets. The POST endpoints (which write to R2) remain gated by the
  shared secret.
- **Cost managed by:** if auth is needed later, the WS upgrade is the place to
  add it — a signed token in the query string, verified by the passport worker
  before `acceptWebSocket`.

## Token namespace split — `--space-*` vs `--p31-space-*`

- **What design-core ships:** the 8pt `--space-1` through `--space-7` scale.
- **What QPJ uses:** `--space-*` on SiteShell/WorkerChat surfaces (design-core
  namespace) and `--p31-space-*` on Workshop/pin-* surfaces (QPJ-local
  namespace). Both scales resolve to the same 8pt values.
- **Why product:** the split predates design-core adoption; both are canonical
  on their own surfaces. Unifying would touch every surface.
- **Cost managed by:** `token-audit.test.ts` verifies both namespaces resolve.
  A surface reading from the wrong namespace fails the guard.

## SwitchPage — no design-core Card/PageHeader analog confirmed

- **What design-core ships:** SpoonDial, ChatShell, Button, GlassPanel,
  PageHeader, StatusBadge, and the chrome primitives.
- **What SwitchPage uses:** 5 raw `<button>` cards with `switch-card*` CSS.
- **Why product:** SwitchPage is a passport-switching surface with a
  card-shaped interaction. The closest design-core composition is
  `GlassPanel`, but it is a container, not an interactive card. Migration
  requires either a new composition in design-core or a QPJ-local
  `SwitchCard` reusing `GlassPanel` internally.
- **Cost managed by:** deferred. Recorded so the next polish pass doesn't
  re-open this without a design-core-side decision.

## Service-binding routing replaces per-passport hostnames

- **Design-core assumption:** `*.{namespace}.workers.dev` routing via Workers
  for Platforms dispatch namespace.
- **QPJ reality:** the account has no Workers for Platforms plan (`error 10121`).
  One `p31-passport` worker hosts every `PassportDO` via `getByName(passportId)`.
  Dispatch proxies to it via a `[[services]]` binding.
- **Cost managed by:** when/if Workers for Platforms is provisioned, the
  dispatch `/ws`, `/api/build`, `/api/status`, `/api/artifacts` routes can
  switch to `env.DISPATCHER.get(passportId).fetch(request)` without changing
  the passport worker.

## Substrate HTTP API: RETIRED (2026-09-14)

- **Status:** Dormant → Formally Retired. Zero imports of `bridgeSubmitGoal` across all 9 portals. No design-core composition, token, or composition depends on the substrate bridge. Not included in fitness functions.
- **What exists:** `src/lib/substrate.ts` exports `submitGoal`, `executeBuild`, `checkStatus`, `verifyPassport`, `getArtifactUrl`, all gated by `isEdgeMode()`. `src/features/worker/substrate-bridge.ts` exports `bridgeSubmitGoal`. Code remains in source as dead code; no deletion required.
- **Why retired:** QPJ-specific infrastructure behind `substrate: false` (feature flag). `useSubstrateWebSocket` (build-status toasts) is the only live surface integration; WorkerChat uses in-memory `delegateGoal` instead. No production path uses the bridge.
- **Reactivation:** Requires RFC in `docs/rfc/` + activation runbook (`docs/21` § Activation). Design-team decision needed before any code changes.
- **Cost managed by:** Code stays as dead code. Reactivation is a net-new feature decision, not a revert.

---

## Ecosystem-level divergences (2026-09-14)

These register divergences across the full family portal system
(QPJ, chat, design, children, teen, meatspace, parent, p31ca,
phosphorus31). Each entry follows the same format: **what the family
ships**, **what this portal needs instead**, **why**.

---

## Design-core version split: RESOLVED (2026-09-14)

- **What the family ships:** `@p31/design-core@2.3.0` (canonical source:
  `P31-local-workspace/packages/design-core`). Template declares 2.3.0.
- **What all portals use:** 2.3.0 vendored tarballs, current.
- **Resolved:** children/teen/parent/meatspace synced to 2.3.0 via
  tarball copy + package.json update + pnpm install.
- **Why (historical):** children/teen/parent/meatspace vendored 2.2.0 before
  2.3.0 was released. The template was updated but these portals didn't
  re-sync. meatspace uses design-core CSS (all.css) but not compositions.
- **Cost managed by:** `pnpm sync:vendor` in each portal regenerates the
  vendored tarball from canonical. `v:gate` asserts the version.

## @p31/game-engine: dormant in QPJ and meatspace

- **What the family ships:** `@p31/game-engine@0.2.0-alpha.0` — Maxwell
  rigidity, jitterbug geometry, geodesic primitives, spoon-gated game runtime.
- **What children/teen/parent use:** JitterbugGame component (geometry +
  JitterbugState types) — active arcade game surface.
- **What QPJ needs instead:** QPJ has spoons (energy), BatteryRing, and crisis
  floor — game-adjacent but not game mechanics. No Jitterbug, no geometry, no game runtime.
- **What meatspace needs instead:** meatspace declares game-engine but imports
  nothing from it. Like QPJ, no game mechanics.
- **Why product:** game-engine serves arcade/ROBLox-style surfaces (children/teen/parent
  have JitterbugGame). QPJ and meatspace are different surface types — QPJ is a family
  gateway, meatspace is a workspace. Neither needs game mechanics currently.
- **Cost managed by:** neither portal imports game-engine. If QPJ or meatspace later
  needs Jitterbug geometry, adopt specification-first (define game mechanics spec before code).
- **Rejuvenation trigger:** decision needed — document dormancy with trigger condition,
  or adopt for workshop surface.

## @p31/gamification: dormant in QPJ and meatspace

- **What the family ships:** `@p31/gamification@1.0.0` — sound, confetti, haptics,
  achievements, growth rings, voice feedback, economy store.
- **What children/teen/parent use:** sound, confetti, haptic, growth-rings subpaths —
  active in arcade surfaces.
- **What QPJ already provides:** Confetti component (custom), voice (useVoice/voiceSupport),
  LOVE ledger (dual-currency system). Partial overlap with gamification's surface.
- **What meatspace provides:** Uses @p31/ui which includes its own audio/interaction layer.
  No direct gamification usage.
- **Why product:** QPJ's existing features cover some gamification surface (confetti, voice).
  The question is whether QPJ should adopt gamification's sound/haptic/achievement/growth-ring
  subsystems or keep its current implementations.
- **Cost managed by:** document the overlap — which gamification exports does QPJ already
  provide, which does it need, which are intentionally out of scope.
- **Rejuvenation trigger:** decision needed — adopt gamification subsystems or document the
  QPJ-specific implementations as the canonical ones.

## @p31/ui: dormant in QPJ and chat

- **What the family ships:** `@p31/ui@1.3.1` — starfield, adaptive/GreyRock/NeuroAdapter,
  webmcp, passport templates, chrome components, layout templates.
- **What children/teen/meatspace/parent use:** Heavy use — passport/* (backup, pqc, did-document,
  eudi), starfield, types. Identical patterns across all four template-based portals.
- **What design uses:** adaptive/GreyRock, adaptive/NeuroAdapter.
- **What p31ca uses:** chrome, webmcp.
- **What QPJ needs instead:** Custom Starfield (seeded, deterministic, QPJ-specific),
  MeshBridge (p2p mesh integration), ModeGuard (XState mode gate), CrisisOverlay (spoons=0 floor).
  QPJ's patterns are intentional — family-specific look and security posture.
- **What chat needs instead:** chat uses @p31/design-core compositions exclusively.
  No @p31/ui features (passport, starfield, adaptive) are needed in chat's sandbox surface.
- **Why product:** QPJ and chat intentionally chose custom implementations that align with
  their product needs. @p31/ui's passport templates are for sovereign identity surfaces;
  QPJ/chat handle identity differently.
- **Cost managed by:** document the replacements. Each dormant dependency has a trigger:
  if QPJ needs GreyRock adaptive theming, adopt. If QPJ needs passport templates, adopt.

## meatspace: declares but does not use @p31/design-core

- **What meatspace declares:** `@p31/design-core@2.2.0` in package.json (via template).
- **What meatspace imports:** Zero — grep of all .ts/.tsx files returns no design-core imports.
- **What meatspace actually uses:** @p31/ui (passport/*, starfield, types, notifications),
  @p31/sovereign-core (configure, store, types), custom starfield and mesh implementations.
- **Why product:** meatspace was likely built from the template then diverged. Its surfaces
  have no design-core token layer — no var(--p31-*) styling, no design-core compositions,
  no token governance. Styling comes from @p31/ui internals or custom CSS.
- **Cost managed by:** investigate whether this is intentional (different visual identity)
  or drift. If drift, re-adopt design-core via sync:vendor + token audit. This is the most
  misaligned portal in the family.
- **Action needed:** Phase 1 investigation. Phase 2 re-adoption (if intentional drift is
  ruled out). Phase 3 game-engine/gamification decision (same as QPJ).

## Two architectural paradigms in the family

- **What the family has:** 7 React SPAs (zustand, hash routing, @p31/design-core CSS,
  var(--p31-*) tokens) and 2 Astro sites (Tailwind, react-router, no @p31 packages).
- **What they share:** Brand voice, color palette (roughly), the P31 name, the same
  deployment target (Cloudflare Pages), the same governance model.
- **Why product:** Astro sites are marketing/documentation surfaces (p31ca = dev portal,
  phosphorus31 = institutional). React SPAs are interactive app surfaces. Different
  deployment models, different user flows, different state management needs.
- **Cost managed by:** define a "P31 design contract" — a shared specification for tokens,
  components, and voice that both paradigms adhere to. Do NOT force one paradigm onto the other.
- **Action needed:** specification-first — define the contract before any code changes.
  The contract enables p31ca/phosphorus31 to consume design-core tokens and enables SPAs
  to maintain their @p31/design-core surface.

## @p31/shared Tailwind preset: p31ca's design token path

- **What p31ca ships:** `tailwind.config.mjs` extends `@p31/shared/theme/tailwind-preset`.
  This is p31ca's design token pipeline — NOT @p31/design-core CSS.
- **What @p31/design-core ships:** CSS custom properties (var(--p31-*)) via all.css,
  token JS via mcp/data, DTCG JSON via gen:tokens.
- **Why product:** p31ca is Astro — it can't consume design-core CSS directly (no
  design-core dependency, no @p31/design-core/css/all.css import). @p31/shared provides
  a Tailwind-compatible token layer.
- **Cost managed by:** verify that @p31/shared's tailwind preset covers all design-core
  tokens. If not, there's a token drift between the SPA portals (design-core CSS) and
  p31ca (Tailwind preset). This is a cross-paradigm token alignment issue.
- **Action needed:** token mapping between design-core and @p31/shared preset.
  Critical for market — p31ca is the public dev portal.

## phosphorus31: zero @p31 integration

- **What phosphorus31 ships:** Astro 5 + Tailwind v4 with 6 hardcoded hex colors
  in tailwind.config.mjs (cloud, espresso, teal-600, coral-500, butter, lavender)
  and font families (Lato, Lexend). No @p31 packages.
- **What phosphorus31 needs:** Design token alignment with the family. Even if
  phosphorus31 doesn't adopt @p31 packages, its visual identity should map to the
  P31 design system (same color relationships, same token semantics).
- **Why product:** phosphorus31 is the "cleaner warmer institutional version" —
  intentionally different aesthetic from QPJ's warm Lantern look. But it's still
  P31 brand and should be recognizable as part of the family.
- **Cost managed by:** extract phosphorus31's 6 Tailwind colors into a token map,
  then align with @p31/design-core tokens (or define a parallel institutional palette
  that maps to design-core semantics).
- **Action needed:** Phase 1 token extraction. Phase 2 alignment mapping. Phase 3
  optional @p31/design-core CSS adoption via Tailwind.
