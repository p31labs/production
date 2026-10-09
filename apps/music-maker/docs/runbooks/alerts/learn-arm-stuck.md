# Runbook: LearnArmStuck

## Overview

- **Alert name**: `LearnArmStuck` (derived from DO logs: an arm older than
  `LEARN_TTL_MS` = 30s that never resolved)
- **Severity**: P3
- **Related services**: `ControlRoom` DO, `useMidiIn`, the surface's Matrix
- **Last updated**: 2026-09-24
- **Owner**: @p31-platform

## Symptoms

- A user clicks a Matrix row, the badge shows `learning` (amber), but moving
  a physical MIDI knob does nothing — the badge never flips to `bound`
  (green).
- After 30s the arm silently expires; the user tries again with the same
  result.
- DO logs show `learn-armed` frames with no matching `resolveLearn`.

## Impact Assessment

- **Affected users**: anyone binding a MIDI CC to a control.
- **Business impact**: the headline feature (MIDI learn) is non-functional
  for the affected user. The synth and WLED paths are unaffected.
- **Upstream/downstream**: none.

## Diagnostic Steps

### 1. Confirm the arm reached the DO

```bash
cd apps/music-maker/worker && npx wrangler tail --format json \
  | jq 'select(.ev == "ws_connected" or .ev == "learn_resolve_failed")'
```

Ask the user to arm a control. Expected: an incoming `learn-arm` frame. If
absent, the client is not sending — go to Scenario A.

### 2. Confirm the CC is reaching the DO

The surface forwards every CC via `room.sendMove(source, value, cc)`. Ask
the user to move the knob. Expected: a control frame with a `cc` field.
If absent, the MIDI hook is not dispatching — go to Scenario B.

### 3. Confirm the DO's resolution loop matches

```bash
grep -n -A15 "clean.cc !== undefined && this.pendingLearn.size > 0" \
  apps/music-maker/worker/controlRoom.ts
```

Expected: the loop checks `p.source === null || p.source === clean.source`.
If the UI arms with a source that never matches the incoming `midi:in-N`,
the arm never resolves — go to Scenario C.

### 4. Determine the root cause

- arm frame absent → Scenario A
- CC frame absent → Scenario B
- frames present but no resolve → Scenario C

## Fix Steps

### Scenario A: arm frame not sent

- Confirm `armLearn` in `useControlRoom` sends `{ type: 'learn-arm', controlId }`.
- Confirm the surface calls it on gesture-start (not on value-change).
- Check the console for a `frame-rejected` frame — a malformed `controlId`
  (> 128 chars, empty) is rejected.

### Scenario B: CC frame not forwarded

- Confirm `useMidiIn`'s `onMessage` handler is registered in the surface's
  effect.
- Confirm the handler forwards unconditionally — an early `if (armed) return`
  before `sendMove` drops unbound CCs.

The correct shape:

```ts
const off = midiIn.onMessage((msg) => {
  if (msg.kind !== 'cc') return;
  const value = msg.data2 / 127;
  room.sendMove(`midi:in-${msg.channel}`, value, msg.data1);
  if (armed) setArmed(null);
});
```

### Scenario C: source mismatch

The UI arms with a source of null (any), but a committed
`control.midi.learn` armed with an explicit source. The DO's loop prefers the
explicit source and never matches.

Decide the contract: UI-armed learns accept any source; explicit learns bind
their declared source. Both are valid; they must not conflict.

The current `armLearn(controlId, source)` clears the whole map, so only one
arm exists at a time. Confirm the last arm is the one the user intended.

Estimated time: 5–15 minutes.

## Escalation

If unresolved after 2 hours: the learn protocol may need a redesign. Page
@p31-platform. Do not patch it under incident pressure — the arm/bind
transition is the feature's core.

## Post-Actions

- [ ] Update this runbook
- [ ] Add a regression test: arm → forward CC → assert bound
- [ ] Consider a `learn-disarmed` echo so the UI can distinguish "expired"
      from "still waiting"