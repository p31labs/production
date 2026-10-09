<!-- P31-HEADER
id: p31_wave_10_find_account_20261007_v1.0
type: runbook
component: shell
status: live
retention: keep-forever
created: 2026-10-07T00:00:00Z
owner: will
-->

# Wave 10 — Find and Account (Search, Activity, Compliance)

## Scope note (the honest line)

Waves 8–9b built the room, pages, comments, notifications, and BYOK, and the
behavioural gate is green (Playwright 15/15). Wave 10 is the **projection tier**
— three features that all read `bus_events`:

- **10a — Search.** FTS5 over the ledger, cmdk as the palette, ⌘K.
- **10b — Activity Feed and Compliance.** The allowlisted projection, the AI
  disclosure, the provenance field, the retention policy, and the audit export.

Wave 10 opens with a Phase 0 that closes one Wave 9b review defect and settles
one question:

1. **The notification dedup has no behavioural test** — the 3→1 mention collapse
   is asserted only structurally (`dedup|count|\bSet\b`). Phase 0a adds the case.
2. **`resolveKey` already returns the plaintext** — verified this turn:
   `resolveKey(env, did, provider): Promise<{ key: string; fingerprint: string }
   | null>` (functions/_lib/credentials.ts:44,60). The review's suspicion that it
   returned metadata only is **wrong**. The real remaining gap is narrower:
   `stream.ts` reads `cred?.fingerprint` for attribution but does not *route*
   `cred.key` to a provider — the turn still uses the keyless Workers AI
   binding. Phase 0b gates the contract (`resolveKey` returns a `key` field) and
   names the provider-routing seam as deferred.

**Explicitly not in this wave:** the OTel GenAI pipeline (Wave 11 — the
conventions are settled and `otel.ts` exists; Cloudflare exports traces and logs
only, not metrics, so the token histogram is a span attribute), a vector index,
push notifications, and shared-page membership UI.

## Phase 0 — close the Wave 9b review defect

### 0a — The notification dedup behavioural test

Add a `comments.spec.ts` case: three `comment.created` events mentioning the
same `did` produce one notification with `count: 3`. The harness emits the three
events; the assertion is the collapsed count, not a grep.

### 0b — Gate the `resolveKey` contract

Add to the `byok` gate:

```javascript
{ name: 'resolveKey returns the plaintext key', fn: () => { const s = shellSrcIf('functions/_lib/credentials.ts'); return (/key: string/.test(s) && /resolveKey/.test(s)) || 'resolveKey does not return a plaintext key'; } },
```

Provider routing — passing `cred.key` to a third-party provider — is deferred;
the turn currently runs the keyless Workers AI binding, and the fingerprint
attribution on `model.usage` already records which credential would have paid.

## Phase 1 — search (10a)

### 1a — The FTS5 index (`migrations/0007_search.sql`)

```sql
CREATE VIRTUAL TABLE IF NOT EXISTS search_fts USING fts5(
  event_type, text, session_id, did, face,
  content='bus_events', content_rowid='id'
);

CREATE TRIGGER IF NOT EXISTS bus_events_fts_insert AFTER INSERT ON bus_events BEGIN
  INSERT INTO search_fts(rowid, event_type, text, session_id, did, face)
  VALUES (new.id, new.event_type, new.payload_json, new.session_id, new.did, new.face);
END;

CREATE TRIGGER IF NOT EXISTS bus_events_fts_update AFTER UPDATE ON bus_events BEGIN
  INSERT INTO search_fts(search_fts, rowid, event_type, text, session_id, did, face)
  VALUES ('delete', old.id, old.event_type, old.payload_json, old.session_id, old.did, old.face);
  INSERT INTO search_fts(rowid, event_type, text, session_id, did, face)
  VALUES (new.id, new.event_type, new.payload_json, new.session_id, new.did, new.face);
END;

CREATE TRIGGER IF NOT EXISTS bus_events_fts_delete AFTER DELETE ON bus_events BEGIN
  INSERT INTO search_fts(search_fts, rowid, event_type, text, session_id, did, face)
  VALUES ('delete', old.id, old.event_type, old.payload_json, old.session_id, old.did, old.face);
END;
```

