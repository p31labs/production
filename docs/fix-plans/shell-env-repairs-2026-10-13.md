<!-- P31-HEADER
id: p31_fix_plan_shell_env_repairs_20261013_v1.0
type: fix-plan
component: shell build environment (node_modules links, vitest config, sharp) + packages/ui chrome Footer
status: open
retention: keep-forever
created: 2026-10-13T00:00:00Z
owner: will
-->

# fix-plan: shell environment repairs — @p31ca links, vitest include, sharp, Footer copy

**Discovered by:** agent:subagent:env-repair (Lane B of the Content + H4-tooling
wave; Lane A owns the hub sweep).
**Discovered at:** 2026-10-13T00:00:00Z
**Severity:** high — shell build undeployable (missing package links), vitest
crawling .pnpm (29-min runs), 3 shell-own test failures, stale nonprofit copy
shipping in the shared chrome Footer.

## 1. @p31ca link gaps — root cause

`shell/package.json` declares 12 `link:` deps (ble, design-core, economy,
love-ledger, quantum-core, rules, shared, shared-identity, shell-chrome,
sovereign-core, spaceship-earth, ui). `shell/node_modules/@p31ca/` had only
the first 8 as symlinks; shell-chrome, sovereign-core, spaceship-earth, ui
were missing — the exact 4 that follow the first 8 in both the lockfile
importer order and alphabetically.

Investigation (no postinstall script in root or shell package.json, no pruner
anywhere — grep across `scripts/` and `tools/` found zero code touching
`shell/node_modules`):

1. **shell is not in the root pnpm workspace.** Root `pnpm-workspace.yaml`
   globs `packages/*`, `apps/*`, `workers/*`, `tools/*` only. Repo-root
   `pnpm install` never materializes shell's `link:` deps — ever.
2. **shell's node_modules metadata has no @p31ca entries.**
   `shell/node_modules/.modules.yaml` (written 2026-09-07, 78,899 bytes)
   contains zero `@p31ca` keys: the last install that materialized shell's
   tree predated the link deps and no install has run in shell since. The
   links that ever existed were hand-made.
3. **Lockfile ↔ package.json specifier drift.** `shell/pnpm-lock.yaml`
   (mtime 2026-10-09 15:06) records all 12 as
   `link:../../production/packages/<name>` — the declared specifiers from an
   older machine layout — while package.json now declares
   `link:../packages/<name>` (both resolve to `/home/p31/production/packages`
   from `/home/p31/production/shell`). The lockfile was rewritten Oct 9
   without re-materializing node_modules (`.modules.yaml` stayed Sep 7) —
   consistent with a lockfile-only operation. No routine install reconciles
   the gap.
4. **The prior repair was partial.** The 8 existing symlinks all carry
   mtime 2026-10-13 08:50 and stop exactly at `shared-identity` — the repair
   (STATE.md: "shell @p31ca link: symlinks re-materialized") enumerated the
   first 8 names and stopped. Nothing in the repo re-derives this list
   deterministically, so each repair is manual and truncation-prone.

