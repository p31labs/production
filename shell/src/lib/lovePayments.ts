// lovePayments.ts — LOVE payment requests + peer send helpers.
// Local-first payment request queue (localStorage) with a shareable
// p31://receive?did=...&amount=X link for requesting LOVE from a peer.
// True peer-to-peer settlement (mesh/shadow-bridge) lands in a later
// phase; for now sends are recorded against the local performance pool.

import { getLoveEngine } from './loveEngine';

const QUEUE_KEY = 'p31-love-payment-requests';

export interface PaymentRequest {
  id: string;
  fromDid: string;
  amount: number;
  note?: string;
  createdAt: string;
  status: 'pending' | 'fulfilled';
}

export interface ReceiveLink {
  did: string;
  amount: number;
  note?: string;
}

type Listener = () => void;
const listeners = new Set<Listener>();

// Snapshot cache — getPaymentRequests() feeds useSyncExternalStore and must
// return a stable reference between mutations. Reading localStorage (or
// building a fresh array) on every call makes React loop with error #185.
let cache: PaymentRequest[] | null = null;

function load(): PaymentRequest[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    if (!raw) { cache = []; return cache; }
    const parsed = JSON.parse(raw) as PaymentRequest[];
    cache = Array.isArray(parsed) ? parsed : [];
  } catch {
    cache = [];
  }
  return cache;
}

function save(reqs: PaymentRequest[]): void {
  cache = reqs;
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(reqs));
  } catch {
    // private mode or storage full
  }
  listeners.forEach((fn) => fn());
}

export function getPaymentRequests(): PaymentRequest[] {
  if (cache === null) load();
  return cache!;
}

export function subscribePaymentRequests(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function enqueuePaymentRequest(req: Omit<PaymentRequest, 'id' | 'createdAt' | 'status'>): PaymentRequest {
  const full: PaymentRequest = {
    ...req,
    id: `pay-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    status: 'pending',
  };
  save([...load(), full]);
  return full;
}

export function fulfillPaymentRequest(id: string): void {
  save(load().map((r) => (r.id === id ? { ...r, status: 'fulfilled' } : r)));
}

export function clearPaymentRequests(): void {
  save([]);
}

// ─── Shareable receive links ────────────────────────────────────────

export function buildReceiveLink(did: string, amount: number, note?: string): string {
  const params = new URLSearchParams({ did, amount: String(amount) });
  if (note) params.set('note', note);
  return `p31://receive?${params.toString()}`;
}

export function parseReceiveLink(link: string): ReceiveLink | null {
  if (!link || !link.startsWith('p31://receive')) return null;
  try {
    const qs = link.slice('p31://receive'.length);
    const params = new URLSearchParams(qs.startsWith('?') ? qs.slice(1) : qs);
    const did = params.get('did');
    const amount = Number(params.get('amount'));
    if (!did || !Number.isFinite(amount) || amount <= 0) return null;
    return { did, amount, note: params.get('note') ?? undefined };
  } catch {
    return null;
  }
}

export function amountFromReceiveLink(link: string): number | null {
  return parseReceiveLink(link)?.amount ?? null;
}

// ─── Local spend ────────────────────────────────────────────────────

export interface SendLoveResult {
  ok: boolean;
  spendId?: number;
  error?: string;
}

/**
 * Send LOVE from the local performance pool. Uses the FOUNDING_GIFT spend
 * type (peer-gift semantics) with an arbitrary amount. Records the recipient
 * DID in the spend meta. True peer settlement (credit on the counterparty's
 * ledger) is deferred to the mesh/shadow-bridge phase.
 */
export function sendLove(recipient: string, amount: number, note?: string): SendLoveResult {
  if (!recipient || !recipient.startsWith('did:')) {
    return { ok: false, error: 'Recipient must be a did: DID' };
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false, error: 'Amount must be a positive number' };
  }
  const spend = getLoveEngine().spend('FOUNDING_GIFT', amount, { recipient, note });
  if (!spend) {
    return { ok: false, error: 'Insufficient available balance' };
  }
  return { ok: true, spendId: spend.id };
}
