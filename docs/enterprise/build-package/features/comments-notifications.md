<!-- P31-HEADER
id: p31_feature_comments_notifications_20261006_v1.0
type: spec
component: shell
status: live
retention: keep-forever
created: 2026-10-06T00:00:00Z
owner: will
-->

# Feature: Comments and Notifications

## The invariant

A comment is anchored to a range of text and survives concurrent edits; a thread
has five states (`open` → `resolved` → `reopened` → `resolved`, plus `orphaned`);
a mention notifies the mentioned participant once, not once per keystroke; and
read state is per-participant, viewport-driven, and never a ledger row.

## The boundary

This feature does **not** own:

- **The anchor** — Yjs relative positions own the anchor (see `pages.md`).
- **The transport** — the page's Yjs doc and its `PageRoom` DO own sync.
- **The audit** — the ledger owns every durable state transition. This feature
  renders them; it does not store them.
- **Push delivery** — this feature is in-app only. Email and web push are a
  later wave with their own consent model.
- **Presence** — Wave 8's awareness channel owns who is in the room. A comment
  is not presence; it is durable.
- **The activity feed** — a curated allowlisted view over the ledger, deferred
  to a later wave.

Four rules this feature owns outright:

1. **The thread is CRDT state; the transition is a ledger event.** The thread
   body lives in the page's Yjs doc (`threads` map). `comment.created`,
   `comment.resolved`, and `comment.reopened` are ledger events. The doc syncs;
   the ledger audits.
2. **An orphaned anchor is a state, not a deletion.** When the anchored range
   resolves to `null`, the thread renders with the quoted text it was attached
   to. It stays resolvable. It is never silently dropped. `null` is the honest
   answer — the place the caret pointed is gone.
3. **A mention notifies once, and dedups by target.** `comment.created` carries
   `mentions: [did]`. Three comments mentioning the same person collapse to one
   notification with a count of 3. Notifications flush batched (one per
   `requestAnimationFrame`, the Wave 7 token-batching discipline). The
   notification store is a derived view over ledger events, never a new event
   type.
4. **Read state is per-participant, viewport-driven, and derived — it is
   never a ledger event.** An `IntersectionObserver` marks a notification read
   when it enters the viewport, not on a timer. The read receipt lives in a
   per-did read watermark (D1 state or the awareness channel for live sessions),
   batched as "I have read up to X", and notifies only the author in the live
   session. **It is not audited:** one read by each of 256 participants must not
   produce 256 ledger rows — reading something is not an accountable change to
   shared state. The durable facts are the comment lifecycle events; read state
   is a derived convenience view.

## The implementation

| File | What it provides |
|---|---|
| `src/shell/pages/commentStore.ts` | the thread map (CRDT) + the transition events |
| `src/shell/pages/CommentThread.tsx` | the anchored thread: replies, resolve, reopen |
| `src/shell/pages/useCommentAnchor.ts` | `Y.RelativePosition` create/resolve + the orphaned case |
| `src/shell/notifications/notificationStore.ts` | the two-tier model: active → history, dedup by target, rAF batching |
| `src/shell/notifications/NotificationInbox.tsx` | the bell + unread badge + the inbox |
| `src/shell/notifications/useReadOnViewport.ts` | the `IntersectionObserver` read watermark (derived, never a ledger event) |
| `src/bus/events.ts` | *(modified)* `comment.created`, `comment.resolved`, `comment.reopened` |

## The tests (negative controls in both directions)

| Test | Pass case | Fail case |
|---|---|---|
| anchor survives edits | edit above the anchor → the comment stays on its range | anchor drifts or detaches |
| orphaned anchor | delete the range → the comment renders with the quote | the comment vanishes |
| resolve/reopen | resolve → hidden from open; reply → reopened | resolve deletes the thread |
| mention dedup | 3 comments mention one did → 1 notification, count 3 | 3 notifications |
| viewport read | scroll a notification into view → marked read | timer marks everything read |
| read is derived | a read updates a per-did watermark; the ledger has no read row | a read appends a ledger event |

## The gate

```bash
node scripts/gate.mjs --feature comments-notifications
npx playwright test tests/e2e/comments.spec.ts
```

The structural assertions are a precondition. The behavioural assertions are the
gate: (a) an anchor survives an edit above it; (b) deleting the range orphans
the comment rather than crashing; (c) three mentions of one person produce one
notification.

## The escalation

When this feature blocks a surface, the surface does not ship comments. A
comment that detaches from its text is worse than no comment — the thread loses
its subject and the discussion becomes unanswerable.