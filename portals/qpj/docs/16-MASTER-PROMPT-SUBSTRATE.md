# Master Prompt 1 — Track A: Per-Passport Substrate

You are implementing the substrate layer for QPJ (Quantum Pickle Jar), a
family-first portal at `/home/p31/production/portals/qpj/`. The interface layer
(SiteShell, WorkerChat, workerStore) already exists and runs entirely on
localStorage. This prompt stands up the Cloudflare substrate that makes the
same interface work across devices, and gates it behind a feature flag so
localStorage remains the fallback until the substrate is verified.

## Context you must read before writing code

1. `portals/qpj/AGENTS.md` — the golden rules (zero hex, barely-there UI,
   progressive disclosure, mode-gated security)
2. `portals/qpj/docs/02-STATE.md` — the current zustand store shape
3. `portals/qpj/docs/08-DEPLOYMENT.md` — how portals are deployed today
4. `portals/qpj/src/store/useQpjStore.ts` — the state we are migrating
5. `portals/qpj/src/features/worker/workerStore.ts` — the worker state
6. `portals/qpj/src/features/sandbox/sandboxStore.ts` — the sandbox state
7. `portals/qpj/src/features/sandbox/sandboxFeatureFlags.ts` — the feature flag
   file where `substrate: false` will be flipped to `true` once verified

## Architecture (from Cloudflare docs, Apr–Sep 2026)

Workers for Platforms introduces four components:

