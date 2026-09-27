/**
 * @file docStore.ts — Yjs-backed collaborative document store (QPJ Docs).
 *
 * Local-first collaborative documents (ported from the phos PWA):
 *  - Yjs CRDT; the prosemirror XML fragment holds the rich-text body, a `meta`
 *    map holds the title.
 *  - Same-device collaboration via BroadcastChannel (no network required).
 *  - Cross-device via the P31 doc-relay Worker (Durable Object per room),
 *    gated by PQC capability tokens. Enabled by `VITE_DOCS_WS_URL`; off by
 *    default so content never leaves the device unless the operator opts in.
 *  - Persistence to PGlite (`documents` table) as full Yjs state in `bytea`.
 */

import * as Y from 'yjs';
import * as awarenessProtocol from 'y-protocols/awareness';
import { WebsocketProvider } from 'y-websocket';
import {
  base64urlDecode,
  base64urlEncode,
  generateCompositeKeyPair,
  mintCapabilityToken,
  type CompositeKeyPair,
} from '@p31ca/sovereign-primitives';
import { getDb, initDb } from '../../../lib/pglite';

const RELAY_AUDIENCE = 'p31-doc-relay';
const RELAY_CAPS = ['read', 'write', 'awareness'];
const TOKEN_TTL_MS = 15 * 60 * 1000;

export interface DocMeta {
  id: string;
  title: string;
  updatedAt: string;
}

const docCache = new Map<string, Y.Doc>();
const channels = new Map<string, BroadcastChannel>();
const awarenesses = new Map<string, awarenessProtocol.Awareness>();
const awarenessChannels = new Map<string, BroadcastChannel>();
const providers = new Map<string, WebsocketProvider>();
const saveTimers = new Map<string, ReturnType<typeof setTimeout>>();
const SAVE_DEBOUNCE_MS = 600;
let tableReady: Promise<void> | null = null;

const docKeys = new Map<string, CompositeKeyPair>();
const docTokens = new Map<string, string>();

const WS_SERVER_URL = (import.meta as { env?: Record<string, string | undefined> }).env
  ?.VITE_DOCS_WS_URL;

function ensureTable(): Promise<void> {
  if (!tableReady) {
    tableReady = initDb().then(async () => {
      const db = getDb();
      if (!db) return;
      await db.exec(`CREATE TABLE IF NOT EXISTS documents (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        content_state BYTEA,
        ed25519_pub TEXT,
        ed25519_priv_pkcs8 TEXT,
        mldsa65_pub TEXT,
        mldsa65_priv TEXT,
        updated_at TEXT NOT NULL
      )`);
      await db.exec(`CREATE INDEX IF NOT EXISTS idx_documents_updated_at ON documents(updated_at)`);
      for (const col of [
        'ed25519_pub',
        'ed25519_priv_pkcs8',
        'mldsa65_pub',
        'mldsa65_priv',
      ]) {
        await db.exec(`ALTER TABLE documents ADD COLUMN IF NOT EXISTS ${col} TEXT`);
      }
    });
  }
  return tableReady;
}

function titleOf(doc: Y.Doc): string {
  const title = doc.getMap('meta').get('title');
  return typeof title === 'string' && title.length > 0 ? title : 'Untitled';
}

/**
 * Migrates the pre-rich-text body (`Y.Text('content')`) into the prosemirror
 * XML fragment (each line becomes a paragraph). Tolerates the lone empty seed
 * paragraph the editor may push before PGlite hydration lands, so legacy docs
 * are never orphaned by the seed. Idempotent otherwise.
 */
export function migrateLegacyContent(doc: Y.Doc): void {
  const text = doc.getText('content');
  const fragment = doc.getXmlFragment('prosemirror');
  if (text.length === 0) return;

  const isOnlyEmptySeed =
    fragment.length === 1 &&
    fragment.get(0) instanceof Y.XmlElement &&
    (fragment.get(0) as Y.XmlElement).nodeName === 'paragraph' &&
    (fragment.get(0) as Y.XmlElement).length === 0;
  if (fragment.length > 0 && !isOnlyEmptySeed) return;
  if (isOnlyEmptySeed) fragment.delete(0, 1);

  const lines = text.toString().split('\n');
  for (const line of lines) {
    const paragraph = new Y.XmlElement('paragraph');
    const textNode = new Y.XmlText();
    if (line.length > 0) textNode.insert(0, line);
    paragraph.insert(0, [textNode]);
    fragment.push([paragraph]);
  }
  text.delete(0, text.length);
}

/**
 * Shared awareness for cursor/presence — BroadcastChannel (same-device) and
 * the y-websocket provider (cross-device) both ride this instance.
 */
export function getDocAwareness(id: string): awarenessProtocol.Awareness {
  const existing = awarenesses.get(id);
  if (existing) return existing;

  const doc = getDoc(id);
  const awareness = new awarenessProtocol.Awareness(doc);
  awarenesses.set(id, awareness);

  if (typeof BroadcastChannel !== 'undefined') {
    const channel = new BroadcastChannel(`qpj:doc:${id}:awareness`);
    awarenessChannels.set(id, channel);
    awareness.on('update', ({ added, updated, removed }: { added: number[]; updated: number[]; removed: number[] }) => {
      const changed = added.concat(updated, removed);
      if (changed.length === 0) return;
      const update = awarenessProtocol.encodeAwarenessUpdate(awareness, changed);
      channel.postMessage(
        update.buffer.slice(update.byteOffset, update.byteOffset + update.byteLength),
      );
    });
    channel.onmessage = (event: MessageEvent) => {
      awarenessProtocol.applyAwarenessUpdate(awareness, new Uint8Array(event.data), null);
    };
  }

  return awareness;
}

