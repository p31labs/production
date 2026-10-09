# fix: design-core token generator emits NaN hue for achromatic colors

<!-- P31-HEADER
id: p31_fix_plan_design_core_nan_hue_20261008_v1.0
type: fix-plan
component: packages/design-core
status: open
retention: keep-forever
created: 2026-10-08T00:00:00Z
owner: will
-->

## Symptom

`packages/design-core/src/css/tokens.css` emits achromatic colors with a literal
`NaN` hue value:

```css
--p31-glass-shadow: 0 8px 32px oklch(0% 0 NaN / 0.15);
--p31-glass-bg: oklch(0% 0 0 / 0.03);
```

## Evidence

`design-core/src/css/tokens.css:98` (`--p31-glass-shadow`) and the
`[data-theme="light"]` glass block. The `NaN` appears only on achromatic colors
(chroma `0`), where hue is undefined in OKLCH.

**Post-Path-A update (2026-10-09): the bug is not only in the generator.**
`packages/design-core/src/css/tokens.css` is now deleted by the SSOT
consolidation, and canon (NaN-free) is the token source — yet the built design
portal still ships `NaN` because the defect is **hand-written in design-core's
own CSS**.

**Shipped surface (the `./css/*` exports — fixed 2026-10-09):**
- `src/css/base.css:25` (`--p31-glass-shadow`)
- `src/css/recipes.css` (12 occurrences)
- `src/css/a2ui-datacard.css` (1 occurrence)
These 14 sites are now `oklch(L 0 0 / a)`.

**Full surface (discovered 2026-10-09 — NOT yet fixed, needs triage).** The
package carries **duplicate source trees** and embedded copies that still
contain `NaN`:

| Location | Count | Exported? | Notes |
|---|---|---|---|
| `src/styles/tokens.css`, `src/styles/base.css` | 2 | **no** | dead tree; `styles/` has no export. A **second `tokens.css`** Path A did not delete. |
| `src/recipes/forms.css`, `src/recipes/recipes.css` | 6 | **no** | dead tree; `recipes/` has no export. |
| `src/themes/themes.ts`, `src/themes/theme-switcher.js` | 11 | **no** | dead tree; only `src/theming/` is exported. |
| `src/mcp/recipes-data.ts` (embedded CSS string) | 7 | transitively (via `./mcp`) | an inline copy of recipes.css — drift source. |
| `src/generator/adapters/html.ts`, `webcomponent.ts` | 4 | transitively (via `./generator/*`) | generator templates. |
| `src/generated-wc/CommandPalette.wc.js` | 1 | no | generated artifact. |
| `src/css/semantic-token-manifest.json` | 4 | no | generated manifest (raw+resolved fields). |

The `isNaN()` calls in `src/fouc-killer.js:21` and `src/agentic/learning/track.ts:26`
are **legitimate JS**, not color NaN — do not touch.

The dead trees (`styles/`, `recipes/`, `themes/`) and the embedded copy in
`recipes-data.ts` are themselves a token-drift/duplication defect — the same
"multiple hand-edited sources" failure LESSONS.md L-003 records. Their
disposition (delete vs regenerate) is dead-file/token triage (Path B/C), not a
mechanical NaN fix.

Verified: `packages/canon/dist/tokens.css` has `0` NaN occurrences.

Any conformant color parser that computes `Math.atan2(b, a)` on a zero vector
returns `NaN` — e.g. a `white-space: normal` serialization passes, but parsing
back through culori (`converter('rgb')`) rejects the `NaN` form, so the value
cannot round-trip. Verified while adjudicating the 22 token-parity divergences
during the SSOT consolidation (2026-10-08): the parity gate's color
normalizer now repairs `NaN` → `0` before parsing.

## Fix

1. **Shipped CSS (done 2026-10-09):** `src/css/base.css`, `src/css/recipes.css`,
   `src/css/a2ui-datacard.css` — `NaN` → `0` in the hue position (chroma 0).
2. **Dead trees + embedded copies (deferred to Path B/C triage):** `src/styles/`,
   `src/recipes/`, `src/themes/`, `src/mcp/recipes-data.ts`, generator adapters,
   `src/generated-wc/`, `semantic-token-manifest.json`. Decide DELETE vs
   REGENERATE vs FIX-at-source before touching — they are not exported or are
   generated.
3. **Generator** (`scripts/gen-tokens.mts` / style-dictionary): emit
   `oklch(L 0 0 / a)` rather than `oklch(L 0 NaN / a)` so the pattern cannot
   re-enter.

## Impact

- The **shipped** bundle is NaN-free in the `./css/*` layer after this fix; the
  dead trees and embedded copies still contain NaN but are not exported (except
  transitively via `./mcp` and `./generator/*`).
- Browsers tolerate NaN but parsers (culori, postcss-color-function, DTCG
  validators) reject it.
- The gate works around the token variant via `repairNaNColor()` in
  `packages/canon/scripts/verify-token-parity.mjs`; the workaround is documented
  as a source-of-truth divergence path, not a fix.
- **Broader finding:** the duplicate trees (`styles/`, `recipes/`, `themes/`) and
  the inline `recipes-data.ts` copy are a SSOT duplication defect in their own
  right — candidates for the dead-file/token triage (Path B/C), not a NaN-only
  fix.