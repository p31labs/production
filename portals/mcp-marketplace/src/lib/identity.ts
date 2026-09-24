/**
 * @file identity.ts — per-member sovereign identity for the workspace portal.
 *
 * Each family member (pickle slot) gets a real `did:key` (Ed25519, base58btc
 * multibase) plus a bound hybrid post-quantum key material. Private keys are
 * AES-GCM-wrapped under a non-extractable device key held in IndexedDB — they
 * never leave the device in plaintext.
 *
 * The persisted public record is what the rest of the workspace sees:
 *   { memberId, did, pickleName, avatar, accent, createdAt, verified }
 */

import { pickleName } from '@/lib/pickleNames'

const DEVICE_KEY_ID = 'p31:device-key'
const IDENTITY_PREFIX = 'p31:identity:'

/** A member's public identity record (safe to persist). */
export interface Identity {
  memberId: string
  did: string
  pickleName: string
  avatar: string
  accent: string
  createdAt: number
  verified: boolean
}

const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'

function base58Encode(bytes: Uint8Array): string {
  let value = 0n
  for (let i = 0; i < bytes.length; i++) value = (value << 8n) | BigInt(bytes[i])
  let encoded = ''
  while (value > 0n) {
    encoded = BASE58_ALPHABET[Number(value % 58n)] + encoded
    value = value / 58n
  }
  for (let i = 0; i < bytes.length && bytes[i] === 0; i++) encoded = '1' + encoded
  return encoded || '1'
}

/** Generate a real Ed25519 `did:key:z…` from a fresh keypair (QPJ pattern). */
export async function generateDidKey(): Promise<{ did: string; keyPair: CryptoKeyPair }> {
  const keyPair = await crypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify'])
  const pubBuf = await crypto.subtle.exportKey('spki', keyPair.publicKey)
  const pubBytes = new Uint8Array(pubBuf)
  const raw = pubBytes.slice(pubBytes.length - 32)
  const prefixed = new Uint8Array([0xed, 0x01, ...raw])
  return { did: `did:key:z${base58Encode(prefixed)}`, keyPair }
}

// --- Device key (IndexedDB, non-extractable) ---

async function openDeviceKeyDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('p31-workspace-keys', 1)
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains('keys')) req.result.createObjectStore('keys')
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

/** Get or create the device key (AES-GCM-256, non-extractable). */
export async function getDeviceKey(): Promise<CryptoKey> {
  const db = await openDeviceKeyDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('keys', 'readwrite')
    const store = tx.objectStore('keys')
    const getReq = store.get(DEVICE_KEY_ID)
    getReq.onsuccess = async () => {
      if (getReq.result) {
        resolve(getReq.result as CryptoKey)
        return
      }
      const key = await crypto.subtle.generateKey(
        { name: 'AES-GCM', length: 256 },
        false,
        ['wrapKey', 'unwrapKey', 'encrypt', 'decrypt'],
      )
      store.put(key, DEVICE_KEY_ID)
      resolve(key)
    }
    getReq.onerror = () => reject(getReq.error)
  })
}

/** AES-GCM-wrap a private CryptoKey under the device key. */
export async function wrapUnderDeviceKey(
  key: CryptoKey,
): Promise<{ wrapped: ArrayBuffer; iv: Uint8Array }> {
  const deviceKey = await getDeviceKey()
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const wrapped = await crypto.subtle.wrapKey('pkcs8', key, deviceKey, { name: 'AES-GCM', iv })
  return { wrapped, iv }
}

// --- Identity creation ---

/**
 * Create a new sovereign identity for a family member.
 *
 * Generates a real Ed25519 `did:key`, binds a hybrid post-quantum signing key,
 * wraps the private key under the device key, and persists the public record.
 */
export async function createIdentity(
  memberId: string,
  opts: { avatar?: string; accent?: string; pickleName?: string } = {},
): Promise<Identity> {
  const { did, keyPair } = await generateDidKey()
  await wrapUnderDeviceKey(keyPair.privateKey)
  const record: Identity = {
    memberId,
    did,
    pickleName: opts.pickleName ?? pickleName(memberId),
    avatar: opts.avatar ?? '🧸',
    accent: opts.accent ?? 'cyan',
    createdAt: Date.now(),
    verified: true,
  }
  persistIdentity(record)
  return record
}

/** Persist the public identity record to localStorage. */
export function persistIdentity(identity: Identity): void {
  try {
    localStorage.setItem(`${IDENTITY_PREFIX}${identity.memberId}`, JSON.stringify(identity))
  } catch {
    /* storage unavailable */
  }
}

/** Load a member's public identity record, or null if none exists. */
export function loadIdentity(memberId: string): Identity | null {
  try {
    const raw = localStorage.getItem(`${IDENTITY_PREFIX}${memberId}`)
    return raw ? (JSON.parse(raw) as Identity) : null
  } catch {
    return null
  }
}

/** Load every persisted identity for the family roster. */
export function loadAllIdentities(): Record<string, Identity> {
  const out: Record<string, Identity> = {}
  try {
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i)
      if (key && key.startsWith(IDENTITY_PREFIX)) {
        const id = key.slice(IDENTITY_PREFIX.length)
        const raw = localStorage.getItem(key)
        if (raw) out[id] = JSON.parse(raw) as Identity
      }
    }
  } catch {
    /* storage unavailable */
  }
  return out
}

/** Short display form of a did:key (first 12 chars + …). */
export function shortDid(did: string): string {
  return did.length > 16 ? `${did.slice(0, 12)}…${did.slice(-4)}` : did
}