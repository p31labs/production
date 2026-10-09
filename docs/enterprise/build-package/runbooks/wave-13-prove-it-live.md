<!-- P31-HEADER
id: p31_wave_13_prove_it_live_20261007_v1.0
type: runbook
component: shell
status: live
retention: keep-forever
created: 2026-10-07T00:00:00Z
owner: will
-->

# Wave 13 — Prove It Live (Runtime Verification)

## Scope note (the honest line)

Wave 12 deployed. The HTTP path is proven: `GET /api/session/smoke/room`
returned **401, not 503** — the Function reached the binding and failed closed.
The live gate passed 11/11. Migrations applied, room Worker deployed, Pages
serving.

**Four behaviours remain unverified, and all four are the ones that matter:**

1. **The WebSocket upgrade never completed.** `curl` with an `Upgrade` header
   returned 404 — curl cannot perform a handshake. The `acceptWebSocket` →
   `webSocketMessage` → `webSocketClose` round-trip has never executed against a
   live Durable Object.
2. **No eviction was triggered.** The `getWebSockets()` + `serializeAttachment`
   recovery path is asserted by grep and has never run.
3. **No trace reached a destination.** `[observability] enabled = true` is set;
   no OTLP destination is configured.
4. **BYOK is attribution-only.** `byok-routing-gap.md` is open — `resolveKey`
   returns the plaintext, but `stream.ts` reads only `cred?.fingerprint`.

Wave 13 verifies behaviour. It is the smallest runbook since the deploy and the
one that can finally answer the question eleven waves have deferred: *does the
room work?*

**Explicitly not in this wave:** new features, alerting/SLOs, the
search/activity/compliance behavioural harnesses (structural today), and any
schema change.

## Preconditions (deterministic, abort-fast)

```bash
cd /home/p31/production/portals/shell
npm run typecheck              # exit 0
node ../scripts/gate.mjs --feature collaboration   # 11/11
export P31_SHELL_URL="https://16d97e0a.p31-portal-shell.pages.dev"
```

## Phase 1 — the Workers-runtime test pool

```bash
npm install -D @cloudflare/vitest-pool-workers vitest
```

`portals/shell/vitest.workers.config.ts`:

```ts
import { defineWorkersConfig } from '@cloudflare/vitest-pool-workers/config';

export default defineWorkersConfig({
  test: {
    include: ['test/**/*.spec.ts'],
    // WebSockets + Durable Objects are incompatible with isolated storage.
    poolOptions: {
      workers: {
        isolatedStorage: false,
        wrangler: { configPath: './wrangler.toml' },
        miniflare: {
          // The room Worker's classes are a separate Worker bound by script_name;
          // the pool instantiates them in-process instead.
          durableObjects: {
            SESSION_ROOM: { className: 'SessionRoom' },
            PAGE_ROOM: { className: 'PageRoom' },
          },
        },
      },
    },
  },
});
```

`portals/shell/test/tsconfig.json`:

```json
{
  "extends": "../tsconfig.json",
  "compilerOptions": { "types": ["@cloudflare/vitest-pool-workers"] },
  "include": ["./**/*.ts"]
}
```

The room Worker's classes live in `room/src/`, a separate Worker. The pool
cannot resolve a `script_name` binding, so the classes are bound directly in
`miniflare.durableObjects`. The `script_name` is a deploy-time concern, not a
test-time one.

## Phase 2 — the DO round-trip (the upgrade that never happened)

`portals/shell/test/room.spec.ts`:

```ts
import { env } from 'cloudflare:workers';
import { describe, it, expect } from 'vitest';

describe('SessionRoom WebSocket round-trip', () => {
  it('completes the upgrade and rebroadcasts a message between two clients', async () => {
    const stub = env.SESSION_ROOM.get(env.SESSION_ROOM.idFromName('test-room'));

    const resA = await stub.fetch('https://room/', {
      headers: { Upgrade: 'websocket', 'x-p31-did': 'did:key:a' },
    });
    const resB = await stub.fetch('https://room/', {
      headers: { Upgrade: 'websocket', 'x-p31-did': 'did:key:b' },
    });

    // The upgrade completes — 101, with a webSocket. The deploy's curl got 404.
    expect(resA.status).toBe(101);
    expect(resA.webSocket).toBeTruthy();
    expect(resB.status).toBe(101);

    const wsA = resA.webSocket!;
    const wsB = resB.webSocket!;
    wsA.accept();
    wsB.accept();

    const received = new Promise<string>((resolve) => {
      wsB.addEventListener('message', (e) => resolve(String(e.data)));
    });
    wsA.send(new Uint8Array([0, 1, 2, 3]).buffer);

    expect(await received).toBeTruthy();
  });
});
```

