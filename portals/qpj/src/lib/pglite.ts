/**
 * @file pglite.ts — device-local PGlite (SQLite-in-WASM) for QPJ workspace
 * surfaces (Docs / Sheets). Same local-first pattern as the phos PWA: data
 * lives in IndexedDB on the device, nothing leaves unless the relay flag is on.
 */

import { PGlite } from '@electric-sql/pglite';
import { live } from '@electric-sql/pglite/live';

let dbInstance: PGlite | null = null;
let initPromise: Promise<PGlite> | null = null;

export async function initDb(): Promise<PGlite> {
  if (dbInstance) return dbInstance;
  if (!initPromise) {
    initPromise = PGlite.create({
      dataDir: 'idb://qpj-workspace-db',
      extensions: { live },
    }).then((db) => {
      dbInstance = db;
      return db;
    });
  }
  return initPromise;
}

export function getDb(): PGlite | null {
  return dbInstance;
}