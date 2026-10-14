<!-- P31-HEADER
id: p31_v3d_policy_schema_20261011_v1.0
type: lane-deliverable
component: design-workflow
status: live
retention: keep-forever
created: 2026-10-11T00:00:00Z
owner: lane-d-resilience
-->

# D-1 · Resilience Policy Descriptor Schema

**Lane:** D v3.0 · **Validator:** `policy-validate.mjs` (zero deps) · **Canon:** READ-ONLY.
All rewrites below are **contribution proposals** (design-core AGENTS.md mistake #10) —
nothing is applied to canon in this lane.

---

## 1. Framing (runbook §2.4 + §7 D-1, sealed)

> A token is a **policy**, not an answer. A FIXED-VALUE token is correct when its
> rendering context is stable under every user control and device tier. A
> **POLICY** token lives on an axis a user controls (transparency slider,
> text-size adjustment, adaptive density, reduced motion) or a capability axis
> (coarse/fine/canHover). It therefore must carry a **policy descriptor** that
> states *what range/constraint the value may take* and *who resolves it*. The
> resolver's capability flags are surfaced at resolution time, never collapsed
> into a fixed value (Lane B `B-device-tiers/device-tiers.mjs` lines 89–95).

The scanner (`policy-scan.mjs`, D-2) flags any POLICY-category token that **lacks
a valid policy descriptor**; the validator (`policy-validate.mjs`, D-1) is the
shape authority the scanner imports — ONE source of truth for what a valid
descriptor is.

---

## 2. Descriptor shape

The descriptor lives at the token's `$extensions.p31` node, alongside (never
replacing) existing keys such as `themes`. Shape:

```json
{
  "$value": {
    "$type": "color",
    "colorSpace": "oklch",
    "components": [1, 0.01, 240],
    "alpha": 0.06
  },
  "$type": "color",
  "$extensions": {
    "p31": {
      "policy": "range",
      "resolvedBy": "resolver.flags + user.slider",
      "bounds": { "min": 0.03, "max": 0.09 },
      "unit": "alpha"
    }
  }
}
```

Top-level keys:

| Key | Type | Required | Meaning |
|---|---|---|---|
| `policy` | string enum | yes | `"range"` · `"clamp"` · `"density"` · `"speed"` |
| `resolvedBy` | non-empty string | yes | who resolves the value from the bounds (surfaced flags, never a freeze) |
| `bounds` | object | yes | per-policy constraint shape below |
| `unit` | string | yes | `"alpha"` · `"number"` · `"px"` · `"rem"` · `"ms"` (must match policy) |

### Per-policy `bounds`

| Policy | Category (runbook §7 D-2) | `bounds` shape | `unit` | Rules |
|---|---|---|---|---|
| `range` | color-with-alpha | `{ "min": number, "max": number }` | `"alpha"` or `"number"` | alpha: `0 ≤ min ≤ max ≤ 1`; number: `min ≤ max`, `min ≥ 0` (D-2-P5 elevation-tint ranges use `number`) |
| `clamp` | type-scale px | `{ "preferred": "Xrem", "min": "Yrem", "max": "Zrem" }` | `"rem"` | each value matches `/^(\d+(\.\d+)?)rem$/`; `min ≤ preferred ≤ max` (WCAG F94, mobile-first) |
| `density` | spacing | `{ "min": number, "max": number }` | `"px"` or `"rem"` | `min ≥ 0`, `min ≤ max` (D-2-P3 per-tier ranges) |
| `speed` | motion duration | `{ "min": number, "max": number }` | `"ms"` | `min ≥ 0`, `min ≤ max`; reduced-motion resolves to `min` (0 → instant) |

`resolvedBy` examples (not enforced beyond non-empty — it is documentation for
the resolver surface):

- alpha range: `"resolver.flags + user.slider"` (runbook §7 D-1)
- type clamp: `"window-size class + user text-size adjustment"`
- density: `"resolver tier + M3 adaptive spacing"`
- speed: `"media context (prefers-reduced-motion) + runtime speed factor"`

---

## 3. Backward compatibility note

v2.0's positive fixture used a free-text `policy` string
(`"policy": "range: resolved from surface L via capability flags (never collapsed)"`).
v3.0 **formalizes** the descriptor: `policy` must be exactly one of the four
enum values and the constraint lives in `bounds` + `unit`. The v2.0 free-text
form is superseded and would be flagged as invalid by the validator — this is
intentional (a gate that cannot fail is furniture, runbook §2.6). The v2.0
fixture files themselves are never modified.

---

## 4. Files in this deliverable

- `policy-schema.md` — this document
- `policy-validate.mjs` — validator (CLI + exported `validatePolicy`, imported by
  `policy-scan.mjs` and `migration-test.mjs`)
- `fixtures/` — D-1 negative + positive control fixtures

## 5. Gate (runbook §8 `policy-schema`)

```
node policy-validate.mjs --descriptor '{"policy":"range","resolvedBy":"resolver.flags + user.slider","bounds":{"min":0.03,"max":0.09},"unit":"alpha"}'
```

**Negative controls (each MUST fail):**
1. alpha `max > 1` → FAIL
2. clamp missing `preferred` → FAIL
3. `policy: "banana"` → FAIL
4. density `min < 0` → FAIL
5. speed `min > max` → FAIL

**Positive controls (each MUST pass):** one valid descriptor per policy type.

**No canon file was modified.**