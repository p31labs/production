<!-- P31-HEADER
id: p31_v2d_multi_brand_schema_20261011_v1.0
type: lane-deliverable
component: design-workflow
status: live
retention: keep-forever
created: 2026-10-11T00:00:00Z
owner: lane-d-designv2
-->

# D-1 · Multi-Brand Inheritance Schema

**Lane:** D v2.0 (design system v2) · **Deliverable:** schema + validator
**Canon:** READ-ONLY — every canon change below is a contribution proposal (design-core AGENTS.md mistake #10; runbook §11.11).
**Validator:** `validates.mjs` (zero deps, Node 24 ESM) — this document is backed by its pasted output.

---

## 1. Canon today (verified facts)

The canon (`production/packages/canon/tokens/tokens.dtc.json`) carries the brand
themes **twice**:

| Surface | Shape | Coverage |
|---|---|---|
| `themes.*` top-level group (line 4078) | 11 packs × flat `p31.*` token maps (22–23 tokens each) | aurora, cipher, family, garden, mono, ocean, retro, sunlight, sunset, volt, zen |
| per-token `$extensions.p31.themes.*` | inline override map on ~19 p31/color tokens | same minus **ocean** |

Per-pack token split (extracted, all 11 packs):

- **7 shared tokens** (identical value in every pack): `base` (16px), `radius-sm` (8), `radius-md` (16), `radius-lg` (24), `radius-full` (9999), `font-sans`, `font-mono`.
- **15 overridden tokens** (value differs per pack): `accent`, `accent-cyan`, `accent-gold`, `accent-green`, `accent-iris`, `accent-red`, `accent-violet`, `bg`, `surface`, `surface2`, `text-primary`, `text-secondary`, `text-tertiary`, `glass-bg`, `glass-border`.
- **1 drift token**: `sunlight` alone carries a 23rd token `text` (line 6517, oklch(0.22 0.015 80)) that exists in no other pack.

### Findings (canon drift — filed, not fixed)

- **F1 — child-introduced structure.** `sunlight.p31.text` does not exist in the
  other 10 packs. Under RFC-0006, children may override but not introduce
  structure. `validates.mjs --strict` (Base = intersection) proves R2 catches
  it: `[R2] text: override name 'text' does not exist in the parent chain`.
- **F2 — dual-source theme overrides.** The per-token `$extensions.p31.themes`
  maps list **10** packs (missing `ocean`, which exists only in the top-level
  group at line 4760). Two sources for one fact is drift risk (runbook Law 1:
  ONE SOURCE).

## 2. Proposed layout (RFC-0006 shape)

```
tokens/
  Base/tokens.json              # 23 structural names; defaults = cipher (live theme);
                                # `text` default = canonical p31.text (line 79) — see F1
  brands/
    cipher/tokens.json          # override-only; extends ["../../Base/tokens.json"]
    garden/tokens.json
    … (11 files)                # 22 tokens each; sunlight 23
```

Each brand file:

```json
{
  "name": "garden",
  "$extends": ["../../Base/tokens.json"],
  "versionPolicy": "minor",              // RFC-0006: explicit, never implicit
  "tokens": { "<existing-token-name>": { "$value": …, "$type": … } }
}
```

## 3. Validation rules (enforced by `validates.mjs`)

| Rule | Statement | Evidence |
|---|---|---|
| **R1** | Parent validates first: Base must be structurally sound (every token has `$type` + `$value`, no duplicate names). | run output §6 |
| **R2** | Override-only names: a child may only override token names that exist in the parent chain. No new structure. | F1, negative control (i) |
| **R3** | Thresholds tighten only: for numeric tokens (dimension with matching unit, `number`), child value ≥ parent floor. Floors may raise, never lower. | negative control (ii) |
| **R4** | Type/unit fidelity: a child override keeps the parent `$type` (and dimension unit). | validator code path |

Exemptions (documented, not loopholes): color hue/lightness swaps are the
entire point of a brand pack (R3 does not gate hue); `fontFamily` lists are
preference stacks, not floors; `alpha` is not monotone (see D-2 audit —
fixed alpha is a resilience finding, not an inheritance one).

## 4. Runtime switching — data attributes

One Base emit + per-brand override sheets, switched at runtime:

```css
:root { --p31-bg: var(--p31-bg-cipher); … }        /* default = cipher */
[data-theme="garden"] { --p31-bg: var(--p31-bg-garden); … }
```

Themes are a **value swap at the semantic tier, never a component fork**
(production AGENTS.md Law 3). No component CSS may reference a brand palette
directly.

## 5. Migration test — all 11 themes express with zero value changes

`node validates.mjs` (union Base, defaults = cipher; `text` = canonical p31.text):

```
=== P31 multi-brand inheritance validation (D-1) ===
canon: /home/p31/production/packages/canon/tokens/tokens.dtc.json
base mode: UNION (migration target)
Base structural tokens: 23
Base violations (R1): 0

per-theme results:
  aurora     22 overrides  ALL PASS
  cipher     22 overrides  ALL PASS
  family     22 overrides  ALL PASS
  garden     22 overrides  ALL PASS
  mono       22 overrides  ALL PASS
  ocean      22 overrides  ALL PASS
  retro      22 overrides  ALL PASS
  sunlight   23 overrides  ALL PASS
  sunset     22 overrides  ALL PASS
  volt       22 overrides  ALL PASS
  zen        22 overrides  ALL PASS

REPORT: 11 themes, 243 overrides, 243 validated, 0 violation(s).
```

Migration expressibility: **11/11 themes, zero value changes** (243 override
entries, 243 validated). Runbook §11 stop condition "schema cannot express all
11 themes without value changes" → **not triggered**.

## 6. Negative controls (each MUST fail)

### (i) Child references a nonexistent parent token

```bash
node validates.mjs --fixture fixtures/neg-unknown-name.fixture.json
```

```
=== fixture validation: fixtures/neg-unknown-name.fixture.json ===
  name: neg-control-unknown-name  extends: ["Base"]
  tokens: 1
  RESULT: FAIL (1 violation(s))
    [R2] not-a-parent-token: override name 'not-a-parent-token' does not exist in the parent chain (new structure forbidden)
```

exit 1 ✓

### (ii) Child loosens a floor

```bash
node validates.mjs --fixture fixtures/neg-loose-floor.fixture.json
```

```
=== fixture validation: fixtures/neg-loose-floor.fixture.json ===
  name: neg-control-loose-floor  extends: ["Base"]
  tokens: 1
  RESULT: FAIL (1 violation(s))
    [R3] radius-sm: child floor 6px lowers parent floor 8px (floors may raise, never lower)
```

exit 1 ✓

### Positive control (specificity)

```bash
node validates.mjs --fixture fixtures/pos-valid-child.fixture.json
```

```
=== fixture validation: fixtures/pos-valid-child.fixture.json ===
  name: pos-control-valid-child  extends: ["Base"]
  tokens: 2
  RESULT: PASS (0 violations)
```

exit 0 ✓ — a raised floor (10px) and a legal accent swap pass.

## 7. Contribution proposals (canon is READ-ONLY — these route through design-core)

| ID | Proposal | Trigger |
|---|---|---|
| **D-1-P1** | Promote `text` into the shared Base structure (default = canonical `p31.text`, line 79) so `sunlight` no longer carries child-introduced structure; or drop `sunlight.p31.text` in favor of `text-primary`. | F1 |
| **D-1-P2** | Collapse the dual source: keep ONE themes surface (top-level `themes` group); retire the per-token `$extensions.p31.themes` maps, or make one the generated mirror of the other. | F2 (ocean missing from `$extensions`) |
| **D-1-P3** | Add explicit `versionPolicy` per theme pack (RFC-0006 token semver: exact / minor / minor-and-major / latest — no implicit default) before any consumer migrates. | runbook §2.8 |
| **D-1-P4** | Adopt the `brands/<name>/tokens.json` + `$extends` file shape on disk when design-core is next edited; the validator in this lane is ready to gate the migration. | runbook §7 D-1 |

## 8. Files in this lane

- `validates.mjs` — validator (main / `--strict` / `--fixture` modes)
- `fixtures/neg-unknown-name.fixture.json`, `fixtures/neg-loose-floor.fixture.json`, `fixtures/pos-valid-child.fixture.json`

**No canon file was modified.**