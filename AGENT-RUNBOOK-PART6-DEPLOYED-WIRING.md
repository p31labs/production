<!-- P31-HEADER
id: p31_agent_runbook_part6_deployed_wiring_20261004_v1.0
type: runbook
component: workspace
status: live
retention: keep-forever
created: 2026-10-04T00:00:00Z
owner: will
supersedes: p31_deployed_shell_wiring_runbook_20261004_v1.0
-->

# AGENT-RUNBOOK-PART6 — Deployed Shell Wiring

**Authority:** Extends `AGENT-RUNBOOK-PART5-WORKERS-AI-ROUTING.md`. If a chat
instruction conflicts, the runbook wins.

---

## Part 0 — The Gap (verified on disk)

| Layer | Local CLI | Deployed Function |
|---|---|---|
| Engine | `forge()` from `@p31ca/ui-forge/src/center.mjs` | same |
| Dreamer provider | `workersAiProvider` → `routeToWorkersAI` | default provider → `phos-ai-proxy` (HTTP 500) |
| Result | 3/3 runs pass, `tier: dream`, `gate: pass` | fails on first Dreamer call |

The deployed `portals/shell/functions/api/forge/stream.ts` passes only
`providerOpts: { endpoint: 'https://phos-ai-proxy…' }` — no explicit `provider` —
so `dream()` uses `defaultProvider`, which fetches the 500 proxy over HTTP.

---

## Part 1 — The Fix (Option A: Workers AI binding)

Replace the HTTP-fetch proxy with the Workers AI **binding** (`env.AI.run`).
No external fetch, no proxy, no service binding.

| Step | File | Change |
|---|---|---|
| 1 | `portals/shell/wrangler.toml` | add `[ai] binding = "AI"` |
| 2 | `portals/shell/functions/_lib/ledger.ts` | add `AI: Ai` to `Env` |
| 3 | `packages/ui-forge/src/provider-workers-ai-binding.mjs` | new binding provider |
| 4 | `portals/shell/functions/api/forge/stream.ts` | pass `provider: makeBindingProvider(env)` |

**Caveat:** Pages AI bindings may require dashboard config (Pages project →
Settings → Bindings → Workers AI → `AI`), not just `wrangler.toml`. If `env.AI`
is undefined after deploy, add the binding in the dashboard.

---

## Part 2 — The Provider Contract

`provider(prompt, opts) → Promise<string>` (a JSON array of candidate trees).
The engine already falls back to a deterministic catalog walk if the provider
throws — the button never dead-ends.

**JSON Mode:** the Dreamer needs structured output; Workers AI JSON Mode
(`response_format: { type: 'json_schema', json_schema }`) provides it. JSON Mode
cannot stream — irrelevant, because the engine emits its own `agent.*` SSE
events around the call; the model's tokens are internal.

**Fallback:** if JSON Mode fails (schema too complex / model unsupported), the
provider retries unconstrained; the Shaper repairs; `extractJsonArray` recovers.

---

## Part 3 — The Neuron Budget

Free tier: **10,000 Neurons/day, account-wide** (roughly 200–500 requests),
shared across the ~16 MCP servers + router + engine.

- Use a **non-reasoning** model for the Dreamer (`mistral-small-3.1-24b-instruct`,
  fc, 128K, no CoT). Reasoning models (`nemotron-3-120b-a12b`) burn neurons on
  chain-of-thought the Dreamer does not need.
- When neurons are exhausted, the provider throws → the engine's catalog walk
  produces a valid surface for free.

---

## Part 4 — The Gates

| Gate | Command | Proves |
|---|---|---|
| Offline smoke | `node scripts/ui-forge-smoke.mjs --skip-live` | engine logic (3 stages, ~400ms) |
| Live CLI forge | `node scripts/ui-forge-live.mjs` | router → Workers AI → `gate: pass` |
| Deployed forge | `curl -N -X POST …/api/forge/stream` | the deployed button emits `artifact.final` |

---

## Part 5 — The One-Page Reference

- **Gap:** deployed Function → `phos-ai-proxy` (500). Local CLI → router (works).
- **Fix:** `[ai] binding = "AI"` + binding provider + rewire `providerOpts`.
- **Model:** `@cf/mistralai/mistral-small-3.1-24b-instruct` (fc, 128K, no CoT).
- **Guarantee:** catalog-walk fallback keeps the button alive on neuron exhaustion.
- **The rule:** the binding provider is a *local* fallback to the router, not a
  replacement — the router stays the source of truth for model selection.

---

*End of runbook. The engine works; the router works; the deployed shell points at
a dead proxy. The fix is the Workers AI binding — no proxy, no service binding,
~30 lines plus a `wrangler.toml` entry.*