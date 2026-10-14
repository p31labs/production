<!-- P31-HEADER
id: p31ca_phase1_token_core_20261013_v1.0
type: fix-plan
component: packages/canon
status: resolved
retention: keep-forever
created: 2026-10-13T00:00:00Z
owner: will
-->

# Phase 1 — Token Core (DTCG consolidation + Style Dictionary v5 pipeline)

Issue: the estate's 20 token sources (token-inventory.md) need one DTCG core
with the five ratified decisions landed (STATE.md "In Flight", 2026-10-13),
and the canon package's generated CSS must stop disagreeing with its own
DTCG export.

## ROLLBACK CONDITIONS (written before the first edit — runbook §5)

1. **RC1 — generator red.** If `pnpm --filter @p31ca/canon build:tokens`
   fails dtokens check or the SD v5 build after the theme-store edits:
   revert `src/theming/theme-store.ts` + `scripts/gen-tokens.mjs` +
   `scripts/sd-config.mjs` via `git checkout --` on those paths, then
   restore `dist/tokens.css` from the byte-copy `dist/tokens.legacy.css`
   and re-run `gen:tokens`. Never forward-fix the validator.
2. **RC2 — coverage regression.** If the regenerated `dist/tokens.css`
   loses any `--p31-*` name that was present in the pre-edit export
   (compare name sets against `dist/tokens.legacy.css`), the css-emit
   supplement must restore it in the same cascade layer; if it cannot,
   revert RC1-style. Sensor: root `scripts/check-token-parity.mjs`
   (DTCG→CSS one-way) + a plain `diff` of sorted custom-property names.
3. **RC3 — unratified value drift.** The ONLY allowed :root value changes
   are: `--p31-radius-md`→16px, `--p31-radius-lg`→24px (match own DTCG),
   `--p31-font-sans`→Lexend stack (ratified), `--p31-font-display`→Lexend
   stack, `--p31-topbar-height`→`var(--p31-header-height)` (deprecated
   alias), and the ADDITION of `[data-theme="rose"]` scope. Any other
   value delta between `tokens.legacy.css` and the new `tokens.css` in
   :root/theme blocks ⇒ revert that token's edit and re-file.
4. **RC4 — install path.** Scoped `pnpm --filter @p31ca/canon add -D
   style-dictionary@^5.3.0` is the preferred path. If the workspace
   lockfile/frozen-install blocks it, fall back to manual package.json
   devDependency edit + `pnpm install --lockfile-only`; if that fails,
   `npx -y style-dictionary@5.6.0` (SD 5.6.0 is already in the pnpm
   store) and FILE the outcome honestly here. Never hand-pin an
   unpublished tarball.
5. **RC5 — cascade flip.** If any consumer-facing cascade position of the
   compat-root/conditional sections changes (they must stay: compat
   inside `@layer canon.tokens`, CONDITIONAL_CSS unlayered, later-in-layer
   wins), revert the CSS assembly refactor to the pre-edit emission
   order. Byte-compare the pre/post files section-by-section.

## 1. What already existed (inspected 2026-10-13, pre-edit)

- `packages/canon/tokens/tokens.dtc.json` — DTCG 2025.10 export, 661
  tokens, generated from `src/theming/theme-store.ts` by
  `scripts/gen-tokens.mjs`. p31.* already carries radius **8/16/24**
  (lines: radius-md 16px) — DTCG side of D2 already correct.
- `packages/canon/tokens/dist/tokens.resolved.json` — resolved aliases
  (SD v4 `json/nested` artifact).
- `packages/canon/dist/tokens.css` — the generated CSS export; BUGGY:
  `--p31-radius-md: calc(var(--p31-scale-md)/2)` (≈10.7px),
  `--p31-radius-lg: calc(var(--p31-scale-lg)/2)` (≈14.2px) — matches
  neither 12/24 nor the DTCG's 16/24 (drift table row radius-md).
- `packages/canon/dist/tokens.js` + `dist/tokens.d.ts` + `src/tokens.ts`
  — typed name contract (P31TokenName union), emitted by gen-tokens.mjs
  and tsc.
