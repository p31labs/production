/**
 * @file slideStore.ts — Yjs-backed collaborative deck store (QPJ Slides).
 *
 * A deck is a Yjs doc: an ordered `Y.Array` of slides (each a `Y.Map<unknown>` with
 * `title`/`body` Y.Text blocks), plus a `meta` map. Persisted to PGlite
 * (`slide_decks` table, bytea), same-device via BroadcastChannel, cross-device
 * via the P31 doc-relay with PQC capability tokens (opt-in via
 * `VITE_DOCS_WS_URL`).
 */

import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import {
  base64urlDecode,
  base64urlEncode,
  generateCompositeKeyPair,
  mintCapabilityToken,
  type CompositeKeyPair,
} from '@p31ca/sovereign-primitives';
import { getDb, initDb } from '../../../lib/pglite';

export interface DeckMeta {
  id: string;
  title: string;
  updatedAt: string;
}

const RELAY_AUDIENCE = 'p31-doc-relay';
const RELAY_CAPS = ['read', 'write', 'awareness'];
const TOKEN_TTL_MS = 15 * 60 * 1000;

const deckCache = new Map<string, Y.Doc>();
const channels = new Map<string, BroadcastChannel>();
const providers = new Map<string, WebsocketProvider>();
const deckKeys = new Map<string, CompositeKeyPair>();
const deckTokens = new Map<string, string>();
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
      await db.exec(`CREATE TABLE IF NOT EXISTS slide_decks (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        deck_state BYTEA,
        ed25519_pub TEXT,
        ed25519_priv_pkcs8 TEXT,
        mldsa65_pub TEXT,
        mldsa65_priv TEXT,
        updated_at TEXT NOT NULL
      )`);
      await db.exec(`CREATE INDEX IF NOT EXISTS idx_slide_decks_updated_at ON slide_decks(updated_at)`);
    });
  }
  return tableReady;
}

function deckTitleOf(doc: Y.Doc): string {
  const title = doc.getMap('meta').get('title');
  return typeof title === 'string' && title.length > 0 ? title : 'Untitled';
}

export function getSlideDoc(id: string): Y.Doc {
  const cached = deckCache.get(id);
  if (cached) return cached;

  const doc = new Y.Doc({ gc: true });
  deckCache.set(id, doc);
  doc.getArray('slides');
  doc.getMap('meta');

  void initDb().then(async () => {
    await ensureTable();
    const db = getDb();
    if (!db) return;
    const res = await db.query<{ deck_state: Uint8Array | null }>(
      'SELECT deck_state FROM slide_decks WHERE id = $1',
      [id],
    );
    const state = res.rows[0]?.deck_state;
    if (state && state.length > 0) {
      Y.applyUpdate(doc, state);
    }
  });

  if (typeof BroadcastChannel !== 'undefined') {
    const channel = new BroadcastChannel(`qpj:deck:${id}`);
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
    void setupDeckProvider(id, doc);
  }

  return doc;
}

async function getDeckKeyPair(id: string): Promise<CompositeKeyPair | null> {
  const cached = deckKeys.get(id);
  if (cached) return cached;
  await ensureTable();
  const db = getDb();
  if (!db) return null;
  const res = await db.query<{
    ed25519_pub: string | null;
    ed25519_priv_pkcs8: string | null;
    mldsa65_pub: string | null;
    mldsa65_priv: string | null;
  }>('SELECT ed25519_pub, ed25519_priv_pkcs8, mldsa65_pub, mldsa65_priv FROM slide_decks WHERE id = $1', [id]);
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
    deckKeys.set(id, kp);
    return kp;
  }
  const kp = await generateCompositeKeyPair();
  await db.query(
    `UPDATE slide_decks SET ed25519_pub = $1, ed25519_priv_pkcs8 = $2, mldsa65_pub = $3, mldsa65_priv = $4 WHERE id = $5`,
    [
      base64urlEncode(kp.ed25519.publicKey),
      base64urlEncode(kp.ed25519.privateKey),
      base64urlEncode(kp.mlDsa65.publicKey),
      base64urlEncode(kp.mlDsa65.privateKey),
      id,
    ],
  );
  deckKeys.set(id, kp);
  return kp;
}

