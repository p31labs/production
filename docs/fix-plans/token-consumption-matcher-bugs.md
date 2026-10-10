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

## Progress (2026-10-10)

**BEM matching — FIXED.** The matcher's `belongs()` now accepts BEM elements
(`cls__*`) and modifiers (`cls--*`) in addition to dash variants (`cls-*`).
This clears false over-claims from BEM children (`sidebar-nav__item`,
`status-cluster__scroller`, `mobile-bottom-nav__btn`, `notif-toast__*`,
`topbar-section--*`), e.g. `--p31-accent` dropped from NotificationStack.

**Child-class gap — inventory complete, fix is a pipeline change (not done).**
Authoritative child classes, verified from the component TSX (not CSS
proximity, which misled — `status-dot`/`mobile-only` are NOT the components'
classes):

| Component | cssClass | childClasses (TSX-verified) |
|---|---|---|
| SpoonDial | `spoon-dial` | `spoon-btn`, `spoon-dot`, `spoon-crisis-btn` |
| NotificationStack | `notif-stack` | `notif-toast` |
| PageHeader | `page-header-route` | `page-lede`, `page-actions`, `hero-eyebrow` |
| SectionStrip | `section-strip` | `section-tab` |

Adding `childClasses` is NOT a one-file edit: `registry.json` is generated
(`components.yml` → `componentDefs.ts` → `storybook-to-catalog.mts` →
`catalog.json` → `gen-registry.mjs` → `registry.json`), and that pipeline has
pre-existing **naming drift** (the yml/defs catalog uses `spoon-meter`,
`starfield`, `glass-strong`; the 32-item registry uses `SpoonDial`, `Starfield`,
`GlassCard`). The childClasses field must be added at the source-of-truth layer
and propagated, or maintained as a small explicit map in the matcher.

**Flat-only under-claims — SEMANTIC_MAP decision remains.** The dominant
under-claims (`--p31-scale-*`, `--p31-text-*`, `--p31-duration-*`,
`--p31-easing-*`, `--p31-space-*`, `--p31-void`) are `GLOBAL_COMPAT` flat vars
with no DTCG path; they are not "contract omissions" until each gets a
`SEMANTIC_MAP` slot or a documented non-DTCG carve-out.

## Remaining

1. Decide childClasses delivery: (a) add `child_classes` to `componentDefs.ts`
   + `components.yml` and propagate, or (b) keep a small `CHILD_CLASSES` map in
   `token-consumption.mjs`. Option (a) is correct but touches the drifted
   catalog pipeline; option (b) is fast but reintroduces a maintained list.
2. Per flat-only token: add a `SEMANTIC_MAP` slot or mark non-DTCG.

## Impact

- The BEM fix narrows the over-claim surface; childClasses + SEMANTIC_MAP are
  the remaining work to make the counts trustworthy.
- Until childClasses and the SEMANTIC_MAP decision land, the over/under-claim
  counts remain advisory only.
- The deprecation gate (`check-deprecated-tokens.mjs`) is unaffected — it scans
  all `var()` references, not class-scoped consumption.