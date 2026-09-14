# 22 — Track A.4 Implementation Spec

Status: **implemented** (commit-world: hibernatable WebSocket upgrade, socket
protocol, build push notifications).

## Scope

Track A.4 adds a hibernation-compatible WebSocket upgrade path to `p31-passport`.
The PassportDO accepts sockets via `this.ctx.acceptWebSocket(server)` (the
Hibernation API), handles lifecycle events (`webSocketMessage`,
`webSocketClose`, `webSocketError`) and reserves `alarm()` for future scheduled
work. Sockets hibernate with the DO; per-socket attachment state survives
eviction.

**Out of scope:**
- Browser-side connections. The qpj portal keeps its request/response pattern
  (`docs/18`); no client connects to `/ws` yet.
- Push events beyond build-status updates.
- Standard WebSocket API (`ws.accept()`) — hibernation only.

## Protocol

JSON envelope `{ type, data? }` over the socket:

| Client → server | Server → client |
|---|---|
| `{ "type": "ping" }` | `{ "type": "pong", "ts" }` |
| `{ "type": "echo", "data" }` | `{ "type": "echo", "data" }` |
| `{ "type": "subscribe" }` | `{ "type": "subscribed", "ts" }` |
| `{ "type": "status" }` | `{ "type": "status", "ts", ...wsStatus }` |
| invalid payload | `{ "type": "error", "error" }` |

`subscribe` marks the socket's attachment (`WsMeta { connectedAt, subscribed }`)
so it receives build pushes:

```
{ "type": "buildUpdated", "buildId", "status", "artifactKey?" }
```

## Implementation

`src/ws-protocol.ts` (pure, dependency-free, unit-tested from the qpj suite):
- `parseWsMessage(raw)` — tolerates `string | ArrayBuffer`
- `handleWsMessage(raw, socket, handlers)` — stateless protocol dispatch
- `createWsMeta(now)` / `WsMeta` — attachment shape

`src/passport-do.ts`:
- `fetch()` — short-circuits `Upgrade: websocket` to `handleWebSocketUpgrade`
- `handleWebSocketUpgrade()` — `new WebSocketPair()`, `serializeAttachment`,
  `this.ctx.acceptWebSocket(server)`, returns `101` with `webSocket: client`
- `webSocketMessage()` / `webSocketClose()` / `webSocketError()` — hibernation
  lifecycle handlers
- `notifyBuildUpdate()` — fans out `buildUpdated` to subscribed sockets via
  `this.ctx.getWebSockets()`
- `wsStatus()` — last 5 builds + open socket count from SQLite
- `alarm()` — reserved, returns early

`src/index.ts`: `/ws?passportId=` routes the upgrade request to the PassportDO
stub via `stub.fetch(request)`.

No new bindings or migrations. `wrangler types` output is unchanged.

## Verification

- `workers/p31-passport`: `pnpm typecheck` — 0 errors
- `workers/p31-dispatch`: `pnpm typecheck` — 0 errors
- `portals/qpj`: `pnpm typecheck`, `pnpm lint`, `pnpm test` (28 files / 233
  tests, +11 ws-protocol), `pnpm build`, `pnpm v:gate` — all green

## Constraints

- Do not use the standard WebSocket API (`ws.accept()`). Hibernation only
  (`this.ctx.acceptWebSocket`).
- Keep per-socket attachments under the 16 KB hibernation attachment limit.
- Do not assume sockets exist after hibernation; re-derive from
  `this.ctx.getWebSockets()` on each event.