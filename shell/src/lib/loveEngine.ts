import { LedgerEngine, type LoveTransaction, type LoveWallet, type LedgerSnapshot } from '@p31ca/love-ledger';

let engine: LedgerEngine | null = null;

const STORAGE_KEY = 'p31-shell-love-ledger';

// ─── Revenue-ledger config (browser-side, read from Vite env or localStorage) ───

function getRevenueLedgerUrl(): string | undefined {
  if (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_REVENUE_LEDGER_URL) {
    return (import.meta as any).env.VITE_REVENUE_LEDGER_URL;
  }
  if (typeof localStorage !== 'undefined') {
    return localStorage.getItem('p31-shell-revenue-ledger-url') || undefined;
  }
  return undefined;
}

function getMerchantDid(): string {
  if (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_MERCHANT_DID) {
    return (import.meta as any).env.VITE_MERCHANT_DID;
  }
  if (typeof localStorage !== 'undefined') {
    return localStorage.getItem('p31-shell-merchant-did') || 'did:web:p31ca.org';
  }
  return 'did:web:p31ca.org';
}

// production/shell → revenue-ledger (fire-and-forget, non-blocking).
async function recordLoveRevenue(tx: any, operation: 'earn' | 'spend', reason: string): Promise<void> {
  const url = getRevenueLedgerUrl();
  if (!url) return;
  const did = typeof localStorage !== 'undefined' ? localStorage.getItem('p31-shell-did') || 'shell' : 'shell';
  try {
    await fetch(`${url}/revenue/record`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source: 'love',
        payer_did: did,
        merchant_did: getMerchantDid(),
        amount_usdc: String(tx.amount || 0),
        asset: 'LOVE',
        metadata: { operation, reason },
      }),
    });
  } catch {
    // non-blocking: never break the primary LOVE flow
  }
}

export function getLoveEngine(): LedgerEngine {
  if (!engine) {
    const did = typeof localStorage !== 'undefined' ? localStorage.getItem('p31-shell-did') || 'shell' : 'shell';
    engine = new LedgerEngine(did);

    if (typeof localStorage !== 'undefined') {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const snapshot = JSON.parse(raw) as LedgerSnapshot;
          engine.import(snapshot);
        }
      } catch {
        // first run or corrupt state — start fresh
      }
    }
  }
  return engine;
}

// Snapshots are cached and rebuilt only after a ledger event so that
// getSnapshot() (used by useSyncExternalStore) returns a stable reference
// between events. Returning a fresh object/array on every call makes React
// detect an endless "store change" → "Maximum update depth exceeded" (#185).
let snapshotInvalid = true;
let walletCache: LoveWallet | null = null;
let txCache: LoveTransaction[] = [];

function rebuildSnapshots(): void {
  if (!snapshotInvalid) return;
  const engine = getLoveEngine();
  walletCache = engine.wallet;
  txCache = [...engine.transactions];
  snapshotInvalid = false;
}

export function getLoveWallet(): LoveWallet {
  rebuildSnapshots();
  return walletCache!;
}

export function getLoveTransactions(): LoveTransaction[] {
  rebuildSnapshots();
  return txCache;
}

export function persistLoveEngine(): void {
  try {
    const snapshot = getLoveEngine().export();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    // private mode or storage full
  }
}

export function subscribeLoveEngine(cb: () => void): () => void {
  const engine = getLoveEngine();
  const handler = (tx: any, operation: 'earn' | 'spend', reason: string) => {
    snapshotInvalid = true;
    persistLoveEngine();
    recordLoveRevenue(tx, operation, reason);
    cb();
  };
  engine.on('LOVE_EARNED', (tx) => handler(tx, 'earn', tx.type));
  engine.on('LOVE_SPENT', (spend) => handler(spend, 'spend', spend.type));
  engine.on('POOL_REBALANCED', () => {
    snapshotInvalid = true;
    persistLoveEngine();
    cb();
  });
  engine.on('LEDGER_RESTORED', () => {
    snapshotInvalid = true;
    persistLoveEngine();
    cb();
  });
  return () => {
    engine.off('LOVE_EARNED', (tx) => handler(tx, 'earn', tx.type));
    engine.off('LOVE_SPENT', (spend) => handler(spend, 'spend', spend.type));
    engine.off('POOL_REBALANCED', () => {});
    engine.off('LEDGER_RESTORED', () => {});
  };
}