Conclusion: the links do not "vanish" — they were never pnpm-managed, and
hand-repairs are lossy. Recurrence stops only when a shell-workspace-only
`pnpm install` (shell's own lockfile) runs so pnpm owns the links, or a
deterministic relink script is added to the repo.

## 2. Repairs performed (this lane)

- **4 symlinks re-created by hand** (mirroring the existing 8, target
  verified as real dirs with matching package `name` fields):
  `shell/node_modules/@p31ca/{shell-chrome,sovereign-core,spaceship-earth,ui}`
  → `../../../packages/<name>`, 2026-10-13 11:01. `ls -la` shows all 12 now.
- **Vitest include filter** — `shell/vitest.config.ts:10` adds
  `include: ['src/**/*.test.{ts,tsx}']` (environment/setupFiles/exclude
  unchanged). Shell has 17 own test files; the crawl of `.pnpm` dependency
  suites is gone.
- **sharp allowBuilds placeholder fixed** — `shell/pnpm-workspace.yaml`
  had the literal string `sharp: set this to true or false` (automation
  wrote pnpm's interactive prompt text into the config instead of a
  boolean). Set to `sharp: true`. The same placeholder garbage remains for
  `node-datachannel` and `protobufjs` — left untouched (enabling those
  builds is a policy call; filed below).
- **sharp rebuilt within the shell workspace** —
  `pnpm rebuild sharp` (shell dir, own lockfile — NOT a repo-root install;
  lockfile untouched, mtime still 2026-10-09 15:06). sharp@0.32.6 (a hard
  dep of @xenova/transformers@2.17.2 → `src/lib/embeddingService.ts`)
  fetched libvips 8.14.5 + prebuilt binding; `node -e "require('sharp')"`
  now succeeds.
- **chrome Footer copy** — `packages/ui/src/chrome/Footer.tsx:22,57` (see §5).

## 3. Build / tsc — before and after

- **`vite build` before:** Rollup resolve failure of `@p31ca/shell-chrome`
  from `src/main.tsx:5` (h4-collapse plan evidence).
- **`vite build` after:** module resolution for all four links succeeds;
  build now advances into the CSS pipeline and fails at
  `src/index.css:1` — `[postcss] Missing "./css/tokens.css" specifier in
  "@p31ca/design-core"`. Pre-existing gap, newly exposed: design-core's
  exports map (packages/design-core/package.json:9–57) has no
  `./css/tokens.css` (tokens.css was deleted in the SSOT Path A flip; the
  real files live at `packages/canon/dist/tokens.css` and
  `packages/canon/baseline/design-core-css/tokens.css`). Fix belongs to
  shell/src/index.css (re-point the import) or design-core/canon exports —
  both outside this lane's allowed file set. **Filed: build still red on
  this; needs the next lane.**
- **`tsc --noEmit` before:** module-not-found for all four missing links,
  masking everything downstream.
- **`tsc --noEmit` after:** zero module-not-found errors for the four
  links. Remaining errors are pre-existing API drift, all outside this
  lane's allowed set:
  - shell/src ↔ `@p31ca/shell-chrome`: `shell-chrome` exports only `.` and
    `./stores` (`export * from './stores'` — theme store only), but
    `src/App.tsx`, `RestOverlay.tsx`, `PassportTab.tsx`,
    `SpaceshipEarth.tsx`, `ledModes.test.ts` import StarfieldBackground,
    StarfieldField, DomeGeometry, sourceToNode, domeState, DomeMode,
    SurfaceMode, LedSource, LED_MODE_MAP, ledUniformsFor, ThemeId, AgeTier
    — none exist. The shell↔shell-chrome contract has drifted wholesale.
  - `@p31ca/ui/chrome`: no Topbar/TopbarNavItem exports (`Topbar.tsx:10–11`);
    `qrcode` toCanvas types (ui/src/passport/QRDisplay.tsx:15).
  - shell-own: `ThemeState` missing setTheme/age (RightSystemHUD, PassportTab,
    useUndoHistory); `CognitivePassport` missing `validFrom`
    (pqc-eudi.test.ts:20 — runtime passes, type still red); SiteNav Crown
    `size` prop.
  These need a shell↔packages contract-repair lane (or the tree's
  pre-existing shell-chrome rollback). None reference the h4 work.

## 4. Vitest — before and after (clean verdict)

- **Before** (h4-collapse evidence): no include filter → 2,174 test files,
  7,607 tests, 23 failed / 7,584 passed, 1,504 file-level failures, ~29 min;
  shell-own failures: pqc-eudi (valid:false), cognitiveGate (sharp
  collection), ledModes (shell-chrome collection).
- **After** (include filter + links + sharp rebuild), full
  `./node_modules/.bin/vitest run`:
  **Test Files 16 passed | 1 failed (17); Tests 144 passed | 4 failed
  (148); duration 123.66 s.** The only failing file is ledModes (below).
  No weakening of any assertion was done or proposed.

### Failure dispositions

1. **pqc-eudi "builds a structurally valid EUDI VC" — RESOLVED by the link
   repair (mechanical).** `src/__tests__/pqc-eudi.test.ts` now runs 25/25
   pass; the `valid:false` result was the graceful-degradation path of the
   validate chain when its `@p31ca/sovereign-core` / `shared-identity`
   imports could not resolve. Residual tsc error at :20 (`validFrom` not in
   `CognitivePassport`) is a separate pre-existing type-contract gap —
   filed with the shell↔packages drift above, not touched.
2. **cognitiveGate collection failure — RESOLVED mechanically (sharp).**
   Root cause was the literal-string allowBuilds placeholder suppressing
   sharp's install script → no `sharp-linux-x64.node` for sharp@0.32.6 (hard
   dep of @xenova/transformers via `src/lib/embeddingService.ts:1`).
   Rebuild landed the binding; the file now runs 5/5 pass. Note: the first
   post-repair run hit two 5,000 ms test timeouts while
   `Xenova/all-MiniLM-L6-v2` cold-downloaded from HF; warm-cache rerun is
   5/5 in 1.1 s. Same environmental-flake class as the documented Known
   Flakes in shell/AGENTS.md ("do not chase"); if it keeps biting CI,
   raising `testTimeout` for this file is an owner call.
