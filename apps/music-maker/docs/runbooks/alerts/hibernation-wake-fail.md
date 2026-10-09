# Runbook: HibernationWakeFail

## Overview

- **Alert name**: `HibernationWakeFail`
- **Severity**: P1
- **Related services**: `ControlRoom` DO, D1 `music-maker`
- **Last updated**: 2026-09-24
- **Owner**: @p31-platform
- **Last drilled**: —

## Symptoms

- The smoke test's step 5 (30s idle → move still fans out) fails.
- A user reports "I left the tab open, came back, and the knobs don't move."
- DO logs show `hydrationMode: "cold-start"` on every wake, never
  `"checkpoint"`.
- Latency on the first message after an idle window is > 1s (a D1 scan
  instead of a local storage get).

## Impact Assessment

- **Affected users**: any user whose DO was evicted between messages.
- **Business impact**: degraded, not down. The DO still works — it just
  re-reads the full D1 log instead of the checkpoint. At family scale
  (log < 10k events) the cost is ~200ms; at 100k events it is multi-second.
- **Upstream/downstream**: none. The fallback is correct, just slow.

## Diagnostic Steps

### 1. Confirm the checkpoint exists in DO storage

```bash
# Local dev: inspect the DO's health after a commit.
cd apps/music-maker/worker && npx wrangler dev --local &
curl -s http://127.0.0.1:8787/control/health | jq .hydrationMode
```

Expected: `"checkpoint"` after the first commit. If `"cold-start"` persists,
go to Scenario A.

### 2. Confirm the checkpoint is written before the broadcast

```bash
grep -n "persistCheckpoint\|broadcast" apps/music-maker/worker/controlRoom.ts \
  | head -20
```

Expected: in `commitInput`, `await this.persistCheckpoint()` precedes
`this.broadcast(...)`. If the order is inverted, go to Scenario B.

### 3. Confirm the auto-response is configured

```bash
grep -n "setWebSocketAutoResponse" apps/music-maker/worker/controlRoom.ts
```

Expected: a match in the constructor. If absent, every client ping wakes
the DO — go to Scenario C.

### 4. Determine the root cause

- `hydrationMode` stuck on `cold-start` → Scenario A
- checkpoint write after broadcast → Scenario B
- no auto-response → Scenario C

## Fix Steps

### Scenario A: checkpoint never written

The `persistCheckpoint` call is missing or throwing silently.

Check the call sites:

```bash
grep -c "persistCheckpoint" apps/music-maker/worker/controlRoom.ts
```

Expected: ≥ 5 (one per commit kind + the cold-start branch + the method
definition). If fewer, a commit path was added without a checkpoint write.

Add the missing `await this.persistCheckpoint()` before the broadcast in
the new path. Redeploy and re-run the smoke.

Estimated time: 10–20 minutes.

### Scenario B: checkpoint written after broadcast

A socket can observe a state newer than the checkpoint, so a wake after the
broadcast but before the write restores a stale fold.

Confirm the order in `commitInput`:

```ts
this.applyMappingSet(...)
this.projectMappingSet(...)
await this.persistCheckpoint()   // ← must precede
this.broadcast({ ...event, type: event.kind })
```

If inverted, reorder and redeploy. Estimated time: 5–10 minutes.

### Scenario C: no auto-response

Add to the constructor:

```ts
this.ctx.setWebSocketAutoResponse(
  new WebSocketRequestResponsePair('ping', 'pong'),
);
```

Add the client heartbeat (one line in `useControlRoom`'s `onopen`):

```ts
const beat = setInterval(() => {
  if (ws.readyState === WebSocket.OPEN) ws.send('ping');
}, 30_000);
ws.addEventListener('close', () => clearInterval(beat), { once: true });
```

Redeploy, re-run the smoke, confirm `hydrationMode: "checkpoint"`.

Estimated time: 10–15 minutes.

## Escalation

If unresolved after 1 hour: the checkpoint mechanism itself may be
mis-designed. Page @p31-platform lead. Do not attempt a schema migration
under incident pressure.

## Post-Actions

- [ ] Update this runbook
- [ ] Postmortem (P1) — mandatory
- [ ] Verify the smoke's `hydrationMode` assertion is in CI
- [ ] Record MTTR