<!-- P31-HEADER
id: p31_contributing_20261010_v1.0
type: runbook
component: workspace
status: live
retention: keep-forever
created: 2026-10-10T00:00:00Z
owner: will
-->

# Contributing to P31

The design system is a product whose customers are the surfaces built on it.
Contributions are how the outside comes in: a component born in a product that
earns its place in the system, a pattern that repeats across surfaces, a token
that was missing.

## Component proposal

To propose a component, open an issue using the component-proposal template.
Include:

- **Use case** — what this solves, in one sentence.
- **Examples in the wild** — 3–5 places this pattern appears (product screens,
  other design systems, named precedents).
- **Why existing components don't fit** — the specific gap.
- **Proposed design** — props, states, variants, accessibility considerations.
- **Owner** — who will build it.
- **Timeline** — when.

## Triage

A maintainer reviews the proposal and decides one of:

- **Accept** — move to build.
- **Adapt existing** — an existing component covers it with a variant or prop.
- **Defer** — valid but not yet; record the reasoning.
- **Reject** — out of scope; record the reasoning.

## Review bar

A component enters the system only if it:

1. Is **reused across 2+ surfaces** or is a **named primitive** (not a one-off).
2. Meets the **accessibility baseline** (touch targets, ARIA, contrast, focus).
3. Has a **contract** (`tokenContract` in `packages/canon/src/contracts`).
4. Has a **changeset** (`.changeset/*.md`).
5. Has a **docs page** (`docs/components/<Name>.md`).

## Lifecycle tiers

| tier | meaning |
|---|---|
| `core` | stable, semver-stable, documented, promoted to the catalog |
| `experimental` | additive; breaking changes allowed at will; marked in the catalog |
| `deprecated` | has a `$deprecated` entry, removal target named, codemod exists |

## Token changes

Token changes follow the same discipline as code: semver, deprecation before
removal, `$replacement` where a successor exists, a codemod for breaking moves.
See `docs/enterprise/design-system/token-vocabulary-map.md`.

## The gates

`pnpm gate` runs ten checks, each with a proven negative control. A contribution
that violates a gate is not mergable until the gate is fixed or the fix is filed
as `docs/fix-plans/<issue>.md`. Prose is advice; gates are enforcement.