The migration ends with `INSERT INTO search_fts(search_fts) VALUES('rebuild')` so
the index is populated from the existing ledger — without it, search returns
nothing until the next insert. A plain `DELETE FROM search_fts` raises
`unsafe use of virtual table`; the `'delete'` command form is mandatory.

### 1b — The search endpoint

`functions/api/search/index.ts` — `?q=&scope=&limit=`. FTS5 `bm25()` base score
plus an adjacency boost for events sharing `session_id`, `did`, or `page_id`
with the query context. Grouped results: threads, pages, artifacts, actions.

### 1c — The palette

Install `cmdk`. `src/features/search/components/CommandPalette.tsx` — the
`Command` primitive with `Command.Input` carrying `role="combobox"`,
`aria-expanded`, `aria-controls`, and `aria-activedescendant` (focus stays in the
input while ↑/↓ move the highlight). ⌘K/Ctrl+K toggles via a keydown listener;
each `Command.Item`'s `onSelect` closes the palette and restores focus.

### 1d — The request-id guard

`src/features/search/lib/searchStore.ts` — every query carries a request id; a
response whose id is not the latest in flight is discarded. Debounce at 150ms.

## Phase 2 — activity feed (10b)

`functions/api/activity/index.ts` — the allowlisted, cursor-paginated projection
over `bus_events`, joined to the actor's display name. The allowlist is explicit
and short; every other type is audit-only. Consecutive same-actor-same-action
events collapse to one row with a count.

`src/features/activity/lib/activityLabels.ts` — the event-type → human-label map,
the single source. Adding a type without a label fails the gate.

## Phase 3 — compliance (10b)

### 3a — AI disclosure

`src/features/compliance/components/AiDisclosure.tsx` — a visible, persistent
marker on every assistant message and every agent suggestion. Article 50(1) is
live law: "chat and voice interfaces get an explicit notice at first interaction;
keep it in the interface, not buried in terms".

### 3b — Provenance

`artifact.persisted` and `artifact.shared` gain a `provenance` field
`{ generated: true, model, sessionId, generatedAt }`. `ProvenanceChip.tsx`
renders the "Generated by AI" chip.

### 3c — The audit export

`functions/api/audit/export.ts` — the bundle: `manifest.json` + `events.jsonl` +
`checksums.sha256`. The manifest carries `integrity_status ∈ VERIFIED | FAILED`,
set by a full verify-chain pass over the range at generation time. An export
whose chain fails still generates — with `FAILED` — so the failure is evidence.

### 3d — The retention policy

`functions/_lib/retention.ts` — the redaction job. A `session.retention` policy
(default `keep-forever`; down to a 180-day floor) schedules a sweep. Redaction
replaces `payload_json` with a tombstone `{ redacted: true, type, hash }` and
leaves `prev_hash`/`hash`/`id` intact — the chain still verifies.

## The gate

```bash
node scripts/gate.mjs --feature search
node scripts/gate.mjs --feature activity-feed
node scripts/gate.mjs --feature compliance
npx playwright test tests/e2e/
```

Structural assertions (the precondition): `search_fts` is external-content with
three triggers; the delete path uses the `'delete'` command form; the palette
carries `aria-activedescendant`; the request-id guard is present; the feed's
allowlist is explicit; the feed reads `bus_events` (no activity table); the
export sets `integrity_status` from a verify pass; the retention floor is 180
days; provenance is on artifact events; the AI disclosure renders; typecheck and
build pass.

Behavioural assertions (the gate): ⌘K opens from any face; a late response never
overwrites a fresh one; ↑/↓ moves the highlight with focus in the input; three
same-actor creates collapse to one row; a tampered row fails verification; a
redacted payload leaves the chain verifiable; three mentions → one notification
(count 3).

## Negative controls (plant, grep the needle, prove it fails, `cp` restore)

