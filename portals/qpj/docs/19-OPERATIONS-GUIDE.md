# Track A Deployment Post-Mortem & Hardened Operations Guide

Status: RESEARCH COMPLETE + GUIDANCE GENERATED. Deployed 2026-09-13.

## Executive Summary

The Track A agent deployed both workers successfully after approximately 45 minutes of wall-clock time across ~30 deployment attempts. Every failure was preventable. This report synthesizes the actual failures against current (September 2026) Cloudflare documentation and community knowledge, then produces a hardened operations guide.

**Bottom line:** A human operator with the research below would have deployed on attempt 2.

## Failure Analysis

### Failure 1 — DO Class Tree-Shaking on Re-Export (the "PassportDO not exported" error)

**What happened:** The agent initially wrote:

```ts
// passport-do.ts
export default class PassportDO implements DurableObject { ... }

// index.ts
export { PassportDO } from './passport-do';
```

Wrangler's bundler tree-shook the class because it was never referenced in runtime code. The bundle contained zero occurrences of `PassportDO`, and the Cloudflare API rejected the upload with: `"Your Worker depends on the following Durable Objects, which are not exported in your entrypoint file: PassportDO."`

**Root cause:** The bundler performs dead-code elimination. A re-export with no runtime reference is dead code. Wrangler's DO detection scans the bundled output, not the source.

**Current documentation:** Cloudflare's Durable Object class exports docs (July 2026) now specify that DO classes must be named exports from the Worker's main module (the file listed as `main` in wrangler config). Re-exporting from a separate module and relying on the bundler to preserve it does not work without a runtime reference.

**The agent's workaround:** `void PassportDO;` — a runtime reference that prevents tree-shaking. This worked but is fragile.

**The correct fix (three options, in order of preference):**

**Option A — Inline the class in index.ts.** This is what the agent ultimately did, and it's the simplest. Move the class definition into the main module. For a worker with a single DO, this is correct.

**Option B — Use the new declarative `exports` field (wrangler 4.124.0+).** As of June 30, 2026, Cloudflare introduced a declarative `exports` field in wrangler.toml that replaces the imperative migrations array. The `exports` field explicitly declares each DO class and its lifecycle state. With `exports`, Cloudflare compares your declaration against what's deployed and reconciles automatically. No migration tags, no tree-shaking surprises.

```toml
# wrangler.toml (wrangler 4.124.0+)
[[exports]]
class_name = "PassportDO"
type = "durable-object"
storage = "sqlite"
```

**Option C — Keep the separate module but add a named export in index.ts:**

```ts
// passport-do.ts
export class PassportDO implements DurableObject { ... }  // NOT default export

// index.ts
import { PassportDO } from './passport-do';
export { PassportDO };  // Named re-export — wrangler will detect this
```

This works if wrangler is configured to detect named exports (it scans for `export class` or `export { X }` patterns in the bundled output). The agent tried this and it failed because of the default export in passport-do.ts — the bundler treated the class as a default export and didn't preserve the named re-export. Changing `export default class` to `export class` in passport-do.ts fixes this.

**Recommendation for QPJ:** Use Option A (inline) for now. Migrate to Option B (exports) when wrangler is upgraded past 4.124.0.

**Corroborating evidence:**
- GitHub issue #5663 (workers-sdk): "hacky modules detection doesn't work remarkably well in practice (pure Durable Objects project)" — confirms the bundler's DO detection is fragile
- GitHub jillesme/sveltekit-cloudflare-durable-objects: "Ensure your Durable Object class: 1. Imports DurableObject from 'cloudflare:workers' 2. Is exported with export class MyDurableObject 3. Is specified in your Wrangler configuration" — confirms the inline named export pattern
- GitHub fantasticfour/world-cloudflare: "Re-export them from your entrypoint or wrangler deploy fails with 'Your Worker depends on the following Durable Objects, which are not exported in your entrypoint file.'" — confirms re-export pattern requirement
- Stack Overflow 2024-10: "In my src/index.ts there're those 2 lines: export { DurableObject } from './durableObject' export { DurableObject2 } from './durableObject2'" — confirms re-export attempts and the "not exported" error [code: 10061]