/** Returns the shared CRDT document for an id, wiring persistence + sync. */
export function getDoc(id: string): Y.Doc {
  const cached = docCache.get(id);
  if (cached) return cached;

  const doc = new Y.Doc({ gc: true });
  docCache.set(id, doc);

  void initDb().then(async () => {
    await ensureTable();
    const db = getDb();
    if (!db) return;
    const res = await db.query<{ content_state: Uint8Array | null }>(
      'SELECT content_state FROM documents WHERE id = $1',
      [id],
    );
    const state = res.rows[0]?.content_state;
    if (state && state.length > 0) {
      Y.applyUpdate(doc, state);
    }
    migrateLegacyContent(doc);
  });

  if (typeof BroadcastChannel !== 'undefined') {
    const channel = new BroadcastChannel(`qpj:doc:${id}`);
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
    void setupWebsocketProvider(id, doc);
  }

  return doc;
}

async function getDocKeyPair(id: string): Promise<CompositeKeyPair | null> {
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
  }>('SELECT ed25519_pub, ed25519_priv_pkcs8, mldsa65_pub, mldsa65_priv FROM documents WHERE id = $1', [id]);
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
    `UPDATE documents SET ed25519_pub = $1, ed25519_priv_pkcs8 = $2, mldsa65_pub = $3, mldsa65_priv = $4 WHERE id = $5`,
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

async function mintDocToken(id: string): Promise<string | null> {
  const keys = await getDocKeyPair(id);
  if (!keys) return null;
  const iat = Date.now();
  const token = await mintCapabilityToken(
    {
      iss: 'did:key:qpj-doc',
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
  docTokens.set(id, token);
  return token;
}

async function setupWebsocketProvider(id: string, doc: Y.Doc): Promise<void> {
  try {
    const token = await mintDocToken(id);
    if (!token) return;
    const provider = new WebsocketProvider(WS_SERVER_URL!, id, doc, {
      params: { token },
      awareness: getDocAwareness(id),
    });
    providers.set(id, provider);
  } catch (err) {
    console.warn('[docs] relay unavailable — remote sync off', err);
  }
}

/** Debounced save of the full Yjs state (body + meta) into PGlite as bytea. */
export function persistDoc(id: string, doc: Y.Doc): void {
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
          `INSERT INTO documents (id, title, content_state, updated_at)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (id) DO UPDATE SET content_state = $3, updated_at = $4`,
          [id, titleOf(doc), Y.encodeStateAsUpdate(doc), new Date().toISOString()],
        );
      });
    }, SAVE_DEBOUNCE_MS),
  );
}

export async function listDocuments(): Promise<DocMeta[]> {
  await ensureTable();
  const db = getDb();
  if (!db) return [];
  const res = await db.query<{ id: string; title: string; updated_at: string }>(
    'SELECT id, title, updated_at FROM documents ORDER BY updated_at DESC',
  );
  return res.rows.map((row) => ({ id: row.id, title: row.title, updatedAt: row.updated_at }));
}

export async function createDocument(title: string): Promise<string> {
  await ensureTable();
  const db = getDb();
  const id = `doc_${crypto.randomUUID()}`;
  const now = new Date().toISOString();
  if (db) {
    await db.query(
      'INSERT INTO documents (id, title, content_state, updated_at) VALUES ($1, $2, $3, $4)',
      [id, title, new Uint8Array(0), now],
    );
  }
  const doc = getDoc(id);
  doc.getMap('meta').set('title', title);
  persistDoc(id, doc);
  return id;
}

export async function renameDocument(id: string, title: string): Promise<void> {
  const doc = getDoc(id);
  doc.getMap('meta').set('title', title);
  persistDoc(id, doc);
  await ensureTable();
  const db = getDb();
  if (db) {
    await db.query(
      'UPDATE documents SET title = $1, updated_at = $2 WHERE id = $3',
      [title, new Date().toISOString(), id],
    );
  }
}

export async function deleteDocument(id: string): Promise<void> {
  await ensureTable();
  const db = getDb();
  if (db) {
    await db.query('DELETE FROM documents WHERE id = $1', [id]);
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
  const awarenessChannel = awarenessChannels.get(id);
  if (awarenessChannel) {
    awarenessChannel.close();
    awarenessChannels.delete(id);
  }
  const awareness = awarenesses.get(id);
  if (awareness) {
    awareness.destroy();
    awarenesses.delete(id);
  }
  const provider = providers.get(id);
  if (provider) {
    provider.destroy();
    providers.delete(id);
  }
  docKeys.delete(id);
  const token = docTokens.get(id);
  docTokens.delete(id);
  if (WS_SERVER_URL && token) {
    void fetch(`${WS_SERVER_URL}/${id}?token=${encodeURIComponent(token)}`, {
      method: 'DELETE',
      credentials: 'include',
    }).catch(() => {});
  }
}