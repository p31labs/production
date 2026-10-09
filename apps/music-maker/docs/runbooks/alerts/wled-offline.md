# Runbook: WledOffline

## Overview

- **Alert name**: `WledOffline`
- **Severity**: P3
- **Related services**: client-side `WledBridge` (`src/lib/wledBridge.ts`)
- **Last updated**: 2026-09-24
- **Owner**: @p31-platform

## Symptoms

- The Lights tab shows the bridge status as `offline` or `error`.
- The bridge's `onStatus` handler reports a fetch failure against the
  user-entered address.
- The control surface's WLED faders change values but the lights do not move.

## Impact Assessment

- **Affected users**: the household's WLED strips.
- **Business impact**: lights are a delight feature, not a core loop. The
  synth and MIDI paths are unaffected.
- **Upstream/downstream**: none. The bridge is client-side; it does not touch
  the DO.

## Diagnostic Steps

### 1. Confirm the address is reachable from the client's network

The bridge POSTs to `http://<address>/json/state`. The address is a LAN IP
(e.g. `192.168.1.50`), so reachability is the client's network, not
Cloudflare's.

```bash
# From a machine on the same network:
curl -s -o /dev/null -w "%{http_code}\n" http://192.168.1.50/json/info
```

Expected: 200. If the address is unreachable, it is either wrong or the
device is powered off — go to Scenario A.

### 2. Confirm the bridge is instantiated

```bash
grep -n "new WledBridge\|enqueue" apps/music-maker/src/surfaces/ControlSurface.tsx
```

Expected: the Lights tab's fader `onChange` calls `bridge.enqueue(...)`.
If the bridge is never constructed, the faders change local state only —
go to Scenario B.

### 3. Determine the root cause

- address unreachable → Scenario A
- bridge not wired → Scenario B

## Fix Steps

### Scenario A: device unreachable

- Confirm the WLED device is powered and on the same subnet.
- Confirm the address in the Lights tab is current (devices can get new
  DHCP leases).
- WLED has a hard limit of 8 clients on ESP32 / 3 on ESP8266 — if the panel
  shows connected but drops, the device's client slots may be full.

Redeploy the surface with the corrected address. The bridge reports the
honest offline state — never a fake green dot.

### Scenario B: bridge not wired

The Lights tab must construct a `WledBridge` and route fader moves to it:

```ts
const bridge = useMemo(
  () => new WledBridge({ address: userAddress, hz: 5 }),
  [userAddress],
);
// on the fader's onChange:
bridge.enqueue({ seg: [{ id, bri: Math.round(value * 255) }] });
```

Confirm the fader calls `enqueue` (not just `room.sendMove`). The bridge's
own ≤ 10Hz coalescer collapses a 60Hz drag stream into one fetch per
interval — do not bypass it.

Estimated time: 10–15 minutes.

## Escalation

If the device is reachable but the bridge still errors after the wiring fix:
the WLED JSON schema may have changed. Page @p31-platform. Do not patch the
segment serializer under incident pressure without confirming the device's
`/json/info` shape.

## Post-Actions

- [ ] Update this runbook
- [ ] Confirm the WLED segment serializer test still passes
- [ ] Record the device address rotation if the DHCP lease changed