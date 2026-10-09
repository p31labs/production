# Operation: Rebuild the Mapping Projections

**Cadence**: after drift is detected (the `mappings`/`patches` tables disagree
with the `events` log).

## Overview

The `mappings` and `patches` tables are DERIVED read-models of the `events`
log — never authoritative. The ControlRoom DO hydrates its in-memory fold
from the log; the projections exist for fast SQL listing and the connect
snapshot. If they drift (a commit's projection write failed, or a migration
changed their shape), rebuild them from the log.

## Steps

### 1. Confirm drift

```bash
cd apps/music-maker/worker
# The events log's control.mapping.set rows:
npx wrangler d1 execute music-maker --remote \
  --command "SELECT COUNT(*) FROM events WHERE data LIKE '%control.mapping.set%'"
# The projection:
npx wrangler d1 execute music-maker --remote \
  --command "SELECT COUNT(*) FROM mappings"
```

If the log count is higher, the projection is stale.

### 2. Rebuild

Drop and re-apply the projection tables (the log is untouched; the DO will
re-hydrate from the log on its next wake):

```bash
npx wrangler d1 execute music-maker --remote --command \
  "DROP TABLE IF EXISTS mappings; DROP TABLE IF EXISTS patches;"
npx wrangler d1 execute music-maker --remote --file=./schema.sql
```

### 3. Verify the DO re-hydrates

```bash
curl -s https://music-presence.trimtab-signal.workers.dev/control/health | jq .
```

Expected: `destinations` matches the committed mappings count, and
`hydrationMode` is `"cold-start"` on the first wake after the rebuild (the
projection was empty; the fold rebuilt from the log).

## Verification

- [ ] Log count and projection count agree
- [ ] `/control/health` reports the correct destination count
- [ ] The surface shows the committed bindings after a reload