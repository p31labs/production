import { getOrCreateDidKey, getDidAlias } from './identity';

const DB_NAME = 'p31-shell-db';
const DB_VERSION = 4;
const STORES = ['threads', 'notifications', 'memory', 'spoons-history', 'identity-keys', 'pqc-keys', 'slhdsa-keys', 'goals'] as const;

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (e) => {
      const target = e.target as IDBOpenDBRequest;
      for (const name of STORES) {
        if (!target.result.objectStoreNames.contains(name)) {
          target.result.createObjectStore(name, { keyPath: 'id' });
        }
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return dbPromise;
}

export async function storeRecord<T extends { id: string }>(
  storeName: (typeof STORES)[number],
  data: T,
): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    tx.objectStore(storeName).put(data);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function loadRecord<T>(storeName: (typeof STORES)[number], id: string): Promise<T | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const req = tx.objectStore(storeName).get(id);
    req.onsuccess = () => resolve((req.result as T) ?? null);
    req.onerror = () => reject(req.error);
  });
}

export async function listRecords<T>(storeName: (typeof STORES)[number]): Promise<T[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const req = tx.objectStore(storeName).getAll();
    req.onsuccess = () => resolve(req.result as T[]);
    req.onerror = () => reject(req.error);
  });
}

export async function clearRecords(storeName: (typeof STORES)[number]): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    tx.objectStore(storeName).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

const DID_KEY = 'p31-did';
const DID_STORAGE_KEY = 'p31-shell-did';

export async function ensureDid(): Promise<string> {
  try {
    const did = await getOrCreateDidKey();
    // Persist a secondary record for query purposes
    storeRecord('memory', { id: DID_KEY, did, createdAt: Date.now(), updatedAt: Date.now() }).catch(() => {});
    return did;
  } catch {
    // Fallback — if crypto/IndexedDB not available, return existing alias or placeholder
    const alias = await getDidAlias().catch(() => null);
    if (alias) return alias;
    const fallback = localStorage.getItem(DID_STORAGE_KEY);
    if (fallback) return fallback;
    const uuid = window.crypto?.randomUUID?.bind(window.crypto)?.() ?? Math.random().toString(36).slice(2, 12);
    const placeholder = `did:p31:${uuid}`;
    localStorage.setItem(DID_STORAGE_KEY, placeholder);
    return placeholder;
  }
}

export async function requestPersistentStorage(): Promise<boolean> {
  if ('storage' in navigator && 'persist' in navigator.storage) {
    try {
      return await navigator.storage.persist();
    } catch {
      return false;
    }
  }
  return false;
}

export async function persistThreads(threads: unknown[]): Promise<void> {
  try {
    await storeRecord('threads', { id: 'active', threads });
  } catch {
    // best-effort
  }
}
