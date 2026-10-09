<!-- P31-HEADER
id: p31_wave_9b_comments_byok_20261007_v1.0
type: runbook
component: shell
status: live
retention: keep-forever
created: 2026-10-07T00:00:00Z
owner: will
-->

# Wave 9b — Comments, Notifications, and BYOK (executable)

## Scope note (the honest line)

Wave 9a's Phase 0 is **done**, and the harness-fidelity rebuild made the
behavioural gate **green for the first time** (collab-harness 8/8, pages 9/9,
collaboration 11/11, Playwright 13/13). The base is behaviourally verified:
the client protocol converges, presence relays, and a relative-position anchor
orphans correctly.

Wave 9b is the second half of the pages tier — anchored comment threads, the
notification inbox, and per-user provider credentials.

Two corrections landed with this package, carried from the migration cascade the
`0004_suggestions` migration introduced in Phase 0:

1. **Migration renumbering.** `0004` is now *suggestions*, so the credentials
   table is `0006_credentials.sql` and the notifications watermark is
   `0005_notification_reads.sql`. The Wave 10 search migration moves from
   `0005_search` to `0007_search` (already corrected in `scripts/gate.mjs`).
2. **Gate paths.** The `comments-notifications` and `byok` gates referenced
   `src/shell/pages/…`/`src/shell/notifications/…` and `0004_credentials.sql`;
   both corrected to `src/features/…` and `0006_credentials.sql`.

**Explicitly not in this wave:** search, activity, compliance (Wave 10), the
OTel pipeline (Wave 11), a vector index, and push notifications.

## Preconditions (deterministic, abort-fast)

```bash
node scripts/gate.mjs --feature collab-harness   # 8/8 today
node scripts/gate.mjs --feature pages            # 9/9 today
node scripts/gate.mjs --feature collaboration    # 11/11 today
npm --prefix portals/shell run typecheck         # exit 0
```

## Phase 1 — comments and notifications

### 1a — The thread lives in the page's `Y.Doc`

`src/features/comments/lib/commentStore.ts` — a `threads` `Y.Map` in the page's
doc. A comment anchors with a relative position; the position resolves only
against the doc that holds the text, so a separate doc has no reference frame.

```ts
import * as Y from 'yjs';

export interface CommentThread {
  id: string;
  anchorStart: string;   // b64(Y.encodeRelativePosition(...))
  anchorEnd: string;
  quoted: string;        // the text the anchor covered at creation time
  authorDid: string;
  body: string;
  state: 'open' | 'resolved' | 'reopened';
  createdAt: number;
}

export function threadsOf(doc: Y.Doc): Y.Map<CommentThread> {
  return doc.getMap<CommentThread>('threads');
}
```

### 1b — The anchor

`src/features/comments/hooks/useCommentAnchor.ts` — the encode/resolve pair.
Two rules the research pins: `assoc = -1` on the start and `+1` on the end (an
insertion at the boundary lands outside the comment), and
`followUndoneDeletions = false` on resolve (a shared position must resolve the
same for everyone).

```ts
import * as Y from 'yjs';

export type ResolvedAnchor =
  | { state: 'resolved'; index: number; length: number }
  | { state: 'orphaned' }
  | { state: 'pending' };

export function anchorRange(ytext: Y.Text, index: number, length: number) {
  const start = Y.createRelativePositionFromTypeIndex(ytext, index, -1);
  const end = Y.createRelativePositionFromTypeIndex(ytext, index + length, 1);
  return {
    anchorStart: b64(Y.encodeRelativePosition(start)),
    anchorEnd: b64(Y.encodeRelativePosition(end)),
    quoted: ytext.toString().slice(index, index + length),
  };
}

export function resolveAnchor(
  thread: Pick<CommentThread, 'anchorStart' | 'anchorEnd' | 'quoted'>,
  doc: Y.Doc,
): ResolvedAnchor {
  const start = Y.decodeRelativePosition(b64d(thread.anchorStart));
  const end = Y.decodeRelativePosition(b64d(thread.anchorEnd));
  const a = Y.createAbsolutePositionFromRelativePosition(start, doc, false);
  const b = Y.createAbsolutePositionFromRelativePosition(end, doc, false);
  if (!a || !b) return { state: 'orphaned' };
  // A deleted item is a tombstone until GC — verify the range still holds the
  // quoted text before calling it resolved.
  const ytext = doc.getText('content');
  const slice = ytext.toString().slice(a.index, b.index);
  if (slice !== thread.quoted) return { state: 'orphaned' };
  return { state: 'resolved', index: a.index, length: b.index - a.index };
}
```

The decoded position never lives in component state — it is re-resolved on every
transaction, local and remote, because "the relative position is a stable value"
but "you need to recompute the absolute positions on every change".

### 1c — The thread component