3. **ledModes — NOT fixable in this lane; owner decision filed.**
   Link repair cleared the collection failure, but the imports were always
   wrong: `LED_MODE_MAP` is a module-private const in
   `packages/spaceship-earth/src/cockpit/NeoPixelFrame.tsx:14` (not
   exported), `ledUniformsFor` does not exist anywhere in `packages/` or
   `apps/` (repo-wide grep, node_modules excluded), and
   `@p31ca/shell-chrome` never exported either. Options for the owner:
   (a) export LED_MODE_MAP + a real `ledUniformsFor` from spaceship-earth
   (add `./src/cockpit/*` to its exports map) and re-point the test import;
   (b) restore LED/starfield/dome helpers to shell-chrome (their historical
   home per the test + `SpaceshipEarth.tsx`); or (c) if the helpers were
   intentionally removed, rewrite the test against the current
   NeoPixelFrame shader constants. Assertions left intact.

## 5. chrome Footer copy — disposition

`packages/ui/src/chrome/Footer.tsx` said "501(c)(3) application pending"
(twice: :22, :57). Ground truth is **determined**, not pending:

- `docs/STATE_OF_THE_YARD.md:46` — "501(c)(3): DETERMINED (May 4, 2026)".
- `docs/IMMEDIATE_ACTIONS.md:9`, `docs/LEGAL-COUNSEL-ENGAGEMENT.md:17`,
  `docs/OPEN_COLLECTIVE.md:7` — determination confirmed 2026-09-23.
- Hub surfaces (the phrasing the hub already uses):
  `apps/p31ca/src/components/SharedFooter.astro:13` — "501(c)(3) confirmed
  (IRS determination 2026-09-23)"; `terms.astro:26`, `financials.astro:24`,
  `annual-report.astro:24` — determination granted, effective 2026-04-03.

**Fix applied (copy only, zero layout/style change):** :22 →
"Georgia Nonprofit Corporation. 501(c)(3) confirmed (IRS determination
2026-09-23)." and :57 → "… EIN 42-1888158 · 501(c)(3) confirmed" — an exact
mirror of the hub's own SharedFooter phrasing. `grep` confirms no
"pending" remains in packages/ui/src (only the two strings existed).

**Filed for the owner:** the repo carries three distinct dates for one
determination — exemption effective 2026-04-03 (hub terms/financials/
annual-report), determination letter 2026-09-23 (SharedFooter + IMMEDIATE_ACTIONS/
LEGAL-COUNSEL/OPEN_COLLECTIVE), and "May 4, 2026" (STATE_OF_THE_YARD:46,
CWP-PHOS-GEMINI_UX.md:314). The first two are reconcilable (effective vs
letter-issued); the May 4 figure needs one owner check so all surfaces
converge.

## 6. Additional filings (no fix applied)

