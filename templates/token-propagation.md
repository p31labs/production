<!-- P31-HEADER
id: p31_template_token_propagation_20261013_v1.0
type: template
component: templates/token-propagation
status: live
retention: keep-forever
created: 2026-10-13T00:00:00Z
owner: will
-->

# token-propagation — the mandatory procedure for any token change

Track A's operating procedure. A token change is any edit to a value,
name, or theme in the DTCG core. It propagates in exactly this order;
skipping a step makes every downstream surface a fork. Who may change
tokens: @canon-owner (token-architecture.md §Governance).

## The propagation chain

```
1. EDIT SOURCE     packages/canon/src/theming/theme-store.ts (the p31.* record)
                   — and ONLY this. No edit to any CSS, JSON, or Tailwind file.
2. BUILD OUTPUTS   pnpm gen:tokens  (canon) → regenerates:
                     packages/canon/tokens/tokens.dtc.json
                     packages/canon/tokens/dist/tokens.resolved.json
                     packages/canon/dist/tokens.css + dist/css/*
3. VALIDATE        dtokens check tokens.dtc.json          (strict DTCG schema)
                   node scripts/validate-registry.mjs      (registry vs contracts)
                   node scripts/token-conformance.mjs      (no consumer forks)
                   node scripts/check-token-parity.mjs     (no p31.* drift)
4. RE-VENDOR       any surface still consuming a frozen vendor tgz
                   (portals/mcp-marketplace/vendor/p31-design-core-*.tgz,
                   portals/*/vendor/*.tgz) re-vendors from the new build.
                   NEVER patch a tgz in place.
5. GATE EVERY      pnpm gate from the portal root; per-surface:
   SURFACE           canon-source-audit.mjs --target portals/<name>  → 0 forks
                     render-gate A1–A8 (self-test fixtures green first)
```

## Rules (each is a sensor, not advice)

- **R1 — one edit point.** If the same value must change in two files, the
  generator is wrong, not the process. Edit the source once; the outputs
  are derived. Hand-editing `dist/tokens.css` or any `.dtc.json` is a
  falsification.
- **R2 — additive or intentional.** Additive `p31.*` paths are allowed
  (canon-v2 §8); changing an existing value requires the owner decision
  recorded in the runbook (parallel-paths §6 D1–D4) — a value change with
  no decision on file fails review.
- **R3 — validate before you ship the build.** A regeneration that fails
  step 3 reverts the step-1 edit (rollback condition 1: revert the edit,
  never weaken the validator).
- **R4 — no surface may carry a `--p31-*` override after re-vendor.**
  The propagation is done only when every consumer resolves the token
  through the wrapper, not through a local `:root` override (today's
  violators: `apps/p31ca/src/styles/global.css`, `shell/src/index.css`,
  `portals/design/src/tokens.css`).
- **R5 — CSS-only tokens are declared, not smuggled.** `ch`-unit tokens
  (`prose-max` 65ch) and any token absent from the DTCG export get listed
  in the parity gate as non-portable CSS-only tokens (the
  `--p31-accent-hover` precedent, canon-v2 §16) until promoted into DTCG.

## Change request header (fill before touching the source)

```
Token(s):        p31.<category>.<property>
Type:            additive | value-change | rename | theme-add
Owner decision:  parallel-paths-enterprise-runbook.md §6 D<number>  (required for value-change)
Consumers:       <grep -rn "var(--p31-…)" across portals/shell/apps/packages — list them>
Fix-plan:        docs/fix-plans/<issue-id>.md
```

## Rollback

Propagation failure rolls back to the LAST green state: revert the step-1
source edit and re-run steps 2–3. Never hand-patch a derived file to
"unbreak" a surface — that creates a second fork. Surfaces on frozen
bundles keep their old values until their scheduled re-vendor leg; record
them as known-frozen, not as passers.