async function setupDeckProvider(id: string, doc: Y.Doc): Promise<void> {
  try {
    const keys = await getDeckKeyPair(id);
    if (!keys) return;
    const iat = Date.now();
    const token = await mintCapabilityToken(
      {
        iss: 'did:key:qpj-slides',
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
    deckTokens.set(id, token);
    const provider = new WebsocketProvider(WS_SERVER_URL!, id, doc, { params: { token } });
    providers.set(id, provider);
  } catch (err) {
    console.warn('[slides] relay unavailable — remote sync off', err);
  }
}

export function persistDeck(id: string, doc: Y.Doc): void {
  const existing = saveTimers.get(id);
  if (existing) clearTimeout(existing);
  saveTimers.set(
    id,
    setTimeout(() => {
      saveTimers.delete(id);
      void ensureTable().then(async () => {
        const db = getDb();
        if (!db) return;
        await db.query(
          `INSERT INTO slide_decks (id, title, deck_state, updated_at)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (id) DO UPDATE SET deck_state = $3, updated_at = $4`,
          [id, deckTitleOf(doc), Y.encodeStateAsUpdate(doc), new Date().toISOString()],
        );
      });
    }, SAVE_DEBOUNCE_MS),
  );
}

export async function listDecks(): Promise<DeckMeta[]> {
  await ensureTable();
  const db = getDb();
  if (!db) return [];
  const res = await db.query<{ id: string; title: string; updated_at: string }>(
    'SELECT id, title, updated_at FROM slide_decks ORDER BY updated_at DESC',
  );
  return res.rows.map((row) => ({ id: row.id, title: row.title, updatedAt: row.updated_at }));
}

export async function createDeck(title: string): Promise<string> {
  await ensureTable();
  const db = getDb();
  const id = `deck_${crypto.randomUUID()}`;
  const now = new Date().toISOString();
  if (db) {
    await db.query(
      'INSERT INTO slide_decks (id, title, deck_state, updated_at) VALUES ($1, $2, $3, $4)',
      [id, title, new Uint8Array(0), now],
    );
  }
  const doc = getSlideDoc(id);
  doc.getMap('meta').set('title', title);
  // Seed one title slide.
  const slides = doc.getArray('slides');
  const first = new Y.Map<unknown>();
  first.set('title', new Y.Text('Title'));
  first.set('body', new Y.Text('Start typing…'));
  slides.push([first]);
  persistDeck(id, doc);
  return id;
}

export async function renameDeck(id: string, title: string): Promise<void> {
  const doc = getSlideDoc(id);
  doc.getMap('meta').set('title', title);
  persistDeck(id, doc);
  await ensureTable();
  const db = getDb();
  if (db) {
    await db.query('UPDATE slide_decks SET title = $1, updated_at = $2 WHERE id = $3', [
      title,
      new Date().toISOString(),
      id,
    ]);
  }
}

export async function deleteDeck(id: string): Promise<void> {
  await ensureTable();
  const db = getDb();
  if (db) {
    await db.query('DELETE FROM slide_decks WHERE id = $1', [id]);
  }
  const doc = deckCache.get(id);
  if (doc) {
    doc.destroy();
    deckCache.delete(id);
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
  deckKeys.delete(id);
  const token = deckTokens.get(id);
  deckTokens.delete(id);
  if (WS_SERVER_URL && token) {
    void fetch(`${WS_SERVER_URL}/${id}?token=${encodeURIComponent(token)}`, {
      method: 'DELETE',
      credentials: 'include',
    }).catch(() => {});
  }
}