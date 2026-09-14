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