`src/features/comments/components/CommentThread.tsx` — replies, resolve, reopen,
and the orphaned rendering. Five states: `open` → `resolved` → (`reply`) →
`reopened` → `resolved`, plus `orphaned`. Only the lifecycle transitions reach
the ledger (`comment.created`, `comment.resolved`, `comment.reopened`); the
thread body is CRDT state. An orphaned thread renders with its quoted text and
stays resolvable — "render nothing rather than falling back to an index".

### 1d — The notification store

`src/features/notifications/lib/notificationStore.ts` — a two-tier
`active → history` model with dedup by target and batching.

```ts
export interface Notification {
  id: string;          // dedup key: `${objectType}:${objectId}:${reason}`
  objectType: 'page' | 'comment';
  objectId: string;
  reason: 'mention' | 'reply' | 'resolved';
  count: number;       // three mentions of one person → count 3
  actorDid: string;
  createdAt: number;
  read: boolean;
}
```

A `comment.created` carrying `mentions: [did]` increments `count` when a
notification with the same dedup key already exists in the active tier. Flush on
`requestAnimationFrame` — a burst of ten comments is one store update.

### 1e — The read watermark

`src/features/notifications/hooks/useReadOnViewport.ts` — an
`IntersectionObserver` marks a notification read when it enters the viewport.
Read state is a watermark plus an exception list, never a per-notification row
and never a ledger event:

```sql
-- migrations/0005_notification_reads.sql
CREATE TABLE IF NOT EXISTS notification_reads (
  did TEXT NOT NULL,
  object_type TEXT NOT NULL,
  object_id TEXT NOT NULL,
  last_read_at INTEGER NOT NULL,
  exceptions_json TEXT,
  PRIMARY KEY (did, object_type, object_id)
);
```

One read by each of 256 members must not append 256 ledger rows; reading is not
an accountable change to shared state.

### 1f — The events

`src/bus/events.ts` — `comment.created`, `comment.resolved`, `comment.reopened`
(additive). **No `notification.read` event type** — a gate assertion confirms its
absence.

## Phase 2 — BYOK

### 2a — The schema

```sql
-- migrations/0006_credentials.sql
CREATE TABLE IF NOT EXISTS credentials (
  id TEXT PRIMARY KEY,
  did TEXT NOT NULL,
  provider TEXT NOT NULL,
  ciphertext BLOB NOT NULL,
  iv BLOB NOT NULL,
  fingerprint TEXT NOT NULL,          -- sha256(key).slice(0, 12)
  created_at INTEGER NOT NULL,
  revoked_at INTEGER
);
CREATE INDEX IF NOT EXISTS idx_credentials_did
  ON credentials (did, provider) WHERE revoked_at IS NULL;
```

No plaintext column.

### 2b — The crypto

`functions/_lib/credentials.ts` — AES-256-GCM via `crypto.subtle`, the native
Web Crypto API on Workers. The IV is `crypto.getRandomValues(new Uint8Array(12))`
— random per credential, stored beside the ciphertext (a reused IV breaks GCM).
`resolveKey(did, provider)` decrypts per call; the plaintext is in scope for one
inference, then released — no cache, no module-level variable.

### 2c — The API

`functions/api/credentials/index.ts` — POST connect (encrypt, store, append
`credential.connected` with the fingerprint), GET list (provider, fingerprint,
created_at — never ciphertext, never iv), DELETE disconnect (`revoked_at`,
append `credential.disconnected`).

### 2d — The resolution

`functions/api/chat/stream.ts` calls `resolveKey(did, provider)` just before the
model call. The Pages Function resolves; the room DO never touches the key.
Per the AI Gateway resolution order, a provider key on the request wins, else
the stored key is used. No credential → the workspace default; on the Workers AI
binding, no key is needed at all.

### 2e — The leak gate

```bash
grep -r 'sk-' dist/ && echo 'KEY IN BUNDLE' && exit 1 || true
```

## The gate

```bash
node scripts/gate.mjs --feature comments-notifications
node scripts/gate.mjs --feature byok
npx playwright test tests/e2e/comments.spec.ts tests/e2e/byok.spec.ts
```

Structural assertions (the precondition): the thread is CRDT state (`threads`
`Y.Map`); a `null` resolution is orphaned, not an error; mentions dedup by
target; read state is viewport-driven (`IntersectionObserver`); `comment.*` are
ledger events with no `notification.read`; the key is AES-256-GCM at rest (no
plaintext column); GET returns metadata only; `credential.*` carry a fingerprint;
`resolveKey` is per-call and the DO never touches a key; disconnect revokes;
`grep -r 'sk-' dist/` is empty.

Behavioural assertions (the gate): an anchor survives an edit above it; deleting
the range orphans the comment with its quote; three mentions → one notification
(count 3); the GET returns no key and the bundle contains no `sk-`; a
disconnected key never resolves again.

## Negative controls (plant, grep the needle, prove it fails, `cp` restore)

`portals/shell/**` is untracked — `cp` to `/tmp/opencode/nc/`, never `git checkout`.

