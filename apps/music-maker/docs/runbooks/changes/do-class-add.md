# Change: DO Class Addition

**Applies to**: `apps/music-maker/worker/` — adding a new Durable Object class
(sibling to `MusicRoom` and `ControlRoom`).

## Why this is a change procedure

A DO class is a stateful, billed resource. Its binding must be exported from
the entrypoint (wrangler fails the deploy otherwise), declared in
`wrangler.toml` with the SQLite backend, and reachable via a route. The
ControlRoom's sibling pattern is the template.

## Steps

### 1. Declare the class

- New file in `apps/music-maker/worker/` (e.g. `newRoom.ts`).
- `import { DurableObject } from 'cloudflare:workers'` + the class.
- **Export it from `worker/index.ts`** — `export { NewRoom }` is required;
  wrangler's dry-run fails with "depends on the following Durable Objects,
  which are not exported" otherwise.

### 2. Bind it in `wrangler.toml`

```toml
[durable_objects]
bindings = [
  { name = "MUSIC_ROOM", class_name = "MusicRoom" },
  { name = "CONTROL_ROOM", class_name = "ControlRoom" },
  { name = "NEW_ROOM", class_name = "NewRoom" },
]

[exports.NewRoom]
type = "durable-object"
storage = "sqlite"
```

`storage = "sqlite"` is REQUIRED (new namespaces must use the SQLite
backend). No `[[migrations]]` entries — the `[exports.*]` declaration handles
class lifecycle.

### 3. Route to it

Add a `url.pathname.startsWith(...)` branch in the top-level `fetch` in
`worker/index.ts`, mirroring the `/control/*` branch.

### 4. Include it in the worker tsconfig

`worker/tsconfig.json` `include` must list the new file.

### 5. Gate

```bash
cd apps/music-maker/worker
npx tsc -p tsconfig.json
npx wrangler deploy --dry-run --outdir /tmp/check
```

Expected: the new binding listed; dry-run exits cleanly.

## Verification

- [ ] `npx tsc -p tsconfig.json` green
- [ ] `wrangler deploy --dry-run` lists the new DO binding
- [ ] The route reaches the DO (`curl` the new health path)
- [ ] The class is exported from `worker/index.ts`
- [ ] `storage = "sqlite"` in `[exports.NewRoom]`