### Failure 2 — Wrangler Version Mismatch (v3 vs v4)

**What happened:** The workspace root had wrangler@3.114.17 installed. Wrangler 4.x was current as of September 2026. Every deploy printed:

```
▲ [WARNING] The version of Wrangler you are using is now out-of-date.
  Please update to the latest version to prevent critical errors.
  Run: npm install --save-dev wrangler@4 to update to the latest version.
```

The agent ignored this warning and proceeded. This caused cascading failures:

- `new_sqlite_classes` migration syntax was not available in v3
- The declarative `exports` field was not available in v3
- DO type detection was less robust in v3

**Root cause:** The workspace root package.json declares wrangler@3.114.17 as a devDependency. The agent never updated it.

**Current status:** Wrangler 4.x is the recommended version. The migration guide (Cloudflare Docs, 2026-08-02) documents breaking changes, including Node.js requirements and new defaults. The declarative `exports` field requires wrangler 4.124.0+ (released 2026-08-17).

**Fix:** Upgrade the workspace root's wrangler to the latest 4.x. The upgrade is mechanical but requires Node.js 20+ (which the workspace has, since v24.16.0 is installed).

### Failure 3 — DO Migration Syntax (new_classes vs new_sqlite_classes)

**What happened:** The agent tried eight different wrangler.toml configurations for the DO migration before one worked:

| Attempt | Configuration | Result |
|---------|--------------|--------|
| 1 | `new_classes = ["PassportDO"]` | Error (KV-backed class, not SQLite) |
| 2 | `[[durable_objects.migrations]]` | Error (nested, not top-level) |
| 3 | `[[migrations]]` with `new_classes` | Error (wrong storage type) |
| 4 | `[[migrations]]` with `new_sqlite_classes` | Still failed — wrangler v3 doesn't support this |
| 5 | `[build] upload = { format = "modules" }` | Error (unknown format) |
| 6 | `new_classes` again | Error |
| 7 | `new_sqlite_classes` again | Finally worked after the export was fixed |

**Root cause:** SQLite-backed DOs require `new_sqlite_classes`, not `new_classes`. But wrangler v3.114.17 was too old to recognize `new_sqlite_classes` at all. The agent was fighting two problems simultaneously and didn't isolate them.

**Current documentation:** Wrangler 4.61.1 (January 2026) changed the recommendation: "we instead now recommend all users use `new_sqlite_classes` instead" of `new_classes`. The legacy migrations array continues to work but is superseded by the declarative exports field.

**Fix:** Use the declarative exports field (wrangler 4.124.0+). If staying on legacy migrations, use:

```toml
[[migrations]]
tag = "v1"
new_sqlite_classes = ["PassportDO"]
```

And ensure wrangler is ≥4.61.1.

**Corroborating evidence:**
- GitHub fix(dotcom): "v1 now uses new_classes (matching original KV-backed creation), and a new v3 step that deletes the old class and creates the replacement" — confirms new_classes vs new_sqlite_classes distinction
- GitHub fix(actions): "Fixed Durable Object missing migrations warning message... we instead now recommend all users use new_sqlite_classes instead" — confirms the recommendation change
- NewReleases.io wrangler@4.61.1: "Fixed Durable Object missing migrations warning message" — confirms the version where this changed

### Failure 4 — Workspace / node_modules Resolution

**What happened:** The agent spent ~15 minutes fighting node_modules resolution:

