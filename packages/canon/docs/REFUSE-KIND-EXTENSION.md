# ADR: `refuse` — a versioned extension of the Loom event interface

**Status**: superseded for shipping by the **sidecar**; the envelope extension
remains the long-term direction
**Owner**: the frozen-interface owner (see `packages/canon/src/loom/events.ts`,
"THE frozen interface")
**Relation**: Track E of the 2026-09-22 LUMI training hardening review

## Problem

Governance that doesn't appear in the audit log doesn't exist (Trace-Based
Governance, IEEE 2026). `dispatchAgentAction` returns a structured refusal, but
a refusal that is only returned to the caller is **not auditable** — no hash
chain, no provenance, no accountability.

## Shipped now: the refusals sidecar (2026-09-22)

Rather than block on the frozen interface, the refusal is recorded in a
**sidecar log** — a `refusals` table in the Loom's D1, hash-chained
independently (each row's `prev_hash` → the previous row), joinable to the main
log by `ts`/`session`. This is the pattern every 2026 governance system
converges on (CloudTrail-style out-of-band audit, Stripe's sidecar):

- `apps/loom/functions/api/loom/_lib/log.ts` → `recordRefusal` (append, hash-chained with the events log's JCS canonicalizer via `refusalToChainRecord`) + `readRefusals`.
- `apps/loom/functions/api/loom/event.ts` → on a guard verdict, records a refusal (`mode='enforce'`) or an observation (`mode='observe'`, see `LUMI_ENFORCEMENT`) before acting.
- `apps/loom/functions/api/loom/refusals/` → `GET /api/loom/refusals` (list + per-mode counts) and `GET /api/loom/refusals/verify` (walk the JCS chain, name any break).
- `apps/loom/worker/schema.sql` → the `refusals` table (with a `mode` column separating observations from enforced refusals).

The Loom's event interface stays frozen; the audit property is preserved.
Refusals and observations are now auditable, not just returned.

## Proposal (long-term): envelope + `refuse` kind

When the frozen-interface owner approves a versioned extension, refusals become
first-class Loom events:

```ts
{
  seq: number; ts: string;
  writer: 'agent';
  kind: 'refuse';
  id: string;                 // the refused proposal id
  node: string;
  reason: string;             // the guard's structured reason
  scope: 'shared' | 'personal' | 'session';
}
```

The recommended mechanism is the event-store convention (KurrentDB/EventStoreDB
24+/Axon 5): a **versioned envelope** (`{ schemaVersion, kind, data }`) with an
upcaster chain, so old logs replay against new code and the frozen-interface
claim holds. The gateway becomes two-branch and **both branches append**:

```
agent action → gateway → { allow:  append(action) }
                       → { deny:   append(refuse(action, reason)) }
```

## Constraints

- `events.ts` is a frozen interface. A `refuse` kind lands either as (a) a new
  `LoomEventV2` union (additive, backward-compatible), or (b) an approved
  extension to the current union — via the envelope/upcaster, never by editing
  the frozen union.
- The hash chain and the ReplayGate must treat `refuse` as a valid agent-kind
  with no proposal-revision side effects (it is a record, not a decision).
- `HUMAN_KINDS`/`AGENT_KINDS` in `gate.ts` are the single source; `refuse`
  would be added to `AGENT_KINDS` and to `AgentScopeDeclaration.proposeKinds`
  only if Lumi is allowed to emit it (currently NO — refusals come from the
  gateway, not from Lumi).

## Until the envelope lands

The sidecar is the audit trail: `recordRefusal` + `GET /api/loom/refusals`
(and its hash chain) is where refusals exist. When the envelope ships, the
sidecar rows can be upcast/replayed into the main log.