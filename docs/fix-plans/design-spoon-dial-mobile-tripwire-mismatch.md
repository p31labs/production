# fix: design portal mobile tripwire fails — .spoon-dial hidden at ≤768px

<!-- P31-HEADER
id: p31_fix_plan_design_spoon_dial_mobile_tripwire_20261009_v1.0
type: fix-plan
component: portals/design
status: open
retention: keep-forever
created: 2026-10-09T00:00:00Z
owner: will
-->

## Symptom

`tests/visual.spec.ts:125` (`topbar affordance tripwire`) fails at `@mobile`
with `expect(locator('.spoon-dial')).toBeVisible()` → hidden. The desktop and
tablet tripwires pass. Surfaced while regenerating visual baselines for the
SSOT arc (2026-10-09) — the sole remaining failure after the 28 glass-shadow
snapshots were re-baselined (56 passed / 1 failed).

## Evidence

`portals/design/src/workspace.css:228` hides the spoon dial at mobile widths:

```css
@media (max-width: 768px) {
  .topbar-right .badge,
  .topbar-right .spoon-dial { display: none; }
}
```

The tripwire (`visual.spec.ts:125`) asserts the `.spoon-dial` is visible at all
three breakpoints. The CSS and the test disagree: the CSS deliberately hides the
spoon dial inside `.topbar-right` on mobile, the test expects it visible.

This rule predates the SSOT arc — it landed in commit `fcc9240` ("axe-core a11y
gate … topbar affordance tripwire"), the same commit that added the tripwire.
**Not caused by the tokens.css → canon flip or the NaN fix.**

## Fix

One of:
1. **Test** — scope the tripwire's `.spoon-dial` assertion to ≥ tablet (skip or
   relax at mobile), reflecting the responsive intent of `workspace.css:228`.
2. **CSS** — move the spoon dial out of `.topbar-right` (or un-hide it) on
   mobile, so the affordance is present at all breakpoints.

Defer to a design decision: does the mobile topbar intentionally omit the spoon
dial (test should relax), or should it be present (CSS should change)?

## Impact

- The design portal's visual gate is not green: `1 failed` after the SSOT
  snapshot re-baseline. It must not be mistaken for a regression from the SSOT
  work — it is a pre-existing test/CSS mismatch.