<!-- P31-HEADER
id: p31_feature_chat_primitives_20261005_v1.0
type: spec
component: shell
status: live
retention: keep-forever
created: 2026-10-05T00:00:00Z
owner: will
-->

# Feature: Chat Primitives

## The invariant

A thread of N messages renders in O(visible) DOM nodes; prepending older history
does not move the reader's position; streaming output stays pinned at the end
only when the user is already at the end; and every message is keyed by its
ledger id so prepend stability is structural rather than incidental.

## The boundary

This feature does **not** own:

- **Transport** — the bus client (`src/bus/client.ts`) owns SSE and replay.
- **Storage** — the ledger owns persistence; the store is a projection.
- **Role gating** — `authz.can()` owns the composer's enablement.
- **Tool calls or approvals** — no backend emits tool calls yet (Wave 4).
- **Model-level token streaming** — Wave 3 renders accumulated text from
  `message.content` ledger rows; Workers AI `stream: true` is Wave 4.
- **Session listing** — the threads sidebar stays a Wave 2 placeholder.

Two rules this feature owns outright:

1. **`overflow-anchor: none` on the scroller.** Exactly one writer of `scrollTop`.
   Chrome and Firefox anchor natively; the virtualizer also compensates; without
   this rule the reader is pushed one page-height per prepend.
2. **Stable keys, never index keys.** `getItemKey` returns the ledger id. After a
   prepend every message shifts index, so index keys cannot identify a message
   across the update.

## The implementation

| File | What it provides |
|---|---|
| `src/shell/chat/Thread.tsx` | `Thread` — the end-anchored virtualized message list |
| `src/shell/chat/useThreadVirtualizer.ts` | the virtualizer config + end-state predicates |
| `src/shell/chat/Composer.tsx` | `Composer` — input, send, abort |
| `src/shell/chat/StreamingMarkdown.tsx` | `StreamingMarkdown` — wraps `stream-md`'s `StreamMD` |
| `src/shell/chat/threadStore.ts` | *(modified)* session-filtered hydrate, paginated `loadOlder` |
| `src/shell/chat/streamClient.ts` | *(modified)* session-scoped subscription |
| `src/shell/chat/useChatPresentation.ts` | *(modified)* reactive selector (no `getState()` in render) |
| `src/index.css` | `overflow-anchor: none` + `overscroll-behavior: none` on `.chat-thread__scroll` |

## The tests (negative controls in both directions)

| Test | Pass case | Fail case |
|---|---|---|
| prepend stability | prepend 50 older rows → visible item key unchanged, scrollTop adjusted | index keys → visible item changes, position jumps |
| follow-on-append | pinned (`distanceFromEnd < 80`) + append → stays at end | scrolled up + append → scrollTop unchanged |
| streaming resize | last item measured 20× larger while pinned → bottom stays pinned | unpinned → no yank |
| session filter | session A events applied | session B events ignored (no cross-thread bleed) |
| scroll ownership | `overflow-anchor: none` present on the scroller | `auto` → double compensation in Chrome/Firefox |
| empty state | renders a welcome block when `messages.length === 0` | renders a blank scroller |

## The gate

```bash
node scripts/gate.mjs --feature chat-primitives
```

## The escalation

When this feature blocks a surface, the surface does not ship. The failure is
attributed to the primitive, not the face — the primitive is the shared contract.