- **shell/pnpm-workspace.yaml** still carries literal prompt text for
  `node-datachannel` and `protobufjs` in allowBuilds ("set this to true or
  false"). Policy call to enable; left as-is. This class of bug (automation
  writing pnpm's prompt string into config) is likely what suppressed
  sharp's build.
- **`shell/package.json` `pnpm.overrides` block is dead**: pnpm 10.32
  warns it ignores the `pnpm` field; the live overrides live in
  shell/pnpm-workspace.yaml (three/@types). Harmless duplication — tidy-up
  candidate.
- **shell lockfile specifier drift** (§1.3): a shell-workspace-only
  `pnpm install` (shell's own lockfile, offline/cache mode) would let pnpm
  own all 12 links + refresh specifiers. Recommended as the durable fix;
  NOT run this lane (rule: no repo-root install; hand links verified
  sufficient).
- **shell/src ↔ packages API drift** (§3) — the tsc-red surface beyond
  the four links: shell-chrome missing exports, ui/chrome Topbar,
  ThemeState, CognitivePassport.validFrom, qrcode types. Needs a dedicated
  contract-repair lane; do not hand-wave these to green.

## 7. Evidence index

- `ls -la shell/node_modules/@p31ca/` — 12 links, 8 at 08:50 + 4 at 11:01.
- `./node_modules/.bin/vite build` — passes all @p31ca module resolution;
  fails only at postcss tokens.css (index.css:1).
- `./node_modules/.bin/tsc --noEmit` — no module-not-found for the links.
- `./node_modules/.bin/vitest run` — 17 files / 148 tests / 144 pass / 4
  fail (ledModes only), 123.66 s.
- `node -e "require('sharp')"` in shell — succeeds (binding 0.33.5,
  libvips 8.14.5).
- `grep -rn "pending" packages/ui/src/chrome/Footer.tsx` — 0 hits.

## 8. Contract-repair lane (2026-10-13, second pass) — REPAIRS APPLIED

This section records the shell↔packages contract-repair lane that §3 filed
as "needs the next lane". Scope honored: only `shell/src/**`, one additive
export in `packages/spaceship-earth/package.json`, the dead-overrides
removal in `shell/package.json`, and this plan. No apps/workers/portals/
design-core/canon edits. No files deleted. No installs run.

### 8.1 tokens.css + chrome.css re-points (build CSS pipeline — RESOLVED)

- `shell/src/index.css:1` — `@import "@p31ca/design-core/css/tokens.css"`
  (deleted in the SSOT flip) → `@import "@p31ca/canon/tokens.css"` — the
  exports-map specifier (packages/canon/package.json `"./tokens.css"`).
- `shell/src/index.css:5` — `@import "@p31ca/shell-chrome/chrome.css"` →
  `@import "@p31ca/design-core/css/chrome.css"`. shell-chrome ships NO css
  at all (rollback left only `src/stores/*`); the `.starfield-bg` rules the
  shell consumes live in design-core (`src/css/chrome.css:288`), so the
  re-point lands on the existing file. Lines 2–3 (design-core
  a2ui-datacard.css / container.css) were verified live (exports map +
  files exist) and left unchanged.
- **Environment repair:** hand-created
  `shell/node_modules/@p31ca/canon → ../../../packages/canon` (mirrors the
  12 existing links; lockfile untouched; no install). `vite build` now
  resolves all five CSS imports and transforms 2,870 modules — the CSS
  pipeline is GREEN end-to-end.
- **Filed:** `shell/package.json` does not declare `@p31ca/canon` (zero
  canon refs in shell/pnpm-lock.yaml), so the link is hand-made and
  unmanaged — same recurrence class as the 12 links. Adding the dep is a
  package.json change outside this lane's scope; it rides the durable
  shell-workspace-install decision (§6).

### 8.2 API drift — per symbol disposition

**Fixed (re-point to where the symbol actually lives):**

- `StarfieldBackground` — `shell/src/App.tsx:22` now imports the existing
  shell-local component `./components/StarfieldBackground` (default
  export, reads spoons/reduceMotion from stores). Call site
  `App.tsx:158` updated to the real prop-less API; the 11 phantom props
  (urgent/pulseAt/starDensity/starSpeed/warmStars/domeAccent/cometTrails/
  aurora/quantum) and their now-dead selector lines (lastNotifPulse,
  unreadCount, reduceMotion, effects) removed. The jitterbug engine never
  consumed those props — zero runtime change.
- `StarfieldField` — `shell/src/components/RestOverlay.tsx:5` now imports
  `@p31ca/spaceship-earth/src/cockpit/StarfieldField`. Additive export
  added in `packages/spaceship-earth/package.json`:
  `"./src/cockpit/StarfieldField": "./src/cockpit/StarfieldField.tsx"`
  (existing symbol only; design-core's exact-file export pattern). Props
  used (spoons/count/reduceMotion/speed/calm) all exist on the real
  component.
- `ThemeId` / `AgeTier` / `ThemeState.setTheme` / `.age` / `.setAge` — the
  real store is shell-local `src/store/useThemeStore.ts` (theme, age,
  setTheme, setAge, applyTheme, THEME_TOKENS, ThemeId, AgeTier). Re-pointed
  six consumers from `@p31ca/shell-chrome` (whose store only has
  theme/cycleTheme/syncFromDom/applyTheme and exports no ThemeId):
  `main.tsx:5`, `components/hud/RightSystemHUD.tsx:4`,
  `hooks/useUndoHistory.ts:3`, `hooks/useWebMCP.ts:19`,
  `hooks/useSensorySync.ts:3` (applyTheme pairing — must call the same
  store main.tsx writes), `features/identity-wallet/PassportTab.tsx:7`.
- `qrcode` `toCanvas` — root cause was NOT @types/qrcode (which resolves
  fine from /home/p31/node_modules and declares toCanvas) but the
  shell-local ambient shim `shell/src/types/qrcode.d.ts` shadowing the
  module with only `toDataURL`. Added the real `toCanvas` overload
  (canvasElement/text/options/callback — exact mirror of @types/qrcode)
  to the shim, additively. Clears both ui/QRDisplay.tsx:15 errors.
- `CognitivePassport.validFrom` — `shell/src/__tests__/pqc-eudi.test.ts:20`
  fixture carried phantom `validFrom`/`validUntil` fields; the real schema
  (`packages/ui/src/passport/schema.ts:60`) has neither and the VC builder
  (`eudi.ts:77`) derives both from `now`. Removed the two phantom fixture
  fields (align to real API; no assertion touched — the VC
  validFrom<validUntil check at :185 still tests the real builder).
  pqc-eudi stays 25/25.

**Left red — owner decision, no existing symbol anywhere (grep
shell/src + packages/ + apps/ + portals/, node_modules excluded):**

- `Topbar` / `TopbarNavItem` (`shell/src/components/Topbar.tsx:10–11`) —
  NOW THE BUILD BLOCKER: rollup fails `"Topbar" is not exported by
  ../packages/ui/src/chrome/index.ts` immediately after the green CSS
  pipeline. No Topbar exists in packages/ui (chrome exports AppNav,
  P31SiteHeader, SiteNav…); none of ui/chrome AppNav
  {appName,tagline,icon,spoons,setSpoons,onCompanion,navLinks},
  design-core/compositions Topbar (slot model:
  brand/center/right/statusCluster/mode/trailing/identity), ui-react
  Topbar {brand,left,center,right}, or spaceship-earth Topbar
  {onOpenPalette,undoCount,onUndo} matches the expected API
  (navItems[]·onSelect, activeKey, brandLabel, slotLeft/Center/Right,
  notificationsBadgeCount). Options: (a) restore a real Topbar+TopbarNavItem
  to ui/chrome (its historical expectation), or (b) redesign the shell
  Topbar composition against design-core's slot Topbar (visual/behavioral
  redesign — owner call, per Seven Laws compositions belong to the feature).
- `DomeGeometry` (component), `sourceToNode`, `domeState`, `DomeMode`,
  `SurfaceMode`, `LedSource` (`SpaceshipEarth.tsx:9–10`, `RestOverlay.tsx:6`)
  and `domePose` (`lib/domePose.ts:5`) — the shell-chrome rollback class:
  these implementations are GONE repo-wide (even
  `shell/src/features/ship/DomeGeometry.tsx`, referenced by
  `pocketCardData.tsx:521`, no longer exists; spaceship-earth's
  `math/domeMap.ts` `DomeGeometry` is a geometry-data interface, not the
  React component the shell expects). No existing symbol to re-export
  anywhere in the allowed packages; fabrication is off the table. Same
  options a/b/c shape as ledModes (§4.3).
- `LED_MODE_MAP`, `ledUniformsFor`, `LedSource` (`ledModes.test.ts:2`) —
  unchanged owner item (§4.3), assertions left intact.

**Pre-existing, outside this lane's allowed file set (documented, not
touched):**

- `packages/ui/src/chrome/SiteNav.tsx:138` — Crown `size` prop (Crown
  props live in design-core/generated — both out of scope).
- `packages/ui/src/passport/pqc.ts:28` — `ml_dsa65.keygen()` called with 0
  args (needs seed). NEWLY DOCUMENTED here; not in the §3 list. Real
  pre-existing bug in ui, out of scope.

**Surfaced by the StarfieldField re-point (new, honest attribution):**

- `packages/spaceship-earth/src/cockpit/StarfieldField.tsx:165` ×2 —
  three-version skew: spaceship-earth builds against its own
  three@0.172/@types/three@0.170; shell's program pins
  three@0.185.1/@types/three@0.185.4 (the workspace override), so the
  `points geometry/material` JSX fails typecheck when compiled through the
  link. Runtime unaffected (vite bundles one three; no typecheck in
  build); spaceship-earth remains green in its own workspace. Options:
  align the three versions (owner), or ship a dist for spaceship-earth.

### 8.3 tsc before/after (this lane)

- **Before:** 42 error lines — 4× module-not-found for the links already
  clear (prior lane); full drift list in §3.
- **After:** 25 error lines, 22 errors, all accounted for:
  2 StarfieldField three-skew (surfaced, §8.2), 1 SiteNav Crown +
  1 ui/pqc keygen (pre-existing, out of scope), 1 RestOverlay DomeGeometry
  + 10 SpaceshipEarth + 3 ledModes + 1 domePose (shell-chrome rollback
  class, owner), 3 Topbar (owner, build-blocking). Resolved from the
  drift list: QRDisplay ×2, App StarfieldBackground, pqc-eudi validFrom,
  RestOverlay StarfieldField, PassportTab ×5, useUndoHistory ×6,
  useWebMCP ×2, main.tsx ×2, RightSystemHUD ×1.

### 8.4 Build / vitest verdict

- **`vite build`:** CSS pipeline GREEN (all five @imports resolve;
  2,870 modules transformed). Fails only at
  `src/components/Topbar.tsx:10` — the filed Topbar item; after it, the
  same shell-chrome rollback members (DomeGeometry/sourceToNode/domeState/
  domePose) are next in rollup's path — one owner-decision class, nothing
  new.
- **`vitest run` (include-filtered, 17 files):** 144 passed / 4 failed
  (ledModes only) — IDENTICAL to the §4 verdict; pqc-eudi 25/25 with the
  fixture aligned. No new failures from this lane.

### 8.5 Placeholders + dead overrides — dispositions

- `shell/pnpm-workspace.yaml` allowBuilds `protobufjs` / `node-datachannel`
  — **REAL deps, left in place.** protobufjs: 34 lockfile references +
  @protobufjs/* subpackages present in shell/node_modules/.pnpm;
  node-datachannel@0.32.3 present in .pnpm (3 lockfile references). The
  literal-string placeholder VALUES remain a policy call (enable/disable
  the build scripts) — unchanged owner item.
- `shell/package.json` `pnpm.overrides` — **REMOVED** (dead: pnpm reads
  overrides from `shell/pnpm-workspace.yaml`, which carries the same four
  entries verbatim: @types/three 0.185.4, three 0.185.1, @types/react
  19.2.14, @types/react-dom 19.2.3). Nothing in shell depends on the
  package.json field.

## Resolution

- [x] 4 @p31ca link symlinks restored; root cause filed (never pnpm-managed;
      shell outside root workspace; partial hand-repair).
- [x] vitest include filter → suite is shell-own (17 files); verdict clean
      except ledModes (owner-decision filed).
- [x] pqc-eudi green via link repair; cognitiveGate green via sharp rebuild;
      ledModes filed for owner.
- [x] chrome Footer copy corrected to determined status (hub-mirrored).
- [x] tokens.css re-point → `@p31ca/canon/tokens.css`; shell-chrome
      chrome.css re-point → `@p31ca/design-core/css/chrome.css`; canon link
      hand-created (env repair, filed for durable install); CSS pipeline
      green.
- [x] API drift: StarfieldBackground (App.tsx local component),
      StarfieldField (spaceship-earth additive export), ThemeId/AgeTier/
      setTheme/setAge (shell-local store re-point ×6), qrcode toCanvas
      (ambient shim additive), validFrom (phantom fixture fields removed).
- [x] Dead `pnpm.overrides` removed from shell/package.json; protobufjs/
      node-datachannel verified real (entries kept).
- [ ] Owner: Topbar/TopbarNavItem — build blocker, options in §8.2.
- [ ] Owner: shell-chrome rollback class — DomeGeometry/sourceToNode/
      domeState/domePose/DomeMode/SurfaceMode/LedSource (SpaceshipEarth,
      RestOverlay, domePose.ts).
- [ ] Owner: ledModes (options a/b/c, §4.3).
- [ ] Owner: durable shell-workspace install — now also carries the
      @p31ca/canon dep decision (§8.1).
- [ ] Owner: three-version skew (spaceship-earth 0.172 vs shell 0.185.4
      override) surfaced by StarfieldField; SiteNav Crown size; ui
      pqc.ts keygen arity (§8.2).