# fix: 14 canon contracts have no component CSS in design-core/src/css

<!-- P31-HEADER
id: p31_fix_plan_contracts_missing_css_20261009_v1.0
type: fix-plan
component: packages/canon
status: open
retention: keep-forever
created: 2026-10-09T00:00:00Z
owner: will
-->

## Symptom

14 of the 26 "over-claiming" contracts have a `cssClass` that appears in **no**
file under `packages/design-core/src/css/*.css`:

CalmIndicator, CalmOverlay, CandyHeader, Checkbox, CommandTrigger, Crown,
Dropdown, Footer, MobileBottomNav, ModePill, SidebarNav, SpoonCluster,
StatusCluster, TopbarSection.

Their `tokenContract` over-claims are therefore not "inherited global" nor
"uses primitive" — the consuming CSS simply is not in the scanned directory.

## Evidence

`packages/design-core/registry.json` maps each `name` → `cssClass`; the matcher
finds no matching class in `src/css/`. The consuming styles likely live in a
portal shell (`portals/shell/`), a web-component shadow root, or are unwritten.

## Fix

Per component, locate or author the consuming CSS:
1. If it lives in a portal/shell → the canon contract's `cssClass` should point
   at the correct surface, or the CSS should be re-homed into `design-core/src/css`.
2. If it is genuinely unwritten → the contract is aspirational; mark it
   `status: 'planned'` until the CSS exists.

## Impact

- 14/26 of the over-claim adjudication is blocked on this — the tokens cannot be
  adjudicated (drop vs CSS-fix) until the CSS is found.
- Not a token-deprecation issue; it is a contract-grounding gap.