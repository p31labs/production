# fix: registry POST /servers liveness probe fails with error 1042 for live https endpoints

<!-- P31-HEADER
id: p31_fix_plan_registry_liveness_1042_20261012_v1.0
type: fix-plan
component: workers/mcp-registry
status: resolved
retention: keep-forever
created: 2026-10-12T00:00:00Z
owner: lane-e (bridge/cli/sbom subagent)
-->

## Symptom

`p31 publish -submit` (Lane D-2, `cli/p31-publish.mjs`) reaches the deployed
registry `POST /servers`, but every community registration against a live
remote endpoint fails the registry's own liveness probe:

```
p31-publish: registry submission failed: HTTP 400 — liveness check failed:
initialize failed: {"code":-32000,"message":"Error POSTing to endpoint: error code: 1042\n"}
```

Reproduced twice (2026-10-12, both as the `p31` user):

1. `-n p31-publish-smoke-test` targeting `https://dads.trimtab-signal.workers.dev/mcp`
2. `-n p31-marketplace-registry-self` targeting `https://mcp-registry.trimtab-signal.workers.dev/mcp`

Both servers probe fine from the CLI directly (stateless 2026-07-28
`server/discover` + `tools/list` — 7 and 3 tools respectively) and from
`curl`; only the registry's edge-side probe (`probeEndpoint` in
`workers/mcp-registry/src/index.ts:886`) fails, with Cloudflare error 1042
(subrequest-limit class error) inside its `initialize` attempt. Consequence:
`POST /servers` is currently a dead path for any new remote server — the
registry answers 400 before the scanner/attestation stages ever run.

## Evidence (CLI-side payload is correct)

The CLI submit path is not the cause. A mock registry recording the POST
body accepted the exact same manifest submission:

- CLI → mock `POST /servers` payload:
  `{id, name, endpoint, category, description, tags, author, capabilities}`
  → 201, `registered` (2026-10-12).
- Live registry `GET /servers` → 200; live registry `POST /internal/usage`
  → 404 (Lane E-2 endpoint not deployed yet — see
  `p31-usage-counter-bridge-wiring.md`).

## Resolution (needs registry-side owner)

1. Investigate why `connectMcpClient`/`probeEndpoint` (
   `workers/mcp-registry/src/index.ts:779,886`) hits 1042 on outbound
   probing — check subrequest budget vs. the probe timeout/retry fan-out,
   binding-vs-fetch path, and whether the probe POST headers differ from
   what the CLI sends (the CLI's working stateless probe: headers
   `MCP-Protocol-Version: 2026-07-28` + `Mcp-Method: <method>`, body
   `params._meta` carrying `io.modelcontextprotocol/protocolVersion`,
   `clientCapabilities`, `clientInfo` — see `cli/p31-publish.mjs`
   `modernEnvelope`/`probeModern`).
2. Re-run `p31 publish -submit` against the live registry after the fix;
   expected: 201 + `note: 'registered as unverified — pending P31 review'`.

Parallel agent owning `workers/mcp-registry` — this file is the handoff;
Lane D-2's work is complete and blocked only on this for live submission.
## Resolution (2026-10-11/12)

`handleRegister` now resolves same-account workers.dev hostnames to service
bindings (`resolveSameAccountBinding`, derived from OFFICIAL_CATALOG
bindings) and sets `candidate.binding` before the liveness probe, bypassing
DNS 1042. Verified live: `p31-publish -submit` registered a probe entry via
the DADS binding (was 1042 before); test entry rejected/cleaned. Registry
v5ef1928e, tsc green, 106/106 tests.
