import { storeRecord, loadRecord } from './memory';
import { getOrCreateDidKey, signWithDid, getEd25519PubKeyB64, verifyWithDid } from './identity';
import { getOrCreatePqcKey } from './pqc';

const KEY_STORE = 'identity-keys';
const KEL_ID = 'kel';

export interface KelEvent {
  seq: number;
  type: 'inception' | 'rotation' | 'delegation';
  prevEventHash: string;
  pubKeyB64: string;
  nextPubKeyB64: string;
  sigB64: string;
  ts: number;
  said?: string;
}

interface KelRecord {
  id: string;
  prefix: string;
  events: KelEvent[];
}

async function sha256(message: string): Promise<string> {
  const encoder = new TextEncoder();
  const hash = await crypto.subtle.digest('SHA-256', encoder.encode(message));
  const bytes = Array.from(new Uint8Array(hash));
  return bytes.map((b) => b.toString(16).padStart(2, '0')).join('');
}

function eventHash(e: Omit<KelEvent, 'sigB64'>): Promise<string> {
  return sha256(`${e.seq}:${e.type}:${e.prevEventHash}:${e.pubKeyB64}:${e.nextPubKeyB64}:${e.ts}`);
}

async function sha256Bytes(message: string): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  return crypto.subtle.digest('SHA-256', encoder.encode(message));
}

