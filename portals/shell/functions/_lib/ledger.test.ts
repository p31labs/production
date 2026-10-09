/**
 * functions/_lib/ledger.test.ts — the hash-chained ledger (provenance).
 *
 * Verifies: events chain via prev_hash, hashes are deterministic, and the
 * chain verifies true when intact / false when tampered.
 */
import { describe, expect, it } from 'vitest';
import { append, verifyChain, canonical, sha256Hex, canonicalJson, toAatRecord, type BusRow } from './ledger';
import type { BusEvent } from '../../src/bus/events';

/** A minimal in-memory D1 fake with proper row-object semantics. */
function makeDB() {
  const rows: BusRow[] = [];
  return {
    _rows: rows,
    prepare(sql: string) {
      return {
        bind(...args: unknown[]) {
          return {
            async run() {
              // INSERT — map columns positionally.
              const cols = (sql.match(/INTO \w+\s*\(([^)]+)\)/i) ?? [])[1].split(',').map((c) => c.trim());
              const row = {} as BusRow;
              cols.forEach((c, i) => { (row as unknown as Record<string, unknown>)[c] = args[i]; });
              rows.push(row);
              return { meta: { last_row_id: rows.length } };
            },
            async first<T>() { return undefined as unknown as T; },
            async all<T>() { return { results: [...rows] as T[] }; },
          };
        },
        async all<T>() { return { results: [...rows] as T[] }; },
        async first<T>() {
          // lastHash query: ORDER BY created_at DESC LIMIT 1 → last row.
          if (/LIMIT 1/.test(sql)) {
            const sorted = [...rows].sort((a, b) => (a.created_at ?? 0) - (b.created_at ?? 0));
            return (sorted.length ? sorted[sorted.length - 1] : undefined) as unknown as T;
          }
          return undefined as unknown as T;
        },
      };
    },
  };
}

const envOf = (db: ReturnType<typeof makeDB>) => ({ DB: db as never });

describe('bus ledger', () => {
  it('chains events via prev_hash', async () => {
    const db = makeDB();
    const env = envOf(db);
    const e1: BusEvent = { type: 'brain.started', sessionId: 's1' };
    const e2: BusEvent = { type: 'gate.verdict', sessionId: 's1', status: 'pass' };
    const r1 = await append(env, e1, { sessionId: 's1' });
    const r2 = await append(env, e2, { sessionId: 's1' });
    expect(r2.prev_hash).toBe(r1.hash);
    expect(r1.hash).not.toBe(r2.hash);
    // Every append links to the previous row's hash.
    expect(db._rows[1].prev_hash).toBe(db._rows[0].hash);
  });

  it('produces an identical chain for an identical run (determinism)', async () => {
    const a = makeDB();
    const b = makeDB();
    const seq: BusEvent[] = [
      { type: 'brain.started', sessionId: 's1' },
      { type: 'gate.verdict', sessionId: 's1', status: 'pass' },
      { type: 'run.finished', sessionId: 's1', ok: true },
    ];
    for (const ev of seq) { await append(envOf(a), ev, { sessionId: 's1' }); }
    for (const ev of seq) { await append(envOf(b), ev, { sessionId: 's1' }); }
    expect(a._rows.map((r) => r.hash)).toEqual(b._rows.map((r) => r.hash));
    expect(a._rows[1].prev_hash).toBe(a._rows[0].hash);
  });

  it('verifyChain returns valid:true for an intact chain', async () => {
    const db = makeDB();
    const env = envOf(db);
    await append(env, { type: 'brain.started', sessionId: 's1' }, { sessionId: 's1' });
    await append(env, { type: 'agent.result', sessionId: 's1', agent: 'grounder', summary: 'ok' }, { sessionId: 's1' });
    await append(env, { type: 'run.finished', sessionId: 's1', ok: true }, { sessionId: 's1' });
    const result = await verifyChain(env);
    expect(result.valid).toBe(true);
    expect(result.total_entries).toBe(3);
  });

  it('verifyChain detects tampering', async () => {
    const db = makeDB();
    const env = envOf(db);
    await append(env, { type: 'brain.started', sessionId: 's1' }, { sessionId: 's1' });
    await append(env, { type: 'run.finished', sessionId: 's1', ok: true }, { sessionId: 's1' });
    // Tamper: alter the first row's payload in place.
    const tampered = db._rows[0];
    const raw = tampered as unknown as Record<string, unknown>;
    raw.payload_json = JSON.stringify({ type: 'brain.started', sessionId: 's1', evil: true });
    const result = await verifyChain(env);
    expect(result.valid).toBe(false);
  });

  it('canonical is deterministic and ordered', async () => {
    const ev = { type: 'gate.verdict', sessionId: 's1', status: 'pass' } as BusEvent;
    expect(canonical(ev)).toBe(canonical({ ...ev }));
    expect(canonical(ev)).toContain('"status":"pass"');
  });

  it('sha256Hex produces 64 hex chars', async () => {
    expect(await sha256Hex('x')).toMatch(/^[0-9a-f]{64}$/);
  });

  it('canonicalJson sorts keys deterministically (RFC 8785-style)', () => {
    expect(canonicalJson({ b: 1, a: 2 })).toBe(canonicalJson({ a: 2, b: 1 }));
    expect(canonicalJson({ b: 1, a: 2 })).toBe('{"a":2,"b":1}');
    // Nested objects too.
    expect(canonicalJson({ x: { z: 1, y: 2 } })).toBe('{"x":{"y":2,"z":1}}');
  });

  it('toAatRecord maps a row to the audit shape with outcome', async () => {
    const db = makeDB();
    const env = envOf(db);
    await append(env, { type: 'gate.verdict', sessionId: 's1', status: 'pass' }, { sessionId: 's1', face: 'studio' });
    const row = db._rows[0] as BusRow;
    const rec = toAatRecord(row, { did: 'did:key:user1' });
    expect(rec.agent_identity).toBe('did:key:user1');
    expect(rec.type).toBe('gate.verdict');
    expect(rec.outcome).toBe('in-progress');
    expect(rec.trust_level).toBe('runtime-observed');
    expect(rec.hash).toBe(row.hash);
  });
});