```bash
mkdir -p /tmp/opencode/nc

# 1 — the export lies about integrity
cp portals/shell/functions/api/audit/export.ts /tmp/opencode/nc/export.ts.bak
sed -i "s/integrity_status: verify.ok ? 'VERIFIED' : 'FAILED'/integrity_status: 'VERIFIED'/" \
  portals/shell/functions/api/audit/export.ts
grep -n "integrity_status: 'VERIFIED'" portals/shell/functions/api/audit/export.ts   # MUST show the plant
node scripts/gate.mjs --feature compliance --quick   # MUST exit 1
cp /tmp/opencode/nc/export.ts.bak portals/shell/functions/api/audit/export.ts

# 2 — the FTS delete uses the unsafe form
cp portals/shell/migrations/0007_search.sql /tmp/opencode/nc/0007.sql.bak
sed -i "s/VALUES ('delete', old.id/VALUES ('x', old.id/" portals/shell/migrations/0007_search.sql
grep -n "VALUES ('x'" portals/shell/migrations/0007_search.sql   # MUST show the plant
node scripts/gate.mjs --feature search --quick   # MUST exit 1
cp /tmp/opencode/nc/0007.sql.bak portals/shell/migrations/0007_search.sql

# 3 — retention breaks the chain
cp portals/shell/functions/_lib/retention.ts /tmp/opencode/nc/retention.ts.bak
sed -i 's/payload_json = tombstone/payload_json = tombstone, hash = NULL/' \
  portals/shell/functions/_lib/retention.ts
grep -n 'hash = NULL' portals/shell/functions/_lib/retention.ts   # MUST show the plant
node scripts/gate.mjs --feature compliance --quick   # MUST exit 1
cp /tmp/opencode/nc/retention.ts.bak portals/shell/functions/_lib/retention.ts

# 4 — the feed renders a non-allowlisted event
cp portals/shell/src/features/activity/lib/activityLabels.ts /tmp/opencode/nc/labels.ts.bak
sed -i "s/export const ACTIVITY_ALLOWLIST = \[/export const ACTIVITY_ALLOWLIST = ['message.content', /" \
  portals/shell/src/features/activity/lib/activityLabels.ts
grep -n "message.content" portals/shell/src/features/activity/lib/activityLabels.ts   # MUST show the plant
node scripts/gate.mjs --feature activity-feed --quick   # MUST exit 1
cp /tmp/opencode/nc/labels.ts.bak portals/shell/src/features/activity/lib/activityLabels.ts
```

Control 1 is the export that lies about integrity — the exact failure Article
50's provenance requirement exists to prevent. Control 3 is the retention job
that destroys the chain it was supposed to preserve.

## Decision log

| Decision | Basis | Recorded in |
|---|---|---|
| FTS5 external-content with three triggers | D1 supports FTS5; external-content needs insert/update/delete sync | search.md |
| The delete uses the `'delete'` command form | a plain DELETE raises `unsafe use of virtual table` | search.md |
| The migration ends with a rebuild | `bus_events` has rows when the migration applies | this runbook, 1a |
| `aria-activedescendant` keeps focus in the input | the cmdk a11y contract | search.md |
| The index is in D1, not the DO | a session's live draft is not searchable until it commits | search.md |
| The feed is an allowlist, not a store | activity feed ≠ audit log | activity-feed.md |
| `integrity_status` is set by a verify pass | the export spec's MUST | compliance.md |
| Retention redacts without breaking the chain | the chain must verify over a redacted range | compliance.md |
| Retention floor is 180 days | Article 50's six-month minimum | compliance.md |
| Compliance ships before OTel | Article 50 is live; OTel has no deadline | this runbook |
| `resolveKey` already returns the plaintext | verified at credentials.ts:44,60 | this runbook, scope note |

## Three review questions, answered

1. **Does the FTS5 index live in D1 or the DO?** D1, over `bus_events`. A
   session's live Yjs draft is not searchable until it commits — the Wave 8 rule
   (commits, not keystrokes).
2. **Is the audit export synchronous or a job?** A bounded synchronous request
   for a single session or short range; a queued job for a workspace-wide or
   multi-month export. A synchronous export that times out leaves a half-written
   bundle with `integrity_status` unset — the worst outcome.
3. **Does compliance ship before OTel?** Yes. Article 50 is live law and the
   ledger already has the chain; OTel is a developer-experience tier with no
   deadline. Wave 11 is the OTel GenAI pipeline — named here, not built here.

## Explicitly not in this wave

The OTel GenAI pipeline (Wave 11 — `gen_ai.conversation.id`, `gen_ai.agent.name`,
`gen_ai.operation.name`; the token histogram is a span attribute, not a metric).
Vector embeddings. Push notifications. Shared-page membership UI.