# Runbook: Forge Connection

## 1. Overview
- **Alert name:** `forge-connection`
- **Severity:** P1 (the entire generation pipeline is blocked when any connection in this map fails)
- **Related services:** ui-forge-studio, phos-ai-proxy, ui-forge engine, canon-mcp, design-core
- **Owner:** @phos-ai-proxy
- **Last written:** 2026-10-03
- **Last verified:** 2026-10-03 (all diagnostics re-run live against the deployed studio)
- **Drill cadence:** Quarterly (P1)
- **Drill status:** NOT YET DRILLED
- **Drill record:**
  - Date: (pending)
  - Participants: (pending)
  - Result: (pending — pass / partial / fail)
  - Issues found: (pending)
  - Estimated vs actual repair time: (pending)

**The connection map** — the four surfaces that must stay connected for the Forge
to turn a natural-language idea into a rendered surface. Every line below is a
connection with a contract, a failure mode, and a recovery path.

```
┌─────────────────────────────────────────────────────────────────────┐
│                       THE FORGE CONNECTION MAP                       │
│                                                                     │
│  Browser (Forge UI — family theme)                                  │
│    │                                                                │
│    ├── POST /api/brief ──────► Pages Function ──► phos-ai-proxy     │
│    │     (nl text → brief)       brief.ts        (service binding)  │
│    │                                                                │
│    ├── POST /api/refine ─────► Pages Function ──► phos-ai-proxy     │
│    │     (brief+instr → brief)   refine.ts       (service binding)  │
│    │                                                                │
│    ├── POST /api/schema ─────► Pages Function ──► ui-forge engine   │
│    │     (brief → schema)         schema.ts       (center.mjs)      │
│    │                                   │                            │
│    │                                   └──► phos-ai-proxy           │
│    │                                        (Dreamer via binding)   │
│    │                                                                │
│    └── GET /ui-schema ───────► phos-ai-proxy                        │
│          (component catalog — 34 components)                        │
│                                                                     │
│  canon-mcp (agents)                                                 │
│    └── get_ui_schema ────────► bundled ui-schema.json               │
└─────────────────────────────────────────────────────────────────────┘
```

**The four connection boundaries** (each has a schema + a validator — the
agent-to-agent composition contract):

| Boundary | Contract | Validator |
|---|---|---|
| `POST /api/brief` | `{ text } → { ok, brief: DesignBrief }` | brief.ts parse + shape check |
| `POST /api/refine` | `{ brief, instruction } → { ok, brief }` | brief.ts parse + fallback to current brief |
| `POST /api/schema` | `{ brief } → { ok, schema, gate, survivors, kills }` | ui-forge Governor admissibility |
| `GET /ui-schema` | `— → { schema, catalog }` (34 components) | JSON Schema conformance (no boolean-required) |

## 2. Symptoms

| Symptom | Likely connection | Severity |
|---|---|---|
| `POST /api/brief` returns 500 or times out | Pages Function → phos-ai-proxy binding | P1 |
| Brief is empty or has no title | LLM returned malformed JSON | P2 |
| `POST /api/refine` returns 500 | Pages Function → phos-ai-proxy binding | P1 |
| `POST /api/schema` returns `{ ok: false }` | ui-forge engine → Dreamer provider | P1 |
| `POST /api/schema` returns `survivors: []` | Dreamer run-dependence (known) | P2 — expected, not an incident |
| Schema compiles but renders `UnknownBlock` for every node | Component-name mismatch (schema ↔ design-core) | P1 |
| `GET /ui-schema` returns 404 or fewer than 34 components | phos-ai-proxy route missing / bundle stale | P1 |
| `get_ui_schema` MCP tool returns `ui_schema_unavailable` | Bundled schema file missing in canon-mcp | P1 |
| Fresh load shows cyan, not amber | `data-theme` not set to `family` | P2 |
| Lumi doesn't animate | `--motion-scale` not defined | P3 |
| Touch targets < 48px on mobile | Family floor violated | P2 |

## 3. Impact Assessment
- **Affected users:** anyone using the Forge to generate UI; agents calling `get_ui_schema`.
- **Business impact:** the entire generation pipeline is blocked. If `/api/schema`
  is down, no UI can be produced.
- **Upstream/downstream:** upstream is phos-ai-proxy (the Dreamer provider);
  downstream is the rendered artifact, the export pipeline (`briefToMarkdown`,
  `buildDocHtml`), and the deploy-precheck that validates against `/ui-schema`.
- **Blast radius:** contained to the Forge. The ui-forge engine tests (36) are
  independent and should still pass. `survivors: []` is a known, expected
  condition — **do not escalate it as an incident.**

## 4. Diagnostic Steps

> All commands were verified live against the deployed studio on 2026-10-03.
> Run them in order; the first failure tells you which scenario to enter.

