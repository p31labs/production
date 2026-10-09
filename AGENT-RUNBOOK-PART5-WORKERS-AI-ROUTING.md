<!-- P31-HEADER
id: p31_agent_runbook_part5_workers_ai_routing_20261004_v1.0
type: runbook
component: workspace
status: live
retention: keep-forever
created: 2026-10-04T00:00:00Z
owner: will
supersedes: p31_workers_ai_routing_runbook_20261004_v1.0
-->

# AGENT-RUNBOOK-PART5 — Workers AI Routing

**Authority:** Extends `AGENT-RUNBOOK.md` v3.0 and `AGENT-RUNBOOK-PART4-OPTIMIZATION.md`.
If a chat instruction conflicts, the runbook wins.

**Trigger:** The OpenCode Zen free tier hit its usage limit. This runbook routes the
P31 delegation model across the Workers AI catalog instead.

---

## Part 0 — The Ground Truth (verified on disk)

The catalog is `/home/p31/production/tools (1)/phos-forge/models-catalog.json`
(fetched 2026-09-28, 31 models). The router is
`/home/p31/production/tools (1)/phos-forge/router.mjs`.

**Three bugs found — fix these first:**

| # | Bug | Location | Effect |
|---|---|---|---|
| 1 | `loadCatalog()` reads a stale path | `router.mjs:173` → `production/...` | Catalog always empty; router throws "no model catalog" |
| 2 | `selectModel()` ignores `requirePaid` | `router.mjs:188` (no filter) | Can pick `glm-5.3`/`deepseek-v4-pro` on a free account |
| 3 | No free-tier code model has long context + function calling | catalog | The Worker role must use a general fc model, not a code-specialist |

---

## Part 1 — The Free-Tier / Paid Split

The catalog's `requirePaid` flag is the single most important field. Of 31 models:

- **7 `requirePaid: true`** — `glm-5.3`, `deepseek-v4-flash`, `deepseek-v4-pro`,
  `glm-5.3-flash`, `glm-5.2`, `kimi-k2.7-code`, `kimi-k2.6`
- **21 `requirePaid: false`** — the free tier
- **3 LoRA models** (`priceInUsdPerM: null`) — base models, not for routing

**The rule:** if the account token is a free-tier `cfut_` token, only
`requirePaid: false` models are routable. The router must filter on this — it
currently does not.

---

## Part 2 — The Free-Tier Model Inventory (what you can actually use)

Sorted by capability. Prices are per-million tokens (input/output).

| Model | Ctx | FC | Reasoning | Vision | Price in/out | Best for |
|---|---|---|---|---|---|---|
| `@cf/qwen/qwen3.8-27b` | 262K | ✓ | ✓ | ✓ | 0.45 / 3.20 | Orchestrator, synthesizer, evaluator |
| `@cf/nvidia/nemotron-3-120b-a12b` | 256K | ✓ | ✓ | — | 0.50 / 1.50 | Orchestrator, evaluator (strongest free reasoning) |
| `@cf/google/gemma-4-26b-a4b-it` | 256K | ✓ | ✓ | ✓ | 0.10 / 0.30 | Worker, cheap long-context, vision |
| `@cf/meta/llama-guard-3-8b` | 131K | — | — | — | 0.484 / 0.03 | Guard (safety classification only) |
| `@cf/zai-org/glm-4.7-flash` | 131K | ✓ | ✓ | — | 0.061 / 0.40 | Explorer, cheap reasoning+fc |
| `@cf/meta/llama-4-scout-17b-16e-instruct` | 131K | ✓ | — | ✓ | 0.27 / 0.85 | Vision tasks |
| `@cf/ibm-granite/granite-4.0-h-micro` | 131K | ✓ | — | — | 0.017 / 0.112 | Explorer (cheapest fc model) |
| `@cf/openai/gpt-oss-120b` | 128K | ✓ | ✓ | — | 0.35 / 0.75 | Worker (reasoning + fc), evaluator |
| `@cf/openai/gpt-oss-20b` | 128K | ✓ | ✓ | — | 0.20 / 0.30 | Worker (low latency) |
| `@cf/meta/llama-3.2-11b-vision-instruct` | 128K | — | — | ✓ | 0.049 / 0.676 | Design-parity screenshots |
| `@cf/mistralai/mistral-small-3.1-24b-instruct` | 128K | ✓ | — | — | 0.351 / 0.555 | Synthesizer fallback |
| `@cf/deepseek-ai/deepseek-r1-distill-qwen-32b` | 80K | — | ✓ | — | 0.497 / 4.88 | Reasoning (no fc) — evaluator only |
| `@cf/qwen/qwen2.5-coder-32b-instruct` | 32K | — | — | — | 0.66 / 1.00 | Pure code-gen (no tools) |
| `@cf/qwen/qwen3-30b-a3b-fp8` | 32K | ✓ | ✓ | — | 0.051 / 0.335 | Cheap reasoning — short context |
| `@cf/qwen/qwq-32b` | 24K | — | ✓ | — | 0.66 / 1.00 | Reasoning (no fc) |
| `@cf/meta/llama-3.3-70b-instruct-fp8-fast` | 24K | ✓ | — | — | 0.293 / 2.25 | fc, short context |

