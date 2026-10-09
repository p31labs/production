# Token Architecture — three tiers + DTCG governance

## The three tiers

```mermaid
flowchart TB
  subgraph T1[TIER 1 — PALETTE · raw values, no intent]
    p1[oklch 65% 0.28 195 — quantum cyan]
    p2[oklch 8% 0.01 270 — void]
    p3[oklch 96% 0.005 270 — text]
  end
  subgraph T2[TIER 2 — SEMANTIC · intent, themeable]
    s1[--p31-accent: oklch 65% 0.28 195]
    s2[--p31-bg: oklch 8% 0.01 270]
    s3[--p31-text: oklch 96% 0.005 270]
  end
  subgraph T3[TIER 3 — COMPONENT · per-component contracts]
    c1[Button: accent, radius.full, font.sans]
    c2[GlassPanel: glass.bg, glass.blur, glass.border]
    c3[MetricBadge: glass.bg, radius.sm, scale.xs, text.secondary]
  end
  T1 --> T2 --> T3
```

Referencing direction is strict: **component → semantic → palette**. Skipping
tiers is a violation.

## Naming

`p31.<category>.<property>` — e.g. `p31.color.action.primary`,
`p31.radius.full`, `p31.motion.duration.fast`, `p31.space.md`.

- Registry items store the **bare** form (`surface.bg`); the schema and the
  Shaper namespace to `p31.surface.bg`.
- A token a component's contract does not allow is a falsification
  (non-compensatory, ADR 0004).

## Canonical source

`software/design-tokens/p31-universal-canon.json` is the single source of
truth: all visual values derive from **PHI (1.618)**, **Perfect Fourth
(1.333)**, a **4-multiple grid**, **OKLCH**, and **120 BPM** tempo. The
`@p31ca/design-core` v2 package consumes it; divergence is a type error.

## Governance

- **One canonical machine-readable source** — CSS custom properties, tokens,
  and the DTCG export are generated from it; do not hand-maintain derived
  forms.
- **External token files (Figma etc.)** MUST be validated against the W3C
  DTCG schema before ingestion.
- **`gen:tokens` regenerates** CSS + DTCG + registry; `validate-registry.mjs`
  checks the derived registry against contracts; `canon-purity` enforces the
  source-of-truth rule.
- **Who may change tokens** — @canon-owner. An unowned token is a dead token.
  Follow `runbooks/RUNBOOK-canonical-source.md` (repo root) before editing a
  design token.

## The registry (verified 2026-10-02)

- `packages/canon/registry.json` — tokens (205), components (Badge, Button),
  CSS classes (133), themes (11).
- `packages/design-core/registry.json` — 32 components + 18 chrome, each with
  typed props, tokens, variants, slots, a11y, importPath, cssClass.
- `packages/ui-forge/ui-schema.json` — the closed-vocabulary schema generated
  from both (34 unique component names), the THAKI validity contract.

## Related

- [contract.md](contract.md) — the semantic contract
- `runbooks/RUNBOOK-canonical-source.md` (repo root) — the edit procedure