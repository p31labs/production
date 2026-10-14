# D-1 — RFC-0006 Design CI boundary mapping

<!-- P31-HEADER
id: p31_v4_d1_ci_mapping_20261011_v1.0
type: analysis
component: design-workflow/V4-D-design-ci
status: live
retention: keep-forever
created: 2026-10-11T00:00:00Z
owner: half-sour
-->

RFC-0006 §8.5 (Design CI boundary) prescribes: deterministic accessibility,
token, spacing, typography, and interaction-state checks, plus an AI-agent
usability simulation via browser-based task-completion testing. This maps P31's
existing gates onto the model and names the gaps.

| RFC-0006 check | P31 gate (file:line) | Status |
|---|---|---|
| Accessibility | `portals/design/scripts/contrast-audit.mjs` (WCAG 2.2 floor) + `V2-D-designv2/apca.mjs` (perceptual sanity, disclaimer verbatim) | ✅ covered |
| Token | `packages/design-core/scripts/token-audit.mjs` (OKLCH stance) + `V2-C-ci/dtcg-shape-audit.mjs` ($type/aliases/deprecated) | ✅ covered |
| Spacing | `portals/design/scripts/spacing-audit.mjs` | ✅ covered |
| Typography | `portals/design/scripts/token-tier-audit.mjs` (fluid clamp rem rule) | ✅ covered |
| Canon derivation | `tools/canon-audit/canon-source-audit.mjs` (shell vs canon) + `V2-C-ci/cross-target-parity.mjs` (incl. 24 LVGL defines) | ✅ covered |
| **Interaction states** | **GAP → `interaction-state.mjs` (this lane)** | ✅ now covered |
| Agent usability simulation | **GAP** — browser-based task-completion testing (the agent completes a task against the rendered UI) | ⏳ queued — requires a live build surface (portal node_modules absent this cycle); scaffold note below |

## Interaction-state gap (closed by this lane)

`interaction-state.mjs` renders at 320×844 (system Chromium, never downloads),
enumerates interactive elements, and asserts computed-style change for
`:hover` / `:focus-visible` (keyboard modality) / `:active`, with
`data-state-exempt` as the documented exemption.

- Positive fixture: `fixtures/interaction-good.html` → PASS (exit 0)
- Negative control: `fixtures/interaction-bad.html` (appearance:none +
  outline:none, no author states — the suppressed-focus-outline failure
  pattern) → FAIL all three states (exit 1)
- Served UI (`D-embedded/ui/index.html`): 0 interactive elements → vacuous
  pass, noted honestly

## Agent usability simulation (queued, not forgotten)

The task-completion leg needs a live build surface. Scaffold it as a
`task-completion.mjs` spec when the portal builds: an agent must (1) load the
catalog page, (2) resolve one token via the MCP console, (3) complete a
spoon-level toggle — recorded as steps with pass/fail. The harness from
`interaction-state.mjs` (probe/launch policy) is the base.