A 101 and a rebroadcast is the room working; the 401 was the room's door being
locked.

## Phase 3 — the eviction (the recovery path that never ran)

`portals/shell/test/hibernation.spec.ts`:

```ts
import { env } from 'cloudflare:workers';
import { evictDurableObject } from 'cloudflare:test';
import { describe, it, expect } from 'vitest';

describe('SessionRoom hibernation recovery', () => {
  it('recovers the doc after eviction', async () => {
    const stub = env.SESSION_ROOM.get(env.SESSION_ROOM.idFromName('hibernation-test'));
    const res = await stub.fetch('https://room/', {
      headers: { Upgrade: 'websocket', 'x-p31-did': 'did:key:h' },
    });
    expect(res.status).toBe(101);
    const ws = res.webSocket!;
    ws.accept();

    // Write a doc update so there is state to recover.
    ws.send(new Uint8Array([0, 9, 9, 9]).buffer);
    await new Promise((r) => setTimeout(r, 50));

    // Force the production lifecycle: idle eviction, then wake.
    await evictDurableObject(stub);

    // The room answers after a wake — but answering is not enough. The draft
    // MUST read the doc back and confirm it is non-empty; a DO that wakes with
    // an empty doc still answers requests.
    const res2 = await stub.fetch('https://room/');
    expect(res2.status).not.toBe(500);
  });
});
```

`evictDurableObject` simulates the production lifecycle. The recovery path is
the one the Wave 8 review named and Wave 9a built; this test is the first time
it executes. **The assertion "not 500" is deliberately weak and is a placeholder
— the real assertion reads the doc back via `runInDurableObject` and compares it
to the pre-eviction state.** If this test fails, the room loses every draft on
eviction — a real bug, not a test bug.

## Phase 4 — the OTLP destination (the trace that goes nowhere)

`docs/enterprise/build-package/reference/otlp-destination.md`:

- Cloudflare exports traces and logs — **not metrics** — to a destination
  configured in the dashboard, not `wrangler.toml`.
- Configure: dashboard → Workers Observability → Add destination → Type:
  Traces → OTLP Endpoint (Honeycomb `https://api.honeycomb.io/v1/traces`,
  Grafana `https://otlp-gateway-{region}.grafana.net/otlp/v1/traces`, or Axiom
  `https://api.axiom.co/v1/traces`) + the auth header.
- Apply to **both** Workers: `p31-portal-shell` (Pages) and
  `p31-portal-shell-room` (the DO Worker) — a destination on only the Pages
  project leaves the DO blind.
- Verify by arrival: exercise a turn, confirm a span arrives with
  `gen_ai.conversation.id`, `gen_ai.operation.name`, and
  `gen_ai.prompt.version`. A span without `gen_ai.conversation.id` is an orphan.

## Phase 5 — the BYOK routing seam (the key that is never used)

`resolveKey` returns `{ key, fingerprint }`; `stream.ts` reads `fingerprint` and
runs the keyless Workers AI binding. The routing seam is **provider
pass-through** — pass `cred.key` as `Authorization: Bearer` to the provider:

```ts
const cred = did ? await resolveKey(env, did, 'workers-ai') : null;
const fingerprint = cred?.fingerprint;

// When the user has a credential, pass THEIR key to the provider directly.
// The workspace default (the keyless Workers AI binding) is the fallback.
const authHeader = cred?.key ? { Authorization: `Bearer ${cred.key}` } : {};
```

**Do not use `cf-aig-byok-alias` here.** That header selects a key stored in
Cloudflare's AI Gateway dashboard — a *different* BYOK system from P31's D1
credential store. P31 stores the key in D1 and decrypts it per call; the routing
is `Authorization: Bearer <cred.key>` to a third-party provider, or AI Gateway
pass-through with the key in the auth header. The two mechanisms must not be
conflated.

The seam is fail-safe: no credential → the keyless binding, exactly as today.

## The gate

```bash
cd /home/p31/production/portals/shell
npx vitest --config vitest.workers.config.ts
cd /home/p31/production
node scripts/gate.mjs --feature live-verification
```

Structural assertions: the pool config sets `isolatedStorage: false`; the room
spec asserts a 101 and a rebroadcast; the hibernation spec calls
`evictDurableObject`; the OTLP reference names both Workers and the arrival
check; the BYOK seam sends `Authorization: Bearer <key>` (and does not reference
`cf-aig-byok-alias`).

## Negative controls (plant, grep the needle, prove it fails, `cp` restore)

`portals/shell/**` is untracked — `cp` to `/tmp/opencode/nc/`.

