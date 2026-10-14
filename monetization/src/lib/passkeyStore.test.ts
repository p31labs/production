// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { createD1PasskeyStore, createMemoryPasskeyStore } from './passkeyStore';
import type { PasskeyCredential } from './passkeys';
import type { D1Database, D1PreparedStatement, D1Result } from './d1Types';

const CRED: PasskeyCredential = {
  id: 'cred-abc',
  publicKey: new Uint8Array([1, 2, 3, 4, 5]),
  counter: 0,
  transports: ['internal', 'hybrid'],
  did: 'did:key:zAlice',
  createdAt: 1_800_000_000_000,
};

/** Minimal fake D1 covering exactly the statements passkeyStore issues. */
class FakeD1 implements D1Database {
  readonly rows = new Map<string, { id: string; publicKey: Uint8Array; counter: number; did: string; transports: string[]; createdAt: number }>();
  readonly calls: string[] = [];

  prepare(query: string): D1PreparedStatement {
    const db = this;
    const values: unknown[] = [];
    return {
      bind(...bound: unknown[]) {
        values.push(...bound);
        return this;
      },
      async first<T>() {
        db.calls.push(`first:${query}`);
        if (query.includes('credential_id = ?')) {
          const row = db.rows.get(String(values[0]));
          if (!row) return null;
          return {
            credential_id: row.id,
            public_key: Buffer.from(row.publicKey).toString('base64url'),
            counter: row.counter,
            did: row.did,
            transports: JSON.stringify(row.transports),
            created_at: row.createdAt,
          } as T;
        }
        return null;
      },
      async all<T>() {
        db.calls.push(`all:${query}`);
        const did = String(values[0]);
        const results = [...db.rows.values()]
          .filter((r) => r.did === did)
          .map((row) => ({
            credential_id: row.id,
            public_key: Buffer.from(row.publicKey).toString('base64url'),
            counter: row.counter,
            did: row.did,
            transports: JSON.stringify(row.transports),
            created_at: row.createdAt,
          }));
        return { results: results as T[], success: true } as D1Result<T>;
      },
      async run() {
        db.calls.push(`run:${query}`);
        if (query.includes('INSERT OR REPLACE INTO passkeys')) {
          const [id, pk, counter, did, transports, createdAt] = values as [string, string, number, string, string, number];
          db.rows.set(id, {
            id,
            publicKey: Buffer.from(pk, 'base64url'),
            counter,
            did,
            transports: JSON.parse(transports) as string[],
            createdAt,
          });
        }
        if (query.includes('UPDATE passkeys SET counter')) {
          const [counter, id] = values as [number, string];
          const row = db.rows.get(id);
          if (row) row.counter = counter;
        }
        return { success: true };
      },
      async raw<T2>(): Promise<T2[]> {
        return [] as T2[];
      },
    };
  }

  async batch<T>(): Promise<D1Result<T>[]> {
    return [];
  }

  async exec() {
    return { success: true };
  }
}

describe('createMemoryPasskeyStore', () => {
  it('preserves the historical per-isolate behavior (put/get/list/counter)', async () => {
    const store = createMemoryPasskeyStore();
    await store.put(CRED);
    expect(await store.get('cred-abc')).toEqual(CRED);
    expect((await store.listByDid('did:key:zAlice')).map((c) => c.id)).toEqual(['cred-abc']);
    expect(await store.listByDid('did:key:zOther')).toEqual([]);
    await store.setCounter('cred-abc', 7);
    expect((await store.get('cred-abc'))!.counter).toBe(7);
    expect(await store.get('missing')).toBeNull();
  });
});

describe('createD1PasskeyStore', () => {
  it('persists and round-trips credentials through the passkeys table', async () => {
    const db = new FakeD1();
    const store = createD1PasskeyStore(db);

    await store.put(CRED);
    const got = await store.get('cred-abc');
    expect(got).not.toBeNull();
    expect(got!.id).toBe('cred-abc');
    expect(got!.did).toBe('did:key:zAlice');
    expect([...got!.publicKey]).toEqual([1, 2, 3, 4, 5]);
    expect(got!.transports).toEqual(['internal', 'hybrid']);
    expect(got!.createdAt).toBe(CRED.createdAt);

    expect((await store.listByDid('did:key:zAlice')).map((c) => c.id)).toEqual(['cred-abc']);
    expect(await store.listByDid('did:key:zBob')).toEqual([]);

    await store.setCounter('cred-abc', 42);
    expect((await store.get('cred-abc'))!.counter).toBe(42);

    // Re-putting the same credential id replaces the row (INSERT OR REPLACE).
    await store.put({ ...CRED, counter: 1 });
    expect((await store.get('cred-abc'))!.counter).toBe(1);
  });

  it('returns null for unknown credential ids', async () => {
    const store = createD1PasskeyStore(new FakeD1());
    expect(await store.get('nope')).toBeNull();
  });
});