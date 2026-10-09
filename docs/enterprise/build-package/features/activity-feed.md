<!-- P31-HEADER
id: p31_feature_activity_feed_20261006_v1.0
type: spec
component: shell
status: live
retention: keep-forever
created: 2026-10-06T00:00:00Z
owner: will
-->

# Feature: Activity Feed

## The invariant

A participant can see what happened in a workspace, a page, or a session as a
human-readable timeline; the feed is a curated projection over the ledger, not a
second store; and an event type not on the allowlist appears in the audit export
but never in the feed.

## The boundary

This feature does **not** own:

- **The ledger** — the audit log is the ledger. The feed is a view.
- **Notifications** — Wave 9's `NotificationInbox` owns per-participant unread
  state. The feed is workspace- and object-scoped, not per-participant.
- **The audit export** — `compliance.md` owns the tamper-evident bundle. The
  feed is human-rendered; the export is machine-verifiable.
- **Presence** — Wave 8's awareness channel owns who is here now. The feed owns
  what already happened.

Four rules this feature owns outright:

1. **The feed is a filtered, enriched projection.** A read is a `SELECT` over
   `bus_events` joined to the actor's display name, filtered to an allowlist,
   rendered with a human label. No new table, no denormalization.
2. **The allowlist is explicit and short.** Only accountable, human-meaningful
   events appear: `page.created`, `page.deleted`, `page.restored`,
   `comment.created`, `comment.resolved`, `artifact.shared`,
   `suggestion.created`, `suggestion.resolved`, `tool.approval.recorded`,
   `credential.connected`, `credential.disconnected`, `session.joined`. Every
   other type is audit-only. **The feed never invents an event.**
3. **Consecutive same-actor-same-action events collapse.** Three pages created
   by one actor in one window render as one row with a count — the same
   `N posts to your talk page` → one notification discipline Wave 9 applied to
   mentions, now applied to the feed.
4. **The feed is read-only and never a source of truth.** No action in the feed
   mutates state. Every row links to the object it describes; the link is the
   affordance.

## The implementation

| File | What it provides |
|---|---|
| `functions/api/activity/index.ts` | `?scope=workspace\|page\|session&before=&limit=&actor=&type=` — the allowlisted, cursor-paginated projection |
| `src/shell/activity/activityStore.ts` | the feed state, the cursor, the filters |
| `src/shell/activity/ActivityFeed.tsx` | the timeline: grouped rows, relative timestamps, actor chips |
| `src/shell/activity/activityLabels.ts` | the event type → human label map (the single source) |
| `src/shell/pages/PageActivity.tsx` | *(modified)* the page-scoped feed |

## The tests (negative controls in both directions)

| Test | Pass case | Fail case |
|---|---|---|
| allowlist only | a `message.content` event appears in the export, not the feed | every event type renders |
| no second store | the feed reads `bus_events`; no activity table exists | a denormalized table drifts |
| dedup by actor+action+window | 3 creates → 1 row, count 3 | 3 rows |
| cursor pagination | scroll loads older without duplicates | duplicates on the boundary |
| read-only | no feed row mutates state | a row performs an action |
| the label is the single source | adding a type without a label fails the gate | an unlabeled type renders raw |

## The gate

```bash
node scripts/gate.mjs --feature activity-feed
npx playwright test tests/e2e/activity.spec.ts
```

The structural assertions are a precondition. The behavioural assertions are the
gate: (a) three same-actor creates collapse to one row; (b) a non-allowlisted
event never appears; (c) scrolling loads older without duplicates.

## The escalation

When this feature blocks a surface, the surface does not ship the feed. A feed
that renders raw event types is a debug log wearing a timeline's clothes.