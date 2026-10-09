# Emergency Procedure: Data-Integrity Incident

**Trigger**: SEV-1 — the committed log (D1 `events`) is suspected of data
loss, corruption, or unauthorized modification.

## What must survive (from INCIDENT_CARD.md)

- **The committed log (D1) must survive.** It is the score — the family's
  arrangement. The `prev_hash` chain makes every row tamper-evident: a
  rewritten row breaks the link, and the canon hash-chain gate recomputes the
  verdict.
- **Ephemeral presence can be lost freely.** Triggers, cursor positions,
  who-is-hearing-what — gone by design, no recovery needed.

## Phase 1 — Freeze writes

Do NOT append or delete events while the incident is live. The DO's committed
writes go through the gate + hash chain; a manual intervention during a
corruption event would compound the damage.

1. Declare the incident (`!ic declare SEV-1 data-integrity`).
2. Note the current head seq (the last committed row).

## Phase 2 — Assess integrity

```bash
cd apps/music-maker/worker
npx wrangler d1 execute music-maker --remote \
  --command "SELECT seq, ts, prev_hash, length(data) FROM events ORDER BY seq DESC LIMIT 10"
```

Then run the canon hash-chain verify against the exported log:

```bash
# The canon's hash-chain gate recomputes every link and reports tamper.
cd apps/music-maker && pnpm exec tsx -e "
  import { readEvents } from './src/hooks/useMusicSession.ts';
  // Or, for the raw chain: node --experimental-strip-types \
  //   ../../packages/canon/scripts/test-loom-hashchain.mjs
"
```

Look for:
- A gap in `seq` (a row was deleted).
- A `prev_hash` that does not match the recomputed value (a row was
  modified).
- A truncated `data` field (a partial write).

## Phase 3 — Determine the blast radius

- If only `events` is affected, the projection tables (`mappings`,
  `patches`) are DERIVED — rebuild them from the log after recovery
  (`operations/projection-rebuild.md`).
- If the DO's `control:fold` checkpoint is also suspect, the DO falls back to
  a cold start from the log — the checkpoint is a cache, never authoritative.

## Phase 4 — Restore

The D1 backup/restore policy is the committed-log backup drill. If a
backup exists:

```bash
# Restore is via the D1 backup mechanism in the Cloudflare dashboard, or a
# re-apply of the last known-good schema + event export.
```

If no backup exists, the last known-good state is whatever the head of the
`events` table is — the log IS the truth. Do not fabricate a "recovery" that
the log cannot support.

## Phase 5 — Postmortem (mandatory)

A data-integrity incident is always SEV-1. Use
`policies/postmortem-template.md`. The "What went badly" section must name
the backup gap explicitly if a restore was impossible.

## Authority

The IC can freeze writes, assess integrity, and run the restore drill. The IC
cannot append compensating events to hide a gap — the log is append-only, and
a compensating event is itself an audit trail entry, not a repair.