### 4.1 Verify the studio is live
```bash
curl -s -o /dev/null -w "%{http_code}\n" https://p31-ui-forge-studio.pages.dev/
```
Expected: `200`.

### 4.2 Verify the theme is family (not rebel/cyan)
```bash
curl -s https://p31-ui-forge-studio.pages.dev/ | rg -o 'data-theme="[a-z]+"'
```
Expected: `data-theme="family"`.

### 4.3 Verify the schema host is up
```bash
curl -s -m 10 https://phos-ai-proxy.trimtab-signal.workers.dev/ui-schema | \
  node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const j=JSON.parse(s);console.log('components:',j.catalog.components.length)})"
```
Expected: `components: 34`.

### 4.4 Verify the brief endpoint
```bash
curl -s -m 40 -X POST https://p31-ui-forge-studio.pages.dev/api/brief \
  -H "Content-Type: application/json" \
  -d '{"text":"a calm dashboard for spoons with a meter and log"}' | \
  node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const j=JSON.parse(s);console.log('brief:',j.ok?'OK':'FAIL','| title:',j.brief?.title)})"
```
Expected: `brief: OK | title: <something warm>` (e.g. `Calm Dashboard for Spoons`).

### 4.5 Verify the refine endpoint
```bash
curl -s -m 40 -X POST https://p31-ui-forge-studio.pages.dev/api/refine \
  -H "Content-Type: application/json" \
  -d '{"brief":{"title":"Calm Dashboard","goal":"track spoons","structure":["meter"],"constraints":["calm"],"entities":[{"name":"spoon","fields":[{"name":"level","type":"number"}]}],"actions":[{"name":"log"}]},"instruction":"add a task entity"}' | \
  node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const j=JSON.parse(s);console.log('refine:',j.ok?'OK':'FAIL','| entities:',JSON.stringify(j.brief?.entities?.map(e=>e.name)))})"
```
Expected: `refine: OK | entities: ["spoon","task"]`.

### 4.6 Verify the schema endpoint (response shape)
```bash
curl -s -m 80 -X POST https://p31-ui-forge-studio.pages.dev/api/schema \
  -H "Content-Type: application/json" \
  -d '{"brief":{"title":"Calm Dashboard","entities":[{"name":"spoon","fields":[{"name":"level","type":"number"}]}],"actions":[{"name":"log"}]}}' | \
  node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const j=JSON.parse(s);console.log('ok:',j.ok,'| keys:',Object.keys(j).join(',')||'(none)','| survivors:',JSON.stringify(j.survivors||[]))})"
```
Expected: `ok: true | keys: ok,schema,gate,survivors,kills`. `survivors` may be
`[]` on any given run — that is Scenario F, not a schema failure.

### 4.7 Determine root cause
- If 4.1 fails → **Scenario A** (Pages deploy missing)
- If 4.2 fails → **Scenario B** (wrong theme)
- If 4.3 fails → **Scenario C** (schema host down / bundle stale)
- If 4.4 or 4.5 fails → **Scenario D** (brief/refine → Dreamer provider)
- If 4.6 returns `ok: false` or a non-`{ok,schema,gate,survivors,kills}` shape → **Scenario E** (schema endpoint / engine)
- If 4.6 returns `survivors: []` → **Scenario F** (Dreamer run-dependence — expected, not an incident)

## 5. Fix Steps

### Scenario A — Pages deploy missing
Rebuild and redeploy the studio:
```bash
cd portals/ui-forge-studio && pnpm build
npx wrangler pages deploy dist --project-name p31-ui-forge-studio --commit-dirty=true
```
Verify: re-run 4.1. Expected: `200`.
Estimated: 3–5 minutes.

### Scenario B — wrong theme
Check the html root:
```bash
rg -n 'data-theme' portals/ui-forge-studio/index.html
```
Expected: `data-theme="family"`. If it is `rebel`, change it, rebuild, redeploy
(Scenario A). Also confirm `src/index.css` overrides to the family tokens.
Verify: re-run 4.2.
Estimated: 2–5 minutes.

### Scenario C — schema host down / bundle stale
Check the proxy health, then the bundle:
```bash
curl -s https://phos-ai-proxy.trimtab-signal.workers.dev/health
```
If the worker is down, redeploy:
```bash
cd apps/phos/worker-ai-proxy && npx wrangler deploy
```
If the schema is stale, regenerate and copy:
```bash
cd packages/ui-forge && node scripts/gen-ui-schema.mjs
cp ui-schema.json apps/phos/worker-ai-proxy/src/ui-schema.json
cp ui-schema.json portals/ui-forge-studio/src/forge-schema.json
cd apps/phos/worker-ai-proxy && npx wrangler deploy
```
Verify: re-run 4.3. Expected: `components: 34`.
Estimated: 5–10 minutes.