function bytesToBase64url(bytes: ArrayBuffer): string {
  let binary = '';
  const arr = new Uint8Array(bytes);
  for (let i = 0; i < arr.length; i++) {
    binary += String.fromCharCode(arr[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function encodeCESR(event: KelEvent): string {
  return `${event.seq}:${event.type}:${event.prevEventHash}:${event.pubKeyB64}:${event.nextPubKeyB64}:${event.sigB64}:${event.ts}`;
}

export function decodeCESR(encoded: string): KelEvent {
  const [seq, type, prevEventHash, pubKeyB64, nextPubKeyB64, sigB64, ts] = encoded.split(':');
  return {
    seq: parseInt(seq, 10),
    type: type as KelEvent['type'],
    prevEventHash,
    pubKeyB64,
    nextPubKeyB64,
    sigB64,
    ts: parseInt(ts, 10),
  };
}

export async function said(event: KelEvent): Promise<string> {
  const encoded = encodeCESR(event);
  const bytes = await sha256Bytes(encoded);
  return bytesToBase64url(bytes).slice(0, 44);
}

export async function verifySAID(event: KelEvent, expectedSaid: string): Promise<boolean> {
  const computed = await said(event);
  return computed === expectedSaid;
}

export async function initializeKEL(): Promise<string | null> {
  try {
    const pub = await getEd25519PubKeyB64();
    const pqc = await getOrCreatePqcKey();
    if (!pub) return null;

    const did = await getOrCreateDidKey();
    const prefix = `B${(await sha256(pub)).slice(0, 44)}`;

    const inception: Omit<KelEvent, 'sigB64'> = {
      seq: 0,
      type: 'inception',
      prevEventHash: '',
      pubKeyB64: pub,
      nextPubKeyB64: pqc.pubB64,
      ts: Date.now(),
    };

    const hash = await eventHash(inception);
    const sig = await signWithDid(`${inception.type}|${hash}|${pub}`);
    if (!sig) return null;

    const event: KelEvent = { ...inception, sigB64: sig };
    event.said = await said(event);
    const record: KelRecord = { id: KEL_ID, prefix, events: [event] };

    await storeRecord<KelRecord>(KEY_STORE, record);
    if (onKelRotated) onKelRotated([event]);
    return prefix;
  } catch {
    return null;
  }
}

export async function getKEL(): Promise<KelRecord | null> {
  try {
    let kel = await loadRecord<KelRecord>(KEY_STORE, KEL_ID);
    if (!kel) {
      const prefix = await initializeKEL();
      if (prefix) kel = await loadRecord<KelRecord>(KEY_STORE, KEL_ID);
      if (!kel) return null;
    }
    return kel;
  } catch {
    return null;
  }
}

export async function rotateKEL(): Promise<KelEvent | null> {
  try {
    const kel = await getKEL();
    if (!kel) return null;

    const did = await getOrCreateDidKey();
    const pub = await getEd25519PubKeyB64();
    const pqc = await getOrCreatePqcKey();
    if (!pub) return null;

    const prevEvent = kel.events[kel.events.length - 1];
    const prevHash = await eventHash(prevEvent);

    const rotation: Omit<KelEvent, 'sigB64'> = {
      seq: prevEvent.seq + 1,
      type: 'rotation',
      prevEventHash: prevHash,
      pubKeyB64: pub,
      nextPubKeyB64: pqc.pubB64,
      ts: Date.now(),
    };

    const hash = await eventHash(rotation);
    const sig = await signWithDid(`${rotation.type}|${hash}|${pub}`);
    if (!sig) return null;

    const event: KelEvent = { ...rotation, sigB64: sig };
    event.said = await said(event);
    kel.events.push(event);

    await storeRecord<KelRecord>(KEY_STORE, kel);
    if (onKelRotated) onKelRotated(kel.events);
    return event;
  } catch {
    return null;
  }
}

export async function verifyKEL(events: KelEvent[], expectedDid?: string): Promise<boolean> {
  if (!events.length) return false;
  for (let i = 0; i < events.length; i++) {
    const e = events[i];
    const hash = await eventHash(e);
    if (i > 0) {
      const prevHash = await eventHash(events[i - 1]);
      if (e.prevEventHash !== prevHash) return false;
    }
    // Verify the event signature against its public key.
    const sigMessage = `${e.type}|${hash}|${e.pubKeyB64}`;
    const sigOk = await verifyWithDid(sigMessage, e.sigB64, e.pubKeyB64);
    if (!sigOk) return false;
  }
  // DID binding: KEL prefix must match the first event's public key.
  if (expectedDid) {
    const prefix = `B${(await sha256(events[0].pubKeyB64)).slice(0, 44)}`;
    if (prefix !== expectedDid) return false;
  }
  return true;
}

export function serializeKEL(events: KelEvent[]): string {
  return JSON.stringify(events);
}

export function deserializeKEL(data: string): KelEvent[] {
  try { return JSON.parse(data) as KelEvent[]; } catch { return []; }
}

export async function broadcastKEL(): Promise<KelEvent[]> {
  const kel = await getKEL();
  return kel?.events ?? [];
}

export async function resolveDidKeri(prefix: string): Promise<{ kel: KelEvent[]; verified: boolean } | null> {
  try {
    const kel = await getKEL();
    if (!kel) return null;
    const valid = await verifyKEL(kel.events);
    return { kel: kel.events, verified: valid };
  } catch {
    return null;
  }
}

(globalThis as Record<string, unknown>).__p31_keri = { cesr: true, said: true };

let onKelRotated: ((events: KelEvent[]) => void) | null = null;
export function setKelRotatedHandler(cb: (events: KelEvent[]) => void): void {
  onKelRotated = cb;
}

export function formatKELChain(events: KelEvent[]): string {
  return events.map((e) =>
    `#${e.seq} ${e.type} · ${new Date(e.ts).toLocaleString()}\n  pub: ${e.pubKeyB64.slice(0, 32)}…\n  prev: ${e.prevEventHash.slice(0, 16) || '(genesis)'}`
  ).join('\n\n');
}

export async function importKEL(events: KelEvent[]): Promise<boolean> {
  try {
    const valid = await verifyKEL(events);
    if (!valid) return false;
    const existing = await loadRecord<KelRecord>(KEY_STORE, KEL_ID);
    if (existing) {
      const seenSeqs = new Set(existing.events.map((e) => e.seq));
      let changed = false;
      for (const e of events) {
        if (!seenSeqs.has(e.seq)) {
          existing.events.push(e);
          seenSeqs.add(e.seq);
          changed = true;
        }
      }
      if (changed) {
        existing.events.sort((a, b) => a.seq - b.seq);
        await storeRecord<KelRecord>(KEY_STORE, existing);
      }
    } else {
      await storeRecord<KelRecord>(KEY_STORE, { id: KEL_ID, prefix: '', events });
    }
    if (onKelRotated) onKelRotated(events);
    return true;
  } catch {
    return false;
  }
}
