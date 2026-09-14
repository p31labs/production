# 21 — Track A.3 Implementation Spec

Status: draft. No implementation yet. This document is the implementation-ready
spec for Track A.3. It assumes Track A.2 is merged and the gate is green.

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
new_sqlite_classes = ["PassportDO", "Sandbox"]

[[r2_buckets]]
binding = "ARTIFACTS_BUCKET"
bucket_name = "p31-artifacts"
preview_bucket_name = "p31-artifacts-preview"

[limits]
cpu_ms = 5000
sub_requests = 50
```

Create the R2 buckets:
```bash
pnpm wrangler r2 bucket create p31-artifacts
pnpm wrangler r2 bucket create p31-artifacts-preview
```

Create the container image (`workers/p31-passport/Dockerfile`):
```dockerfile
FROM node:22-slim
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

In `workers/p31-passport/src/index.ts`, add:

```ts
app.post('/api/build/:passportId', async (c) => {
  const passportId = c.req.param('passportId');
  const { buildId, code, filename } = await c.req.json<ExecuteBuildInput>();

  // Route to PassportDO
  const passportDO = c.env.PASSPORT.get(passportId, { id: passportId });
  const result = await passportDO.executeBuild({ buildId, code, filename });

  return c.json(result, result.ok ? 200 : 500);
});
```

## Step 6 — Update client bridge

In `src/lib/substrate.ts`, add:

```ts
export async function executeBuild(
  passportId: string,
  buildId: string,
  code: string,
  filename: string,
): Promise<SubstrateGoalResult> {
  if (!isEdgeMode()) {
    return { ok: false, deferred: false, error: 'substrate disabled — set VITE_P31_SUBSTRATE_URL' };
  }

  try {
    const config = getSubstrateConfig();
    const response = await fetch(`${config.dispatchUrl}/api/build/${passportId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ buildId, code, filename }),
    });
    const data = (await response.json()) as ExecuteBuildResult & { ok: boolean };
    return {
      ok: data.ok,
      error: data.error,
      statusUrl: `/api/build/${passportId}/${buildId}`,
    };
  } catch (e) {
    return { ok: false, error: String((e as Error)?.message ?? 'executeBuild failed') };
  }
}
```

## Step 7 — KeepAlive policy

- Default: `keepAlive: false`. Container sleeps after 5 minutes of idle.
- Long builds: call `sandbox.setKeepAlive(true)` before the build, then
  `sandbox.setKeepAlive(false)` after.
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
- Do not assume sandbox state persists across sleep. Write to R2 before the container sleeps.
- Do not use `blockConcurrencyWhile()` for anything other than schema init.
- Do not use `runFiber()` in PassportDO unless subclassing Agent.