### Scenario D — brief/refine endpoint 500s (Dreamer provider)
Check the Dreamer provider directly:
```bash
curl -s -m 30 -X POST https://phos-ai-proxy.trimtab-signal.workers.dev/ \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Return JSON: {\"title\":\"test\"}"}],"max_tokens":100,"temperature":0.3}'
```
If the provider is down, check Cloudflare status for Workers AI incidents.
If it is up but returns malformed JSON, the brief.ts `parseBrief` needs the
repair pass (see the `extractBalancedJson` pattern in
`apps/phos/worker-ai-proxy/src/vision.ts`).
Verify: re-run 4.4 then 4.5.
Estimated: 5–15 minutes.

### Scenario E — schema endpoint returns `ok: false`
Run the deterministic engine tests first:
```bash
cd packages/ui-forge && node --test test/*.test.mjs
```
Expected: `36 pass, 0 fail`. If the engine is green, the failure is in the
connection — check the Dreamer's JSON Mode empty-array guard:
```bash
rg -n "parsed.length > 0|Array.isArray\(parsed\)" packages/ui-forge/src/dreamer.mjs
rg -n "normalizeResponse|JSON.stringify\(response\)" packages/ui-forge/src/dreamer.mjs
```
If either guard is missing, add it, re-pack, redeploy:
```bash
cd packages/ui-forge && pnpm vendor:pack
cd portals/ui-forge-studio && pnpm add "@p31ca/ui-forge@file:vendor/p31-ui-forge-0.1.0.tgz"
pnpm build && npx wrangler pages deploy dist --project-name p31-ui-forge-studio --commit-dirty=true
```
Verify: re-run 4.6. Expected: `ok: true`.
Estimated: 5–15 minutes.

### Scenario F — `survivors: []` (the Dreamer's run-dependence)
**This is expected, not an incident.** The Dreamer occasionally produces
candidates that fail the Governor's non-compensatory admissibility (no binding
to the brief's entities/actions). The Forge's surface chapter already handles
this: the empty-artifact screen says *"The surface didn't quite come together
this time. That's okay — make the brief a little clearer and try again."* with
one button back to the brief. **Do not escalate.** If it happens repeatedly
for the same brief, refine the brief with clearer entities/actions and re-run.
Estimated: 0 minutes (no fix required).

## 6. Escalation

| If unresolved within | Contact | Channel |
|---|---|---|
| 30 minutes (P1) | @phos-ai-proxy | #p31-eng |
| 60 minutes (P1) | William R. Johnson | Direct |
| Backup | @canon-owner | #p31-design |

Do NOT escalate `survivors: []` (Scenario F) — it is a known, expected condition.

## 7. Post-Actions
- [ ] Update this runbook if new failure modes were discovered
- [ ] Record the incident in the Loom event log if the flow is instrumented
- [ ] Add a CI check: `gen-ui-schema.mjs --check` fails when the bundled copy (worker + studio + canon-mcp) differs from the generated one (prevents Scenario C)
- [ ] Re-drill quarterly; update the Drill record in §1 (date, participants, result, issues, estimated vs actual repair time)

---

## Appendix A — The MCP connection contract

If an agent needs to connect to the Forge's schema, the contract is:

```json
{
  "tool": "get_ui_schema",
  "input": { "mode": "summary" | "full" },
  "output": {
    "summary": { "components": [{ "name": "…", "category": "…", "importPath": "…" }], "enum": ["…"], "tokenNamespace": "p31.*" },
    "full": { "schema": { … }, "catalog": { "components": [ … ] } }
  }
}
```

The tool reads a bundled copy of `ui-schema.json`
(`packages/canon-mcp/src/ui-schema.json`) — self-contained, no cross-package
path coupling. The schema is also fetchable at
`https://phos-ai-proxy.trimtab-signal.workers.dev/ui-schema` (34 components).

## Appendix B — The agent-to-agent composition contract

The MCP research is explicit: *every agent-to-agent boundary gets a schema and a
validator.* The Forge's boundaries are the four endpoints in §1. The research
calls the trace discipline the "prove-the-source rule" — *capturing the tool-call
ID for every MCP call, stamping every artifact with the set of tool-call IDs it
derived from, and refusing to accept any retrieved fact into a downstream stage
that cannot be traced to a real external source.* The Forge's `DesignBrief` and
`TreeNode` are the artifacts; the `ok` flag is the trace.

## Appendix C — The family-floor audit

Every interactive element must meet the 48px floor. Run this audit against the
studio CSS:

```bash
rg -n "touch-min|touch-recommended|min-height: 48px|min-height: var" portals/ui-forge-studio/src/index.css
```

Expected: every interactive class (`.forge-primary`, `.forge-quiet`,
`.forge-refine-btn`, `.studio__menu-btn`, `.studio__menu button`) declares
`min-height: 48px` or `var(--p31-touch-min, 48px)`; the primary declares
`var(--p31-touch-recommended, 56px)`.

---

End of runbook. Last written: 2026-10-03. Drill status: NOT YET DRILLED. Next review: 2027-01-03.