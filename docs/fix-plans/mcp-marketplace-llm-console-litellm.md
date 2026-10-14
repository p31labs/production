# fix: LLM Test Console default backend (LiteLLM :4001) not provisioned

<!-- P31-HEADER
id: p31_fix_plan_mcp_marketplace_llm_console_litellm_20261011_v1.0
type: fix-plan
component: portals/mcp-marketplace
status: open
retention: keep-forever
created: 2026-10-11T00:00:00Z
owner: will
-->

## Symptom

The runbook's LLM Test Console default is a local LiteLLM gateway at
`http://localhost:4001` (OpenAI-compatible `/v1/chat/completions`). Probing it
live from this environment (2026-10-11) returns nothing — the gateway is not
running here, so the console ships with a "backend unavailable" state as the
default experience.

## What the portal ships today

- `src/lib/llm.ts` probes the configured backend live (`GET /v1/models`) and
  reports `reachable` + a reason.
- The console settings panel (src/features/playground/components/LlmConsole.tsx)
  supports: local LiteLLM URL + model, hosted OpenAI-compatible provider
  (base URL + API key + model), or disable.
- The generation path (`POST /v1/chat/completions`) parses fenced/bare JSON
  arrays of `{tool, args, reason}` and executes them against the selected
  server through the registry proxy (or direct for inspected external URLs).

## Fix

1. Provision and run the LiteLLM gateway on the dev box:
   `pip install 'litellm[proxy]' && litellm --port 4001 --model gpt-4o-mini`
   (or point it at the local design-mcp/fleet models). Then the default
   config works out of the box.
2. For production: decide whether the portal should default to a hosted
   provider instead (the settings panel already supports it) — then flip
   `DEFAULT_LLM_CONFIG` in src/lib/llm.ts.
3. Consider a registry-side LLM proxy so the browser never holds an API key
   (keys today live in localStorage; acceptable for the console MVP, filed
   for review).

## Negative control

Disabled backend → explicit "LLM backend is disabled in settings" state;
unreachable backend → "backend <url> is unreachable — <reason>"; generation
input and button are disabled. No silent failure, no fake completions. The
state is verified live at the deployed URL (console shows
"backend unavailable" with the probe detail).