# fix: /api/bus/stream seeds its id cursor with an epoch-ms timestamp

<!-- P31-HEADER
id: p31_fix_plan_bus_stream_cursor_20261006_v1.0
type: fix-plan
component: portals/shell
status: resolved
retention: keep-forever
created: 2026-10-06T00:00:00Z
owner: will
-->

## Symptom

A fresh SSE connection to `/api/bus/stream` delivers **zero** events, ever.
The chat surface therefore never receives a streamed assistant turn in
production (hydrate covers only the rows that existed at mount).

## Evidence

`portals/shell/functions/api/bus/stream.ts:14-17`

```ts
const lastEventId = request.headers.get('Last-Event-ID');
let cursor = lastEventId ? Number(lastEventId) || Date.now() : Date.now();
if (!lastEventId) cursor = Date.now(); // only deliver events after connect
```

The poll is `SELECT * FROM bus_events WHERE id > ?1 ...` and `id` is
`INTEGER PRIMARY KEY AUTOINCREMENT` (`migrations/0001_bus_ledger.sql:3`) —
a small integer. `Date.now()` is ~1.7e12, so `id > 1770000000000` matches
nothing until the ledger holds 1.7 trillion rows. The intent ("deliver only
events created after connect") was a `created_at` predicate wearing an `id`
cursor.

`Last-Event-ID` resume (reconnect) was correct — only the initial seed was
broken, which is why the defect hid: nothing ever reconnected with a real id.

## Fix

Seed the cursor from the **ledger itself**, and let the client close the
hydrate→connect gap by passing the last row id it has seen:

1. `Last-Event-ID` header (EventSource reconnect resume) — wins, because the
   reconnect URL still carries the original, now stale, `?since`.
2. `?since=<ledger id>` query param (the client's last seen row) — closes the
   hydrate→connect gap on first connect.
3. else `SELECT id FROM bus_events ORDER BY id DESC LIMIT 1` — deliver only
   rows created after this connection opens (the original intent, with a real
   id). Empty ledger → cursor 0.

The chat transport (`src/shell/chat/streamClient.ts`) now owns its
EventSource and passes `since=<max id from hydrate>`, so the first poll of the
connection replays exactly the rows the hydrate snapshot could have missed —
no gap, no duplicates, one ordered id-ascending stream.

Out of Wave 7 scope (`functions/api/bus/**`), fixed here because Wave 7
(streaming + sharing) is functionally dead without live delivery. Filed per
the Ownership Contract before continuing the wave.

## Regression

`tests/e2e/streaming.spec.ts` — the burst/Stop behavioural test runs against
the harness; the cursor fix is asserted by review + the id predicate above
(unit coverage of the endpoint lives outside the wave's test scope).
