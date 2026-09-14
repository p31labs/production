# 21 — Track A.3 Implementation Spec

Status: **implemented** (commit-world: worker RPC, sandbox client bridge, tests).
The verification gate is green. This document records the implementation and the
spec that produced it.

## Scope

Track A.3 adds sandbox execution to the PassportDO. The browser-side artifact
studio (`src/pages/workshop/Studio.tsx`) talks to the `p31-passport` Worker,
which forwards build requests to the PassportDO. The PassportDO creates a
Sandbox container, runs the user code, writes artifact blobs to R2, and records
metadata in SQLite.

**Out of scope:**
- UI changes (Track A.3 is worker-side only)
- `substrate: true` flip in the deployed portal
- WebSocket hibernation (Track A.4)

## Sandbox SDK version

Use `@cloudflare/sandbox@next` (Sandbox SDK 1.0 preview). QPJ is a new project
and the preview is the recommended starting point for new projects. The stable
package remains available if issues arise.

Key API differences from stable:
- `sandbox.exec(argv)` takes an argument list, returns a process handle when the
  process launches (not when it completes)
- Process handle provides `output()`, `logs()`, `waitForExit()`, `waitForLog()`,
  `waitForPort()`
- `SANDBOX_TRANSPORT`, `transport` on `getSandbox()`, and `setTransport()` are
  removed in the preview

## Architecture

```
Browser Studio
    │
    ▼
p31-passport Worker (fetch handler)
    │
    ▼
PassportDO (RPC: executeBuild)
    │
    ├── Sandbox container (MicroVM) via getSandbox(env.Sandbox, passportId)
    │       │
    │       ├── keepAlive: false (default, container sleeps after idle)
    │       └── setKeepAlive(true) only during long builds
    │
    ├── R2 (artifact blobs)
    │       └── passports/{passportId}/{buildId}/{filename}
    │
    └── SQLite (build metadata)
            └── builds table + artifacts table
```

## Step 1 — Add container, R2 binding, and migrations to `wrangler.toml`

In `workers/p31-passport/wrangler.toml`, add a `[[containers]]` section, an R2 bucket binding, and a migration for the Sandbox class:

```toml
name = "p31-passport"
main = "src/index.ts"
compatibility_date = "2026-07-29"
compatibility_flags = ["nodejs_compat"]

[[containers]]
class_name = "Sandbox"
image = "./Dockerfile"
instance_type = "lite"
max_instances = 1

[[durable_objects.bindings]]
class_name = "PassportDO"
name = "PASSPORT_DO"

[[durable_objects.bindings]]
class_name = "Sandbox"
name = "Sandbox"

[[migrations]]
tag = "v1"
new_sqlite_classes = ["PassportDO"]

[[migrations]]
tag = "v2"
new_sqlite_classes = ["Sandbox"]

[[r2_buckets]]
binding = "ARTIFACTS_BUCKET"
bucket_name = "p31-artifacts"
preview_bucket_name = "p31-artifacts-preview"

[limits]
cpu_ms = 5000
sub_requests = 50
```

Note: the Sandbox DO gets its own migration **tag** (`v2`) rather than being appended
to the existing `v1` tag. Migrations are immutable once applied; `v1` already declares
`PassportDO`. Never edit an applied tag.

Create the R2 buckets:
```bash
pnpm wrangler r2 bucket create p31-artifacts
pnpm wrangler r2 bucket create p31-artifacts-preview
```

Create the container image (`workers/p31-passport/Dockerfile`):
```dockerfile
FROM docker.io/cloudflare/sandbox:0.7.0
RUN npm install -g esbuild typescript
WORKDIR /workspace
CMD ["sleep", "infinity"]
```

## Step 2 — Add schema to PassportDO SQLite

In `workers/p31-passport/src/PassportDO.ts`, wrap schema init in
`blockConcurrencyWhile()`:

```ts
constructor(ctx: DurableObjectState, env: Env) {
  super(ctx, env);
  ctx.blockConcurrencyWhile(async () => {
    this.ctx.storage.sql.exec(`
      CREATE TABLE IF NOT EXISTS builds (
        id TEXT PRIMARY KEY,
        passport_id TEXT NOT NULL,
        status TEXT NOT NULL,
        artifact_key TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);
    this.ctx.storage.sql.exec(`
      CREATE TABLE IF NOT EXISTS artifacts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        build_id TEXT NOT NULL,
        filename TEXT NOT NULL,
        content_type TEXT,
        size INTEGER,
        r2_key TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (build_id) REFERENCES builds(id)
      )
    `);
  });
}
```

## Step 3 — Add `executeBuild` RPC to PassportDO

```ts
interface ExecuteBuildInput {
  buildId: string;
  code: string;
  filename: string;
}

interface ExecuteBuildResult {
  ok: boolean;
  buildId: string;
  artifactKey?: string;
  error?: string;
}

async executeBuild(input: ExecuteBuildInput): Promise<ExecuteBuildResult> {
  const { buildId, code, filename } = input;
  const passportId = this.passportId;

  // 1. Record build start
  this.ctx.storage.sql.exec(
    `INSERT INTO builds (id, passport_id, status) VALUES (?, ?, 'running')`,
    buildId,
    passportId
  );

  try {
    // 2. Get sandbox (container lifecycle is independent of DO)
    const sandbox = getSandbox(env.Sandbox, passportId, {
      sleepAfter: '5m',
      keepAlive: false,  // default; set true only during long builds
    });

    // 3. Write code to sandbox
    await sandbox.writeFile(`/workspace/${filename}`, code);

    // 4. For long builds, enable keepAlive
    await sandbox.setKeepAlive(true);

    // 5. Execute build (exec returns a process handle in @next)
    const process = await sandbox.exec([
      'npx', 'esbuild', '--bundle', `--outfile=dist/${filename}`, filename
    ], { cwd: '/workspace' });

    // 6. Wait for completion
    await process.waitForExit();

    // 7. Collect output (stdout/stderr) after exit
    const output = await process.output({ encoding: 'utf8' });
    if (output.exitCode !== 0) {
      throw new Error(`Build failed: ${output.stderr}`);
    }

    // 7. Write artifact to R2 BEFORE disabling keepAlive
    const artifactBytes = await sandbox.readFile(`dist/${filename}`);
    const r2Key = `passports/${passportId}/${buildId}/${filename}`;
    await this.env.ARTIFACTS_BUCKET.put(r2Key, artifactBytes, {
      httpMetadata: { contentType: 'application/javascript' },
    });

    // 8. Disable keepAlive (container can sleep normally)
    await sandbox.setKeepAlive(false);

    // 9. Record artifact metadata
    this.ctx.storage.sql.exec(
      `INSERT INTO artifacts (build_id, filename, content_type, size, r2_key) VALUES (?, ?, ?, ?, ?)`,
      buildId,
      filename,
      'application/javascript',
      artifactBytes.length,
      r2Key
    );

    // 10. Update build status
    this.ctx.storage.sql.exec(
      `UPDATE builds SET status = 'complete', artifact_key = ?, updated_at = datetime('now') WHERE id = ?`,
      r2Key,
      buildId
    );

    return { ok: true, buildId, artifactKey: r2Key };
  } catch (error) {
    await sandbox.setKeepAlive(false);
    this.ctx.storage.sql.exec(
      `UPDATE builds SET status = 'failed', updated_at = datetime('now') WHERE id = ?`,
      buildId
    );
    return { ok: false, buildId, error: String(error) };
  }
}
```

**Important:** `runFiber()` is an Agents SDK method, not a Sandbox SDK method.
The PassportDO is not an Agent subclass. Use `keepAlive`/`setKeepAlive` to
prevent container eviction during long builds, and write durable outputs to R2
before the container sleeps.

## Step 4 — Sandbox binding is already configured in `wrangler.toml`

The `[[durable_objects.bindings]]` and `[[containers]]` entries added in Step 1 configure the Sandbox. The Sandbox Durable Object and its container lifecycle are managed by the Sandbox SDK — **do not** define a custom `SandboxDO` class.

In Worker code, obtain a sandbox instance via the SDK:

```ts
import { getSandbox } from '@cloudflare/sandbox';

