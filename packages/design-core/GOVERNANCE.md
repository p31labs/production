# @p31ca/design-core — Governance

`design-core` is a **public contract** even though it ships as a private tarball: the
shell, the emitters, and every generated project consume it. The rules here are
enforced by `scripts/versioning.mjs`, not just documented.

## The one rule

> **When in doubt between minor and major, it's major.** The contract is sacred.
> A breaking change without a codemod breaks every consumer.

## Semantic versioning

| Bucket | Change kind | Example |
|---|---|---|
| **major** | removed/renamed component or prop, renamed token, changed default | `GlassPanel` `padding` default `md` → `lg` |
| **minor** | new component, variant, token, prop, or a deprecation | `SpoonCluster` added; `LegacyBadge` deprecated |
| **patch** | CSS fix, a11y fix, bug fix, docs | contrast fix on `StatusBadge` |

`scripts/versioning.mjs` classifies a change by kind. An unknown kind is **major** —
never silently under-bump.

## Deprecation process (three steps)

1. **Announce in a minor.** Ship the replacement; mark the old API `@deprecated` and
   call `deprecate(name, { deprecatedIn, replacement, removalIn })`. Consumers get a
   loud `console.warn` naming the replacement and the removal version.
2. **Ship a codemod.** Every deprecation carries an automated migration in `codemods/`
   that rewrites consumer code. A major without a codemod is a release blocker.
3. **Remove in the next major.** The deprecated API is deleted, and the codemod is
   archived as the historical migration path.

## Release discipline

- `CHANGELOG.md` is hand-maintained per release: **Breaking / Migration / Added**.
- The `Migration` section names the exact codemod and the old→new mapping.
- A breaking change ships as `codemods/<from>-to-<to>/` + a changelog `Migration`
  entry, in the same PR.

## The contract the codemod protects

Every consumer — the shell, the emitters, the generated projects — resolves the
tarball. When a major lands, the codemod is what keeps those consumers building.
The `CHANGELOG.md` is the record; the codemod is the contract.