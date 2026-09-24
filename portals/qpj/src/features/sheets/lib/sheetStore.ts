/**
 * @file sheetStore.ts — Yjs-backed collaborative sheet store (QPJ Sheets).
 *
 * Local-first pattern: a Yjs doc holds the grid as a `Y.Map<string,string>`
 * (cell key `"row:col"`) + a `meta` map, persisted to PGlite (`sheets` table,
 * bytea), same-device via BroadcastChannel, cross-device via the P31 doc-relay
 * with PQC capability tokens (opt-in via `VITE_DOCS_WS_URL`).
 */

import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import {
  base64urlDecode,
  base64urlEncode,
  generateCompositeKeyPair,
  mintCapabilityToken,
  type CompositeKeyPair,
} from '@p31/sovereign-primitives';
import { getDb, initDb } from '../../../lib/pglite';

export interface SheetMeta {
  id: string;
  title: string;
  updatedAt: string;
}

const RELAY_AUDIENCE = 'p31-doc-relay';
const RELAY_CAPS = ['read', 'write', 'awareness'];
const TOKEN_TTL_MS = 15 * 60 * 1000;

const docCache = new Map<string, Y.Doc>();
const channels = new Map<string, BroadcastChannel>();
const providers = new Map<string, WebsocketProvider>();
const docKeys = new Map<string, CompositeKeyPair>();
const sheetTokens = new Map<string, string>();
const saveTimers = new Map<string, ReturnType<typeof setTimeout>>();
const SAVE_DEBOUNCE_MS = 600;
let tableReady: Promise<void> | null = null;

const WS_SERVER_URL = (import.meta as { env?: Record<string, string | undefined> }).env
  ?.VITE_DOCS_WS_URL;

function ensureTable(): Promise<void> {
  if (!tableReady) {
    tableReady = initDb().then(async () => {
      const db = getDb();
      if (!db) return;
      await db.exec(`CREATE TABLE IF NOT EXISTS sheets (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        cell_state BYTEA,
        rows INTEGER NOT NULL DEFAULT 20,
        cols INTEGER NOT NULL DEFAULT 10,
        ed25519_pub TEXT,
        ed25519_priv_pkcs8 TEXT,
        mldsa65_pub TEXT,
        mldsa65_priv TEXT,
        updated_at TEXT NOT NULL
      )`);
      await db.exec(`CREATE INDEX IF NOT EXISTS idx_sheets_updated_at ON sheets(updated_at)`);
    });
  }
  return tableReady;
}

function titleOf(doc: Y.Doc): string {
  const title = doc.getMap('meta').get('title');
  return typeof title === 'string' && title.length > 0 ? title : 'Untitled';
}

function dimensionsOf(doc: Y.Doc): { rows: number; cols: number } {
  const meta = doc.getMap('meta');
  const rows = meta.get('rows');
  const cols = meta.get('cols');
  return {
    rows: typeof rows === 'number' ? rows : 20,
    cols: typeof cols === 'number' ? cols : 10,
  };
}

/** Returns the shared CRDT sheet document, wiring persistence + sync. */
export function getSheetDoc(id: string): Y.Doc {
  const cached = docCache.get(id);
  if (cached) return cached;

  const doc = new Y.Doc({ gc: true });
  docCache.set(id, doc);
  doc.getMap('cells');
  doc.getMap('meta');

  void initDb().then(async () => {
    await ensureTable();
    const db = getDb();
    if (!db) return;
    const res = await db.query<{ cell_state: Uint8Array | null }>(
      'SELECT cell_state FROM sheets WHERE id = $1',
      [id],
    );
    const state = res.rows[0]?.cell_state;
    if (state && state.length > 0) {
      Y.applyUpdate(doc, state);
    }
  });

  if (typeof BroadcastChannel !== 'undefined') {
    const channel = new BroadcastChannel(`qpj:sheet:${id}`);
    channels.set(id, channel);
    doc.on('update', (update: Uint8Array) => {
      channel.postMessage(
        update.buffer.slice(update.byteOffset, update.byteOffset + update.byteLength),
      );
    });
    channel.onmessage = (event: MessageEvent) => {
      Y.applyUpdate(doc, new Uint8Array(event.data));
    };
  }

  if (WS_SERVER_URL) {
    void setupSheetProvider(id, doc);
  }

  return doc;
}