const sandbox = getSandbox(env.Sandbox, passportId, {
  sleepAfter: '5m',
  keepAlive: false,
});
```

The binding name `Sandbox` and container `class_name = "Sandbox"` must match between `wrangler.toml` and the `getSandbox()` call.

## Step 5 — Add `executeBuild` route to `p31-passport` Worker

The worker's fetch handler routes `type: 'build'` to the PassportDO stub:

```ts
case 'build': return handleBuild(stub, body);

async function handleBuild(stub: PassportStub, body: PassportRequest): Promise<Response> {
  try {
    const result = await stub.executeBuild({
      buildId: body.buildId ?? `build-${Date.now()}`,
      code: body.code ?? '',
      filename: body.filename ?? 'artifact.js',
    });
    return Response.json({ ok: result.ok, type: 'build', passportId: body.passportId, buildId: result.buildId, artifactKey: result.artifactKey, error: result.error }, { status: result.ok ? 200 : 500 });
  } catch (e) {
    return Response.json({ ok: false, type: 'build', passportId: body.passportId, error: String(e) }, { status: 500 });
  }
}
```

The `p31-dispatch` worker proxies `POST /api/build` to the passport worker
through a **service binding** (`PASSPORT_WORKER` → `p31-passport`) with the same
substrate/verification gates as `/api/goal`. Hostname-based routing
(`https://{passportId}.{PASSPORT_WORKER_NAMESPACE}.workers.dev`) was retired at
deploy time: this account has no Workers-for-Platforms dispatch namespace, and
the single `p31-passport` worker hosts every `PassportDO` by name, so the `R2`
artifact key (`passports/{passportId}/{buildId}/{filename}`) keys on the
passport id instead. The rerun of `wrangler types` regenerates the `Sandbox`
(Durable Object + Container), `ARTIFACTS_BUCKET` (R2), and `PASSPORT_WORKER`
(service binding) environment bindings.

## Step 6 — Update client bridge

In `src/lib/substrate.ts`, `executeBuild` posts to the dispatch `/api/build`
route (substrate flag-gated like `submitGoal`):

```ts
export async function executeBuild(
  passportId: string,
  buildId: string,
  code: string,
  filename: string,
): Promise<SubstrateBuildResult> {
  if (!isEdgeMode()) {
    return { ok: false, buildId, error: 'substrate disabled — set VITE_P31_SUBSTRATE_URL' };
  }

  try {
    const response = await fetch(`${DISPATCH_URL}/api/build`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'build', passportId, buildId, code, filename }),
    });
    const data = (await response.json()) as SubstrateBuildResult & { ok: boolean };
    return {
      ok: data.ok,
      buildId: data.buildId ?? buildId,
      artifactKey: data.artifactKey,
      error: data.error,
      statusUrl: `/api/build?passportId=${passportId}&buildId=${buildId}`,
    };
  } catch (e) {
    return { ok: false, buildId, error: String((e as Error)?.message ?? 'executeBuild failed') };
  }
}
```

## Step 7 — KeepAlive policy

- Default: `keepAlive: false`. Container sleeps after 5 minutes of idle.
- Long builds: call `sandbox.setKeepAlive(true)` before the build, then
  `sandbox.setKeepAlive(false)` after.
- While `keepAlive: true` the `sleepAfter` option is **ignored** — the container
  will not sleep. It stays warm until you call `setKeepAlive(false)` (then the
  idle timer starts) or `sandbox.destroy()` (immediate, full stop). A hung
  `exec()` is still bounded by `waitForExit`'s timeout, so the keepAlive window
  cannot run unbounded.
- `setKeepAlive(true)` only needs to be sent once; the flag persists across DO
  hibernation and wakeup cycles.
