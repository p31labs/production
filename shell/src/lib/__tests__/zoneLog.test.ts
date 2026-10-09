import { describe, it, expect, beforeEach } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { runMigrations } from '../db';
import { writeZoneAccessLog } from '../zoneLog';

let db: PGlite;

beforeEach(async () => {
  db = new PGlite();
  await runMigrations(db);
}, 60000);

describe('zone access log — PGLite insert', () => {
  it('inserts an acknowledge row with kind and payload', async () => {
    await writeZoneAccessLog(
      {
        zoneId: '3',
        kind: 'acknowledge',
        payload: { toZone: 'focus', direction: 'calming', energyDelta: 2, acknowledged: true },
      },
      { db, actorDid: 'did:key:test' },
    );

    type ZoneRow = { id: string; zone_id: string; actor_did: string; kind: string; payload: string; created_at: number };
    const res = await db.query<ZoneRow>('SELECT id, zone_id, actor_did, kind, payload, created_at FROM zone_access_log');
    expect(res.rows).toHaveLength(1);
    const row = res.rows[0];
    expect(row.zone_id).toBe('3');
    expect(row.actor_did).toBe('did:key:test');
    expect(row.kind).toBe('acknowledge');
    const payload = JSON.parse(row.payload);
    expect(payload.acknowledged).toBe(true);
    expect(payload.toZone).toBe('focus');
    expect(typeof row.created_at).toBe('number');
  });

  it('defaults kind to enter when omitted', async () => {
    await writeZoneAccessLog({ zoneId: '6', payload: { toZone: 'commons' } }, { db, actorDid: 'did:key:test' });
    const res = await db.query<{ kind: string }>('SELECT kind FROM zone_access_log');
    expect(res.rows[0].kind).toBe('enter');
  });
});
