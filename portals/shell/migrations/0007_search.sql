-- 0007_search.sql — FTS5 full-text index over the bus ledger.
-- External-content table: the index reads bus_events directly, kept in sync by
-- three triggers. The FTS5 columns match bus_events column names exactly
-- (payload_json, not "text") so the external-content mapping resolves. The
-- delete path uses the 'delete' command form (a plain DELETE raises "unsafe use
-- of virtual table"). No trailing rebuild — a fresh database has no rows to
-- backfill, and the triggers keep the index in sync from the first insert.

CREATE VIRTUAL TABLE IF NOT EXISTS search_fts USING fts5(
  event_type, payload_json, session_id, did, face,
  content='bus_events', content_rowid='id'
);

CREATE TRIGGER IF NOT EXISTS bus_events_fts_insert AFTER INSERT ON bus_events BEGIN
  INSERT INTO search_fts(rowid, event_type, payload_json, session_id, did, face)
  VALUES (new.id, new.event_type, new.payload_json, new.session_id, new.did, new.face);
END;

CREATE TRIGGER IF NOT EXISTS bus_events_fts_update AFTER UPDATE ON bus_events BEGIN
  INSERT INTO search_fts(search_fts, rowid, event_type, payload_json, session_id, did, face)
  VALUES ('delete', old.id, old.event_type, old.payload_json, old.session_id, old.did, old.face);
  INSERT INTO search_fts(rowid, event_type, payload_json, session_id, did, face)
  VALUES (new.id, new.event_type, new.payload_json, new.session_id, new.did, new.face);
END;

CREATE TRIGGER IF NOT EXISTS bus_events_fts_delete AFTER DELETE ON bus_events BEGIN
  INSERT INTO search_fts(search_fts, rowid, event_type, payload_json, session_id, did, face)
  VALUES ('delete', old.id, old.event_type, old.payload_json, old.session_id, old.did, old.face);
END;