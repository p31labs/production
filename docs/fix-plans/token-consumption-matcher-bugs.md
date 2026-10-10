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

The "26 contract over-claims" is inflated and mis-scoped by two real defects
plus one misdiagnosis (corrected 2026-10-09):

1. **Child-class naming gap (real).** A token is counted as consumed only if
   its flat var appears in a rule whose class equals `cssClass` or starts with
   `cssClass + '-'`. Children with a different prefix are missed — e.g.
   SpoonDial (`cssClass: "spoon-dial"`) has child `.spoon-btn`, which does not
   start with `spoon-dial-`. So vars consumed by `.spoon-btn` are attributed to
   no contract, producing false over-claims.

2. **Under-claims are flat-only tokens (real, dominant).** Most under-claims
   (`--p31-glass-blur`, `--p31-space-*`, `--p31-duration-*`, `--p31-easing-*`,
   `--p31-text`, `--p31-void`, `--p31-scale-*`) are emitted only via
   `GLOBAL_COMPAT` in `theme-store.ts` and have **no DTCG semantic path**, so
   `flatVarFor` cannot map them back to a `tokenContract` entry. "Add to
   contract" is therefore not expressible without first adding a `SEMANTIC_MAP`
   slot per token.

3. ~~Selector-group pollution~~ **misdiagnosed.** The prior claim that Topbar
   has "+142 `--p31-glow-*`/`--p31-neon-*` under-claims" from a grouped selector
   is wrong — the "+142" is the *dead-token* list truncation
   (`… +142` after 20 of 162), not Topbar's under-claims (which are ~14
   flat-only tokens). No grouped selector in the CSS causes this.

## Evidence

- Child-class gap: `packages/design-core/src/css/chrome.css:254` (`.spoon-dial`)
  vs `:263` (`.spoon-btn`); the consumed check at `token-consumption.mjs:80-93`
  only matches `cls` or `cls + '-'`.
- Flat-only under-claims: `GLOBAL_COMPAT` in `theme-store.ts` (no `SEMANTIC_MAP`
  slot); `flatVarFor` at `token-consumption.mjs:66-70` returns a dashed guess.

## Fix

1. Map each component to an **explicit child-class list** (extend `registry.json`
   items with a `childClasses` array), replacing the `cls + '-'` prefix guess.
2. For under-claims, decide per token: add a `SEMANTIC_MAP` slot (if the flat
   var should be contract-addressable) or accept it as a documented non-DTCG
   carve-out.

## Impact

- Until fixed, `token-consumption.mjs`'s over/under-claim counts are not a
  reliable adjudication surface: 14 of the 26 "over-claims" are NO-CSS
  components (CSS lives elsewhere), most of the rest are child-class or
  flat-only-token artifacts rather than contract errors.
- The deprecation gate (`check-deprecated-tokens.mjs`) is unaffected — it scans
  all `var()` references, not class-scoped consumption.