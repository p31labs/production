<!-- P31-HEADER
id: p31_fix_plan_render_gate_workspace_anchor_20261012_v1.0
type: fix-plan
component: scripts
status: open
retention: archive-90d
created: 2026-10-12T00:00:00Z
owner: will
-->

# fix-plan: render-gate topbar anchor for the workspace portal (coverage gap)

## Symptom

Informational pass of `scripts/render-gate.mjs` against
`https://workspace.p31ca.org` reports:

```
⚠ topbar-missing: no visible [data-p31]/.topbar/header[role=banner] found
```

The workspace portal is a client-rendered shell (its served HTML has no
`<header>`, no `.topbar` class, no `[data-p31]` attribute), so the gate's
topbar anchor — the same one that works on the marketplace
(`header[role=banner]`) and passes on `design.p31ca.org` — cannot locate its
chrome. Without the anchor, the topbar-clip assertion (A3) is inert on that
target.

## Fix

Either:
1. Extend `scripts/render-gate.mjs` with a per-target anchor selector map
   (`--anchor <css>` or a TARGETS table) — the workspace shell's real chrome
   selector needs a 2-minute DOM inspection of `workspace.p31ca.org`; or
2. Adopt the `[data-p31]` attribute (or `role="banner"`) on the workspace
   portal's top-level chrome element, making the default anchor work for
   every portal.

## Acceptance

`node scripts/render-gate.mjs --info-targets https://workspace.p31ca.org`
reports no `topbar-missing` and runs A3 on the workspace root route.