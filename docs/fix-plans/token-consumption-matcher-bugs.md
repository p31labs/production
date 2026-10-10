# fix: token-consumption.mjs matcher mis-reports over/under-claims (two defects)

<!-- P31-HEADER
id: p31_fix_plan_token_consumption_matcher_bugs_20261009_v1.0
type: fix-plan
component: packages/canon/scripts/token-consumption.mjs
status: open
retention: keep-forever
created: 2026-10-09T00:00:00Z
owner: will
-->

## Symptom

The "26 contract over-claims" is inflated and mis-scoped by two defects in the
matcher, found while adjudicating the triage (subagent, 2026-10-09):

1. **Child-class naming gap** — a token is counted as consumed only if its flat
   var appears in a rule whose class equals `cssClass` or starts with
   `cssClass + '-'`. Components whose children use a different prefix/underscore
   (`.notif-toast`, `.section-tab`, `.spoon-btn`, `.page-lede`, `.p31-crisis-*`)
   get false over-claims.

2. **Selector-group pollution** — the regex `([^{}]+)\{([^{}]*)\}` attributes
   every var in a grouped selector to *every* class in it. Topbar's +142
   `--p31-glow-*`/`--p31-neon-*` under-claims are this artifact, not real tokens.

## Evidence

`packages/canon/scripts/token-consumption.mjs:36-43` (selector group) and the
consumed check at `:80-93` (prefix matching).

## Fix

1. Map each component to an **explicit list of child class names** (from its
   `registry.json` entry or a sidecar), instead of prefix-guessing.
2. Split grouped selectors before attributing vars to classes (a var in
   `.a, .b { … }` belongs to both, not to one — or attribute to none and flag
   as ambiguous).

## Impact

- Until fixed, `token-consumption.mjs`'s over/under-claim counts are not a
  reliable adjudication surface: 14 of the 26 "over-claims" are NO-CSS
  components (CSS lives elsewhere), and an unknown fraction of the rest are
  matcher artifacts rather than real contract errors.
- The deprecation gate (`check-deprecated-tokens.mjs`) is unaffected — it scans
  all `var()` references, not class-scoped consumption.