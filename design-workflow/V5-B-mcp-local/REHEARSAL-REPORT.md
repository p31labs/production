<!-- P31-HEADER
id: p31_v5_b_rehearsal_report_20261011_v1.0
type: rehearsal-report (audit-grade evidence)
component: design-workflow/V5-B-mcp-local
status: complete
retention: keep-forever
created: 2026-10-11T00:00:00Z
owner: lane-b-v5
-->

# Lane B v5.0 — Rehearsal Report (MCP local + dry-run)

Runbook: `DESIGN-SYSTEM-PARALLEL-PATHS-RUNBOOK-V5.md` §4.
All writes confined to `V5-B-mcp-local/`. No deploy commands run. Zero npm
installs. Real commands, pasted output.

## B-1 — Pre-flight reconciliation rehearsal: PASS (+ negative control PASS)

Temp mirror: `.neg-tmp/mirror/packages/design-core/src/mcp/` (copies
sha256-verified byte-identical to canon):
`tools.worker.ts` = `86984dd09f4d27…976b01`, `tool-registry.ts` =
`f50829c85756…927f5e7e3`.

**Negative control (pristine dispatch):**

```text
$ node ../V3-B-mcp/drift-detector.mjs .neg-tmp/mirror/…/tool-registry.ts .neg-tmp/pristine/tools.worker.ts
registry  (17 advertised): list_tokens, resolve_token, search_tokens, list_tokens_dtc,
  list_components, get_component, get_component_metadata, validate_component,
  resolve_brand, generate_component, list_recipes, get_recipe, convert_component,
  audit_css, validate_parity, get_ui_principles, get_review_rules
dispatch  (13 implemented): list_tokens, resolve_token, search_tokens, list_components,
  get_component, generate_component, list_recipes, get_recipe, convert_component,
  audit_css, validate_parity, get_ui_principles, get_review_rules
missing (registered, no handler): list_tokens_dtc, get_component_metadata,
  validate_component, resolve_brand
extra   (handler, no schema):     (none)
DRIFT: 4 tool(s) out of parity (17-vs-13 finding: 4 missing handlers).
exit=1
```

**Patch rehearsal:**

```text
$ patch -p1 --dry-run < handlers-proposal.diff   (cwd: .neg-tmp/mirror)
checking file packages/design-core/src/mcp/tools.worker.ts
checking file packages/design-core/src/mcp/brands.worker.ts
dry-run exit=0
$ patch -p1 < handlers-proposal.diff
patching file packages/design-core/src/mcp/tools.worker.ts
patching file packages/design-core/src/mcp/brands.worker.ts
apply exit=0          # brands.worker.ts (221 lines) created in the mirror
```

**Positive (patched dispatch):**

```text
$ node ../V3-B-mcp/drift-detector.mjs .neg-tmp/mirror/…/tool-registry.ts .neg-tmp/mirror/…/tools.worker.ts
registry  (17 advertised): list_tokens, …, get_review_rules
dispatch  (17 implemented): list_tokens, list_tokens_dtc, …, get_component_metadata,
  validate_component, resolve_brand, …, get_review_rules
missing (registered, no handler): (none)
extra   (handler, no schema):     (none)
DRIFT: none — registry and dispatcher are in parity.
exit=0
```

Result: 17=17 post-apply, exactly as v3.0 proved. The diff remains UNapplied
in real canon (per design-core AGENTS.md mistake #10 — a PR, never a fix in
place).

## B-2 — Local server: boot PASS; surface expectation FAILED-with-finding

Command: from `V3-B-mcp/`, `timeout 240 npx wrangler dev --port 8787
--log-level warn > V5-B-mcp-local/wrangler-dev.log 2>&1` (background).
Bundle graph resolved; no unresolvable imports. Log warnings only:
- wrangler out-of-date notice (npx resolved **3.114.17** from
  `/home/p31/node_modules`; global bin is 4.112.0).
- compatibility_date 2026-08-21 → local runtime falls back to 2025-07-18.

**GET /health — verbatim:**

```text
{"status":"ok","service":"p31-design-mcp","version":"2.2.0","tools":17}
```

