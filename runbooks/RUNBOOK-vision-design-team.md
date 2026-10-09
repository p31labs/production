# RUNBOOK-vision-design-team

> Operate the P31 Vision Design Team — the Workers AI specialty agents that
> review UI screenshots (layout parity, sensory safety, identity surface,
> motion/interaction). This is the operator manual for the `/vision` route,
> the four registered agents, the orchestrator/swarm wiring, and the portal
> review workflow.

## When to use
Run this when any of the following fires:
- A UI change landed and needs an **actual look** (not just regenerated pixel baselines) — the chat portal, forge, phos, or any P31 surface.
- Someone wants to call the vision agent and the route, agent, or review script is missing/misconfigured.
- A `/vision` deploy or binding change needs verifying.
- The design-team agents are down, misbehaving, or returning non-JSON.
- You are onboarding a new surface to the review workflow.

This is the "we just changed the pixels; did it actually look right?" procedure.

## Prerequisites
- **Workers AI credentials** for live inference: `CLOUDFLARE_ACCOUNT_ID` + `CF_API_TOKEN` (or the local Workers AI binding on `phos-ai-proxy`).
- **wrangler** available in the four worker dirs:
  - `apps/phos/worker-ai-proxy` (the AI-bound proxy, hosts `/vision`)
  - `workers (1)/mcp-registry` (agent catalog)
  - `workers (1)/mcp-x402-gateway` (orchestrator, routes `vision_review`)
  - `workers (1)/swarm-router` (K4 router, `/api/vision/*` → `/vision`)
- A screenshot to review (a Playwright baseline PNG, a `--image` file, or an HTTP URL).
- The chat portal's `scripts/vision-review.mjs` (the 4-specialist CLI).

## Steps
1. **Check the route is alive.**
   - `curl -s https://phos-ai-proxy.trimtab-signal.workers.dev/health` → `{"status":"ok","service":"phos-ai-proxy"}`.
   - `curl -s -i -X OPTIONS https://phos-ai-proxy.trimtab-signal.workers.dev/vision -H "Origin: https://phos.p31ca.org"` → HTTP 204 with `Access-Control-Allow-Origin` + `Access-Control-Allow-Headers: Content-Type, Authorization`.
2. **Call the vision agent directly (critique mode).**
   - Encode a screenshot and POST it:
     ```
     node -e "console.log(JSON.stringify({image: require('fs').readFileSync('<snapshot>.png').toString('base64'), median: 1}))" \
       | curl -s -X POST https://phos-ai-proxy.trimtab-signal.workers.dev/vision \
         -H "Content-Type: application/json" --data-binary @-
     ```
   - Expected: `{"layout_novelty":0-10,"visual_identity_distinctiveness":0-10,"component_pattern_novelty":0-10,"evidence":{...},"verdict":"pass|fail","critique":"...","mean":n,"runs":[...],"cached":false,"mode":"critique"}`.