- `runFiber()` is NOT available in the Sandbox SDK. It is an Agents SDK method
  for making Durable Object eviction survivable. The PassportDO is not an Agent
  subclass. For crash recovery across DO eviction, implement a SQLite-backed
  recovery pattern or subclass Agent.
- Always write durable outputs (logs, artifacts) to R2 before the build
  completes, not after.

## Step 8 — Bindings summary

| Binding | Type | Purpose |
|---------|------|---------|
| `PASSPORT_DO` | Durable Object | Per-passport state (existing) |
| `Sandbox` | Durable Object + Container | Sandbox container (new) |
| `ARTIFACTS_BUCKET` | R2 | Artifact blobs (new) |

## Validation

- `pnpm typecheck` — 0 errors in `workers/p31-passport`
- `pnpm lint` — 0 errors
- `pnpm test` — existing tests pass; new `executeBuild` tests added
- `pnpm build` — succeeds
- `pnpm v:gate` — PASS
- `pnpm wrangler deploy --dry-run` — confirms bindings resolve

## Constraints

- Do not flip `substrate: true` in the deployed portal.
- Do not use `process.env` in Worker code — use `import { env } from 'cloudflare:workers'`.

## Deploy-time corrections (2026-09-13)

Live verification caught three platform realities that changed the design:

1. **Worker→worker `fetch()` is blocked on the same account (error 1042).**
   `p31-dispatch` originally proxied to `https://p31-passport.trimtab-signal.workers.dev`
   with `fetch()`; the runtime returns `error code: 1042` for same-zone worker
   to worker requests. Fix: **service binding** `[[services]] PASSPORT_WORKER →
   p31-passport`. `PASSPORT_WORKER_URL` is still used to construct target URLs,
   but the host is discarded by the binding. Client-side fetches (portal → dispatch)
   are unaffected.
2. **Sandbox SDK `@next` must pair with the `:next` container image.**
   The SDK is `@cloudflare/sandbox@0.13.0-next.*`; the Dockerfile pinned the
   stable `docker.io/cloudflare/sandbox:0.7.0` base, which speaks a different
   control protocol — `exec()` failed with "The requested endpoint was not
   found" even though writeFile/setKeepAlive reported `Ok`. Also the Dockerfile's
   `CMD ["sleep","infinity"]` overrode the base image's sandbox-agent entrypoint.
   Current Dockerfile: `FROM docker.io/cloudflare/sandbox:next` + a `npm install
   -g esbuild typescript` layer + `EXPOSE 8080` (no CMD override).
3. **Sandbox IDs must be 1–63 characters.** `executeBuild` was passing
   `this.ctx.id.toString()` (the serialized DO id, 64 hex chars) to
   `getSandbox()`, which rejects it. Fix: `sandboxId()` derives a deterministic
   40-char SHA-256 hex hash of `ctx.id`, stable across DO instances/hibernation.
4. **Stale per-passport hostname routing removed everywhere.** `/api/status` on
   both workers previously forwarded to `https://{passportId}.qpj-passport.workers.dev`;
   that namespace does not exist (`error 1016`). `p31-passport /api/status` now
   queries its own `PassportDO` directly (`{type:'status'}` RPC returning the
   same shape as the WS `onStatus`), and `p31-dispatch /api/status` forwards via
   the service binding.

Verified live: health on both workers, WS `ping`→`pong`, artifact 404 on both,
a real `POST {type:'build'}` (esbuild bundle in the sandbox container → R2
`passports/{pid}/{buildId}/smoke.js` → `GET /api/artifacts/...` 200 via direct
and via dispatch), and `/api/status` 200 on both. The `/api/build` gate on
dispatch still returns 503 until `SUBSTRATE_ENABLED=true`.
- Do not assume sandbox state persists across sleep. Write to R2 before the container sleeps.
- Do not use `blockConcurrencyWhile()` for anything other than schema init.
- Do not use `runFiber()` in PassportDO unless subclassing Agent.
