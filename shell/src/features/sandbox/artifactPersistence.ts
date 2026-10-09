import type { Thread, Message, Artifact } from './types';

const DB_NAME = 'p31-sandbox';
const DB_VERSION = 1;

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains('threads')) db.createObjectStore('threads', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('messages')) db.createObjectStore('messages', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('artifacts')) db.createObjectStore('artifacts', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('settings')) db.createObjectStore('settings', { keyPath: 'key' });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => {
        dbPromise = null;
        reject(req.error);
      };
    });
  }
  return dbPromise;
}

function tx(db: IDBDatabase, store: string, mode: IDBTransactionMode = 'readonly') {
  return db.transaction(store, mode).objectStore(store);
}

function promisify<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// ─── Threads ───

export async function loadThreads(): Promise<Thread[]> {
  const db = await openDB();
  return promisify(tx(db, 'threads').getAll());
}

export async function saveThread(thread: Thread): Promise<void> {
  const db = await openDB();
  await promisify(tx(db, 'threads', 'readwrite').put(thread));
}

export async function deleteThreadFromDB(id: string): Promise<void> {
  const db = await openDB();
  await promisify(tx(db, 'threads', 'readwrite').delete(id));
}

// ─── Messages ───

export type MessageRow = Message & { threadId: string };

export async function loadAllMessages(): Promise<MessageRow[]> {
  const db = await openDB();
  return promisify<MessageRow[]>(tx(db, 'messages').getAll());
}

export async function loadMessages(threadId: string): Promise<Message[]> {
  const all = await loadAllMessages();
  return all.filter((m) => m.threadId === threadId);
}

export async function saveMessage(msg: MessageRow): Promise<void> {
  const db = await openDB();
  await promisify(tx(db, 'messages', 'readwrite').put(msg));
}

export async function deleteMessageFromDB(id: string): Promise<void> {
  const db = await openDB();
  await promisify(tx(db, 'messages', 'readwrite').delete(id));
}

export async function deleteMessagesForThread(threadId: string): Promise<void> {
  const db = await openDB();
  const store = tx(db, 'messages', 'readwrite');
  const all = await promisify<MessageRow[]>(store.getAll());
  for (const m of all) if (m.threadId === threadId) await promisify(store.delete(m.id));
}

// ─── Artifacts ───

export type ArtifactRow = Artifact & { threadId: string };

export async function loadAllArtifacts(): Promise<ArtifactRow[]> {
  const db = await openDB();
  return promisify<ArtifactRow[]>(tx(db, 'artifacts').getAll());
}

export async function loadArtifacts(threadId: string): Promise<Artifact[]> {
  const all = await loadAllArtifacts();
  return all.filter((a) => a.threadId === threadId);
}

export async function saveArtifact(art: ArtifactRow): Promise<void> {
  const db = await openDB();
  await promisify(tx(db, 'artifacts', 'readwrite').put(art));
}

export async function deleteArtifactFromDB(id: string): Promise<void> {
  const db = await openDB();
  await promisify(tx(db, 'artifacts', 'readwrite').delete(id));
}

export async function deleteArtifactsForThread(threadId: string): Promise<void> {
  const db = await openDB();
  const store = tx(db, 'artifacts', 'readwrite');
  const all = await promisify<ArtifactRow[]>(store.getAll());
  for (const a of all) if (a.threadId === threadId) await promisify(store.delete(a.id));
}

// ─── Settings ───

export async function loadSetting(key: string): Promise<unknown> {
  const db = await openDB();
  const result = await promisify<{ value: unknown } | undefined>(tx(db, 'settings').get(key));
  return result?.value;
}

export async function saveSetting(key: string, value: unknown): Promise<void> {
  const db = await openDB();
  await promisify(tx(db, 'settings', 'readwrite').put({ key, value }));
}

// ─── Snapshot reconciliation ───

export interface PersistSnapshot {
  threads: Thread[];
  messages: Record<string, Message[]>;
  artifacts: Record<string, Artifact[]>;
}

export interface DbRows {
  threads: Thread[];
  messages: MessageRow[];
  artifacts: ArtifactRow[];
}

export type PersistWrite = { kind: 'message'; row: MessageRow } | { kind: 'artifact'; row: ArtifactRow };

export interface PersistDelta {
  writes: PersistWrite[];
  deletes: Array<{ kind: 'thread' | 'message' | 'artifact'; id: string }>;
}

export function computePersistDelta(snapshot: PersistSnapshot, db: DbRows): PersistDelta {
  const writes: PersistWrite[] = [];
  const deletes: PersistDelta['deletes'] = [];

  const threadIds = new Set(snapshot.threads.map((t) => t.id));

  for (const t of snapshot.threads) {
    for (const m of snapshot.messages[t.id] ?? []) writes.push({ kind: 'message', row: { ...m, threadId: t.id } });
    for (const a of snapshot.artifacts[t.id] ?? []) writes.push({ kind: 'artifact', row: { ...a, threadId: t.id } });
  }

  for (const t of db.threads) if (!threadIds.has(t.id)) deletes.push({ kind: 'thread', id: t.id });

  const msgIds = new Set(snapshot.threads.flatMap((t) => (snapshot.messages[t.id] ?? []).map((m) => m.id)));
  for (const m of db.messages) if (!msgIds.has(m.id)) deletes.push({ kind: 'message', id: m.id });

  const artIds = new Set(snapshot.threads.flatMap((t) => (snapshot.artifacts[t.id] ?? []).map((a) => a.id)));
  for (const a of db.artifacts) if (!artIds.has(a.id)) deletes.push({ kind: 'artifact', id: a.id });

  return { writes, deletes };
}

async function readAllRows(db: IDBDatabase): Promise<DbRows> {
  const [threads, messages, artifacts] = await Promise.all([
    promisify<Thread[]>(tx(db, 'threads').getAll()),
    promisify<MessageRow[]>(tx(db, 'messages').getAll()),
    promisify<ArtifactRow[]>(tx(db, 'artifacts').getAll()),
  ]);
  return { threads, messages, artifacts };
}

export async function persistSnapshot(snapshot: PersistSnapshot): Promise<void> {
  const db = await openDB();
  const { writes, deletes } = computePersistDelta(snapshot, await readAllRows(db));

  const txo = db.transaction(['threads', 'messages', 'artifacts'], 'readwrite');
  const threads = txo.objectStore('threads');
  const messages = txo.objectStore('messages');
  const artifacts = txo.objectStore('artifacts');

  for (const t of snapshot.threads) threads.put(t);
  for (const w of writes) {
    if (w.kind === 'message') messages.put(w.row);
    else artifacts.put(w.row);
  }
  for (const d of deletes) {
    if (d.kind === 'thread') threads.delete(d.id);
    else if (d.kind === 'message') messages.delete(d.id);
    else artifacts.delete(d.id);
  }

  await new Promise<void>((resolve, reject) => {
    txo.oncomplete = () => resolve();
    txo.onerror = () => reject(txo.error);
  });
}
