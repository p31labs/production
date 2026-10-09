<!-- P31-HEADER
id: p31_feature_thread_list_20261006_v1.0
type: spec
component: shell
status: live
retention: keep-forever
created: 2026-10-06T00:00:00Z
owner: will
-->

# Feature: Thread List

## The invariant

The sidebar renders N conversations in O(visible) DOM nodes; scrolling near the
bottom loads older conversations without flicker or duplicate rows; every row
carries a stable key across re-sorts; the date buckets are computed from
`lastMessageAt` and never render a label above a row that does not belong to it;
and the list survives a new message arriving in a thread that is already loaded.

## The boundary

This feature does **not** own:

- **The message cursor** — Wave 5's `loadOlder` owns the transcript's cursor
  (ledger id, exclusive). The thread list has its own cursor (see rule 2).
- **The virtualizer contract** — Wave 3's `useThreadVirtualizer` owns the
  absolute-positioning rule. The sidebar reuses it; it does not reinvent it.
- **Search indexing** — this feature calls the search endpoint; it does not own
  the index.
- **Artifact detection** — a separate feature. A thread row's preview text is
  the last message, not the last artifact.

Five rules this feature owns outright:

1. **The absolute-positioning contract.** One `position: relative` spacer at
   `getTotalSize()`; each row `position: absolute` + `translateY(virtualItem.start)`.
   A `paddingTop`/`paddingBottom` wrapper re-measures rows whose offsets the
   padding just shifted — the flicker loop. The sidebar must not use padding
   for row positioning.
2. **The cursor is `(lastMessageAt, sessionId)` — a tuple, not a timestamp.** Two
   threads modified in the same millisecond collide on a bare timestamp. The
   tiebreaker is the session id. The cursor is exclusive.
3. **A new message in a loaded thread re-sorts the list.** The list is ordered by
   `lastMessageAt` descending. A thread that receives a message after its page was
   fetched must move to the top — but only if the message is *newer* than the
   current top, not if it is a backfill. The re-sort must not unmount the active
   row.
4. **Date buckets are computed, not stored.** The bucket boundaries are `Today`,
   `Yesterday`, `This Week`, `This Month`, `Older`, computed from `lastMessageAt`
   against the user's local midnight. A row whose bucket is `Today` never renders
   under a `Yesterday` header.
5. **The active thread is pinned, not re-sorted.** The row for the conversation
   the user is currently reading stays at its position until the user sends or
   receives a new message in it.

## The implementation

| File | What it provides |
|---|---|
| `functions/api/conversations/index.ts` | `?before=&limit=` paging over `bus_events` grouped by session |
| `src/shell/chat/threadListClient.ts` | the cursor walk: `fetchThreads(before, limit)` |
| `src/shell/chat/threadListStore.ts` | the conversation list, cursor, hasMore, buckets |
| `src/shell/chat/useThreadListVirtualizer.ts` | the start-anchored absolute-positioning virtualizer |
| `src/shell/chat/useThreadListOnScroll.ts` | the bottom sentinel + in-flight guard + ref-guard |
| `src/shell/chat/ThreadList.tsx` | the sidebar: rows, bucket headers, search, new-thread |

## The tests (negative controls in both directions)

| Test | Pass case | Fail case |
|---|---|---|
| no flicker on scroll | scroll fast → rows do not jump | `paddingTop`/`paddingBottom` → measurement loop |
| cursor tiebreaker | two threads with the same `lastMessageAt` → both appear once | bare timestamp cursor → one skipped |
| re-sort on new message | new message → thread moves to top | no re-sort → buried |
| active-row pin | active row does not move until the user acts | passive re-sort → jump |
| bucket boundaries | 23:59 local renders under Today at 00:01 | UTC → under Yesterday |

## The gate

```bash
node scripts/gate.mjs --feature thread-list
npx playwright test tests/e2e/thread-list.spec.ts
```

The structural assertions are a precondition. The behavioural assertion is the
gate: scroll the sidebar fast, assert no row's `boundingBox().y` changes by more
than 1px between frames.

## The escalation

When this feature blocks a surface, the surface does not ship with a thread list.
A sidebar that flickers on scroll is worse than no sidebar.