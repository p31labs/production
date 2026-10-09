# fix: Wave 8 room uses the non-hibernating WebSocket API and a masking health fallback

<!-- P31-HEADER
id: p31_fix_plan_wave8_room_hibernation_20261006_v1.0
type: fix-plan
component: shell
status: open
retention: keep-forever
created: 2026-10-06T00:00:00Z
owner: will
-->

## Symptom

Two defects in the Wave 8 room, neither caught by the collaboration gate:

1. **No hibernation.** `SessionRoom.handleUpgrade` calls `server.accept()` and
   returns `new Response(null, { status: 101, webSocket: server })`. That is
   the non-hibernating API: the DO stays pinned in memory for the life of every
   open WebSocket, so an idle session is billed forever. The Hibernation API is
   `state.acceptWebSocket(server)` — and it is not a one-line swap, because
   hibernation discards the in-memory `Y.Doc`, `sockets`, and `presence`. The
   doc's state vector must be persisted to `state.storage` (or D1) on debounce
   and reloaded on wake, or a hibernated room loses every draft edit.
2. **Masking health fallback.** `room/src/index.ts` routes every non-`/health`
   fetch — including a real `Upgrade: websocket` request — into a DO named
   `health`. A misrouted upgrade lands a connected socket in a room named
   `health` instead of the session, and the client sees a socket with no peers.
   The failure is silent.

## Evidence

```ts
// portals/shell/room/src/SessionRoom.ts (handleUpgrade)
const pair = new WebSocketPair();
const server = pair[1];
server.accept();                 // non-hibernating; state.acceptWebSocket never used
return new Response(null, { status: 101, webSocket: server });

// portals/shell/room/src/index.ts (default fetch)
const stub = env.SESSION_ROOM.get(env.SESSION_ROOM.idFromName('health'));
return stub.fetch(request);      // a real upgrade would land in a room named 'health'
```

## The fix

1. In `SessionRoom`: store `state` (the constructor's first arg); replace
   `server.accept()` with `this.state.acceptWebSocket(server)`; persist
   `Y.encodeStateAsUpdate(this.doc)` to `this.state.storage` on a debounced
   save; reload it on construction/`fetch` before handling, so a hibernated
   room restores its draft.
2. In `room/src/index.ts`: return 404 for any fetch that is neither `/health`
   nor an upgrade. A WebSocket upgrade that reaches the Worker entry is a
   misconfiguration and must surface, not route into a room named `health`.

## Why it is not done yet

The Wave 8 build shipped the structural layer; the review surfaced these two
after the gates were green. The hibernation fix is non-trivial (it changes the
persistence model, not just the accept call), so it is the first step of the
Wave 9a runbook (`runbooks/wave-9a-pages.md`, Phase 2), which fixes it in
`SessionRoom` and builds `PageRoom` correctly from the start.