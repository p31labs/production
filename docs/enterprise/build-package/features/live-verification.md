<!-- P31-HEADER
id: p31_feature_live_verification_20261007_v1.0
type: spec
component: shell
status: live
retention: keep-forever
created: 2026-10-07T00:00:00Z
owner: will
-->

# Feature: Live Verification

## The invariant

The behaviours the shell depends on at runtime are exercised against the real
Workers runtime, not a stub: the WebSocket upgrade completes, the Durable Object
hibernates and recovers its state, a trace reaches a configured destination, and
a user's own key routes a turn. A behaviour that has never executed in the
runtime is not verified, however many gates assert its source.

## The boundary

This feature does **not** own:

- **The deploy** — `wave-12-deploy.md` ships the code.
- **The span contract** — `observability.md` defines the attributes. This
  feature proves they arrive.
- **The room's behaviour** — Waves 8/9a define sync, awareness, and hibernation.
  This feature proves they run.
- **BYOK's crypto** — `credentials.ts` defines the store. This feature proves
  the key routes.

Four rules this feature owns outright:

1. **Tests run inside the Workers runtime, not beside it.**
   `@cloudflare/vitest-pool-workers` executes in workerd with real DO bindings
   and real WebSockets. A Node-side test of a DO is a test of a different
   program.
2. **`isolatedStorage: false` is mandatory for WebSocket tests.** Using
   WebSockets with Durable Objects with `isolatedStorage` on is unsupported; a
   config that omits this fails in a way that looks like a WebSocket bug.
3. **An eviction is a named test, not an assumption.** `evictDurableObject`
   simulates the production lifecycle; the hibernation recovery path
   (`getWebSockets()` + `deserializeAttachment` + storage reload) is exercised
   explicitly, because it has never run.
4. **A trace is verified by arrival, not by configuration.** `[observability]
   enabled = true` is a config assertion; a span appearing in the destination is
   the verification. The package has only ever asserted the first.

## The implementation

| File | What it provides |
|---|---|
| `portals/shell/vitest.workers.config.ts` | the `cloudflareTest()` pool config with `isolatedStorage: false` |
| `portals/shell/test/room.spec.ts` | the DO round-trip: upgrade, message, close |
| `portals/shell/test/hibernation.spec.ts` | the eviction + recovery test |
| `portals/shell/test/tsconfig.json` | the test types for `cloudflare:test` |
| `docs/enterprise/build-package/reference/otlp-destination.md` | the destination config (dashboard-side, not code) |
| `functions/api/chat/stream.ts` | *(modified)* the BYOK routing seam |

## The tests (negative controls in both directions)

| Test | Pass case | Fail case |
|---|---|---|
| the upgrade completes | a real client WebSocket connects through the Function to the DO | the upgrade returns 404 (the deploy's curl result) |
| the message round-trips | a sent frame arrives at a second client | the DO never rebroadcasts |
| eviction recovers | `evictDurableObject` then a message → state intact | the doc is empty after eviction |
| the attachment survives | the `did` is read back from `deserializeAttachment` after eviction | the attachment is lost |
| a trace arrives | a span with `gen_ai.conversation.id` reaches the destination | `enabled = true` and nothing arrives |
| a key routes | a turn with a user credential sends `Authorization: Bearer <key>` | the turn runs the keyless binding |

## The gate

```bash
npx vitest --config vitest.workers.config.ts
node scripts/gate.mjs --feature live-verification
```

The structural assertions are a precondition. The behavioural assertions are the
gate: the upgrade completes, the eviction recovers, and a trace arrives.

## The escalation

When this feature blocks a surface, the surface ships unverified. Eleven waves
and one deploy have verified shape and reachability; this is the tier that
verifies behaviour — and it is the only tier that can say "the room works."