3. **Run the four-specialist portal review** (the high-value workflow).
   ```
   cd portals/chat
   node scripts/vision-review.mjs --snapshots e2e/visual.spec.ts-snapshots
   ```
   - This POSTs each baseline to `/vision` with the layout-parity, sensory-safety, identity-surface, and motion-interaction prompts, printing each specialist's `verdict` + `mean` + `critique`.
   - Exit 0 = all specialists pass; `--fail-below N` makes it exit non-zero when a mean drops under N.
   - Single image: `node scripts/vision-review.mjs --image <path>` · JSON out: `--json`.
   - Force a fresh run (bypass the content-hash cache): `node scripts/vision-review.mjs --no-cache`.
   - Gate on a mean threshold: `--fail-below 6` exits non-zero when any specialist mean < 6. Default `--fail-below 0` disables the gate; a typical CI value is `6` (the rubric's "genuinely good" floor).
4. **Detect mode (geometry)** — locate an element, not judge it:
   ```
   curl -s -X POST <base>/vision -H "Content-Type: application/json" \
     -d "{\"image\":\"<b64>\",\"mode\":\"detect\",\"target\":\"user avatar\"}"
   ```
   → `{"mode":"detect","target":"user avatar","result":"..."}`.
5. **Deploy the four workers** (after a change): `wrangler deploy` in each of
   `apps/phos/worker-ai-proxy`, `workers (1)/mcp-registry`,
   `workers (1)/mcp-x402-gateway`, `workers (1)/swarm-router` — in that order
   (proxy first; the registry and router reference it by service binding).
6. **Verify the routing chain**:
   - `POST <swarm-base>/api/vision/<anything>` → must reach `/vision` (the swarm router rewrites `/api/vision/*` → `/vision`). Confirm with a 400/502 JSON from the vision handler, not a swarm 404.
   - Orchestrator tool path: a planner selecting `vision_review` calls `PHOS_AI_PROXY` service binding directly (no DNS 1042).

## How to verify
- **Route:** the OPTIONS preflight returns the correct `Access-Control-Allow-Origin`; a POST with `{}` returns `{"error":"Missing image"}` (400); a POST with a real image and no credentials returns `{"error":"vision scoring failed"}` (502) — the fail path is loud, never a crash.
- **Typecheck:** each worker dir → `npx tsc --noEmit` → zero `src/` errors.
- **Dry-run:** `npx wrangler deploy --dry-run` in `worker-ai-proxy` (shows `AI` binding) and `swarm-router` (shows `Services: GATEWAY` + `PHOS_AI_PROXY`).
- **Script:** `node --check scripts/vision-review.mjs` passes; `--image <png>` prints all four specialist verdicts.
- **Registry:** `GET <registry>/health` is live, and the catalog source (`workers (1)/mcp-registry/src/index.ts`) lists `vision-reviewer`, `vision-layout`, `vision-sensory`, `vision-identity`, each `readOnlySafe: true` with `binding: PHOS_AI_PROXY`.

## Common pitfalls
- **Error 1042 (worker→worker DNS)** — calling `*.trimtab-signal.workers.dev` over HTTP from another worker fails. Always use the **service binding** (`PHOS_AI_PROXY`) inside Workers; the public URL is only for browsers/CLI.
- **Swarm path mismatch** — `/api/vision/*` must be rewritten to `/vision` before forwarding, or phos-ai-proxy 404s. Checked in `swarm-router/src/index.ts`.
- **CORS** — `/vision` now handles OPTIONS itself. If you add another route, thread the `corsHeaders`/`respond` helpers through, don't return bare `Response.json`.
- **`instanceof File` in Workers** — workers-types' `FormDataEntryValue` is `string | Blob`; use `typeof audio === 'string'` + a `Blob` cast, not `instanceof File` (broke the transcribe handler previously).
- **tsconfig DOM conflict** — `worker-ai-proxy/tsconfig.json` must pin `"lib": ["ES2022"]` and NOT include DOM; `workers-types` conflicts with `lib.dom` (pre-existing defect, fixed).
- **Cache flap** — identical screenshots return cached scores (content-hash key in the isolate). If a re-review must be fresh, pass `--no-cache` to `vision-review.mjs` (forwards `noCache: true` to `/vision`, which skips the read AND the write), or send `"noCache": true` in a direct `/vision` body. The isolate cache also clears on cold start.
- **Specialist critique is the payload** — the four review prompts put the real findings in `critique`; do not read only `verdict`/`mean` or you miss the actual review.
- **Non-JSON model output** — the route falls back to `extractBalancedJson` then a prose regex; if a model returns prose with all three keys it still scores. A missing key fails loudly rather than fabricating a pass.

## Owner + last verified
`Owner: phos-ai-proxy / vision-reviewer` · `Last verified: 2026-10-02`

### 2026-10-02 reliability pass (this session)
- **Deployed all four workers** (proxy → registry → x402 → swarm). The proxy
  and swarm binaries were stale (predated `/vision`); redeployed so
  `POST /vision` returns `Missing image` and `mesh.p31ca.org/api/vision/*`
  routes to the handler (the rewrite now normalizes to exactly `/vision`,
  not `/vision/<suffix>` — the handler only matches an exact pathname).
- **Critique default model = `llama-3.2-11b`** (not gemma-4-26b). Gemma-a4b
  does not accept the OpenAI-style `image_url` message shape on this account
  (502). Llama is battle-tested in slop-judge. Gemma stays in the catalog.
- **`/vision` reliability fixes:**
  - A custom `rubric`/`prompt` attempt that fails now retries with the
    `DEFAULT_RUBRIC` fallback and returns `degraded:true` instead of a hard
    502 (llama-3.2-11b intermittently 502s on long/complex prompts).
  - **Cache key now includes rubric + model** — previously the key was the
    image hash alone, so a default-rubric request and a custom-rubric request
    for the SAME image collided and the cache served one review's (stale)
    scores to the other (measured: default returned 0 while noCache scored
    higher). Keys are now `sha256(image|rubric|model)`.
- **New: `packages/ui-forge`** — the tetrahedral SIC-POVM engine:
  - `scripts/gen-ui-schema.mjs` — canon→JSON schema (THAKI validity path),
    emits `ui-schema.json` (34 components, closed enum, p31.* tokens).
  - `src/gate.mjs` — the four-axis completeness gate (FLOOR 0.4, critical
    findings need ≥2 corroborating specialists, QBism ‖Δp‖<ε halt).
  - `src/grounder|dreamer|governor|shaper|center.mjs` — the generation
    tetrahedron + `ui-forge.mjs` CLI (backend spec → P31 component tree).
  - `sic-povm-gate.mjs` — the deploy-precheck CLI (runs the four /vision
    specialists → `runGate` → exit non-zero on incomplete/needs-revision).
  - `scripts/rldf-train.mjs` — RLDF (Apple pattern) training-data export from
    the Loom log (screenshot pairs → CLIP reward model; DPO/KTO → policy).
- **Loom v1.2 additive extension** — `chat.artifact.generated` now carries
  optional `screenshotRef` / `screenshotRef2` (R2 keys of the rendered +
  operator-improved artifact) so the RLDF reward model has image pairs.
- **`visual-gate.mjs` Phase 3** — runs the SIC-POVM gate over the candidate
  screenshots and refuses deploy when an axis collapses or a critical finding
  is corroborated.

### 2026-10-02 enterprise-hardening pass (this session)
- **`/vision` cross-model fallback chain** — a critique attempt now tries the
  requested model, then the rest of the catalog (llama → gemma → qwen) before
  the DEFAULT_RUBRIC fallback. A single platform outage (llama-3.2-11b has a
  documented 37-day degraded window) no longer collapses the measurement.
- **Neutral-failure response** — when every model in the chain fails, `/vision`
  returns `{ mean: 5, verdict: 'unmeasured', degraded: true }` with HTTP 200
  (plus `X-P31-Degraded: true`) instead of a hard 502, so the gate can
  distinguish "platform down" from "measured and collapsed".
- **Validate before cache write** — a result is only cached when `mean` is a
  number in [0,10] and `verdict` is present. Model output is external data,
  not a trust boundary; a flaky mean:0 is never cached and served forever.
- **`gate.mjs` `needs-review` status** — a review carrying `degraded:true`
  (instrument fault) yields `needs-review` (QBism low-confidence measurement),
  never a silent pass. `sic-povm-gate.mjs` and `visual-gate.mjs` thread the
  degraded flag from each `/vision` response.
- **Non-compensatory Governor** — `classifyAdmissibility` marks candidates
  admissible/inadmissible by hard rules (unknown type, no data binding, token
  violation). The Governor is a falsifier, not a ranker; no LLM has unilateral
  selection authority. The Center picks among admissible survivors by the
  deterministic score.
- **Center `nextGate`** — the synthesis now maps collapsed/degraded axes and
  corroborated findings to named, actionable fixes (e.g. sensory-safety
  collapsed → "reduce ambient opacity below 0.35"). The loop closes with
  "fix this", not "it failed".
- **Shared `retryFetch`** (`packages/ui-forge/src/retry.mjs`) — retries only
  429/5xx/network with exponential backoff; fails fast on 4xx and Workers AI
  deterministic codes 7502/7504/7506. Wired into the Dreamer provider and the
  gate CLI.
- **P3 RLDF screenshot capture** — `portals/chat/src/features/sandbox/loomEmit.ts`
  emits `chat.artifact.generated` Loom events with `screenshotRef` on artifact
  create and `screenshotRef2` on operator edit, feeding `rldf-train.mjs`.
  Capture is the serialized rendered fragment today (the preview iframe is
  opaque-origin sandboxed, so canvas PNG is blocked until a screenshot lib
  like html-to-image lands).

---

## Appendix A — the four specialist prompts (for tuning)

| id | name | focuses |
|---|---|---|
| `layout-parity` | Vision Layout Parity | sidebar proportion vs DeepSeek/Claude rail, brand placement, New-thread prominence, thread grouping, footer, "moved-down topbar?" |
| `sensory-safety` | Vision Sensory Safety | starfield subordination (~0.35-0.5 opacity), text contrast over stars, sidebar solidity, calming vs busy, reduced-states |
| `identity-surface` | Vision Identity Surface | user chip real vs placeholder, DID legibility at tertiary contrast, SpoonDial crowding, pre-mint "Claim did:key" state, mobile footer |
| `motion-interaction` | Vision Motion & Interaction | focus rings, pressed/hover affordances, composer send/stop/loading signals, control-bar intentionality, icon hit-area consistency |

Edit the prompts in `portals/chat/scripts/vision-review.mjs` (`SPECIALISTS`).

## Appendix B — files touched by this design team
| Path | Role |
|---|---|
| `apps/phos/worker-ai-proxy/src/vision.ts` | `/vision` handler: critique + detect modes, median-of-3, cache, CORS, **model picker catalog** |
| `apps/phos/worker-ai-proxy/src/index.ts` | route dispatch + `Env` (`PHOS_AI_PROXY`, fixed `JITTERBUG_PSK` corruption) |
| `workers (1)/mcp-registry/src/index.ts` | four `vision-*` catalog entries + `PHOS_AI_PROXY?: Fetcher` |
| `workers (1)/mcp-x402-gateway/src/orchestrator.ts` | `vision_review` tool + `executeTool` → `PHOS_AI_PROXY` |
| `workers (1)/mcp-x402-gateway/wrangler.toml` | `[[services]] PHOS_AI_PROXY → phos-ai-proxy` |
| `workers (1)/swarm-router/src/index.ts` | `/api/vision/*` → `/vision` rewrite |
| `workers (1)/swarm-router/src/topology.ts` | `V5 VisionAgent` vertex + `PHOS_AI_PROXY` env |
| `workers (1)/swarm-router/wrangler.toml` | `[[services]] GATEWAY` + `PHOS_AI_PROXY` |
| `portals/chat/scripts/vision-review.mjs` | 4-specialist CLI over Playwright baselines |

## Appendix C — the model picker
The `/vision` route resolves `body.model` through the catalog in `vision.ts`
(`VISION_MODELS`); unknown keys fall back to the mode default. `GET /models`
on `worker-ai-proxy` returns the catalog so portals/CLIs can render a picker.

| Mode | Key | Model | Quality | Cost $/M (in/out) | Context |
|---|---|---|---|---|---|
| critique | `gemma-4-26b` (**default**) | `@cf/google/gemma-4-26b-a4b-it` | high | 0.10 / 0.30 | 256K |
| critique | `llama-3.2-11b` | `@cf/meta/llama-3.2-11b-vision-instruct` | standard | 0.049 / 0.676 | 128K |
| critique | `qwen-3-27b` | `@cf/qwen/qwen3.8-27b` | premium | 0.45 / 3.20 | 262K |
| detect | `moondream-3.1` (**default**) | `@cf/moondream/moondream3.1-9B-A2B` | high | ~160ms detect | 32K |

**Use** — pick a model per review:
```
node scripts/vision-review.mjs --model gemma-4-26b   # critique default
node scripts/vision-review.mjs --model qwen-3-27b    # premium deep critique
node scripts/vision-review.mjs --models gemma-4-26b,llama-3.2-11b  # side-by-side
node scripts/vision-review.mjs --url https://localhost:5173        # + DOM measurement
curl <base>/models                                    # browse the catalog
```
- `--model` validates against the live `/models` catalog and **fails loudly on
  a typo** (exit 2 with the valid keys) instead of silently falling back.
- `--models a,b,c` runs the same review through each model for comparison.
- `--url <page>` launches a Playwright measurement pass (real contrast ratios
  + touch-target sizes, WCAG 2.2 style) appended to the specialist prompt —
  the "measure vs see" gap closer. Vision models judge impressions; the
  measurements provide ground truth. Requires `playwright` installed (it is).
- Each `/vision` response echoes `modelKey` / `modelLabel` so you can confirm
  what actually ran. Direct calls: `{"image":"...","model":"llama-3.2-11b"}`.

**Budget** — Workers AI free tier is **10,000 Neurons/day**, account-wide.
A typical vision review call is ~45–50 Neurons; the four-specialist review
over six baselines (24 calls) ≈ **1,000–1,200 Neurons** — well within free.
Keep the review sequential per specialist (the script already loops that way);
don't parallelize all 24 at once — unified-billing frontier limits are 50
req/min, and a retry storm can hit the cap.

**Follow-ups (not in this pass)** — Clef-Flash decision-model routing in the
orchestrator (`vision_review` tool selection), and AI Gateway server-side
fallback (Gemma → Llama) via `cf-aig-step`.