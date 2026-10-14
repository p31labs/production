<!-- P31-HEADER
id: p31_v2d_resilience_audit_20261011_v1.0
type: lane-deliverable
component: design-workflow
status: live
retention: keep-forever
created: 2026-10-11T00:00:00Z
owner: lane-d-designv2
-->

# D-2 · Token Resilience Audit

**Lane:** D v2.0 · **Scanner:** `resilience-scan.mjs` (zero deps) · **Canon:** READ-ONLY.
All rewrites below are **contribution proposals** (design-core AGENTS.md mistake #10).

---

## 1. Framing (runbook §2.2 — sealed research)

> A token is a policy, not an answer. iOS 27's user-controlled transparency +
> M3 Expressive's adaptive spacing (June 2026) mean fixed-value tokens assume a
> rendering context that no longer exists. Resilient tokens define *ranges +
> constraints*. Our resolver's capability flags (`coarse`, `fine`, `canHover`)
> are exactly that mechanism — surfaced, never collapsed.

A token is **FIXED-VALUE** when its rendering context is stable under all user
controls and device densities. A token is **POLICY** when a user-controlled
axis (transparency slider, text-size adjustment, reduced-motion, adaptive
spacing) or a capability axis (pointer/hover tier) changes what the value must
be. The resolution mechanism for every POLICY rewrite below is Lane B's
resolver (`B-device-tiers/device-tiers.mjs` capability flags + the runtime
media contexts) — the flags are surfaced at resolution time, never collapsed
into a fixed value (resolver source lines 89–95).

## 2. Resilience matrix — canon `p31.*` namespace

Counts measured from the canon (p31 namespace, all nesting levels, tokens = nodes with `$value`).

| Category | Count | FIXED-VALUE | POLICY | Finding |
|---|---|---|---|---|
| color | 80 | 59 (opaque) | **21** (fixed `alpha`) | Fixed-opacity tokens on user-controllable surfaces (glass, neon glow, starfield particles) assume a fixed backdrop. iOS 27's transparency slider and M3 tonal surfaces move the backdrop out from under them. The 21 are FLAGGED by the scanner. |
| dimension | 61 | 35 (structural: topbar, z-adjacent, glass-radius…) | **26** (spacing + 8 type-scale) | Spacing: M3 Expressive adaptive spacing changes density per tier; fixed px can't follow. Type scale (h1 51px … caption 7px): fixed px breaks user text-size adjustment and the mobile-first `clamp()` rule (WCAG F94, runbook §2.3). |
| spacing | 26 | 1 (`space-micro` 4px — micro gap is density-stable) | **25** | `spacing-*`, `space-*`, `layout.spacing.*` are all fixed px. POLICY rewrite: range per window-size class, resolved via resolver flags. |
| radius | 13 | 13 | 0 | Radius is user-control-invariant (no slider touches it). Fixed values are correct; floors tighten-only under D-1 R3. |
| motion | 36 (16 duration + 20 cubicBezier) | 20 (cubicBezier curves — shape is stable) | **16** (fixed ms) | Fixed durations ignore `prefers-reduced-motion` (user-controlled). `speed-factor: 1` (number, deprecated) was the old multiplier — the mechanism existed and was removed; POLICY rewrite restores it as a runtime multiplier, with reduced-motion resolving to instant. |
| fontFamily | 7 | 7 | 0 | Preference stacks ending in `system-ui`/`monospace` are inherently resilient (they degrade to the platform's user-chosen font). No rewrite. |
| duration | 16 | 0 | **16** | Subset row of motion (16 fixed ms durations incl. `spring-*-ms` and `duration-base` 431ms). |

**Totals:** 205 p31 tokens across the seven audited categories (+21 `number`-type
tokens — z-index scale, elevation tints — audited separately: z-* fixed is
correct; `elevation-*-tint` 0.05/0.08/0.11 are shadow policy candidates, filed
as D-2-P5). **89 tokens (43%) are POLICY-typed findings; 116 (57%) are correct
as fixed values.**

## 3. Scanner run — canon findings (negative-control gate: it MUST flag)

```bash
node resilience-scan.mjs
```

```
=== resilience scan: canon p31.* namespace (READ-ONLY) ===
RESULT: 29 FINDING(S)
  [rule A] glass-border-hover: fixed alpha 0.15 with no policy descriptor — …
  [rule A] glass-bg-strong: fixed alpha 0.22 …        (21 rule-A findings:
  [rule A] glass-bg-light: fixed alpha 0.1 …           glass-*, neon-dim/faint/ghost,
  [rule A] neon-ghost: fixed alpha 0.03 …              starfield-particle-*, accent-glow,
  [rule A] glass-surface: fixed alpha 0.04 …           glass-bg-dark)
  [rule B] h1: fixed font-size 51px — … clamp() policy with rem term
  [rule B] h2: fixed font-size 38px — …
  [rule B] h3: fixed font-size 28px — …
  [rule B] h4: fixed font-size 21px — …
  [rule B] body: fixed font-size 16px — …
  [rule B] body-sm: fixed font-size 14px — …
  [rule B] label: fixed font-size 12px — …
  [rule B] caption: fixed font-size 7px — …
```

exit 1 (findings present — the gate fails, as it must).

### Negative control (fixed-opacity on a user-controllable surface → flagged)

```bash
node resilience-scan.mjs --fixture fixtures/res-neg-fixed-alpha.fixture.json
```

```
=== resilience scan: fixtures/res-neg-fixed-alpha.fixture.json ===
RESULT: 1 FINDING(S)
  [rule A] glass-bg: fixed alpha 0.05 with no policy descriptor — user-controllable surface (glass / transparency slider) breaks the fixed value
```

exit 1 ✓

### Control (policy range descriptor → NOT flagged)

```bash
node resilience-scan.mjs --fixture fixtures/res-pos-policy-range.fixture.json
```

```
=== resilience scan: fixtures/res-pos-policy-range.fixture.json ===
RESULT: CLEAN (0 findings)
```

exit 0 ✓ — the scanner flags fixed values, not the policy form.

## 4. Concrete proposed rewrites (contribution proposals)

| ID | Token(s) | Today | Policy rewrite | Resolved by |
|---|---|---|---|---|
| **D-2-P1** | `glass-bg`, `glass-bg-light/strong`, `glass-border*`, `glass-surface*`, `neon-faint/ghost/dim`, `accent-glow`, `starfield-particle-*` (21 tokens) | fixed `alpha` 0.03–0.6 | `alpha: {min, max}` range; resolution picks alpha from the backdrop L and the transparency-slider position; fails closed outside range | resolver flags + user slider position |
| **D-2-P2** | `h1…h4`, `body`, `body-sm`, `label`, `caption` (8 tokens) | fixed px (51→7) | `clamp(min rem, preferred, max rem)` per tier (mobile-first gate, WCAG F94) | window-size class + user text-size adjustment |
| **D-2-P3** | `spacing-*`, `space-*`, `layout.spacing.*` (25 tokens) | fixed px (2–64) | density range per tier: compact/medium/expanded value + `space-micro` as the invariant | resolver tier + M3 adaptive spacing |
| **D-2-P4** | `duration-*`, `duration-base`, `spring-*-ms` (16 tokens) | fixed ms (62.5–1000) | base durations × runtime speed factor; `prefers-reduced-motion` → instant (durations 0), never a CSS override downstream | media context (user-controlled) |
| **D-2-P5** | `elevation-level1/2/3-tint` | fixed 0.05/0.08/0.11 | tint range keyed to surface L (shadow darkness must track the backdrop) | resolver surface class |

## 5. Resolution mechanism — why Lane B's flags are the answer

`B-device-tiers/device-tiers.mjs` returns `flags: { coarse, fine, canHover }`
alongside `tier` and never collapses them (lines 91–95; doctrine comment lines
9–13). Every POLICY rewrite above resolves through exactly this surface: the
value is chosen at resolution time from the range, using the surfaced flags —
the token stores the constraint, the resolver picks the value, and no
downstream layer may re-freeze it. This keeps ONE SOURCE (Law 1) and FAIL
CLOSED (Law 10: out-of-range resolution throws, never guesses — same doctrine
as the resolver's own TypeError on unknown capabilities, lines 55–61).

## 6. Files in this lane

- `resilience-scan.mjs` — scanner (rule A fixed-alpha, rule B fixed-px type scale; `--fixture` mode)
- `fixtures/res-neg-fixed-alpha.fixture.json`, `fixtures/res-pos-policy-range.fixture.json`

**No canon file was modified.**