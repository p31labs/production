# Runbook: D1SchemaDrift

## Overview

- **Alert name**: `D1SchemaDrift`
- **Severity**: P1
- **Related services**: D1 `music-maker`, `ControlRoom` DO, `MusicRoom` DO
- **Last updated**: 2026-09-24
- **Owner**: @p31-platform (D1 owner)

## Symptoms

- The DO logs an unhandled rejection containing `no such table` or a missing
  column error.
- The smoke test fails on commit or snapshot with a D1 error.
- A new migration was merged but the remote database was not migrated.
- The local and remote databases disagree on their table set (the
  "works locally, breaks in production" class).

## Impact Assessment

- **Affected users**: everyone — the committed log is the single source of
  truth for the family's arrangement. If D1 is broken, the DO cannot read or
  write events, and both the spatial instrument and the control plane fail.
- **Business impact**: full data-plane outage.
- **Upstream/downstream**: both DOs (`MusicRoom`, `ControlRoom`) depend on
  `MUSIC_D1`.

## Diagnostic Steps

### 1. Confirm the schema on remote

```bash
cd apps/music-maker/worker
npx wrangler d1 execute music-maker --remote \
  --command "SELECT name FROM sqlite_master WHERE type='table'"
```

Expected: `events`, `mappings`, `patches`, `d1_migrations`. If `mappings` or
`patches` is missing, the control projection tables were never applied —
go to Scenario A.

### 2. Confirm the local schema matches

```bash
npx wrangler d1 execute music-maker --local \
  --command "SELECT name FROM sqlite_master WHERE type='table'"
```

Expected: the same table set. If local and remote differ, the migration was
applied to one side only — go to Scenario B.

### 3. Confirm the DO's binding points at the right database

```bash
grep -A4 "d1_databases" apps/music-maker/worker/wrangler.toml
```

Expected: `database_name = "music-maker"` and a real `database_id`.

## Fix Steps

### Scenario A: projection tables missing on remote

The schema was never applied (or applied before the `mappings`/`patches`
tables were added). Apply it now:

```bash
cd apps/music-maker/worker
npx wrangler d1 execute music-maker --remote --file=./schema.sql
```

Verify:

```bash
npx wrangler d1 execute music-maker --remote \
  --command "SELECT name FROM sqlite_master WHERE type='table'"
```

Expected: all four tables. Estimated time: 2 minutes.

### Scenario B: local/remote drift

Apply the same schema to local, and re-run the local smoke:

```bash
npx wrangler d1 execute music-maker --local --file=./schema.sql
cd apps/music-maker && pnpm smoke
```

The standard rule: apply to BOTH sides when a migration ships. "Local-only
migrations cause confusing 'works locally, breaks in production' issues."

### Scenario C: migration never added to schema.sql

The code references a table that `schema.sql` does not create. The build's
`runbook-validate.mjs` should catch this, but if the DO reached the code
first:

1. Add the missing `CREATE TABLE IF NOT EXISTS` to `worker/schema.sql`.
2. Apply to remote (`Scenario A`).
3. Apply to local (`Scenario B`).

## Escalation

If D1 is failing and the schema looks correct: page @p31-platform. Check the
D1 quota / error rate in the dashboard. Do not create or drop tables by hand
under incident pressure.

## Post-Actions

- [ ] Update this runbook
- [ ] Add the schema drift check to `runbook-validate.mjs` (compare remote
      vs local table sets)
- [ ] Record the migration that was missed