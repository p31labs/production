<!-- P31-HEADER
id: p31_feature_load_older_20261006_v1.0
type: spec
component: shell
status: live
retention: keep-forever
created: 2026-10-06T00:00:00Z
owner: will
-->

# Feature: Load-Older Pagination

## The invariant

Scrolling near the top of a thread loads older messages and prepends them
without moving the reader's position; a prepend in flight for one conversation
never lands in another; a fully-filtered page advances the cursor instead of
stalling; and the reader is only pulled to the bottom by an append, never by a
prepend.

## The boundary

This feature does **not** own:

- **The virtualizer** — `useThreadVirtualizer` (Wave 3) handles scroll-offset
  adjustment. This feature must not write `scrollTop`.
- **The scroller's CSS** — `overflow-anchor: none` and `overscroll-behavior: none`
  shipped in Wave 3. This feature reads them; it does not re-declare them.
- **Message rendering** — `Thread` (Wave 3) owns the DOM.
- **The cursor's source of truth** — the ledger owns it; this feature derives
  the before-cursor from the oldest *retained* message id.
- **Streaming with tools** — a tool-offering turn is JSON-mode and non-streamed
  by construction (Workers AI JSON Mode does not stream). The two-phase turn is
  a separate design, not this feature.

Four rules this feature owns outright:

1. **A prepend never triggers a bottom pull.** The auto-scroll effect must
   recognize a prepend (the previous top message still present, pushed to a
   deeper index; new content only lands at the tail) and skip the bottom pull.
   Appends, streams, and conversation switches still pin.
2. **The async result is ref-guarded on the conversation id captured at trigger
   time.** A load-older for conversation A that resolves after a switch to B
   must be discarded, not prepended. Id-dedupe cannot catch this — different
   conversations have different ids.
3. **The before-cursor advances past filtered pages.** The cursor is the oldest
   *retained* message id. A page where every row filters out leaves the cursor
   parked; a bounded in-invocation hop (`MAX_FILTERED_PAGE_HOPS`) advances it.
4. **`hasMore` is latched per conversation.** A stale `hasMore` from A applied
   to B stops paging in B. The latch is keyed by conversation id.

## The implementation

| File | What it provides |
|---|---|
| `functions/api/bus/events.ts` | *(modified)* `?before=&limit=&session=` paging + `hasMore` probe |
| `src/shell/chat/paginationClient.ts` | the cursor walk: `fetchOlder(sessionId, before, limit)` |
| `src/shell/chat/useLoadOlderOnScroll.ts` | the sentinel `IntersectionObserver` + in-flight guard + ref-guard |
| `src/shell/chat/threadStore.ts` | *(modified)* `loadOlder`, `hasMore`, `loadOlderInFlight` |
| `src/shell/chat/Thread.tsx` | *(modified)* top sentinel + `data-message-id` on every row |
| `src/bus/events.ts` | *(modified)* `tool.approval.recorded` |
| `tests/e2e/load-older.spec.ts` | the behavioural gate |

## The tests (negative controls in both directions)

| Test | Pass case | Fail case |
|---|---|---|
| prepend stability | prepend 50 rows → anchor's `boundingBox().y` unchanged (±1px) | index keys or a bottom pull → anchor moves |
| no bottom-yank on prepend | scrolled to middle, prepend → viewport stays at anchor | auto-scroll fires on `visibleMsgs` change → yanked to bottom |
| cross-conversation guard | load for A resolves after switch to B → discarded | A's page prepended into B → id-dedupe misses |
| filtered-page hop | a page where every row filters out → cursor advances | cursor parks → same page refetched forever |
| `hasMore` latch | A's `hasMore: false` does not stop B's paging | A's latch applied to B → B stops early |
| single scroll owner | `overflow-anchor: none` present → no double compensation | `auto` → one page-height of drift per prepend in Chrome/Firefox |

## The gate

```bash
node scripts/gate.mjs --feature load-older
npx playwright test tests/e2e/load-older.spec.ts
```

The gate is behavioural — it mounts a real browser, prepends real messages, and
asserts the anchor's position is unchanged. The structural assertions are a
precondition; the behavioural assertion is the gate.

## The escalation

When this feature blocks a surface, the surface does not ship with history.
Pagination that moves the reader is worse than pagination that does not exist —
the reader loses their place and the feature is worse than useless.