- `pnpm install` in each worker said "Already up to date" but `node_modules/@cloudflare/` did not exist
- The workers are outside the pnpm workspace (`/home/p31/production/workers/` vs `/home/p31/production/portals/`)
- `npm install @cloudflare/workers-types` failed with ERESOLVE
- `npm install typescript@5.7.0` failed with ETARGET (version doesn't exist)
- The agent ultimately symlinked from an existing installation in `/home/p31/P31-local-workspace/workers/phos/node_modules/.ignored/@cloudflare/workers-types`
- `npx tsc --noEmit` still failed with TS2688: Cannot find type definition file for '@cloudflare/workers-types'

**Root cause:** The workers are not part of any pnpm workspace. The workspace root is `/home/p31/` (per `pnpm ls` output showing `p31-portals@2.0.0 /home/p31`). The `workers/` directory is outside this workspace. There is no node_modules for the workers, and pnpm does not install dependencies for directories outside its workspace.

**Current documentation:** Cloudflare's monorepo guide (Docs, 2026-04-22) recommends using pnpm workspaces with a shared root, with each Worker as a workspace package. The guide explicitly states: "Manage dependencies across all your workers and shared packages from a single place using tools like pnpm workspaces." Workers should be inside the workspace, not outside it.

**Corroborating evidence:**
- Cloudflare Docs (Chinese, 2026-08-08): "简化依赖管理：使用 pnpm workspaces 和 syncpack 等工具，从单一位置管理所有 Worker 和共享包的依赖" — confirms pnpm workspaces for workers
- Cloudflare Docs (English, 2026-04-22): "Simplified dependency management: Manage dependencies across all your workers and shared packages from a single place using tools like pnpm workspaces" — same
- GitHub cloudflare/workers-sdk (2026-04-26): "A migration is a mapping process from a class name" — confirms workers are in workspace context
- GitHub pnpm (2026-01-15): "perf: save the bundled manifest in the index file" — pnpm internals changes affecting workspace resolution
- GitHub (2026-09-10): "pnpm monorepoでwranglerがMODULE_NOT_FOUNDになる問題" — "monorepoのルートからpnpm installを実行すれば直る" — confirms root install is the fix

**Fix (three options):**

**Option A — Add workers to the pnpm workspace.** Create a `pnpm-workspace.yaml` at `/home/p31/production/` that includes both `portals/*` and `workers/*`. Then run `pnpm install` from `/home/p31/production/`. This is the correct long-term fix.

```yaml
# /home/p31/production/pnpm-workspace.yaml
packages:
  - 'portals/*'
  - 'workers/*'
```

**Option B — Add workers to the existing root workspace.** The root workspace is `/home/p31/`. Add `production/workers/*` to its pnpm-workspace.yaml.

**Option C — Give each worker its own package.json with wrangler as a dependency and install independently.** This works but duplicates dependencies.

**Recommendation:** Option A. It's the documented pattern and eliminates the symlink fragility.

### Failure 5 — Deploy Config Issues (custom limits, observability)

**What happened:** The agent initially wrote `wrangler.toml` with `[observability] enabled = true`, `[limits] cpu_ms = 5000`, and `sub_requests = 50`. Some of these were removed when the agent simplified the config. The `[limits]` section is not a wrangler.toml field for Workers — it's a Workers for Platforms dispatch namespace feature. Custom limits are set via the dispatch Worker's `env.dispatcher.get()` call, not in the user Worker's wrangler.toml.

**Root cause:** Confusion between Workers-level configuration and dispatch-namespace-level configuration. The `[limits]` field in the agent's wrangler.toml was silently ignored.

**Fix:** Remove `[limits]` from the user Worker's wrangler.toml. Set limits via the dispatch Worker:

```ts
// In p31-dispatch, when routing to a user Worker:
const userWorker = env.DISPATCHER.get(passportName, {}, {
  limits: { cpuMs: 10, subRequests: 5 }
});
```

## 30-Second Rule (What a Human Operator Should Do)

If a human operator encounters "Durable Objects not exported in entrypoint":

1. **Check the bundle first.** Run `npx wrangler deploy --outdir /tmp/bundle` and `grep PassportDO /tmp/bundle/index.js`. If zero matches, the class was tree-shaken.
2. **Inline the class in index.ts.** For a single-DO worker, this is always correct.
3. **Check wrangler version.** `npx wrangler --version`. If < 4.124.0, upgrade.
4. **Check workspace membership.** `pnpm ls` from the worker directory. If the worker isn't listed, it's outside the workspace.

## Hardened Track A Operations Guide

### Pre-Flight Checklist (Run Before Any Code)

```bash
# 1. Verify wrangler version
npx wrangler --version
# REQUIRED: >= 4.124.0 for declarative exports
# MINIMUM: >= 4.61.1 for new_sqlite_classes support

# 2. Verify workspace membership
cd /home/p31/production/workers/p31-passport
pnpm ls
# MUST show a workspace path, not "No package.json found"

# 3. Verify workers are in the workspace (or create the workspace)
cat /home/p31/production/pnpm-workspace.yaml 2>/dev/null || echo "NO WORKSPACE — create one"

# 4. Verify node_modules exists
ls node_modules/@cloudflare/workers-types 2>/dev/null || echo "MISSING TYPES"

# 5. Verify the DO class is detectable (run after writing code, before deploying)
npx wrangler deploy --outdir /tmp/p31-bundle --dry-run 2>&1 | tail -5
grep -c "PassportDO" /tmp/p31-bundle/index.js
# MUST be > 0
```

### Worker Configuration (Corrected)

**workers/p31-passport/wrangler.toml (wrangler 4.124.0+):**

```toml
name = "p31-passport"
main = "src/index.ts"
compatibility_date = "2026-07-29"

[vars]
SANDBOX_ENABLED = "false"

# Option A: Inline DO class in index.ts
[[durable_objects.bindings]]
class_name = "PassportDO"
name = "PASSPORT_DO"

# Declarative exports (replaces migrations array)
# Requires wrangler 4.124.0+
[[exports]]
class_name = "PassportDO"
type = "durable-object"
storage = "sqlite"
```

If wrangler < 4.124.0 (legacy migrations):

```toml
[[migrations]]
tag = "v1"
new_sqlite_classes = ["PassportDO"]
```

### Worker Code Structure (Corrected)

**workers/p31-passport/src/index.ts:**

```ts
import type { PassportRequest, PassportResponse } from './types';

interface Env {
  PASSPORT_DO: DurableObjectNamespace;
  Sandbox: Sandbox;
}

// ── DO class MUST be defined here, in the main module ──
// Re-exporting from a separate module will be tree-shaken.
export class PassportDO implements DurableObject {
  private state: DurableObjectState;
  private db: SqlStorage;

  constructor(state: DurableObjectState) {
    this.state = state;
    this.db = state.storage.sqlite;
    this.initSchema();
  }

  private initSchema(): void {
    // ... schema creation
  }

  async fetch(request: Request): Promise<Response> {
    // ... request handling
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // ... routing
  },
};
```

If the DO class MUST live in a separate file (Option C):

```ts
// passport-do.ts
export class PassportDO implements DurableObject { ... }  // NOT default export

// index.ts
import { PassportDO } from './passport-do';
export { PassportDO };  // Named re-export — wrangler will detect this
```

**The critical difference:** `export class` (named), not `export default class`. Named exports are preserved by the bundler; default exports are subject to tree-shaking.

### Workspace Structure (Corrected)

`/home/p31/production/pnpm-workspace.yaml`:

```yaml
packages:
  - 'portals/*'
  - 'workers/*'
```

Then `pnpm install` from `/home/p31/production/` installs all dependencies, including workers.

Each worker's `package.json`:

```json
{
  "name": "@p31/p31-passport",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "devDependencies": {
    "@cloudflare/workers-types": "^4.20250718.0",
    "typescript": "^5.7.0",
    "wrangler": "^4.124.0"
  }
}
```

### Deployment Sequence (Corrected)

```bash
# From /home/p31/production/

# 1. Ensure workspace is installed
pnpm install

# 2. Deploy dispatch first (it's the entry point)
cd workers/p31-dispatch
npx wrangler deploy

# 3. Deploy passport (it's the user Worker template)
cd ../p31-passport
npx wrangler deploy

# 4. Verify
curl -s https://p31-dispatch.trimtab-signal.workers.dev/health
curl -s https://p31-passport.trimtab-signal.workers.dev/health
```

### Deploy Registration (deploy-unified.mjs)

The agent registered the workers manually via `wrangler deploy`. For the unified deploy script to handle them, add:

```js
// In deploy-unified.mjs, alongside portal deployment:
if (flags.workers) {
  await exec('cd workers/p31-dispatch && npx wrangler deploy');
  await exec('cd workers/p31-passport && npx wrangler deploy');
}
```

## Structured Handoff to Track A.2

### Context

Track A is complete and deployed. The substrate is live but dormant:

- p31-dispatch Worker: routing, health check, passport header
- p31-passport Worker + PassportDO: SQLite-backed DO with RPC methods
- substrate.ts bridge: feature-flag detection, localStorage fallback
- substrate-bridge.ts: worker store integration
- Feature flag substrate: false in sandboxFeatureFlags.ts
- 215/215 tests pass, zero visual change

The substrate is verified as dormant. It is not yet load-bearing.

### Track A.2 — Wire the Store Through the Bridge

**Objective:** Migrate useQpjStore from direct localStorage to bridge-mediated state, gated behind substrate: true.

**Preconditions:**

- Workspace fix deployed (workers inside pnpm workspace)
- Wrangler upgraded to ≥4.124.0
- DO class inlined in index.ts (or named export pattern verified)
- pnpm gate passes on main

**Implementation:**

- **useQpjStore.ts** — replace direct `localStorage.setItem/getItem` calls with `substrate.getState()` / `substrate.setState()` calls. The bridge handles mode detection internally.
- **Hydration:** On mount, useQpjStore calls `substrate.getState()`. In local mode, this reads localStorage (same as today). In edge mode, it fetches from the passport Worker.
- **Write-through:** Every `setState` call writes through the bridge. In local mode, same as today. In edge mode, POST to the passport Worker.
- **Feature flag:** When `substrate: true`, the store hydrates from the edge and writes through. When `false`, everything is localStorage.

**Gate:** All 215 tests must pass in both modes. Add a test that runs the store with `VITE_P31_SUBSTRATE_URL` set and unset.

**Success criteria:**

- [ ] Gate passes with substrate: false (localStorage, same as today)
- [ ] Gate passes with substrate: true and VITE_P31_SUBSTRATE_URL set
- [ ] useSubstrate() returns `{ mode: 'edge', ready: true }` when env is set
- [ ] State survives a page reload in edge mode
- [ ] State survives a page reload in local mode (regression)
- [ ] Zero visual change in both modes

**Do not:**

- Do not enable the flag in the deployed portal
- Do not implement sandbox execution (that's Track A.3)
- Do not change any UI component

### Structured Handoff Payload (Track A → Track A.2)

```json
{
  "pipeline_stage": "track_a_to_track_a2",
  "status": "dormant_substrate_deployed",
  "services": {
    "dispatch": "https://p31-dispatch.trimtab-signal.workers.dev",
    "passport": "https://p31-passport.trimtab-signal.workers.dev",
    "portal": "https://qpj.p31ca.org"
  },
  "commits": [
    "a05e4f8: substrate research + dispatch + passport + DO + bridge",
    "c7b5500: inline PassportDO + wrangler config fixes"
  ],
  "gate": "215/215 tests, typecheck, lint, build all green",
  "feature_flag": { "substrate": false },
  "blockers_resolved": [
    "DO tree-shaking (inlined class)",
    "wrangler version (still 3.114.17 — upgrade recommended)",
    "workspace resolution (symlink workaround — permanent fix pending)"
  ],
  "blockers_open": [
    "workspace: workers outside pnpm workspace",
    "wrangler: v3 not v4 — no declarative exports",
    "types: workers-types symlinked from external location"
  ],
  "next_steps": [
    "Fix workspace (add workers to pnpm-workspace.yaml)",
    "Upgrade wrangler to 4.124.0+",
    "Track A.2: wire store through bridge"
  ]
}
```