```bash
mkdir -p /tmp/opencode/nc

# 1 — the anchor uses an index, not a relative position (it drifts)
cp portals/shell/src/features/comments/hooks/useCommentAnchor.ts /tmp/opencode/nc/useCommentAnchor.ts.bak
sed -i 's/createRelativePositionFromTypeIndex/createAbsolutePositionFromTypeIndex/g' \
  portals/shell/src/features/comments/hooks/useCommentAnchor.ts
grep -c 'createRelativePositionFromTypeIndex' portals/shell/src/features/comments/hooks/useCommentAnchor.ts   # MUST be 0
node scripts/gate.mjs --feature comments-notifications --quick   # MUST exit 1
cp /tmp/opencode/nc/useCommentAnchor.ts.bak portals/shell/src/features/comments/hooks/useCommentAnchor.ts

# 2 — the key leaks into the GET body
cp portals/shell/functions/api/credentials/index.ts /tmp/opencode/nc/credentials.ts.bak
sed -i 's/fingerprint: /ciphertext: row.ciphertext, fingerprint: /' \
  portals/shell/functions/api/credentials/index.ts
grep -n 'ciphertext: row.ciphertext' portals/shell/functions/api/credentials/index.ts   # MUST show the plant
node scripts/gate.mjs --feature byok --quick   # MUST exit 1
cp /tmp/opencode/nc/credentials.ts.bak portals/shell/functions/api/credentials/index.ts

# 3 — the iv is reused (static)
cp portals/shell/functions/_lib/credentials.ts /tmp/opencode/nc/credentials-lib.ts.bak
sed -i 's/crypto.getRandomValues(new Uint8Array(12))/new Uint8Array(12)/' \
  portals/shell/functions/_lib/credentials.ts
grep -n 'new Uint8Array(12)' portals/shell/functions/_lib/credentials.ts   # MUST show the plant
node scripts/gate.mjs --feature byok --quick   # MUST exit 1 (static-iv assertion)
cp /tmp/opencode/nc/credentials-lib.ts.bak portals/shell/functions/_lib/credentials.ts

# 4 — read state becomes a ledger event
cp portals/shell/src/bus/events.ts /tmp/opencode/nc/events.ts.bak
sed -i "s/'comment.reopened',/'comment.reopened', 'notification.read',/" portals/shell/src/bus/events.ts
grep -n 'notification.read' portals/shell/src/bus/events.ts   # MUST show the plant
node scripts/gate.mjs --feature comments-notifications --quick   # MUST exit 1
cp /tmp/opencode/nc/events.ts.bak portals/shell/src/bus/events.ts
```

Control 1 is the anchor that drifts. Control 2 is the key leak. Control 3 is the
static IV that breaks GCM. Control 4 is the read flood. Each is grep-verified
before the gate runs, and each file is `cp`-restored after — the Wave 7 rule and
the Wave 8 restore rule.

## Decision log

| Decision | Basis | Recorded in |
|---|---|---|
| The thread lives in the page's `Y.Doc` | a relative position resolves only against the doc that holds the text | 1a |
| `assoc = -1` start, `+1` end | an insertion at the boundary lands outside the comment | 1b |
| `followUndoneDeletions=false` | a shared position must resolve the same for everyone | 1b |
| `null` resolution is orphaned, rendered with its quote | "the honest answer — the place that caret pointed at no longer exists" | 1b |
| The absolute position is recomputed on every transaction | "you need to recompute the absolute positions on every change" | 1b |
| Read state is a watermark + exception list | a 256-member read flood is a DoS on the audit | 1e |
| No `notification.read` event | reading is not an accountable change to shared state | 1f |
| The IV is random per credential | GCM with a reused IV is catastrophic | 2b |
| `resolveKey` is per-call, no cache | the engine must not hold a key | 2b |
| The Pages Function resolves; the DO never does | the DO's job is sync, not inference | 2d |
| Credentials migration is `0006`, search is `0007` | `0004` became suggestions in Phase 0 | scope note |

## Three review questions, answered

1. **Does the comment anchor encode to the wire, or stay in the doc?** Encode on
   write with `Y.encodeRelativePosition`, store the b64 in D1, decode on read. A
   decode failure is treated as orphaned, the same as a `null` resolution — a
   raw relative position does not survive a process boundary.
2. **Is `credential.connected` enough audit?** No — a *use* must be auditable
   for billing disputes. `model.usage` already carries `authorDid`; add a
   `fingerprint` field additively so the usage row records which credential
   paid. No new event type.
3. **Does the read watermark belong in D1 or the client store?** D1 — durable
   per-participant state that outlives a session. The live session applies it
   optimistically and reconciles on mount; `exceptions_json` handles the
   "marked one unread after reading past it" case a bare watermark cannot.

## Explicitly not in this wave

Search, activity, compliance (10); the OTel pipeline (11); push notifications;
a vector index; shared-page membership UI.