**FINDING B2-F1 (surface drift):** runbook v5.0 §4 B-2 and the v4 packet
expect `{ status: "ok", tools: 5 }` and "exactly the 5 surface tools". The
on-disk worker serves **17** — the 5-tool public surface
(`public-surface.json`) is a planning artifact; design-core's
`tool-registry.ts`/`http-worker.ts` were never rewired to it.

**POST /mcp tools/list — verbatim (tool names):**

```text
count: 17
list_tokens, resolve_token, search_tokens, list_tokens_dtc, list_components,
get_component, get_component_metadata, validate_component, resolve_brand,
generate_component, list_recipes, get_recipe, convert_component, audit_css,
validate_parity, get_ui_principles, get_review_rules
```

**POST /mcp tools/call resolve_device_tier {width_dp:390, pointer:"coarse",
hover:"none"} — verbatim:**

```text
{"jsonrpc":"2.0","id":2,"result":{"content":[{"type":"text","text":"Unknown tool: resolve_device_tier"}],"isError":true}}
```

**POST /mcp tools/call resolve_device_tier {pointer:"stylus"} — verbatim:**

```text
{"jsonrpc":"2.0","id":3,"result":{"content":[{"type":"text","text":"Unknown tool: resolve_device_tier"}],"isError":true}}
```

**FINDING B2-F2 (tier tools unwired):** `resolve_device_tier` /
`get_tier_tokens` exist only as the unwired adapter `V3-B-mcp/mcp-tiers.mjs`.
No `mobile` tier object is served — the expected B-2 output cannot occur on
today's canon. Fail-closed holds in the degenerate sense (error object, never
a guessed tier), but note the shape is `result.content[].isError`, not a
JSON-RPC `error: {code: -32000}` object as `public-surface.json` specifies.

**Drift made live (silent contract violation demonstrated):** the worker
advertises `list_tokens_dtc` in `tools/list` and answers

```text
{"jsonrpc":"2.0","id":4,"result":{"content":[{"type":"text","text":"Unknown tool: list_tokens_dtc"}],"isError":true}}
```

…because the reconciliation PR has not landed. Contrast — a dispatched tool
works:

```text
resolve_token {path:"color.accent.default"} →
{"path":"color.accent.default","cssVar":"--p31-accent","value":"oklch(73% 0.18 195)"}
```

**Negative control (server down):** killed (SIGTERM, recorded PIDs 727366
wrapper / 727367 npm exec; exit 143). Then:

```text
curl http://localhost:8787/health  → http=000, curl exit=7 (connection refused)
ss -ltn | grep 8787                → no listener
```

## B-3 — Dry-run: PASS on both wranglers (+ negative control PASS)

From `V3-B-mcp/`, wrangler **4.112.0** (global, authenticated):

```text
$ timeout 300 wrangler deploy --dry-run 2>&1 | tail
 ⛅️ wrangler 4.112.0 (update available 4.149.0)
Total Upload: 144.95 KiB / gzip: 30.80 KiB
No bindings found.
--dry-run: exiting now.
```

`npx wrangler deploy --dry-run` (resolves 3.114.17) also passes:

```text
Total Upload: 164.46 KiB / gzip: 35.37 KiB
No bindings found.
--dry-run: exiting now.
```

**Negative control (broken main):** temp copy
`.neg-tmp/broken-main/wrangler.toml` with
`main = "../../packages/design-core/src/mcp/DOES-NOT-EXIST.ts"`:

```text
$ timeout 300 wrangler deploy --dry-run --config .neg-tmp/broken-main/wrangler.toml
✘ ERROR The entry-point file at "../../packages/design-core/src/mcp/DOES-NOT-EXIST.ts" was not found.
exit=1
```

## Verdict

Rehearsal executed end-to-end. The mechanics (patch applies clean, detector
flips 1→0, worker bundles + boots, dry-run uploads, negative controls all
fail as designed) are sound. **The packet's premise is stale**: the canonical
worker serves the 17-tool surface, not the promised 5-tool surface, and the
4-handler reconciliation has not landed in design-core. Deploy stays
operator-gated until (1) `handlers-proposal.diff` lands in design-core and
`drift-detector.mjs` exits 0 on real canon, and (2) the surface decision
(wire the 5 tools into design-core, or formally adopt the 17) is resolved.
Full operator text: `V5-B-mcp-local/mcp-packet-update.md`.