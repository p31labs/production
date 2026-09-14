# 07 — Testing

Vitest + jsdom + @testing-library. Run: `pnpm test`. **271 tests / 32 files.**

Playwright E2E (3 critical journeys). Run: `npx playwright test`. Tests live in `e2e/`, config in `playwright.config.ts`.

| File | Covers |
|---|---|
| `e2e/entry-gate.spec.ts` | Guest lands on #/entry, walks 4 onboarding steps, claim identity → arrives at #/street with banner hidden |
| `e2e/talk-nudge.spec.ts` | Guest sends message on #/talk → nudge dialog appears → "Send as guest" delivers message with guest marker |
| `e2e/persona-switch.spec.ts` | Verified user switches passenger in avatar menu → quiet set-up banner reappears on street |

## Matrix

| File | Covers | Keeps this honest |
|---|---|---|
| `mode-locks.test.tsx` | `canAccess` ranks; spark behind maker route renders **zero** protected children; PIN 1234 in `ModeGuard` elevates + reveals; wrong PIN stays locked | progressive disclosure is a lock, not a nav label |
| `passport-isolation.test.ts` | switch person → mesh `disconnect()` called, `talkMessages` cleared, spoons → 3, mode → `defaultModeFor('breadbutter')` = maker | per-person memory hygiene |
| `spoon-clamp.test.tsx` | clamp range 0–5; NaN/±∞ → 3; store `setSpoons` clamps; `useModeEffects` mirrors `data-spoons`/`--p31-spoon-level` onto `<html>` | energy never leaves bounds; DOM effects fire |
| `voice-health.test.tsx` | starts listening on supported; unsupported without gAPI; no-speech → rebuild → idle after **budget** | silence-reconnect logic + `MAX_RECONNECTS` |
| `workshop-routes.test.tsx` | `#/workshop/*` → `/workshop` normalization; bare hash → hub; unknown sub-route → hub fallback; contrast tab mounts; hub powers render | every workshop tab is reachable only through the guarded parent |
| `features/sandbox/__tests__/persistence.test.ts` | `computePersistDelta` writes every new in-memory row and deletes nothing extra | idempotent IndexedDB reconciliation |
| `features/sandbox/__tests__/threadList.test.ts` | title derives from first user message (filler-strip, 32 char cap); relative time buckets; grouping | thread metadata derived from content |
| `features/sandbox/__tests__/visualDiff.ts` | normalizeDom is stable across attribute order/whitespace; repairLoop resolves each issue one at a time | diff verdicts + targeted repair |
| `features/sandbox/__tests__/pipeline.test.ts` | contract checks (hex/rgba/inline-style/emoji-btn/blur-overflow/glass-overuse/unlabelled/icon-btn), rubric buckets, repair loop | every generated artifact passes the P31 contract |

## Conventions

- **Wrap store writes in `act()`.** `useQpjStore.getState().setSpoons(0)` read-back
  of DOM mirrors is stale unless wrapped — effects flush only inside `act`.
- **Fake voice engine** (`voice-health.test.tsx`): class under `window.SpeechRecognition`
  firing `onstart → onerror('no-speech') → onend` **synchronously**, event list per
  instance with a shared index. Call `window.cancelAnimationFrame`-free cleanup; use
  `window.setTimeout` real timers + `waitFor`.
- **Assert stable states only.** Transient `listening` blips are unobservable with a
  sync fake (the whole no-speech cycle completes inside one `start()` call). Assert
  `reconnecting` → `idle`.
- **Deterministic presence**: `useSimulatedPresence` PRNG is seeded by
  `passportId:room` — tests rely on that; never introduce `Date.now()`-seeded behavior
  into presence.
- **Persist isolation**: each test file resets `localStorage` (`qpj:store`) in `beforeEach`
  so cross-file hydration doesn't leak state.
- **One render per workspace assertion**: `cleanup()` between renders or `getByRole`
  trips on duplicate mounts of the same WorkshopPage.
- **No ad-hoc external formatters.** `pnpm lint` is the single source of
  truth for style. Running `npx prettier` against source files outside the
  project's config breaks the quote/style convention and muddies surface
  commits — fix formatting only via the lint config.

## a11y

Two Playwright specs run per route (#/entry through #/worker) against the
**production build** (`dist/`, served by `pnpm preview`). The gate includes
`pnpm build` so `dist/` is current before tests.

| File | Engine | Target |
|---|---|---|
| `e2e/a11y.spec.ts` | axe-core (via @axe-core/playwright) | dist/ |
| `e2e/a11y-ibm.spec.ts` | IBM Equal Access (accessibility-checker) | dist/ |
| `e2e/contrast.mjs` | WCAG 2.x + APCA (apca-w3) | Manual: `node e2e/contrast.mjs` |

Both specs share the same target (dist/). Dev server (5193) is used by other
e2e specs (entry-gate, talk-nudge, persona-switch) but not by a11y specs.

### Build-script allowlist

`pnpm-workspace.yaml` `allowBuilds` controls which packages may run
postinstall scripts during `pnpm install`. Current state:

- `accessibility-checker: false` — postinstall is `ibmtelemetry` (IBM usage
  telemetry). Denied: the checker works without it (verified by running
  `e2e/a11y-ibm.spec.ts` with this setting). If the checker errors on run,
  revisit; it won't.
- `chromedriver: false`, `puppeteer: false` — transitive deps of
  accessibility-checker; not needed (IBM checker uses its own engine;
  Playwright handles browser for the spec).
- `esbuild: true` — required for Vite builds.
- `sharp: true`, `workerd: true` — required by other dependencies.
- `@sentry/cli: true` — required for Sentry upload during build.

### IBM spec baseline

`e2e/a11y-ibm-baseline.json` is a curated snapshot of IBM findings per route.
Each rule is dispositioned as `accepted` (reasoning provided) or `needs-fix`
(reasoning provided). The spec fails on any rule count increase (new findings)
or partial scan (total < 50% of baseline). Baseline updates require review —
update the classification, not just the count.