# Runbook: Brain-Dump-to-Schema Flow

## 1. Overview
- **Alert name:** `brain-dump-to-schema-flow`
- **Severity:** P2 (feature pipeline — deploy-blocking when broken)
- **Related services:** ui-forge-studio, phos-ai-proxy, canon-mcp, design-core
- **Owner:** @phos-ai-proxy
- **Last written:** 2026-10-03
- **Last verified:** 2026-10-03 (all five stages verified live)
- **Drill cadence:** Quarterly (P2)
- **Drill status:** NOT YET DRILLED
- **Drill record:**
  - Date: (pending)
  - Participants: (pending)
  - Result: (pending — pass / partial / fail)
  - Issues found: (pending)
  - Estimated vs actual repair time: (pending)

**The flow** — a five-stage pipeline that turns a natural-language design idea into a
validated, machine-readable component schema, rendered live in the studio:

```
NL Brain Dump → DesignBrief.md → Agent Refinement → Instance Schema → Rendered Surface + Export
```

**Stage status — READ THIS FIRST.** All stages are **[SHIPPED]** and verified live
against `https://p31-ui-forge-studio.pages.dev`. The studio is the family-side
four-chapter app (Welcome → Your idea → Your brief → Your surface); the pipeline
below is the engine behind the chapters. For connection-level failures (a 500, a
wrong theme, a missing schema host), use `RUNBOOK-forge-connection.md` instead.

| Stage | Endpoint / surface | Status |
|---|---|---|
| 1. Intent Extract | `POST /api/brief` | **[SHIPPED]** |
| 2. Brief Emit | `POST /api/brief` → DesignBrief.md | **[SHIPPED]** |
| 3. Refinement | Studio refine row (bidirectional) | **[SHIPPED]** |
| 4. Schema Compile | `POST /api/schema` | **[SHIPPED]** |
| 5. Render + Export | Studio Surface chapter + menu exports | **[SHIPPED]** |
| Schema host | `GET /ui-schema` (phos-ai-proxy) | **[SHIPPED]** |
| Schema tool | `get_ui_schema` (canon-mcp) | **[SHIPPED]** |

## 2. Symptoms

| Symptom | Likely stage | Severity |
|---|---|---|
| `POST /api/brief` returns 500 / times out | Stage 1/2 — Dreamer provider down | P1 |
| Brief is empty or has no title | Stage 1/2 — LLM returned malformed JSON | P2 |
| `POST /api/refine` returns 500 | Stage 3 — Dreamer provider down | P1 |
| `POST /api/schema` returns `{ ok: false }` | Stage 4 — engine → Dreamer provider | P1 |
| `POST /api/schema` returns `survivors: []` | Stage 4 — Dreamer run-dependence (known) | P2 — expected, not an incident |
| `GET /ui-schema` returns 404 or fewer than 34 components | Schema host (SHIPPED) | P1 |
| Schema compiles but renders `UnknownBlock` for every node | Stage 5 (SHIPPED) — component-name mismatch | P1 |
| `get_ui_schema` MCP tool returns `ui_schema_unavailable` | Schema tool (SHIPPED) — bundled file missing | P1 |
| Brief export downloads but is empty | exportDoc / brief serialization | P3 |
| Studio shows an old component catalog | Schema bundle out of sync | P2 |
| Fresh load shows cyan, not amber | `data-theme` not set to `family` | P2 |

## 3. Impact Assessment

- **Affected users:** operators using the studio to forge UI surfaces; agents consuming
  the `get_ui_schema` MCP tool.
- **Business impact:** the feature pipeline is blocked — no new surfaces can be
  generated. If `/ui-schema` is down, the deploy-precheck cannot validate.
- **Upstream/downstream:** upstream is phos-ai-proxy (Dreamer provider) and canon-mcp
  (schema tool); downstream is the studio render, exportDoc, and the forge portal's
  Schema route.
- **Blast radius:** contained to the studio + forge schema consumer. The ui-forge
  package tests (36) are independent and should still pass. `survivors: []` is a
  known, expected condition — **do not escalate it as an incident.**

## 4. Diagnostic Steps

> All stages are shipped. For connection-level failures (a 500, wrong theme,
> missing schema host), run `RUNBOOK-forge-connection.md` §4 instead — this
> runbook's diagnostics cover the schema content and the engine's determinism.

### 4.1 Verify the schema is hosted and valid [SHIPPED]
```bash
curl -s -m 10 https://phos-ai-proxy.trimtab-signal.workers.dev/ui-schema | \
  node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const j=JSON.parse(s);console.log('components:',j.catalog.components.length);console.log('enum:',j.schema.properties.type.enum.length);})"
```
Expected: `components: 34`, `enum: 34`.

### 4.2 Verify the studio is live [SHIPPED]
```bash
curl -s -o /dev/null -w "%{http_code}\n" https://p31-ui-forge-studio.pages.dev/
```
Expected: `200`.