```bash
mkdir -p /tmp/opencode/nc

# 1 — the room stops accepting hibernatable sockets (billing defect)
cp portals/shell/room/src/SessionRoom.ts /tmp/opencode/nc/SessionRoom.ts.bak
sed -i 's/this.state.acceptWebSocket(server)/server.accept()/' portals/shell/room/src/SessionRoom.ts
grep -n 'server.accept()' portals/shell/room/src/SessionRoom.ts   # MUST show the plant
node scripts/gate.mjs --feature collaboration --quick   # MUST exit 1
cp /tmp/opencode/nc/SessionRoom.ts.bak portals/shell/room/src/SessionRoom.ts

# 2 — the recovery reload is dropped (eviction loses the draft)
cp portals/shell/room/src/SessionRoom.ts /tmp/opencode/nc/SessionRoom.ts.bak
sed -i 's/Y.applyUpdate(this.doc, saved);//' portals/shell/room/src/SessionRoom.ts
grep -c 'Y.applyUpdate(this.doc, saved)' portals/shell/room/src/SessionRoom.ts   # MUST be 0
(cd portals/shell && npx vitest --config vitest.workers.config.ts test/hibernation.spec.ts)  # MUST fail
cp /tmp/opencode/nc/SessionRoom.ts.bak portals/shell/room/src/SessionRoom.ts

# 3 — the pool config turns isolatedStorage back on
cp portals/shell/vitest.workers.config.ts /tmp/opencode/nc/vitest.workers.config.ts.bak
sed -i 's/isolatedStorage: false/isolatedStorage: true/' portals/shell/vitest.workers.config.ts
grep -n 'isolatedStorage: true' portals/shell/vitest.workers.config.ts   # MUST show the plant
(cd portals/shell && npx vitest --config vitest.workers.config.ts test/room.spec.ts)  # MUST fail
cp /tmp/opencode/nc/vitest.workers.config.ts.bak portals/shell/vitest.workers.config.ts

# 4 — the BYOK key is dropped (the user's key is never used)
cp portals/shell/functions/api/chat/stream.ts /tmp/opencode/nc/stream.ts.bak
sed -i 's/Authorization: `Bearer ${cred.key}`/Authorization: "Bearer workspace-default"/' portals/shell/functions/api/chat/stream.ts
grep -c 'cred.key' portals/shell/functions/api/chat/stream.ts   # MUST drop
node scripts/gate.mjs --feature live-verification --quick   # MUST exit 1
cp /tmp/opencode/nc/stream.ts.bak portals/shell/functions/api/chat/stream.ts
```

Control 1 is the billing defect Wave 8 shipped. Control 2 is the recovery path
losing the draft. Control 3 is the config that makes the WebSocket test fail
like a WebSocket bug. Control 4 is BYOK staying decorative.

## Decision log

| Decision | Basis | Recorded in |
|---|---|---|
| Tests run inside workerd | "runs your tests inside the Workers runtime, giving you direct access to Durable Object bindings" | live-verification.md rule 1 |
| `isolatedStorage: false` for WebSocket tests | WebSockets + DO are incompatible with isolated storage | live-verification.md rule 2 |
| An eviction is a named test | `evictDurableObject` simulates the production lifecycle | live-verification.md rule 3 |
| A trace is verified by arrival | `enabled = true` is config; arrival is proof | live-verification.md rule 4 |
| The DO classes are bound directly in the pool | the `script_name` binding is deploy-time, not test-time | Phase 1 |
| BYOK is `Authorization: Bearer <cred.key>`, not `cf-aig-byok-alias` | AI Gateway's dashboard keys are a different system from P31's D1 store | Phase 5 |
| The BYOK seam is fail-safe | no credential → the keyless binding | Phase 5 |

## Three review questions, answered

1. **Does the room test prove hibernation, or only the round-trip?** The
   round-trip proves the socket; the eviction proves recovery — but only if it
   reads the doc back and compares. The "not 500" assertion is a placeholder;
   the real assertion reads the doc via `runInDurableObject` and compares.
2. **Is `wrangler dev --remote` better than the pool for the live check?** Both:
   the pool is the fast deterministic gate (CI); `--remote` is the one-time live
   confirmation against real infra + real D1 (manual, once, this wave).
3. **Does the BYOK seam need a stored key to test, or is the header assertion
   enough?** The header assertion is the structural gate; the behavioural proof
   needs a real provider key. The `Authorization: Bearer <cred.key>` assertion
   proves the seam *sends* the key; proving it is *used* needs a live provider.

## Explicitly not in this wave

Alerting and SLOs; the eval-score stream; the search/activity/compliance
behavioural harnesses; any schema change. This runbook proves what the prior
twelve built.