async function getSheetKeyPair(id: string): Promise<CompositeKeyPair | null> {
  const cached = docKeys.get(id);
  if (cached) return cached;
  await ensureTable();
  const db = getDb();
  if (!db) return null;
  const res = await db.query<{
    ed25519_pub: string | null;
    ed25519_priv_pkcs8: string | null;
    mldsa65_pub: string | null;
    mldsa65_priv: string | null;
  }>('SELECT ed25519_pub, ed25519_priv_pkcs8, mldsa65_pub, mldsa65_priv FROM sheets WHERE id = $1', [id]);
  const row = res.rows[0];
  if (row?.ed25519_pub && row.ed25519_priv_pkcs8 && row.mldsa65_pub && row.mldsa65_priv) {
    const kp: CompositeKeyPair = {
      ed25519: {
        publicKey: base64urlDecode(row.ed25519_pub),
        privateKey: base64urlDecode(row.ed25519_priv_pkcs8),
      },
      mlDsa65: {
        publicKey: base64urlDecode(row.mldsa65_pub),
        privateKey: base64urlDecode(row.mldsa65_priv),
      },
      alg: 'Ed25519+ML-DSA-65',
      createdAt: Date.now(),
    };
    docKeys.set(id, kp);
    return kp;
  }
  const kp = await generateCompositeKeyPair();
  await db.query(
    `UPDATE sheets SET ed25519_pub = $1, ed25519_priv_pkcs8 = $2, mldsa65_pub = $3, mldsa65_priv = $4 WHERE id = $5`,
    [
      base64urlEncode(kp.ed25519.publicKey),
      base64urlEncode(kp.ed25519.privateKey),
      base64urlEncode(kp.mlDsa65.publicKey),
      base64urlEncode(kp.mlDsa65.privateKey),
      id,
    ],
  );
  docKeys.set(id, kp);
  return kp;
}

async function setupSheetProvider(id: string, doc: Y.Doc): Promise<void> {
  try {
    const keys = await getSheetKeyPair(id);
    if (!keys) return;
    const iat = Date.now();
    const token = await mintCapabilityToken(
      {
        iss: 'did:key:qpj-sheet',
        aud: RELAY_AUDIENCE,
        room: id,
        caps: RELAY_CAPS,
        pk: {
          ed25519: base64urlEncode(keys.ed25519.publicKey),
          mlDsa65: base64urlEncode(keys.mlDsa65.publicKey),
        },
        iat,
        exp: iat + TOKEN_TTL_MS,
      },
      keys,
    );
    sheetTokens.set(id, token);
    const provider = new WebsocketProvider(WS_SERVER_URL!, id, doc, { params: { token } });
    providers.set(id, provider);
  } catch (err) {
    console.warn('[sheets] relay unavailable — remote sync off', err);
  }
}

/** Debounced save of the sheet CRDT state into PGlite (bytea). */
export function persistSheet(id: string, doc: Y.Doc): void {
  const existing = saveTimers.get(id);
  if (existing) clearTimeout(existing);
  saveTimers.set(
    id,
    setTimeout(() => {
      saveTimers.delete(id);
      void ensureTable().then(async () => {
        const db = getDb();
        if (!db) return;
        const dims = dimensionsOf(doc);
        await db.query(
          `INSERT INTO sheets (id, title, cell_state, rows, cols, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (id) DO UPDATE SET cell_state = $3, rows = $4, cols = $5, updated_at = $6`,
          [id, titleOf(doc), Y.encodeStateAsUpdate(doc), dims.rows, dims.cols, new Date().toISOString()],
        );
      });
    }, SAVE_DEBOUNCE_MS),
  );
}

export async function listSheets(): Promise<SheetMeta[]> {
  await ensureTable();
  const db = getDb();
  if (!db) return [];
  const res = await db.query<{ id: string; title: string; updated_at: string }>(
    'SELECT id, title, updated_at FROM sheets ORDER BY updated_at DESC',
  );
  return res.rows.map((row) => ({ id: row.id, title: row.title, updatedAt: row.updated_at }));
}

export async function createSheet(title: string): Promise<string> {
  await ensureTable();
  const db = getDb();
  const id = `sheet_${crypto.randomUUID()}`;
  const now = new Date().toISOString();
  if (db) {
    await db.query(
      'INSERT INTO sheets (id, title, cell_state, rows, cols, updated_at) VALUES ($1, $2, $3, $4, $5, $6)',
      [id, title, new Uint8Array(0), 20, 10, now],
    );
  }
  const doc = getSheetDoc(id);
  doc.getMap('meta').set('title', title);
  persistSheet(id, doc);
  return id;
}

export async function renameSheet(id: string, title: string): Promise<void> {
  const doc = getSheetDoc(id);
  doc.getMap('meta').set('title', title);
  persistSheet(id, doc);
  await ensureTable();
  const db = getDb();
  if (db) {
    await db.query('UPDATE sheets SET title = $1, updated_at = $2 WHERE id = $3', [
      title,
      new Date().toISOString(),
      id,
    ]);
  }
}

export async function deleteSheet(id: string): Promise<void> {
  await ensureTable();
  const db = getDb();
  if (db) {
    await db.query('DELETE FROM sheets WHERE id = $1', [id]);
  }
  const doc = docCache.get(id);
  if (doc) {
    doc.destroy();
    docCache.delete(id);
  }
  const channel = channels.get(id);
  if (channel) {
    channel.close();
    channels.delete(id);
  }
  const provider = providers.get(id);
  if (provider) {
    provider.destroy();
    providers.delete(id);
  }
  docKeys.delete(id);
  // Purge the relay's retained copy using the stored token (read AFTER the
  // provider is torn down — the token lives in its own map, not the provider).
  const token = sheetTokens.get(id);
  sheetTokens.delete(id);
  if (WS_SERVER_URL && token) {
    void fetch(`${WS_SERVER_URL}/${id}?token=${encodeURIComponent(token)}`, {
      method: 'DELETE',
      credentials: 'include',
    }).catch(() => {});
  }
}