### 4.3 Verify the studio is on the family theme [SHIPPED]
```bash
curl -s https://p31-ui-forge-studio.pages.dev/ | rg -o 'data-theme="[a-z]+"'
```
Expected: `data-theme="family"`.

### 4.4 Run the ui-forge test suite (deterministic core) [SHIPPED]
```bash
cd packages/ui-forge && node --test test/*.test.mjs
```
Expected: `36 pass, 0 fail`.

### 4.5 Verify the schema endpoint returns the live shape (silent-zero check) [SHIPPED]
```bash
curl -s -m 40 -X POST https://p31-ui-forge-studio.pages.dev/api/schema \
  -H "Content-Type: application/json" \
  -d '{"brief":{"title":"Smoke","entities":[{"name":"a","fields":[{"name":"v","type":"number"}]}],"actions":[{"name":"log"}]}}' \
  | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const j=JSON.parse(s);console.log('ok:',j.ok,'| keys:',Object.keys(j).join(',')||'(none)','| survivors:',JSON.stringify(j.survivors||[]))})"
```
Expected: `ok: true | keys: ok,schema,gate,survivors,kills`. `survivors` may be
`[]` on any given run — that is the known run-dependence (Scenario B), not a failure.

### 4.6 Determine root cause
- If `/ui-schema` fetch fails or returns fewer than 34 components → **Scenario A** (schema bundle stale)
- If `survivors: []` (and the response shape is otherwise `ok: true`) → **Scenario B** (Dreamer run-dependence — expected, not an incident)
- If `ok: false` or a different response shape → connection-level; run `RUNBOOK-forge-connection.md`
- If schema compiles but renders `UnknownBlock` → **Scenario C** (component-name mismatch)
- If `get_ui_schema` MCP returns `ui_schema_unavailable` → **Scenario D** (bundled file missing)

## 5. Fix Steps

### Scenario A — Schema bundle stale [SHIPPED]
Regenerate the schema from the canon, copy to the worker + studio, redeploy:
```bash
cd packages/ui-forge && node scripts/gen-ui-schema.mjs
cp ui-schema.json apps/phos/worker-ai-proxy/src/ui-schema.json
cp ui-schema.json portals/ui-forge-studio/src/forge-schema.json
cd apps/phos/worker-ai-proxy && npx wrangler deploy
```
Verify: re-run 4.1. Expected: `components: 34`.
Estimated: 3–5 minutes.

