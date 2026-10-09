# Design Parity — visual QA between canon and candidate

Local-first MCP server that answers one question mechanically:

> Does the candidate portal look like the canon reference?

It catches the class of failure the forge had on first deploy: wrong display font
(`h1` serif vs Inter), type-scale drift (45px vs 30px), light/dark token mismatch,
missing glass tokens, layout collapse. The agent sees *which* selector and *which*
computed property drifted — not "looks off".

## Tools

| Tool | Purpose |
|------|---------|
| `parity_compare` | screenshot `reference` vs `candidate` for a `route`; diff pixels + computed styles per selector → `pass` + diffs + report PNG paths |
| `parity_baseline` | capture a canon reference screenshot into `baselines/` |
| `parity_status` | list baselines + default routes |

## Usage (agent)

```
parity_compare {
  reference: "https://design.p31ca.org",
  candidate: "http://localhost:5180",   // or the deployed pages.dev URL
  route: "/catalog"
}
```

Returns `pass: false` with `styleDiffs[]` (selector × prop × reference × candidate)
and `layoutDiffs[]` (display-mode changes). Report PNGs are written to `baselines/`.

## Presets

`presets/forge-vs-design.json` — default reference/candidate/routes for the forge.
Load it and iterate routes.

## Registering

Already registered in `~/.config/opencode/opencode.jsonc` under `mcp.design-parity`.

## Baseline discipline

- `parity_baseline` seeds the reference set; re-run only when the canon itself
  intentionally changes (design portal redesign).
- A `parity_compare` `pass` against the canon is the definition of "looks like the
  design system". Do not hand-wave visual parity; run the tool.
## Deterministic anti-slop (resolved)

The anti-slop stack is:

1. `token-audit` (code purity — no raw hex, canon tokens) — BLOCKING
2. `parity` (canon visual conformance — pixelmatch + style) — BLOCKING
3. `slop-judge` (novelty — Workers AI vision, **content-hash cached + median-of-3**) — BLOCKING

The judge is deterministic: identical screenshot → identical cached score, and
median-of-3 kills the measured 0/3/1.33/2.33 swing on identical input.

## Isolated chrome baselines (Step 0 — the precision fix)

The `parity_chrome` gate captures each chrome component **in isolation** via
`chrome-harness/` (a dedicated Vite page per component, `?component=<Name>`),
NOT the catalog card crop. Isolated baselines (no card text / layout noise)
live in `chrome-baselines-isolated/`. Threshold: **2%** (was 10%).

- Capture/refresh: `node capture-isolated-baselines.mjs`
- Verify a component: `parity_chrome { name: "SidebarNav" }` (harness at :5191)
- Negative control proven: injected background change → ratio 0.999 FAIL; revert → ratio 0 PASS.