- **Dispatch namespace** — a container holding all customer Workers. Best
  practice: **one namespace for all customers**, not one per customer. (Docs:
  "All your customers' Workers should live in a single namespace. Do not create
  a namespace per customer.")
- **Dynamic dispatch Worker** — the entry point. Routes by hostname/subdomain,
  runs platform logic, sets per-customer limits, sanitizes responses. Uses
  `env.DISPATCHER.get("worker-name")` to invoke user Workers.
- **User Workers** — isolated V8 environments per customer. Unlimited count.
  Isolation by default (untrusted mode: no shared cache, no `request.cf`).
  Access KV/D1/R2 via bindings.
- **Outbound Workers** (optional) — intercept fetch() calls for egress control.

Durable Objects provide per-entity state:

- **10 GB storage per object** on Workers Paid plan, unlimited objects per
  namespace, unlimited storage per account (paid).
- **Soft limit 1,000 requests/second per individual object** — horizontally
  scalable by having many objects.
- **WebSocket Hibernation API** is the required API for long-lived connections.
  The standard API is NOT recommended. Use `this.ctx.acceptWebSocket(ws)` (the
  hibernation-compatible method), NOT `ws.accept()`.
- `serializeAttachment` / `deserializeAttachment` persist per-connection state
  across hibernation (max 16 KB per attachment).
- **Zero cost when idle/hibernating** — billable duration does not accrue during
  hibernation. Outstanding billable duration accrues for up to 15 minutes per
  active outbound WebSocket connection.
- **SQLite storage** is GA. Configure via `new_sqlite_classes` in wrangler
  config. Use `this.ctx.storage.sql.exec()` for all SQL.

Sandbox SDK combines Workers + DOs + Containers:

- `getSandbox(env.Sandbox, id)` returns a handle. Same `id` always returns the
  same sandbox instance. Containers sleep after 10 minutes of inactivity.
- `sandbox.exec('python script.py')` — shell commands, streaming output.
- `sandbox.runCode(code, { language: 'python' })` — LLM-generated code with
  rich outputs and state persistence.
- `sandbox.writeFile/readFile/mkdir/listFiles/exposePort` — full file ops.
- wrangler.jsonc needs: `containers` (class_name: Sandbox, image, instance_type,
  max_instances) + `durable_objects.bindings` (class_name: Sandbox, name: Sandbox)
  + `migrations` (new_sqlite_classes: [Sandbox]).
- Worker must re-export: `export { Sandbox } from "@cloudflare/sandbox"`.

## What to build

### 1. The dispatch Worker — `workers/p31-dispatch/`

A Hono app with:

- A dispatch namespace binding (`DISPATCHER`) pointing at a `production`
  namespace.
- Hostname routing: `{pickleName}.p31ca.org` → `{pickleName}` user Worker.
- Apex fallback: `qpj.p31ca.org` and `p31ca.org` fall through to the existing
  Pages deployment (do NOT intercept the apex).
- Pass through `X-P31-Passport` header derived from subdomain so user Workers
  know who they are.
- Reject unknown subdomains with 404. Do not leak the namespace name in errors.

```js
// Skeleton
export default {
  async fetch(request, env) {
    const hostname = new URL(request.url).hostname;
    const parts = hostname.split('.');
    if (parts.length < 3 || (parts[0] === 'qpj' && parts[1] === 'p31ca')) {
      return new Response('Not found', { status: 404 });
    }
    const passportId = parts[0];
    const userWorker = env.DISPATCHER.get(passportId);
    const modified = new Request(request, {
      headers: { ...request.headers, 'X-P31-Passport': passportId },
    });
    return userWorker.fetch(modified);
  },
};
```

### 2. The per-passport user Worker — `workers/p31-passport/`

A Worker template that:

- Reads `X-P31-Passport` from the request.
- Binds to a Durable Object via `env.PASSPORT_DO.getByName(passportId)`.
- Exposes RPC methods: `getState()`, `setState(patch)`, `queueTask(prompt)`,
  `listTasks()`, `recall(key)`, `remember(key, value)`.
- Exposes a WebSocket upgrade path at `/ws` using the **Hibernation API**
  (NOT the standard API). Use `this.ctx.acceptWebSocket(ws)`.
- Optionally binds a Sandbox: `env.Sandbox.get(passportId)` for later use,
  but do NOT exercise it in this commit.

### 3. The Durable Object class — `workers/p31-passport/src/passport-do.ts`

A SQLite-backed DO with:

- `new_sqlite_classes` migration in the wrangler config (tag: v1).
- Tables: `state` (key/value for store patches), `tasks` (worker task queue),
  `memory` (worker memory entries). Model on `workerStore.ts`'s existing shape
  so the RPC layer is a thin translation, not a redesign.
- `webSocketMessage()` and `webSocketClose()` handlers using
  `this.ctx.acceptWebSocket(ws)` (hibernation-compatible).
- An `alarm()` handler reserved for future scheduled work (return early for now).
- Use `serializeAttachment`/`deserializeAttachment` for WebSocket state.

### 4. The client-side bridge — `portals/qpj/src/lib/substrate.ts`

A module that:

- Detects whether the substrate is available via
  `import.meta.env.VITE_P31_SUBSTRATE_URL`.
- If unset, exports functions that call the existing localStorage path
  (no behavior change).
- If set, exports functions that fetch the per-passport Worker's RPC endpoints.
- Exposes a `useSubstrate()` hook that returns `{ mode: 'local' | 'edge',
  ready: boolean }`.

The interface must be identical in both modes. `workerStore.ts` and
`sandboxStore.ts` call through this bridge; they do not know which mode is
active.

### 5. Feature flag wiring

Add to `sandboxFeatureFlags.ts`:

```ts
substrate: false  // flip to true once verified
```

`useQpjStore` reads this flag. When false, everything works as today. When
true, the store hydrates from the substrate on mount and writes through.

## Deployment

Two new workers to deploy:

- `p31-dispatch` — apex routing, wildcard DNS (manual Cloudflare dashboard step,
  document in `docs/08-DEPLOYMENT.md` but do NOT attempt via API).
- `p31-passport` — user Worker template.

Add both to `portals/deploy-unified.mjs` with a new `--workers` flag that
deploys them separately from the Pages portals.

## Verification

The gate must pass:

```
cd portals/qpj && pnpm gate
```

New tests required:

- `substrate.test.ts` — bridge returns local mode when env unset; the local
  path behaves identically to today (snapshot the state shape).
- A Playwright journey that confirms the app boots normally with the flag off.

Do NOT enable the flag. Do NOT touch the deployed Pages portal. This commit
ships the substrate dormant.

## What NOT to do

- Do NOT create a namespace per passport. One namespace, many Workers.
- Do NOT use the standard WebSocket API. Hibernation only.
- Do NOT migrate the store to the substrate in this commit. That is the next
  commit, gated on this one being verified.
- Do NOT add any UI. The substrate is invisible.
- Do NOT introduce any new token, color, or component. Zero visual change.
