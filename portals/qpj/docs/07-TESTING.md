# 07 — Testing

Vitest + jsdom + @testing-library. Run: `pnpm test`. **209 tests / 25 files.**

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