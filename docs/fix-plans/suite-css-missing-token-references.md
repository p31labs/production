<!-- P31-HEADER
id: p31_fix_plan_suite_css_missing_token_references_20261012_v1.0
type: fix-plan
component: packages/canon
status: open
retention: keep-forever
created: 2026-10-12T00:00:00Z
owner: will
-->

# fix-plan: suite.css references tokens that do not exist

**Discovered by:** agent:subagent:canon-v2 (the vessel-contract build)
**Discovered at:** 2026-10-12T00:00:00Z
**Severity:** low (invalid declarations at runtime; the affected rules fall
back to browser defaults)

## The bug

`packages/canon/src/css/suite.css` references four custom properties that are
not in the canon token vocabulary (`--p31-*` name set emitted by
`scripts/gen-tokens.mjs`):

- `var(--p31-space-4)` — lines 31, 34, 43, 53 (skip-link + .btn padding)
- `var(--p31-transition-fast)` — lines 38, 60, 149, 171
- `var(--p31-transition-normal)` — line 193
- `var(--p31-ease-quantum)` — lines 38, 60, 149, 171, 193

The `transition`/`easing` declarations therefore do not parse, and every
`transition: …` on `.skip-link` and `.btn` is dropped by the browser.

## The fix (landed with canon v2)

1. `--p31-space-4` now EXISTS — canon v2 added it additively
   (`16px`, in `BASE` in `src/theming/theme-store.ts`) because the canon v2
   layout contract depends on it (`--p31-page-pad-x`).
2. The `--p31-transition-*` / `--p31-ease-quantum` references are repointed
   to the real tokens:
   - `--p31-transition-fast` → `--p31-duration-fast`
   - `--p31-transition-normal` → `--p31-duration-base`
   - `--p31-ease-quantum` → `--p31-easing-standard`

No `p31.*` token path or value changed — only the (previously invalid)
references inside suite.css rules were repointed to existing tokens.