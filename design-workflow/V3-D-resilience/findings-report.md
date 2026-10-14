<!-- P31-HEADER
id: p31_v3d_resilience_report_20261011_v1.0
type: lane-deliverable
component: design-workflow
status: live
retention: keep-forever
created: 2026-10-11T00:00:00Z
owner: lane-d-resilience
-->

# D-3 · Migration Test — Findings Report (reproducible)

**Lane:** D v3.0 · **Canon:** READ-ONLY · **Temp copy:** `tmp/canon.patched.dtc.json`.
All rewrites are **contribution proposals** — nothing was applied to canon.

---

## 1. Reproducible finding counts — extended scanner vs real canon

```bash
node policy-scan.mjs
```

```
=== policy scan: canon p31.* namespace (READ-ONLY) ===
RESULT: 70 FINDING(S)
  by rule: [A] 21  [D] 16  [C] 25  [B] 8
```

| Rule | Category (runbook §7 D-2) | Count | Proposal |
|---|---|---|---|
| A | color-with-alpha (glass/neon/starfield/action/glass.*) | 21 | D-2-P1 → `range` alpha |
| B | type-scale px (h1…caption) | 8 | D-2-P2 → `clamp` rem |
| C | spacing (space-*/spacing-*/space.inline.*/layout.spacing.*) | 25 | D-2-P3 → `density` |
| D | motion duration (duration-*/spring-*-ms/motion.*) | 16 | D-2-P4 → `speed` |
| **total** | | **70** | every finding maps to a proposal |

`space-micro` (4px, 26th spacing-family token) is exempt as the documented
density-stable invariant (D-2-P3). `space-base` (1rem) IS flagged — a rem
spacing token still participates in per-tier density and needs the descriptor.

Exit 1 (findings present — the gate fails, as it must; runbook §8 `policy-scan`).

## 2. Migration test — before/after

```bash
node migration-test.mjs
```

```
BEFORE: 70 finding(s) — [A]21 [B]8 [C]25 [D]16
rewrites applied: P5-P8 on 70/70 flagged tokens; P9 on 6 elevation tints
AFTER:  0 finding(s)
descriptor validation: 76 descriptors, 76 valid, 0 invalid
D-3 RESULT: PASS — previously-flagged tokens no longer flagged; descriptors valid
```

exit 0. Canon md5 unchanged (`packages/canon/tokens/tokens.dtc.json` untouched;
only `tmp/canon.patched.dtc.json` written).

## 3. Negative controls (each demonstrated, each fails as it must)

### D-1 schema — malformed descriptors fail

```bash
node policy-validate.mjs fixtures/d1-neg-alpha-max-over1.fixture.json      # exit 1
node policy-validate.mjs fixtures/d1-neg-clamp-missing-preferred.fixture.json  # exit 1
node policy-validate.mjs fixtures/d1-neg-policy-banana.fixture.json        # exit 1
node policy-validate.mjs fixtures/d1-neg-density-min-negative.fixture.json # exit 1
node policy-validate.mjs fixtures/d1-neg-speed-min-gt-max.fixture.json     # exit 1
node policy-validate.mjs fixtures/d1-pos-all-policy-types.fixture.json    # exit 0
```

### D-2 scanner — fixed tokens flagged, policy-shaped tokens clean

```bash
node policy-scan.mjs --fixture fixtures/d2-neg-fixed-alpha-no-descriptor.fixture.json    # exit 1 (rule A)
node policy-scan.mjs --fixture fixtures/d2-neg-fixed-duration-no-descriptor.fixture.json # exit 1 (rule D)
node policy-scan.mjs --fixture fixtures/d2-neg-spacing-no-descriptor.fixture.json        # exit 1 (rule C)
node policy-scan.mjs --fixture fixtures/d2-neg-type-px-no-descriptor.fixture.json        # exit 1 (rule B)
node policy-scan.mjs --fixture fixtures/d2-pos-policy-shaped-all-rules.fixture.json      # exit 0
```

### D-3 migration — incomplete rewrite is still caught

```bash
node policy-scan.mjs --fixture fixtures/d3-neg-incomplete-rewrite.fixture.json   # exit 1
```

3 of 4 tokens carry valid descriptors (pass clean); the intentionally-unpatched
`spacing-md` is the single remaining finding — proving the scanner flags the
un-rewritten token, not the rewritten ones (a rewritten token still flagged
would be a scanner bug; this control excludes that failure mode).

## 4. Files in this lane

- `policy-schema.md` — D-1 descriptor schema
- `policy-validate.mjs` — D-1 validator (imported by scanner + migration)
- `policy-scan.mjs` — D-2 extended scanner (A/B/C/D rules)
- `migration-test.mjs` — D-3 migration test on temp copy
- `fixtures/` — 12 control fixtures (5 neg + 1 pos D-1; 4 neg + 1 pos D-2; 1 neg D-3)
- `tmp/canon.patched.dtc.json` — temp patched copy (canon untouched)

**No canon file was modified.**