### Scenario B — Dreamer returns survivors: 0 (run-dependence, expected) [SHIPPED]
The Dreamer occasionally produces candidates that fail the Governor's
non-compensatory admissibility (no binding to the brief's entities/actions), so
`survivors` is `[]` despite `ok: true`. **This is expected, not an incident.** The
studio's Surface chapter already handles it: the empty-artifact screen says *"The
surface didn't quite come together this time. That's okay — make the brief a
little clearer and try again."* with one button back to the brief.
Verify the response shape is correct before treating anything as a failure:
```bash
curl -s -m 40 -X POST https://p31-ui-forge-studio.pages.dev/api/schema \
  -H "Content-Type: application/json" \
  -d '{"brief":{"title":"Smoke","entities":[{"name":"a","fields":[{"name":"v","type":"number"}]}],"actions":[{"name":"log"}]}}' \
  | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const j=JSON.parse(s);console.log('ok:',j.ok,'| keys:',Object.keys(j).join(',')||'(none)')})"
```
Expected: `ok: true | keys: ok,schema,gate,survivors,kills`. If `ok: false` or a
different shape, that is a connection failure — run `RUNBOOK-forge-connection.md`.
If `survivors: []` recurs for the same brief, refine the brief with clearer
entities/actions. Do not escalate. Estimated: 0 minutes (no fix required).

### Scenario C — Schema renders UnknownBlock for every node [SHIPPED]
The generated schema's component names don't match the design-core exports the
`TreeRenderer` resolves against. Compare the catalog against the schema enum:
```bash
cd portals/ui-forge-studio && node -e "const c=require('./node_modules/@p31ca/design-core/src/genui/catalog.json'); console.log(c.components.map(x=>x.name).join(', '))"
node -e "const r=require('./src/forge-schema.json'); console.log(r.schema.properties.type.enum.join(', '))"
```
If names differ (e.g., schema uses `SidebarNav` but the catalog exports `NavRail`),
update `gen-ui-schema.mjs` to use the catalog's canonical names, regenerate, redeploy.
Estimated: 5–10 minutes.

### Scenario D — get_ui_schema returns ui_schema_unavailable [SHIPPED]
The MCP tool reads a bundled copy (`packages/canon-mcp/src/ui-schema.json`). If it is
missing, copy from the canonical schema:
```bash
cp packages/ui-forge/ui-schema.json packages/canon-mcp/src/ui-schema.json
cd packages/canon-mcp && npx tsc --noEmit
```
Verify: tsc clean. Estimated: 2–5 minutes.

### Scenario E — Schema endpoint returns `ok: false` or a non-standard shape [SHIPPED]
The schema endpoint should always return `{ ok, schema, gate, survivors, kills }`.
If it returns `ok: false` or a different shape, the failure is at the
connection level (engine → Dreamer provider, or the provider itself). Run
`RUNBOOK-forge-connection.md` §4–§5 (Scenarios D and E) for the recovery steps —
verify the Dreamer JSON-mode empty-array guards in `dreamer.mjs`, re-pack and
redeploy if they're missing, and confirm the engine tests (36) still pass.

## 6. Escalation

| If unresolved within | Contact | Channel |
|---|---|---|
| 30 minutes (P2) | @phos-ai-proxy | #p31-eng |
| 60 minutes (P1) | William R. Johnson | Direct |
| Backup | @canon-owner | #p31-design |

Do NOT escalate `survivors: []` (Scenario B) — it is a known, expected condition.

## 7. Post-Actions
- [ ] Update this runbook if new failure modes were discovered
- [ ] Record the incident in the Loom event log if the flow is instrumented
- [ ] Add a CI check: `gen-ui-schema.mjs --check` fails when the bundled copy differs from the generated one (prevents Scenario A)
- [ ] Re-drill quarterly; update the Drill record in §1 (date, participants, result, issues, estimated vs actual repair time)

---

## Appendix A — Stage status

| Stage | Status | Shipped by |
|---|---|---|
| 1. Intent Extract (`/api/brief`) | **[SHIPPED]** | B1 |
| 2. Brief Emit (DesignBrief.md) | **[SHIPPED]** | B1 |
| 3. Refinement refine row | **[SHIPPED]** | B2 |
| 4. Schema Compile (`/api/schema`) | **[SHIPPED]** | B3 |
| 5. Render + Export (Surface chapter) | **[SHIPPED]** | current |
| Schema host (`/ui-schema`) | **[SHIPPED]** | current |
| Schema tool (`get_ui_schema`) | **[SHIPPED]** | current |

All stages are shipped and verified live. The description is the center of the flow
(research: context-mediated domain adaptation — vague prompts evolve into precise
specs through iteration). The schema is derived from the description; the artifact
is rendered from the schema. Connection-level failures are covered by
`RUNBOOK-forge-connection.md`.

## Appendix B — compyl pipeline reference (schema-compile stage)

The schema stage follows the multi-stage LLM-compiler pattern (compyl):

| Stage | Purpose | Failure mode |
|---|---|---|
| 1. Intent Extractor | Entities, roles, features from the brief | Missing entities |
| 2. System Designer | Pages, component arrangement | Inconsistent structure |
| 3. Schema Generator | Full instance schema (component-tree JSON) | Invalid component refs |
| 4. Validator + Repairer | Consistency + targeted repair | Cross-reference mismatch |

Design principles: temperature decreases across stages (creativity first, precision
last); validation is strict at every stage; repair is targeted (re-generate broken
parts only, not a full retry).

## Appendix C — DesignBrief.md structure [SHIPPED]

The exportable brief (Stage 2, via `exportBrief.ts` `briefToMarkdown`) follows the
4-layer model:

| Layer | Content | Source |
|---|---|---|
| Goal | Core users, success criteria, the single most important thing | Intent extractor |
| Structure | Full page list, per-page states | System designer |
| Constraints | Brand rules, prohibitions, accessibility | Intent extractor + canon |
| Reference | Style references, exclusions | Operator (optional) |

The brief is a compass, not a checklist — it captures intent, not UI.

## Appendix D — Schema contract validation

The ui-schema.json is the contract. Validate it has no boolean-`required` violations:
```bash
cd packages/ui-forge && node -e "
const r = require('./ui-schema.json');
const bad = Object.keys(r.schema.\$defs || {}).filter(k => {
  const d = r.schema.\$defs[k];
  return typeof d.required === 'boolean';
});
console.log('boolean-required violations:', bad.length);
process.exit(bad.length ? 1 : 0);
"
```
Expected: `boolean-required violations: 0`.

## Appendix E — Related runbooks

| Runbook | When to use |
|---|---|
| RUNBOOK-forge-connection.md | A connection fails — a 500, wrong theme, missing schema host |
| RUNBOOK-sic-povm-gate.md | The SIC-POVM gate fails / reports needs-review |
| RUNBOOK-vision-measurement.md | `/vision` is unreachable or degraded |
| RUNBOOK-rldf-training.md | RLDF training data is low or export fails |

---

End of runbook. Last written: 2026-10-03. Last verified: 2026-10-03 (all stages live).
Drill status: NOT YET DRILLED. Next review: 2027-01-03.