-- 0008_trace_id.sql — the nullable trace correlation column.
-- A row records the trace that produced it, but the trace store is sampled and
-- short-lived while the ledger is complete and keep-forever. The join is
-- best-effort: a missing trace is a valid row, never a broken one.

ALTER TABLE bus_events ADD COLUMN trace_id TEXT;