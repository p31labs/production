# Operation: Apply D1 Schema

**Cadence**: per migration. **Pilot step** — the schema is NEVER applied by
`wrangler deploy`.

## Overview

The `events` table (the committed log) plus the `mappings`/`patches`
projection tables live in D1. `schema.sql` is the single source. Apply to BOTH
remote and local — local-only migrations cause confusing "works locally,
breaks in production" issues.

## Steps

### Remote

```bash
cd apps/music-maker/worker
npx wrangler d1 execute music-maker --remote --file=./schema.sql
```

### Local (the E2E + wrangler dev harness)

```bash
cd apps/music-maker/worker
npx wrangler d1 execute music-maker --local --file=./schema.sql
```

### Verify both

```bash
npx wrangler d1 execute music-maker --remote \
  --command "SELECT name FROM sqlite_master WHERE type='table'"
npx wrangler d1 execute music-maker --local \
  --command "SELECT name FROM sqlite_master WHERE type='table'"
```

Expected (both): `events`, `mappings`, `patches`, `d1_migrations`.

## Verification

- [ ] Remote and local table sets match
- [ ] The smoke test passes after the apply
- [ ] A migration that adds a table also adds its `CREATE TABLE IF NOT EXISTS`
      to `schema.sql` (the drift check enforces this)