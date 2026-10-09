# Runbook: ControlRoomDown

## Overview

- **Alert name**: `ControlRoomDown`
- **Severity**: P1
- **Related services**: `music-presence` Worker, `ControlRoom` DO, D1 `music-maker`
- **Last updated**: 2026-09-24
- **Owner**: @p31-platform
- **Last drilled**: — (see index)

## Symptoms

- The control surface at `#/control` shows a red connection dot and never
  reaches `open`.
- Browser devtools → Network → WS shows `/control/ui` returning 404 or
  failing the upgrade.
- The smoke test `node scripts/smoke-control-room.mjs` fails at step 1
  (connect snapshot).
- `curl -s https://music-presence.trimtab-signal.workers.dev/health` returns
  non-200 or times out.

## Impact Assessment

- **Affected users**: every user of `#/control`. The spatial instrument at
  `/` is unaffected (it uses `MusicRoom`, a separate DO).
- **Business impact**: the control plane is a utility, not the core loop.
  A family cannot bind MIDI knobs or drive WLED, but they can still play.
- **Upstream/downstream**: the OSC sidecar (`bridge/osc.mjs`) loses its WS
  and reconnects every 3s — it logs errors but does not crash. The WLED
  bridge is client-side and unaffected.

## Diagnostic Steps

### 1. Confirm the Worker is up

```bash
curl -s -o /dev/null -w "%{http_code}\n" \
  https://music-presence.trimtab-signal.workers.dev/health
```

Expected: 200. If not, go to Scenario C: Worker down.

### 2. Confirm the route is wired

```bash
curl -s -o /dev/null -w "%{http_code}\n" \
  https://music-presence.trimtab-signal.workers.dev/control/health
```

Expected: 200 with `{"ok":true,"do":"control-room",...}`. If 404,
go to Scenario A: route missing.

### 3. Confirm the DO is reachable

```bash
curl -s https://music-presence.trimtab-signal.workers.dev/control/health | jq .
```

Expected: `{"ok":true,"do":"control-room","destinations":N,"seq":M,"hydrationMode":"..."}`.
If it returns ok:false or throws, go to Scenario B: DO throw.

### 4. Check the DO logs

```bash
cd apps/music-maker/worker && npx wrangler tail --format json \
  | jq 'select(.app == "control-room")'
```

Look for `ev: ws_connected`, `ev: ws_committed`, and any unhandled rejection.
A `ensureHydrated` failure surfaces as an unhandled rejection with a D1 error.

### 5. Determine the root cause

- `/health` 200 but `/control/health` 404 → Scenario A
- `/control/health` 500 or hangs → Scenario B
- `/health` non-200 → Scenario C
- All green but clients still fail → Scenario D: client-side

## Fix Steps

### Scenario A: route missing

The top-level Worker's fetch does not route `/control/*` to the DO.

Confirm `worker/index.ts` has the branch:

```bash
grep -n "startsWith('/control/')" apps/music-maker/worker/index.ts
```

Expected: a matching line. If absent, the deploy is stale or a merge dropped
it. Redeploy:

```bash
cd apps/music-maker && pnpm deploy
```

Verify:

```bash
curl -s https://music-presence.trimtab-signal.workers.dev/control/health | jq .ok
```

Expected: true. Estimated time: 2–3 minutes.

### Scenario B: DO throw

The DO is bound but `ensureHydrated` or `fetch` throws.

Tail the logs (step 4 above) and read the rejection message.

- If the message is a D1 error (`no such table: events`), the schema is
  missing → go to `operations/schema-apply.md`.
- If the message is a checkpoint parse error (`control:fold` corrupt), the DO
  falls back to a cold start. To force it: the fallback is automatic — a
  missing checkpoint → cold start from the log. A corrupt checkpoint is
  self-healing. If it recurs, capture the blob and open a P1.

Estimated time: 5–15 minutes (schema) or 2 minutes (checkpoint).

### Scenario C: Worker down

The Worker itself is not serving.

Check Cloudflare status: https://www.cloudflarestatus.com/

If Cloudflare is healthy, roll back:

```bash
cd apps/music-maker/worker && npx wrangler rollback
```

Verify:

```bash
curl -s -o /dev/null -w "%{http_code}\n" \
  https://music-presence.trimtab-signal.workers.dev/health
```

Expected: 200. Estimated time: 2–5 minutes.

### Scenario D: client-side

The Worker and DO are healthy but one client fails.

- Ask the user to hard-reload (Cmd-Shift-R) — a stale bundle may be cached.
- Check the client's WS URL in devtools. It must be
  `wss://<host>/control/ui`. A `ws://` on an `https://` page is blocked.
- If the URL is correct, the client's reconnect backoff may be saturated.
  The hook caps at 15s; ask the user to reload after 20s.

Estimated time: 1–2 minutes.

## Escalation

- If unresolved after 30 minutes: contact @p31-platform on-call via the
  #p31-incidents channel.
- Escalation phone: (see PagerDuty schedule — not yet wired)
- Backup contact: @p31-platform secondary
- Incident commander: page an IC in Slack with `!ic page`

## Post-Actions

- [ ] Update this runbook if new information was found
- [ ] Create a postmortem if P1 (see `policies/postmortem-template.md`)
- [ ] Notify stakeholders in #p31-status
- [ ] Record incident metrics (MTTD, MTTR) in the incident tracker
- [ ] If the DO threw, capture the rejection message and link the log line