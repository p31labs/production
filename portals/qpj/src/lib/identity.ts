const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

function base58Encode(bytes: Uint8Array): string {
  let num = BigInt(0);
  for (let i = 0; i < bytes.length; i++) num = (num << 8n) | BigInt(bytes[i]);
  let encoded = '';
  while (num > 0n) {
    encoded = BASE58_ALPHABET[Number(num % 58n)] + encoded;
    num = num / 58n;
  }
  for (let i = 0; i < bytes.length && bytes[i] === 0; i++) encoded = '1' + encoded;
  return encoded || '1';
}

export async function generateEd25519Did(): Promise<{ did: string; keyPair: CryptoKeyPair }> {
  const keyPair = await crypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
  const pubBuf = await crypto.subtle.exportKey('spki', keyPair.publicKey);
  const pubBytes = new Uint8Array(pubBuf);
  const raw = pubBytes.slice(pubBytes.length - 32);
  const prefixed = new Uint8Array([0xed, 0x01, ...raw]);
  return { did: `did:key:z${base58Encode(prefixed)}`, keyPair };
}

import { generatePickleName } from './pickleNames';

const DB_NAME = 'qpj-identity';
const DB_VERSION = 1;
const DEVICE_STORE = 'device';

let _deviceKey: CryptoKey | null = null;

export function setDeviceKey(key: CryptoKey): void {
  _deviceKey = key;
}

export function getDeviceKey(): CryptoKey | null {
  return _deviceKey;
}

async function openDb(): Promise<IDBDatabase> {
  if (typeof indexedDB === 'undefined') throw new Error('IndexedDB unavailable');
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(DEVICE_STORE)) db.createObjectStore(DEVICE_STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function getOrCreateDeviceKey(): Promise<CryptoKey> {
  if (_deviceKey) return _deviceKey;
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DEVICE_STORE, 'readwrite');
    const store = tx.objectStore(DEVICE_STORE);
    const getReq = store.get('key');
    getReq.onsuccess = async () => {
      const existing = getReq.result as CryptoKey | undefined;
      if (existing) { resolve(existing); return; }
      try {
        const key = await crypto.subtle.generateKey(
          { name: 'AES-GCM', length: 256 },
          false,
          ['encrypt', 'decrypt'],
        );
        const putReq = store.put(key, 'key');
        putReq.onsuccess = () => resolve(key);
        putReq.onerror = () => reject(putReq.error);
      } catch (e) { reject(e); }
    };
    getReq.onerror = () => reject(getReq.error);
  });
}

const IV_LENGTH = 12;

function buf64(buf: Uint8Array): string {
  let s = '';
  for (let i = 0; i < buf.length; i++) s += String.fromCharCode(buf[i]);
  return btoa(s);
}

async function encryptPrivate(keyPair: CryptoKeyPair): Promise<{ iv: string; ciphertext: string }> {
  const deviceKey = await getOrCreateDeviceKey();
  const privBuf = await crypto.subtle.exportKey('pkcs8', keyPair.privateKey);
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    deviceKey,
    privBuf,
  );
  return { iv: buf64(iv), ciphertext: buf64(new Uint8Array(ciphertext)) };
}

const RECORDS_KEY = (passportId: string) => `qpj:identity:${passportId}`;

async function dbPut(record: IdentityRecord): Promise<void> {
  localStorage.setItem(RECORDS_KEY(record.passportId), JSON.stringify(record));
}

async function dbGet(passportId: string): Promise<IdentityRecord | undefined> {
  const raw = localStorage.getItem(RECORDS_KEY(passportId));
  if (!raw) return undefined;
  return JSON.parse(raw) as IdentityRecord;
}

export interface Identity {
  did: string;
  name: string;
  avatar: string;
  accentHue: number;
  createdAt: number;
  verified: boolean;
  pickleName?: string;
}

interface IdentityRecord extends Identity {
  passportId: string;
  iv: string;
  ciphertext: string;
  pickleName: string;
}

export interface IdentityStatus {
  status: 'unknown' | 'loading' | 'ready' | 'none';
  identity: Identity | null;
}

export async function ensureIdentity(passportId: string): Promise<Identity | null> {
  const existing = await dbGet(passportId);
  if (!existing) return null;
  return {
    did: existing.did,
    name: existing.name,
    avatar: existing.avatar,
    accentHue: existing.accentHue,
    createdAt: existing.createdAt,
    verified: existing.verified,
  };
}

export async function createIdentity(
  passportId: string,
  opts: { name: string; avatar: string; accentHue: number; pickleName?: string },
): Promise<Identity> {
  const existing = await dbGet(passportId);
  if (existing) {
    return {
      did: existing.did,
      name: existing.name,
      avatar: existing.avatar,
      accentHue: existing.accentHue,
      createdAt: existing.createdAt,
      verified: existing.verified,
      pickleName: existing.pickleName,
    };
  }
  const { did, keyPair } = await generateEd25519Did();
  const { iv, ciphertext } = await encryptPrivate(keyPair);
  const now = Date.now();
  const pickleName = opts.pickleName ?? generatePickleName(passportId);
  const record: IdentityRecord = {
    passportId,
    did,
    name: opts.name,
    avatar: opts.avatar,
    accentHue: opts.accentHue,
    createdAt: now,
    verified: true,
    pickleName,
    iv,
    ciphertext,
  };
  await dbPut(record);
  return {
    did,
    name: record.name,
    avatar: record.avatar,
    accentHue: record.accentHue,
    createdAt: now,
    verified: true,
    pickleName: record.pickleName,
  };
}

export async function loadIdentity(passportId: string): Promise<Identity | null> {
  const record = await dbGet(passportId);
  if (!record) return null;
  return {
    did: record.did,
    name: record.name,
    avatar: record.avatar,
    accentHue: record.accentHue,
    createdAt: record.createdAt,
    verified: record.verified,
  };
}

export async function setIdentityVerified(passportId: string): Promise<Identity | null> {
  const record = await dbGet(passportId);
  if (!record) return null;
  record.verified = true;
  await dbPut(record);
  return {
    did: record.did,
    name: record.name,
    avatar: record.avatar,
    accentHue: record.accentHue,
    createdAt: record.createdAt,
    verified: true,
  };
}
