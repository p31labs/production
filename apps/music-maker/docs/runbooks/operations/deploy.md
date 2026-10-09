# Operation: Deploy the Worker

**Cadence**: per release.

## Overview

The music-presence Worker serves the built SPA (assets) + the two DOs
(`MusicRoom`, `ControlRoom`) + the D1 binding. The deploy is atomic;
`wrangler rollback` reverts to the previous version. The D1 schema is NOT
applied by the deploy — see `operations/schema-apply.md`.

## Steps

### 1. Gate (local)

```bash
cd apps/music-maker
pnpm typecheck && pnpm test && pnpm build
```

### 2. Deploy

```bash
cd worker && npx wrangler deploy
```

Expected output: two DO bindings (`MusicRoom`, `ControlRoom`), one D1 binding
(`music-maker`), assets. If `ControlRoom` is missing, the `[exports.ControlRoom]`
block is absent — the deploy fails with "depends on the following Durable
Objects, which are not exported".

### 3. Post-flight

```bash
curl -s -o /dev/null -w "%{http_code}\n" \
  https://music-presence.trimtab-signal.workers.dev/health        # 200
curl -s https://music-presence.trimtab-signal.workers.dev/control/health | jq .ok  # true
cd apps/music-maker && pnpm smoke
```

### 4. If the deploy regressed

```bash
cd apps/music-maker/worker && npx wrangler rollback
```

Up to 100 versions retained; a rollback creates a new deployment, it does not
delete history.

## Verification

- [ ] `pnpm typecheck && pnpm test && pnpm build` green
- [ ] Both DO bindings present in the deploy output
- [ ] `/health` 200 and `/control/health` ok:true
- [ ] Smoke passes
- [ ] Rollback verified (drill, not just written)