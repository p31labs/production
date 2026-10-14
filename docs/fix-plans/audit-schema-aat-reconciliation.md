<!-- P31-HEADER
id: p31_fix_plan_audit_schema_aat_reconciliation_20261012_v1.0
type: fix-plan
component: governance
status: open
retention: keep-forever
created: 2026-10-12T00:00:00Z
owner: will
-->

# fix-plan: reconcile the P31 audit JSONL schema with the IETF AAT draft

## Symptom

The P31 audit ledger schema (portal audit-schema.md: `event_id`, `created_at`
epoch-ms, hash chain per RFC 8785 canonical JSON) is close to the IETF Agent
Audit Trail Internet-Draft (`draft-sharif-agent-audit-trail`) but diverges on
two fields and one semantic:

1. **`event_id` is the chain hash.** The draft requires a separate
   `record_id` (UUIDv4) for deduplication plus the hash for chaining.
2. **`created_at` is epoch milliseconds.** The draft requires RFC 3339
   UTC-offset `timestamp` strings.
3. **No pre-execution recording.** The draft's semantic requirement: a
   record is written BEFORE the action executes (in-progress → finished
   pairs), not only after.

## Fix

1. Emit both: `record_id` (UUIDv4 per record, new) + keep `event_id`
   (hash) + `timestamp` (RFC 3339) alongside `created_at` (epoch ms) so
   exports are draft-interoperable without breaking internal consumers.
2. Wire pre-execution recording at the ledger append sites (write the
   `in-progress` record before the action, update to `finished`/`error`
   after) — locate the append call sites in the bus/ledger worker first.
3. Add a schema-conformance test: exported NDJSON parses against the draft's
   mandatory fields; a missing `record_id` fails.

## Until then

The schema remains AAT-aligned-in-spirit (hash chain + canonical JSON are
compliant); the reconciliation lands with the next governance wave.