<!-- P31-HEADER
id: p31ca_topbar_led_20261014_v1.0
type: fix-plan
component: shell topbar + LED mode registry (Lane 2, runbook §8)
status: resolved
retention: keep-forever
created: 2026-10-14T00:00:00Z
owner: will
-->

# Fix-Plan — professional-clean topbar + LED mode registry (Lane 2, runbook §8)

**Discovered by:** agent:subagent:lane2-topbar-led (Phase 3 + ops wave; resolves the
two owner-decision items filed in `shell-env-repairs-2026-10-13.md` §4.3 ledModes
options a/b/c and §8.2 Topbar restore-vs-redesign).
**Discovered at:** 2026-10-14T00:00:00Z
**Severity:** high — shell build undeployable (Topbar resolution), 4 ledModes
tests failing, no single LED mode registry.

**Scope honored:** `shell/**`, `packages/shell-chrome/**` (additive), this plan.
No apps/portals/workers/design-core/canon edits. No files deleted. No installs.

## 1. LED mode registry — RESOLVED (ledModes options a/b/c → one registry)

**Decision:** option (b) shape — the registry lives in shell-chrome, the place
both consumers already import from (`ledModes.test.ts:2` and
`SpaceshipEarth.tsx:10` import `LedSource` from `@p31ca/shell-chrome`). Pure data
+ one pure function, zero new deps. The test's parity assertion locks the map to
the NeoPixelFrame shader indices forever (that is the test's purpose).

- `packages/shell-chrome/src/ledModes.ts` — the ONE registry:
  - `LED_MODES` `:24` — `['rainbow', 'pulse', 'solid', 'off']` (the four
    professional-clean UI modes per runbook §8). `pulse` drives the dome's
    breath waveform (shader index 3) via the `UI_MODE_SHADER` binding `:38`.
  - `LED_MODE_MAP` `:27` — the 7-mode shader index map, parity-locked to
    `packages/spaceship-earth/src/cockpit/NeoPixelFrame.tsx:14` by the shell's
    ledModes test (exact `toEqual`).
  - `LedSource` `:51` / `LedUniforms` / `LedMode` types; `ledUniformsFor(source,
    frozen)` `:73` — NeoPixelFrame-uniform math (speed/10, brightness/100,
    palette `?? '#ff9944'/'#22d3ee'`, frozen flag).
- `packages/shell-chrome/src/index.ts:2` — additive `export * from './ledModes';`
  (the export the shell's test and `SpaceshipEarth.tsx` always expected).
- **ledModes.test.ts verdict: 4/4 PASS** (was 4/4 FAIL — `TypeError:
  ledUniformsFor is not a function` + missing imports). Assertions untouched.
- Filed (owner): `NeoPixelFrame.tsx:14` still carries its own private
  `LED_MODE_MAP` and `shell/src/store/useLedStore.ts:10` its own 7-mode
  `LED_MODES` — unifying those into the registry is a spaceship-earth edit +
  store-migration beyond this lane's additive-export allowance. The parity test
  pins the map so drift is caught at every shell vitest run.
- Note: `ledModes.ts` carries the shader fallback palette literals
  (`#ff9944`/`#22d3ee`) — data constants mirroring the shader's own `??`
  fallbacks, not styling (same class as the existing hex in
  `shell/src/store/useLedStore.ts`).

## 2. Topbar contract — RESOLVED (restore-vs-redesign → redesign per §8)

**Decision:** fix-plan §8.2 option (b) — the shell Topbar composition is rebuilt
against the REAL canon topbar, `@p31ca/design-core/compositions` `Topbar` (the
slot model already consumed by portals/workspace + portals/mcp-marketplace).
No Topbar was fabricated into ui/chrome (the historical export is gone; ui/chrome's
AppNav/SiteNav are Tailwind-class hub components the shell's token CSS cannot
consume). The shell supplies geometry only (Seven Laws §1); canon owns appearance.

- `shell/src/components/Topbar.tsx` — the ONE professional-clean composition:
  - `:4` imports `Topbar as CanonTopbar` + `SpoonDial` from
    `@p31ca/design-core/compositions` (imports that previously pointed at the
    non-existent `@p31ca/ui/chrome` Topbar/TopbarNavItem are gone).
  - `:29` `PRIMARY_NAV_KEYS` — 5 primary items (home · bonding · dashboard ·
    sandbox · cockpit; 3–7 per contract). The other 5 NAV_ITEMS fold into the
    more menu.
  - Action icons: 3 (🔔 notifications, ⌘K palette, ⋯ more) ≤ 5 ✓. Secondary
    actions (undo, install app, pending-outbox status) + secondary destinations
    collapse into the more menu (aria-haspopup/expanded/controls, Escape +
    outside-click close).
  - `:321-322` renders `CanonTopbar glass={false}` with slots: `brand` (Ⓟ31
    wordmark → home), `center` (primary nav), `statusCluster` (LOVE balance +
    peers + DID metric badges), `trailing` (SpoonDial + 3 icons), `identity`
    (device-DID chip / Sign In — identity fenced from utility per the canon
    slot contract).
  - Persistence: rendered once in the persistent `.shell` wrapper div
    (`App.tsx:156`), never re-mounted per tab — the wrapper-div (never-on-island)
    requirement; the more-menu listeners live for the component's lifetime.
- `shell/src/index.css`:
  - `:4` `@import "@p31ca/design-core/css/recipes.css"` — restores the canon
    recipe layer the shell's existing CSS was written against (`.topbar` pill,
    `.metric-badge`, `.status-dot`, `.spoon-dial/.spoon-btn`; the shell's own
    responsive overrides at 768/640/480px reference those recipe classes and
    were previously unstyled).
  - `:261` `html { scroll-padding-top: var(--p31-header-height); }` — the §8
    sticky-anchor contract.
  - `:1070-1188` shell-owned GEOMETRY only: `.topbar { overflow: visible }`
    (the more-menu dropdown must escape the pill recipe's clip; overflow is a
    shell-owned property per Law 1), `.topbar--sticky { position: sticky;
    top: 0 }`, slot geometry (`.topbar__brand/__spacer/__center/__status/
    __trailing/__identity`), `.topbar-nav/.topbar-nav-item`, the more-menu
    panel, and responsive collapse (status hides ≤900px, nav icons ≤900px,
    dial ≤768px, nav wraps ≤640px).
- Not applicable to the shell SPA (hub-side contract items): `data-align` is the
  hub PageHeader contract; the ClientRouter island-persist teardown pattern is
  the hub's CanonTopbar concern — the shell topbar never unmounts, so no
  detached-island listener teardown is needed.

## 3. tsc / vitest / build — before and after

- **`tsc --noEmit` before:** 24 error lines. In-lane: Topbar ×2 (ui/chrome) +
  TopbarNavItem implicit-any cascade, ledModes ×3 (shell-chrome), SpaceshipEarth
  LedSource. Out-of-lane: StarfieldField ×2 three-skew, SiteNav Crown, ui/pqc
  keygen, RestOverlay DomeGeometry, SpaceshipEarth rollback ×9, domePose.
- **`tsc --noEmit` after:** 13 error lines, all pre-existing/out-of-scope:
  StarfieldField ×2 (three-version skew), RestOverlay DomeGeometry,
  SpaceshipEarth ×8 (DomeGeometry/sourceToNode/domeState/DomeMode/SurfaceMode +
  4 implicit-any cascades), domePose — the shell-chrome rollback class (filed,
  §4). The SiteNav Crown + ui/pqc errors dropped out of the shell program as a
  side effect of the Topbar re-point (shell no longer typechecks ui/chrome's
  index). design-core/compositions typechecks clean through the shell program.
- **`vitest run` before:** 17 files / 148 tests / **144 passed, 4 failed**
  (ledModes only).
- **`vitest run` after:** 17 files / 148 tests / **148 passed** (ledModes 4/4).
  One cold-cache run hit the documented cognitiveGate 5,000 ms transformers
  flake (4 timeouts; "do not chase" per shell/AGENTS.md Known Flakes); warm
  rerun of that file is 5/5 in 1.9 s — same environmental class as the prior
  fix-plan §4.2.
- **`vite build` before:** failed at `src/components/Topbar.tsx:10` — `"Topbar"
  is not exported by ../packages/ui/src/chrome/index.ts`.
- **`vite build` after:** **passes the Topbar resolution** — 2,781 modules
  transformed (design-core compositions + recipes.css bundling clean). Next
  blocker, exactly as predicted in the prior plan: `src/components/RestOverlay.tsx:6`
  — `"DomeGeometry" is not exported by @p31ca/shell-chrome` (the rollback
  class). Filed, not chased (§4).

## 4. What remains (filed, not chased)

- **shell-chrome rollback class (build-blocking, next):** DomeGeometry,
  sourceToNode, domeState, DomeMode, SurfaceMode (`SpaceshipEarth.tsx:9`,
  `RestOverlay.tsx:6`), domePose (`lib/domePose.ts:5`) — implementations are
  gone repo-wide; no symbol to re-export anywhere (prior plan §8.2). Owner
  decision: restore or re-implement in the shell.
- three-version skew (`spaceship-earth` 0.172 vs shell 0.185 override) — the 2
  StarfieldField tsc errors, unchanged.
- LED single-source unification (§1): NeoPixelFrame private map + useLedStore
  7-mode list → the shell-chrome registry.
- Durable shell-workspace `pnpm install` (hand-made @p31ca links incl. canon).

## 5. Evidence index

- `grep -n "LED_MODES\|LED_MODE_MAP\|ledUniformsFor" packages/shell-chrome/src/ledModes.ts` — :24/:27/:73.
- `./node_modules/.bin/vitest run src/features/ship/__tests__/ledModes.test.ts` — 4/4 pass.
- `./node_modules/.bin/vitest run` — 17 files / 148 tests / 148 passed.
- `./node_modules/.bin/tsc --noEmit` — 13 residual lines, all rollback/skew class.
- `./node_modules/.bin/vite build` — Topbar resolved; fails only at RestOverlay DomeGeometry.
- `grep -Eo "#[0-9a-fA-F]{6}" shell/src/components/Topbar.tsx` — 0 hits.

<!-- P31-FOOTER
checksum: pending
related: shell-env-repairs-2026-10-13.md
audit_chain: pending
-->