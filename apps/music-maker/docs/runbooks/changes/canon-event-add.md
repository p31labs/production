# Change: Canon Event-Kind Addition

**Applies to**: `packages/canon/src/loom/events.ts` + `gate.ts` — the frozen
`LoomEvent` union.

## Why this is a change procedure

The canon `LoomEvent` union and the gate's `HUMAN_KINDS`/`AGENT_KINDS` sets are
the frozen contract every path imports. Adding a kind touches three places that
must stay in lockstep, and the hash chain means an event shape change is a
semantic contract change, not a refactor.

## Steps

### 1. Add to the union + the input type

- `packages/canon/src/loom/events.ts` — the `LoomEvent` union member.
- `packages/canon/src/loom/gate.ts` — the `LoomEventInput` member (no
  seq/ts) + the writer set (`HUMAN_KINDS` for human-written kinds).

### 2. Add the reducer + gate validation

- `events.ts` `reduce()` — the no-op case (the fold stays deterministic;
  state lives in the app, not LoomState).
- `gate.ts` — per-kind validation (structural: shapes, ranges, enums).
  The gate validates structure, never policy.

### 3. Update the manifest

If the new kind is a UI/agent action, add it to
`apps/loom/public/.well-known/agent-manifest.json` (the canonical
`data-agent-action` registry). Do NOT create a parallel file.

### 4. Gate

```bash
cd packages/canon
npm run build
npm run test:loom
node --experimental-strip-types scripts/test-loom-gate.mjs
```

Add a regression assertion to `test-loom-gate.mjs` for the new kind's shape
(the writer-per-kind check, the range check, the round-trip through JSONL).

## Verification

- [ ] Canon build green
- [ ] Full loom suite green (all test scripts)
- [ ] A gate assertion covers the new kind
- [ ] The agent manifest (if applicable) validates as JSON
- [ ] Parity gate 0/0