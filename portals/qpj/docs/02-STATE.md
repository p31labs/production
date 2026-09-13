# 02 — State

## Store: `src/store/useQpjStore.ts` (zustand + persist, key `qpj:store`)

Two classes of state:

| Class | Fields | Lifetime |
|---|---|---|
| **Persisted (comet)** | `passportId`, `mode`, `spoons`, `treatsReceived`, `caregiverPin`, `darkMode`, `reduceMotion`, `soundEffects`, `presenceRoom`, `mood` | survives reload |
| **Session (vessel)** | `talkTarget`, `talkMessages`, `meshInstance`, `meshStatus`, `meshUniform`, `presence`, `toast` | cleared per person / not persisted |

`partialize` selects only the persisted set. `merge` re-seeds session fields with
safe defaults (`talkTarget: 'family'`, `talkMessages: []`) on rehydration.

### Key actions

- `setPassport(id)` — **the isolation boundary**. If a mesh exists, `disconnect()`;
  clears chat stream; `spoons → 3`; `mode → defaultModeFor(id)`; re-seeds session
  defaults. Running `setQpj(passportId)` sets `html[data-passport]`.
- `setMode(mode)` — never downgrades enforcement alone; elevation goes through
  `ModeGuard` UI which calls `setMode(required)` after a verified PIN.
- `setSpoons(n)` — routes through `clampSpoons` (0–5; NaN/±∞→3, rounds).
- `restartDay()` — spoons→3, treats 0, talkTarget/messages reset (session).
- `initMesh()` / `disconnectMesh()` — HeartbeatMesh lifecycle (`did:
  qpj:{passportId}:{room}`), mapping peer state into `presence`.

**Do not** call store setters from render bodies; effects or event handlers only.

## XState machine: `src/machines/modeGate.ts`

```
idle → (UNLOCK/hidden route) → checking → (FOUND)     → ok
                                  → (NOT_SURE)         → prompt
                                  → (DENIED)           → redirecting
```

`ModeGuard` (components) drives it with `useMachine(modeGateMachine)` + `@xstate/react`.
`canAccess(passportId, route)` (MODE_RANK ordering) decides event routing:

- spark + `/craft` or `/workshop` → PIN prompt (XState → `prompt`, `PinDialog` shows).
- Correct caregiver PIN → `setMode(required)` (session-only) + reveal children.
- Dismiss/cancel → `redirecting` → `navigateTo('#/street')`.

`setMode` from the guard is session-scoped so a fresh visitor persona never inherits
another person's elevation.

## Deterministic presence: `useSimulatedPresence`

PRNG seeded from `${passportId}:${presenceRoom}` so the street grid renders the same
lantern-dots every mount in the same room — deterministic for tests and calm for UX.
Ticks every 25s. Never seed from `Date.now()`/`Math.random` here.