**The short-context warning:** most free models top out at 24–32K context. Only
four free models reach 128K+ with function calling: `qwen3.8-27b`,
`nemotron-3-120b-a12b`, `gemma-4-26b-a4b-it`, and `gpt-oss-120b`. The
orchestrator and evaluator roles MUST use one of these four — a 32K context
model will silently truncate a plan.

---

## Part 3 — The Role Map (free tier)

| Role | Primary | Fallback 1 | Fallback 2 |
|---|---|---|---|
| Orchestrator | `nemotron-3-120b-a12b` | `qwen3.8-27b` | `gpt-oss-120b` |
| Explorer | `glm-4.7-flash` | `granite-4.0-h-micro` | `gpt-oss-20b` |
| Worker | `gpt-oss-120b` | `gemma-4-26b-a4b-it` | `qwen3.8-27b` |
| Evaluator | `qwen3.8-27b` | `gpt-oss-120b` | `nemotron-3-120b-a12b` |
| Synthesizer | `qwen3.8-27b` | `mistral-small-3.1-24b` | `gemma-4-26b-a4b-it` |
| Guard | `llama-guard-3-8b` | — | — |
| Vision | `llama-3.2-11b-vision` | `llama-4-scout-17b-16e` | `gemma-4-26b-a4b-it` |

**Why these assignments:**
- **Orchestrator = `nemotron-3-120b-a12b`** — the strongest free reasoning model
  with 256K context and function calling. It needs to plan and decompose.
- **Explorer = `glm-4.7-flash`** — 131K context, function calling, reasoning, at
  $0.061/M. Cheap enough to grep-and-summarize at volume.
- **Worker = `gpt-oss-120b`** — function calling + reasoning + 128K. This is the
  free tier's best *agentic* code model. (`qwen2.5-coder-32b` is code-specialized
  but has NO function calling and 32K context — it cannot do tool-driven edits.)
- **Evaluator = `qwen3.8-27b`** — differs from the worker (`gpt-oss-120b`),
  satisfying the non-compensatory rule, with 262K context to re-read the whole
  diff plus its surrounding file.

---

## Part 4 — The Non-Compensatory Rule (preserved)

The worker and evaluator must differ at every layer of the fallback chain:

| Worker layer | Evaluator layer | Different? |
|---|---|---|
| `gpt-oss-120b` | `qwen3.8-27b` | ✓ |
| `gemma-4-26b-a4b-it` | `gpt-oss-120b` | ✓ |
| `qwen3.8-27b` | `nemotron-3-120b-a12b` | ✓ |

If the worker falls to `qwen3.8-27b`, the evaluator must fall to
`nemotron-3-120b-a12b` (not also `qwen3.8-27b`). The orchestrator tracks the
active model per role and enforces the separation — never let one model review
its own work.

---

## Part 5 — The Paid-Tier Upgrade Path

If/when a paid Workers AI plan is active, the same role map upgrades by
swapping in `requirePaid: true` models — but ONLY the top two roles justify the
cost:

| Role | Free (current) | Paid (upgrade) | Cost delta |
|---|---|---|---|
| Orchestrator | `nemotron-3-120b-a12b` | `deepseek-v4-pro-0813` | $0.50 → $1.32/M in |
| Worker | `gpt-oss-120b` | `deepseek-v4-flash-0731` | $0.35 → $0.44/M in |
| Evaluator | `qwen3.8-27b` | `glm-5.3` | $0.45 → $1.40/M in |

The explorer, synthesizer, guard, and vision roles stay free even on a paid plan —
there is no paid-tier model cheap enough to justify replacing `glm-4.7-flash`
($0.061/M) for grep-and-summarize work.

---

## Part 6 — The Router Fixes (3 patches)

### Fix 1 — the stale catalog path

`router.mjs:173` reads a path that no longer exists:

```js
// WRONG — stale path
const path = '/home/p31/production/tools/phos-forge/models-catalog.json'

// RIGHT — the catalog lives here
const path = '/home/p31/production/tools (1)/phos-forge/models-catalog.json'
```

### Fix 2 — filter `requirePaid`

`selectModel()` must exclude `requirePaid: true` models when the account is
free-tier. Add a filter, driven by an env flag:

