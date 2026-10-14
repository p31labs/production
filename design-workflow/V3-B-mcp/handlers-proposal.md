<!-- P31-HEADER
id: p31_v3_b1_handlers_proposal_20261011_v1.0
type: proposal (contribution — do NOT apply in place)
component: design-workflow/V3-B-mcp
status: proposal
retention: keep-forever
created: 2026-10-11T00:00:00Z
owner: lane-b
-->

# B1 — Contribution proposal: the 4 missing MCP handlers

Runbook v3.0 §5 B-1. `tool-registry.ts` advertises 17 schemas but
`tools.worker.ts` dispatches 13. The 4 registered-without-handler tools —
`list_tokens_dtc`, `get_component_metadata`, `validate_component`,
`resolve_brand` — are useful (W3C DTCG dump, structured component metadata,
compliance validation, brand theme resolution). This proposal adds them as
**additive, worker-safe** handlers. **It is a contribution proposal, never
applied here** (design-core AGENTS.md mistake #10: editing canon to work around
a gap is a proposal, not a fix in place; runbook §9.16 handoff rule).

## Evidence (real commands, 2026-10-11)

The drift sensor (`drift-detector.mjs`) on real canon:

```text
$ node drift-detector.mjs
registry  (17 advertised): list_tokens, resolve_token, search_tokens,
  list_tokens_dtc, list_components, get_component, get_component_metadata,
  validate_component, resolve_brand, generate_component, list_recipes,
  get_recipe, convert_component, audit_css, validate_parity,
  get_ui_principles, get_review_rules
dispatch  (13 implemented): list_tokens, resolve_token, search_tokens,
  list_components, get_component, generate_component, list_recipes,
  get_recipe, convert_component, audit_css, validate_parity,
  get_ui_principles, get_review_rules
missing (registered, no handler): list_tokens_dtc, get_component_metadata,
  validate_component, resolve_brand
DRIFT: 4 tool(s) out of parity (17-vs-13 finding: 4 missing handlers).
exit=1
```

Under the canonical `http-worker` a client calling any of the 4 today hits the
unknown-tool path (`tools.worker.ts:762`) — a silent contract violation against
`tools/list`.

## What the diff contains

`handlers-proposal.diff` (309 lines, `patch -p1 --dry-run` verified clean
against real canon; never applied):

| Hunk | File | Adds |
|---|---|---|
| 1 | `src/mcp/tools.worker.ts` imports (`:41-43`) | `import { TOKENS_DTC } from './tokens-dtc.js'`; `import { resolveBrandTokens } from './brands.worker.js'` |
| 2 | `tools.worker.ts` tokens section (`:557+`) | `case 'list_tokens_dtc'` — returns the full W3C DTCG 2025.10 object |
| 3 | `tools.worker.ts` components section (`:591+`) | `case 'get_component_metadata'`, `case 'validate_component'`, `case 'resolve_brand'` |
| 4 | NEW `src/mcp/brands.worker.ts` (221 lines) | worker-safe `BRAND_TOKENS` + `THEME_TOKENS` + `resolveBrandTokens()` mirror |

## Why additive and worker-safe

1. **Additive, not reductive.** No existing `case` is touched; the 4 new cases
   slot between existing ones. Registry count stays 17; dispatcher goes
   13 → 17. Nothing is renamed, no schema changes, no consumer breakage
   (runbook §11 stop-condition: nothing live breaks).
2. **Worker-safe — no fs, no Node-only APIs.** All four handlers use data
   already importable in the worker graph:
   - `TOKENS_DTC` — generated pure-data module (`tokens-dtc.ts:1` "DO NOT
     EDIT"), no runtime imports.
   - `COMPONENT_DEFS` — already imported by `tools.worker.ts:11`.
   - `validate_component` — pure regex heuristics on the `code` arg (hex/rgba),
     same semantics as the stdio `tools.ts:242-268` version.
3. **`resolve_brand` required a new pure module.** The stdio reference imports
   `resolveBrandTokens` from `../theming/theme-store.ts`, which imports
   `zustand` + `culori` at module top level (`theme-store.ts:7-9`) with a
   top-level `create(...)(persist(...))` store — not importable into a
   Cloudflare Worker bundle without dragging the whole store. `brands.worker.ts`
   is the byte-for-byte extraction of the const data
   (`BRAND_TOKENS` theme-store.ts:204-230, `THEME_TOKENS` :51-202) and merge
   logic (:232-241) with those imports removed. It is a **mirror, not a new
   source of truth** — if canon changes, it must be regenerated (flagged in its
   file header).
4. **Fail-closed preserved.** `resolve_brand` rejects unknown brands with an
   error result (never a guess); `get_component_metadata` /
   `validate_component` return `isError` on unknown components. All four
   propagate through `handleToolCall`'s existing try/catch
   (`tools.worker.ts:764-768`).

## Verification performed

- `node --check tools.worker.patched.ts` and `node --check brands.worker.ts` —
  syntax clean under Node 24 type-stripping.
- `patch -p1 --dry-run` against `/home/p31/production` — both files check
  cleanly (proposal valid; still not applied).
- Post-reconciliation parity: applying the diff is exactly what closes the
  drift — the 4 missing names become dispatched, registry (17) = dispatcher
  (17), `drift-detector.mjs` exits 0 (see B-3 checklist, reconciliation lands
  before deploy).

## Files

- `handlers-proposal.diff` — the proposal (never applied).
- `drift-detector.mjs` + `fixtures/` — the sensor that proves the drift and its
  negative controls (match → exit 0, mismatch → exit 1).