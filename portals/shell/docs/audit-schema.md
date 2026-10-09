# P31 Audit Log — JSONL Schema (IETF AAT-aligned)

The P31 shell persists every agent event in a **hash-chained D1 ledger** and
exposes it as an NDJSON audit record. This schema is the compliance artifact —
it maps to **EU AI Act Article 12** (event logging), **SOC 2 CC8.1**
(change management), and **ISO/IEC 42001** via the IETF Agent Audit Trail draft.

## The wire format (`application/x-ndjson`)

Each line is one audit record. The final line carries the SHA-256 of the
concatenated JSONL — the tamper-evidence marker. Recomputing the hash over the
file and comparing to the last line proves the ledger is intact.

```jsonl
{"event_id":"<sha256>","agent_identity":"did:key:…","action_class":"grounder","outcome":"in-progress","trust_level":"runtime-observed","type":"agent.result","payload":{…},"prev_hash":"<sha256 of prior>","hash":"<sha256>","created_at":1234567890}
{"_audit_sha256":"<sha256 of all lines above>","count":42}
```

## Fields

| Field | Type | Meaning |
|---|---|---|
| `event_id` | string | SHA-256 of this record (the ledger `hash`) |
| `agent_identity` | string | DID of the agent/actor (or `anonymous`) |
| `action_class` | string | The agent/stage that acted (`grounder`, `dreamer`, `governor`, `brain`, …) |
| `outcome` | enum | `in-progress` · `finished` · `error` · `interrupted` · `resumed` |
| `trust_level` | string | `runtime-observed` (captured at runtime, not documented after) |
| `type` | string | The AG-UI-aligned event discriminant (`pipeline.stage`, `gate.verdict`, `artifact.final`, `brain.*`, `reasoning.*`, `state.*`, `run.*`, …) |
| `payload` | object | The event's fields |
| `prev_hash` | string | SHA-256 of the prior record (the chain link) |
| `hash` | string | SHA-256 of this record |
| `created_at` | number | Epoch ms |

## The hash chain

```
hash[0] = SHA-256("0000…" + canonical(record[0]))
hash[i] = SHA-256(hash[i-1] + canonical(record[i]))
```

`canonical` uses RFC 8785-style deterministic key ordering, so identical
records hash identically regardless of key insertion order. `GET /api/bus/verify-chain`
recomputes the whole chain and returns `{ valid, total_entries, last_hash }`.

## Endpoints

| Endpoint | Purpose |
|---|---|
| `GET /api/bus/export` | NDJSON audit record (this schema) |
| `GET /api/bus/events?limit=&since=` | Replay recent events (cursor = row id) |
| `GET /api/bus/verify-chain` | Recompute + verify the hash chain |
| `GET /api/bus/stream` | Live SSE (with `id:` frames for Last-Event-ID resume) |
| `POST /api/bus/emit` | Append one event (internal) |

## Compliance mapping

- **EU AI Act Art. 12** — automatic event logging over the system lifetime;
  the ledger logs every agent action with a tamper-evident hash chain.
- **SOC 2 CC8.1** — an AI-initiated change carries the same authorization,
  documentation, testing, and approval evidence as a human one; the ledger +
  approval gates (run.interrupted/resumed) provide it.
- **ISO/IEC 42001** — the audit record is reconstructable on request: replay
  any event from any cursor, verify the chain, export the AAT record.