```js
const REQUIRE_FREE = process.env.WORKERS_AI_FREE_TIER === '1'

function selectModel(tag) {
  const req = REQUIREMENTS_BY_INTENT[tag] || REQUIREMENTS_BY_INTENT.general
  let catalog = loadCatalog()
  if (catalog.length === 0) throw new Error('[router] no model catalog — run probe-models.mjs')

  let candidates = catalog.filter((m) => m.contextWindow > 0)
  if (REQUIRE_FREE) candidates = candidates.filter((m) => m.requirePaid !== true)
  // ... existing capability filters ...
}
```

### Fix 3 — add a `coding-free` intent

`REQUIREMENTS_BY_INTENT` has no entry that selects a free-tier agentic code
model. The `coding` intent's `nameMatch: /code|coder/i` filters everything down
to `qwen2.5-coder-32b` (no fc, 32K) — useless for tool-driven edits. Add:

```js
// Coding on the free tier: no code-specialist has fc + long context, so use
// the best general reasoning+fc model with the widest context.
codingFree: { functionCalling: true, reasoning: true, contextMin: 128_000, rank: 'highest-price' },
```

Then `selectModel('codingFree')` picks `nemotron-3-120b-a12b` or `gpt-oss-120b`.

---

## Part 7 — The Rate-Limit Playbook (Workers AI, not Zen)

Workers AI free tier meters by **neurons/day** (10,000 neurons), not requests.
Big models burn neurons fast. The playbook:

| Signal | Meaning | Action |
|---|---|---|
| HTTP 429 | Daily neuron budget exhausted | Stop; resume tomorrow or upgrade |
| HTTP 401 | Token invalid/expired | Refresh `CF_API_TOKEN` |
| HTTP 402 | Paid model on free account | The `requirePaid` filter is missing — fix it |
| Empty `content` on reasoning model | Reasoning starved the completion cap | Retry with `reasoning_effort: 'low'` (already in the router) |

The router already handles the empty-content case (`router.mjs:245–317`,
`MAX_ATTEMPTS = 4`, exponential backoff 1s/4s/9s). Do not re-implement it.

---

## Part 8 — The Gates (unchanged, still decisive)

Model routing does not weaken the correctness model:

- `audit-scope.mjs` — deterministic scope lock (Worker can only touch locked paths)
- `audit-redundancy.mjs` — no double-padding
- The evaluator advises; the gate decides
- Two-pass evaluator (adversarial-verify + self-pass on refutations)
- Confidence threshold (< 0.6 = soft warning)

The eight-step loop from PART3/PART4 is unchanged — only the model per step
changes (per the Part 3 role map).

---

## Part 9 — The One-Page Reference

**Role → model (free tier):**

| Role | Primary | Fallback 1 | Fallback 2 |
|---|---|---|---|
| Orchestrator | nemotron-3-120b-a12b | qwen3.8-27b | gpt-oss-120b |
| Explorer | glm-4.7-flash | granite-4.0-h-micro | gpt-oss-20b |
| Worker | gpt-oss-120b | gemma-4-26b-a4b-it | qwen3.8-27b |
| Evaluator | qwen3.8-27b | gpt-oss-120b | nemotron-3-120b-a12b |
| Synthesizer | qwen3.8-27b | mistral-small-3.1-24b | gemma-4-26b-a4b-it |
| Guard | llama-guard-3-8b | — | — |
| Vision | llama-3.2-11b-vision | llama-4-scout-17b-16e | gemma-4-26b-a4b-it |

**The rules:**

1. Filter `requirePaid` — the free tier cannot route paid models.
2. Only four free models have 128K+ context with fc — orchestrator and evaluator
   must use one of them.
3. The evaluator differs from the worker at every fallback layer.
4. The evaluator advises; the gate decides.
5. Two retries per model, then fall through; log every fallback.
6. Refresh the catalog monthly (`probe-models.mjs`); never hardcode model IDs.
7. Neurons/day, not requests/day — watch the budget on big models.

**The commands:**

```bash
# Refresh the catalog (source of truth for routing)
cd /home/p31/production/tools\ \(1\)/phos-forge
CLOUDFLARE_ACCOUNT_ID=ee05f70c889cb6f876b9925257e3a2fa CF_API_TOKEN=<token> \
  node scripts/probe-models.mjs

# Full gate
cd /home/p31/production && pnpm gate
```

---

*End of runbook. The free tier routes across 21 models, but only four have the
context + function calling the orchestrator and evaluator need. The router has
three bugs to fix (stale path, missing `requirePaid` filter, no `coding-free`
intent). The role map above assigns the right free model to each role, preserves
the non-compensatory rule, and keeps the deterministic gates as the final
authority.*