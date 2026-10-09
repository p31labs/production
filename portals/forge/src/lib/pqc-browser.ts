/**
 * pqc-browser.ts — post-quantum identity in the browser.
 *
 * Consumes @noble/post-quantum's ml_dsa65 (FIPS 204 ML-DSA-65) — the same
 * primitive apps/phos/src/lib/crypto.ts uses — so the forge's identity is in
 * the SAME DID ecosystem as the rest of P31. Keys are stored as base64 in
 * IndexedDB (the browser sandbox is the security boundary; the UI never
 * displays raw private key bytes).
 *
 * Honest caveat: @noble PQC keys are raw Uint8Array, not non-extractable
 * WebCrypto CryptoKey objects (WebCrypto has no native ML-DSA in most
 * browsers yet; Chrome 150 limits it to private PKI). When native ML-DSA
 * lands, the migration is a drop-in swap to non-extractable keys.
 */

import { ml_dsa65 } from '@noble/post-quantum/ml-dsa.js';

const DB_NAME = 'p31-identity';
const STORE = 'keys';

export interface P31Identity {
  did: string;
  sigPublicKey: string; // base64
  createdAt: string;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbSet(key: string, value: unknown): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function idbGet<T>(key: string): Promise<T | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).get(key);
    req.onsuccess = () => resolve((req.result as T) ?? null);
    req.onerror = () => reject(req.error);
  });
}

const bytesToB64 = (bytes: Uint8Array): string => {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
};
const b64ToBytes = (b64: string): Uint8Array => {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
};

const bytesToHex = (bytes: Uint8Array): string =>
  Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');

/** Generate a fresh P31 post-quantum identity (ML-DSA-65). */
export async function generateIdentity(): Promise<P31Identity> {
  const keypair = ml_dsa65.keygen();
  const sigPubB64 = bytesToB64(keypair.publicKey);
  const sigPrivB64 = bytesToB64(keypair.secretKey);

  await idbSet('sigPriv', sigPrivB64);
  await idbSet('sigPub', sigPubB64);

  // Derive a did:p31 from a SHA-256 of the public key (same shape as phos).
  const hashBuf = await crypto.subtle.digest('SHA-256', keypair.publicKey);
  const did = 'did:p31:' + bytesToHex(new Uint8Array(hashBuf)).slice(0, 32);

  const identity: P31Identity = { did, sigPublicKey: sigPubB64, createdAt: new Date().toISOString() };
  await idbSet('identity', identity);
  return identity;
}

/** Load the stored identity (or null). */
export async function loadIdentity(): Promise<P31Identity | null> {
  return idbGet<P31Identity>('identity');
}

/** Sign an arbitrary string (e.g. a document manifest hash). Returns base64. */
export async function sign(message: string): Promise<string> {
  const privB64 = await idbGet<string>('sigPriv');
  if (!privB64) throw new Error('no identity — generate first');
  const sig = ml_dsa65.sign(new TextEncoder().encode(message), b64ToBytes(privB64));
  return bytesToB64(sig);
}

/** Verify a base64 signature against a base64 public key. */
export async function verify(publicKeyB64: string, message: string, signatureB64: string): Promise<boolean> {
  // @noble order is verify(sig, msg, pubKey).
  return ml_dsa65.verify(b64ToBytes(signatureB64), new TextEncoder().encode(message), b64ToBytes(publicKeyB64));
}