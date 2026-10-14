<!-- P31-HEADER
id: p31_fix_plan_health_gate_load_sensitivity_20261012_v1.0
type: fix-plan
component: scripts
status: resolved
retention: archive-90d
created: 2026-10-12T00:00:00Z
owner: will
-->

# fix: mcp:health gate flapped false-negatives under host load

## Symptom

`mcp:health` flapped across consecutive runs during the canon-v2 wave:
16/16 → 5/16 → 2/16 (marge, component-registry) → 0 → 2/16, while host load
average sat at ~13.8 (desktop browsers + build agents). The failing servers
rotated across LOCAL stdio spawns — a 5s probe timeout being exceeded
intermittently, not a real outage (every failing server passed on re-run).

## Root cause

`scripts/mcp-health-check.mjs` used `TIMEOUT_MS = 5000` for both HTTP fetches
and stdio spawn+handshake. Under CPU contention the stdio servers (node spawn
+ SDK-era handshake) occasionally exceed 5s → false UNHEALTHY. A gate that
flaps false-negatives erodes the trust the whole harness depends on.

## Fix (2026-10-12)

`TIMEOUT_MS` 5000 → 10000 (still a tight deploy-gate bound; the JSON-RPC
probe's original intent was an honest health signal, not a latency budget).

## Verification

3 consecutive runs after the bump → all 16/16 healthy, no flapping.