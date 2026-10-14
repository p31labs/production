# fix: bridge usage-counter write side — contract decisions + registry-404 until deploy

<!-- P31-HEADER
id: p31_fix_plan_usage_counter_bridge_wiring_20261012_v1.0
type: fix-plan
component: workers/mcp-x402-gateway/bridge
status: resolved
retention: keep-forever
created: 2026-10-12T00:00:00Z
owner: lane-e (bridge/cli/sbom subagent)
-->

## What landed (E-2 write side)

`workers/mcp-x402-gateway/bridge/src/index.mjs`:

- `reportToolUsage(server, tool)` (index.mjs:19-38): fire-and-forget POST to
  `POST /internal/usage` with header `X-Internal-Usage-Key` =
  `process.env.USAGE_INTERNAL_KEY`; 2.5s abort; every failure swallowed and
  warn-logged. Endpoint: `process.env.USAGE_ENDPOINT` (test override) else
  `https://mcp-registry.trimtab-signal.workers.dev/internal/usage`.
- Hook (index.mjs:104-114): after a successful `tools/call` dispatch
  (`msg.method === 'tools/call' && r && !r.error`), fired **after**
  `res.end()` so the tool response is flushed before the counter POST.
  `server` = the owning backend id read from the router's public
  `router.routeTable` (no router.mjs change); `tool` = `msg.params.name`.
- Negative-control state: `USAGE_INTERNAL_KEY` unset → counter off, silent,
  `[bridge] USAGE_INTERNAL_KEY unset — usage counters disabled` logged once
  per process (index.mjs:22-27). This is the deployed state — the systemd
  unit (`/etc/systemd/system/p31-mcp-bridge.service`) intentionally sets no
  key yet, so no edits there.

`cbs-verify.mjs` and the 403 LOVE enforcement path are untouched.

## Verified (2026-10-12)

1. Restart `sudo systemctl restart p31-mcp-bridge` → `/health` 200,
   180 tools, 12/12 backends healthy.
2. No-key negative control: 2 tool calls → results intact, exactly one
   disabled log line, zero usage POSTs.
3. Positive path (transient `systemctl set-environment` manager vars —
   removed afterwards, no unit-file edit): local recorder on :8200 captured
   the exact contract — `POST /internal/usage`, header
   `X-Internal-Usage-Key: test-internal-key`, body
   `{"server":"oasis","tool":"oasis_status"}`; tool response unaffected
   (200, full result).
4. Registry-404 path: live registry answers 404 on `POST /internal/usage`
   (endpoint not deployed yet). With the key set and the default endpoint,
   tool calls still return full results; the POST resolves silently (no
   spam). One transient `TypeError fetch failed` warn was observed on a
   boot-window instance only and did not reproduce (standalone and
   `systemd-run` fetches to the same endpoint resolve cleanly) — filed here
   as a watch item, not a blocker.

## Open / coordinate

- The counter lights up once the parallel agent deploys the registry
  `POST /internal/usage` (D1-backed) — no bridge change needed on deploy.
- `server` value decision: backend id (e.g. `oasis`, `love`, `registry`) —
  the stdio source servers behind the bridge — NOT the bridge's own
  `p31-mcp-x402-bridge` identity. If `GET /analytics/tools` joins on
  catalog server names, the registry side may need a mapping
  (backend id → deployed worker name); flagged for the registry-side owner.
- Production activation: set `USAGE_INTERNAL_KEY` in the systemd unit (or
  Secrets Store) after the registry endpoint ships; keep the bridge restart
  out of the 403/CBS path (regression: `scripts/cbs-settlement-smoke.mjs`).
## Resolution (2026-10-11/12)

`/internal/usage` deployed on the registry (D1 `usage_events`). Bridge unit
`Environment=USAGE_INTERNAL_KEY` set (systemd-analyze verify clean), bridge
restarted. Verified live: tools/call through the bridge → counter
incremented (1→2) → `GET /analytics/tools` reads `{server:oasis, tool:
oasis_status, count:2}` with admin secret. Fire-and-forget path confirmed
non-blocking.
