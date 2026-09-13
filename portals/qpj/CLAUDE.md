# CLAUDE.md — QPJ working notes

Companion to `AGENTS.md`; the terse operational layer for long sessions.

## Session memory

- Convergence target: QPJ ("Lantern") at `production/portals/qpj/`. Old portals stay
  as substrate but the source of truth moves here.
- Every new state field is a decision: persist (comet-level) vs session (vessel-level).
  `partialize` in `useQpjStore.ts` is the single authority for what survives reload.
- Determinism reminder: `useSimulatedPresence` seeds a PRNG from passport+room — never
  add non-deterministic time-based presence or tests break.
- xstate + `@xstate/react` are the only state-machine deps. Store is zustand.

## Pitfalls observed (real bugs, not hypotheticals)

- **`pnpm install` silent no-op**: caused by the `/home/p31` root workspace. Fix: portal
  needs its own `pnpm-workspace.yaml`. Verify with `v:gate` (or `ls node_modules/.pnpm`).
- **Vendored tarball keyed by path**: `.pnpm` store entries embed the `file:` spec path.
  Bumping versions requires re-install; "Already up to date" is a lie if the pack was
  resolved from an old path. Fix: `rm -rf node_modules pnpm-lock.yaml && pnpm install`.
- **v:gate hardcoded 2.2.0 was stale**: canonical is now `@p31/design-core@2.3.0`
  (`tools/portal-vendor-sync/v-gate.mjs`). chat/qpj/design/template all pass.
- **Web Speech health race**: never `setHealth('listening')` after `rec.start()` —
  a synchronous engine fires `onerror`→`onend` (rebuild path) before `start()` returns
  and the trailing set wins. Health is owned by `onstart`/events, not by call sites.
- **Sync-fake tests can't observe transient health**: with a sync fake, `listening`
  blips are unobservable — assert the stable states (`reconnecting`, `idle`).
- **Store updates outside `act()`**: wrap `useQpjStore.getState().setX` in `act()` in
  tests or the DOM effect (e.g. dataset mirrors) is stale at read time.

## Docs map

`docs/01-ARCHITECTURE.md` (layout/design intent) · `02-STATE.md` (store+machine) ·
`03-VOICE.md` · `04-MODES.md` (progressive disclosure) · `05-ROUTING.md` ·
`06-DESIGN-SYSTEM.md` (tokens/no-hex) · `07-TESTING.md` (matrix + fake-voice) ·
`08-DEPLOYMENT.md` (deploy-unified + prod domain `qpj.p31ca.org`).

## Phase 2 executed (this session)

- **Studio shipped into `/workshop`** (no `/talk`): `src/pages/workshop/Studio.tsx` —
  the chat `features/sandbox` AI artifact studio, re-hosted behind the PIN-gated
  workshop tab at `#/workshop/studio`. All four env-config prereqs were met in-place:
  (1) worker endpoints live in `src/lib/workers.ts` (VITE_SANDBOX_* env overrides,
  defaults to the `*.trimtab-signal.workers.dev` + chat-sandbox endpoints; `/api/generate`
  same-origin stream target configurable via VITE_SANDBOX_STREAM_URL); (2) chat's
  `useAppStore.showToast` is replaced by a one-way shim at `src/store/useAppStore.ts`
  that proxies to `useQpjStore` (ArtifactPane untouched); (3) IndexedDB `p31-sandbox` →
  `qpj-sandbox`, localStorage `p31-chat-sidebar-width` → `qpj-chat-sidebar-width`,
  split key `p31-sandbox-split` → `qpj-sandbox-split`; (4) `@tanstack/react-virtual` +
  `dompurify` added to qpj deps. `generateAssistantResponse` prefers the configured
  stream target and falls back to `localCompose` (token-faithful HTML artifacts built
  in-browser, LAN/offline friendly). The studio runs in a fixed-height zone with an
  artifact overlay on narrow screens. Lint + gate clean; the 4 inherited sandbox test
  suites (66 tests) come along.
- **Workbench absorbed into `/workshop`** (Option 4): `src/pages/workshop/` —
  `WorkshopPage` (tabs hub) + `TokenExplorer`, `RecipeBrowser`, `ComponentCatalog`,
  `Playground` (Intent DSL → Opus gates, in-browser), `Brands` (resolveBrandTokens),
  a fresh `ApcaChecker` (`apca.ts`, pure APCA 0.98G math), and the new Studio tab.
  All browser-safe subpath imports; zero new deps beyond the studio ones; token-only
  `workshop.css` + carved `studio.css` (sandbox styles from the chat portal, 2.0k lines).
- **`/workshop` now requires `workshop` mode** (routes.ts + App ModeGuard) — the
  builder home is PIN-gated, up from `maker`. Sub-routes `#/workshop/{tab}` normalize
  to `/workshop` in `hashToPath`/`routeForPath` so the guard wraps them.
- **`scripts/emit-route-list.mjs` now derives `public/routes.json` from
  `src/lib/routes.ts`** (was a hardcoded mirror that had drifted) — keep `routes.ts`
  the single route authority.

## Open follow-ups

- **Bind `qpj.p31ca.org`** on the `p31-portal-qpj` Pages project (deployed at `https://f3c10a21.p31-portal-qpj.pages.dev`). Must be done in the Cloudflare dashboard — `wrangler pages domains create` returned "invalid TLD" for this internal domain; the dashboard binds it against the account's `p31ca.org` zone.
- **Smoke the studio** in a real browser (`pnpm preview` → `#/workshop/studio`; exercise the chat and artisan tabs with the offline composer if the generator is unreachable).
