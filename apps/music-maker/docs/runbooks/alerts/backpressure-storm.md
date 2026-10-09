# Runbook: BackpressureStorm

## Overview

- **Alert name**: `BackpressureStorm`
- **Severity**: P2
- **Related services**: `ControlRoom` DO
- **Last updated**: 2026-09-24
- **Owner**: @p31-platform
- **Last drilled**: —

## Symptoms

- The surface shows the `BACKPRESSURE` error banner and a rising "dropped"
  counter badge.
- DO logs show repeated `backpressure` frames (the token bucket is exhausted).
- A single client appears to be sending control moves faster than the 60Hz
  budget (the DO's `RATE_HZ`).

## Impact Assessment

- **Affected users**: everyone sharing the DO — the budget is per-DO, so a
  single mashing client can exhaust it for all users.
- **Business impact**: control moves get dropped (structured `backpressure`
  frames are emitted instead — honest, never silent). The committed log is
  unaffected; only ephemeral moves are lost.
- **Upstream/downstream**: the WLED bridge would also see dropped moves if it
  is wired to the same source stream.

## Diagnostic Steps

### 1. Confirm the drops are real

```bash
cd apps/music-maker/worker && npx wrangler tail --format json \
  | jq 'select(.ev == "ws_frame_oversize" or .type == "backpressure")'
```

Expected: `backpressure` frames with `reason: "rate_limit"`. If you also see
`ws_frame_oversize`, a client is sending > 64KiB frames — a separate bug.

### 2. Identify the offending client

The DO does not currently log the source of the backpressure. As a
workaround, correlate by connection time: `ws_connected` logs carry the
socket path. A client connected for a long time with a high `dropCount` is
the likely suspect.

### 3. Determine the root cause

- A stuck loop sending at > 60Hz → the client is buggy (a knob's
  `onChange` without a gesture gate, or a test harness flooding).
- The `RATE_HZ` budget is too low for a legitimate pattern → a fast arpeggio
  across many knobs can exceed 60 moves/sec briefly.

## Fix Steps

### Scenario A: stuck client

The fix is in the client, not the DO. The surface's `onParamChange` fires per
drag frame; if a component bypasses the gesture lifecycle and calls it in a
loop, it floods.

- Confirm every knob uses `onGestureStart`/`onGestureEnd` and only calls
  `sendMove` inside a gesture.
- Confirm no `useEffect` dependency triggers `sendMove` on every render.

Redeploy the surface. The DO's backpressure protection remains as the honest
safety net.

### Scenario B: legitimate burst

If the burst is a fast arpeggio the budget should tolerate, raise `RATE_HZ`
in `controlRoom.ts` (the constant is documented as the §3.1 60Hz budget).
Re-run the smoke test's backpressure step — it asserts drops at a 60Hz+
burst, so raising the budget changes that assertion; update the smoke too.

Do NOT raise the budget to hide a stuck client — that masks the bug.

## Escalation

If unresolved after 2 hours, or the source of the flood is not identifiable:
page @p31-platform. A flood that cannot be attributed is a design gap in
the DO's observability, not just a client bug.

## Post-Actions

- [ ] Update this runbook
- [ ] Consider logging the source per backpressure frame (the DO currently
      drops the source — add it to the frame)
- [ ] Record the burst pattern in the incident tracker