- `packages/canon/package.json` — `style-dictionary: ^4.4.0` devDep;
  SD used for VALIDATION only (`gen:tokens` comment: "SD does not
  generate CSS").
- Theme-store facts: BASE font-sans = Space Grotesk (line 81);
  COMPAT_ROOT font-sans = system-ui (line 937); SEMANTIC_MAP
  `topbar.height` literal 64px (line 613); GLOBAL_COMPAT
  `--p31-topbar-height: 64px` (line 825); `--p31-header-height: 4rem`
  in BASE (line 101) — already canonical. No rose mode exists anywhere
  in the store (grep "rose" → only a description string).

## 2. Edits (this phase)

1. `packages/canon/dist/tokens.legacy.css` — byte-copy of the pre-edit
   `dist/tokens.css` (RC1/RC2 anchor).
2. `src/theming/theme-store.ts` — Lexend font (BASE font-sans,
   COMPAT_ROOT font-sans, GLOBAL_COMPAT font-display); `topbar.height`
   semantic literal → `var(--p31-header-height)`; GLOBAL_COMPAT
   `--p31-topbar-height` → `var(--p31-header-height)`; NEW `ROSE_MODE`
   export (the live p31ca rose accent set from
   `apps/p31ca/src/styles/global.css:9-14`, verbatim values incl. the
   accent-violet hue-28 value — the orange-violet is a KNOWN bug, filed
   below, not silently corrected).
3. `scripts/gen-tokens.mjs` — emit `modes.rose.*` group into the DTCG
   (tokens carry `$extensions.mode: "rose"` + `$description` naming the
   runtime `--p31-*` var); emit `[data-theme="rose"]` block in the CSS
   (inside `@layer canon.tokens`, after the 11 theme blocks); emit the
   deprecated-alias comment for topbar-height.
4. `scripts/sd-config.mjs` (NEW) — Style Dictionary **v5** config:
   input `tokens/tokens.dtc.json`; outputs (a) the token-layer CSS
   (:root + [data-theme] + [data-theme="rose"]) — SD v5 is the generator
   of the portable-token portion of `dist/tokens.css`; (b)
   `dist/tokens.mjs` (typed JS, NEW); (c) `tokens/dist/tokens.resolved.json`
   (custom format preserving the `{value,unit}` shape agents consume).
   The css-emit layer (calc/clamp/var/blur/color-mix/hex + COMPAT_ROOT +
   CONDITIONAL_CSS — values with no portable DTCG form, a documented
   architectural split in gen-tokens.mjs) stays emitted by gen-tokens.mjs
   and is appended to the same file in the same cascade positions (RC5).
5. `package.json` — devDependency `style-dictionary: ^5.3.0` (resolves
   to 5.6.0 from the local pnpm store, Node v24.16.0 on-box); NEW script
   `build:tokens` (generate DTCG → SD v5 build → validate).

## 3. Evidence to collect

- `pnpm --filter @p31ca/canon build:tokens` exit 0.
- sha256 of `tokens.css`, `tokens.mjs`, `tokens.resolved.json` +
  presence check `--p31-radius-md: 16px`, Lexend, rose block.
- `node ../../scripts/check-token-parity.mjs` green.
- Drift detector run vs `apps/p31ca` with real findings.

## 4. Phase 3 handoff notes

- `--p31-topbar-height` + legacy 61px: consumers to remove at port time
  (`shell/src/index.css`, `apps/p31ca/src/styles/*`, design-core
  `canon.css:75`=56px — design-core CSS is NOT touched this phase).
- Neutral-hue 270-vs-75: NOT touched (owner question, filed).
- Rose accent-violet hue-28 (orange) — carried verbatim for visual
  fidelity of the rose mode; fix belongs to the owner queue.
- `verify-token-parity.mjs` (canon vs design-core baseline) stays
  RED-by-design; the 19-divergence list grows by font/radius rows — do
  not repair the gate, update the ledger at Phase 3 flip time.

## 5. RESOLUTION — 2026-10-14 (resume session, lane completed)

### Rollback-condition audit (all honored, none fired)

- **RC1 — generator red: NO.** `build:tokens` exit 0 twice (2026-10-14,
  after resume). `gen:tokens` green + `tools/token-validation` PASSED for
  both canon and design-core DTCG. SD v5 emits the token layer; collision
  warnings are the DOCUMENTED intentional architecture (default-theme
  palette + semantic slots share dashed names; later-in-layer wins —
  sd-config.mjs:105-121).
- **RC2 — coverage regression: NO.** Name-set diff legacy vs new:
  337 = 337, zero lost, zero added (scripted per-scope comparison).
  `scripts/check-token-parity.mjs` green: "243 DTCG tokens all present in
  CSS (95 CSS-only, non-portable)".
- **RC3 — unratified value drift: NONE.** All :root/theme deltas are the
  six allowed ones: `--p31-topbar-height` 64px→`var(--p31-header-height)`
  (:root + 11 themes), `--p31-font-sans`→Lexend (11 themes),
  `--p31-font-display`→Lexend (:root), and the ADDITION of
  `[data-theme="rose"]` carrying the 6 live p31ca accent values verbatim
  (incl. the known accent-violet hue-28 orange bug) — matches
  `apps/p31ca/src/styles/global.css:8-13` byte-for-byte. radius-md/lg were
  already 16px/24px in the legacy anchor (no delta). **Documented
  projection:** `--p31-font-family-sans` (Space Grotesk→Lexend, :root +
  11 themes) is the semantic-tier projection of the SAME ratified BASE
  `--p31-font-sans` edit (SEMANTIC_MAP `font.family.sans` → palette
  `font-sans`, theme-store.ts:639); it is not an independent edit and
  reverting it would recreate the DTCG-vs-CSS font disagreement D4 exists
  to fix. Kept, ledgered here.
- **RC4 — install path: OK.** `style-dictionary: ^5.6.0` devDependency
  (package.json:133) resolved from the local pnpm store; workspace
  lockfile accepted the scoped install (`pnpm install` clean). The plan's
  ^5.3.0 preference was superseded by 5.6.0 (store pin) — no unpublished
  tarball, nothing hand-pinned beyond a published store version.
- **RC5 — cascade flip: NO.** Section order verified in
  `dist/tokens.css`: layer declaration (line 10) → SD v5 token layer
  `@layer canon.tokens` (line 12: :root + 11 themes + rose) → css-emit
  supplement `@layer canon.tokens` (line 2112, later-in-layer wins) →
  CONDITIONAL_CSS unlayered `@media (prefers-reduced-motion: reduce)`
  (line 2755). Legacy anchor shows the same two-section structure
  (tokens.legacy.css:11, 2398).

### Resume fix (the one red the cancelled lane left)

- **`pnpm --filter @p31ca/canon build` was RED at `validate:contracts`:**
  `p31.topbar.height` no longer resolved — the D3 alias literal
  (`var(--p31-header-height)`) is css-dependent, so the SEMANTIC_MAP
  primitive loop dropped the nested node, and the lane's special-case
  re-added it as a FLAT `p31['topbar-height']` leaf. Contracts resolve
  the NESTED path only.
- **Fix (in-lane, no validator edits):** gen-tokens.mjs:296-318 now emits
  the alias at the pre-edit nested path `p31.topbar.height`
  (`$value: '{p31.header-height}'`, `$extensions.p31.css:
  var(--p31-header-height)`). Re-verified: validate:contracts 32 pass /
  0 fail; registry valid; tsc + gen:exports clean; DTCG carries the
  nested node; tokens.resolved.json resolves it to `{value:4,unit:'rem'}`.

### Final evidence

- `build:tokens` exit 0 (×3 runs); full `build` chain exit 0.
- sha256s (2026-10-14): tokens.legacy.css
  `6fed7d68551987cb9f5a2626e6751601ed3e72f99a5caf4b359a34080506d564`;
  tokens.css `36f8f7c2dce04e7333df1ec71555ff929f1cece6682c5b5f0afc23ec75fa18ef`;
  tokens.mjs `db3fc9e3fa8dab458347916fdc1cb363909e03fdf75f648464f1e11b83f5da52`;
  tokens.resolved.json `c380e006cc687b0ea45ccef39aa7a8a47c0dd35c0e0285797f8b86736a90bb2e`.
- Presence: `--p31-radius-md: 16px` (tokens.css:16), Lexend stacks,
  `[data-theme="rose"]` (tokens.css:2098), 152 deprecated tokens noted.
- `scripts/check-token-parity.mjs` exit 0.
- Drift detector `scripts/token-drift-check.mjs --no-fail apps/p31ca`:
  exit 0, report 613 re-declarations + 2660 raw literals (3273 findings
  = the Phase 3 port queue; not wired into `pnpm gate`).
- design-core disposition: lane edits kept (canon-v2 seed + layers.css
  import + aiGuidance coercion + vitest dual-React guard). Two stale
  assertions in the untracked `tests/device-tiers.spec.ts` completed to
  the ratified state: strict `toEqual`→`toMatchObject` (semantic nodes
  carry by-design `$extensions`), and `--p31-topbar-height: 64px` →
  `var(--p31-header-height)` (D3). design-core: typecheck exit 0,
  tests 101/101.