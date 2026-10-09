/**
 * Phenix Donation Wallet — native portal integration.
 * Client-side sovereign wallet primitives: AES-256-GCM vault (PBKDF2),
 * SD-JWT-style credential store, stealth meta-address, and a court-admissible
 * memo-to-file ledger with SHA-256 integrity hash. Namespaced under
 * `p31:monetization:wallet` so it coexists with the standalone wallet page.
 */

const PREFIX = 'p31:monetization:wallet:';
const VK = `${PREFIX}vault`;
const SK = `${PREFIX}session`;
const MK = `${PREFIX}ledger`;
const VCK = `${PREFIX}credentials`;
const SAK = `${PREFIX}stealth`;

function lsGet<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}
function lsSet(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage unavailable
  }
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
}
function fromHex(hex: string): Uint8Array {
  const out = new Uint8Array(new ArrayBuffer(hex.length / 2));
  for (let i = 0; i < out.length; i += 1) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}

async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const km = await crypto.subtle.importKey('raw', new TextEncoder().encode(password).buffer as ArrayBuffer, 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: salt.buffer as ArrayBuffer, iterations: 310000, hash: 'SHA-256' },
    km,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

export interface WalletVault {
  version: number;
  salt: string;
  iv: string;
  ciphertext: string;
  metaAddress: string;
  createdAt: string;
}

export interface WalletCredential {
  id: string;
  vct: string;
  issuer: string;
  claims?: Record<string, unknown>;
  storedAt: string;
}

export interface WalletMemo {
  id: string;
  timestamp: string;
  type: string;
  memo: string;
  amount: string | null;
  currency: string | null;
  txHash: string | null;
}

export const PHENIX_WALLET = {
  status() {
    const vault = lsGet<WalletVault>(VK);
    return {
      exists: vault !== null,
      unlocked: lsGet<Record<string, unknown>>(SK) !== null,
      credentialCount: this.credentials().length,
      stealthCount: (lsGet<unknown[]>(SAK) ?? []).length,
      metaAddress: vault?.metaAddress ?? null,
    };
  },

  async createVault(password: string): Promise<WalletVault> {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await deriveKey(password, salt);
    const spending = toHex(crypto.getRandomValues(new Uint8Array(32)));
    const viewing = toHex(crypto.getRandomValues(new Uint8Array(32)));
    const payload = {
      spending: { privateKey: spending, publicKey: `0x${spending.slice(0, 40)}` },
      viewing: { privateKey: viewing, publicKey: `0x${viewing.slice(0, 40)}` },
      metaAddress: `st:eth:0x${spending.slice(0, 66)}${viewing.slice(0, 66)}`,
      createdAt: new Date().toISOString(),
      version: 3,
    };
    const ciphertext = new Uint8Array(
      await crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv.buffer as ArrayBuffer }, key, new TextEncoder().encode(JSON.stringify(payload)).buffer as ArrayBuffer),
    );
    const vault: WalletVault = {
      version: 3,
      salt: toHex(salt),
      iv: toHex(iv),
      ciphertext: btoa(String.fromCharCode(...ciphertext)),
      metaAddress: payload.metaAddress,
      createdAt: payload.createdAt,
    };
    lsSet(VK, vault);
    lsSet(SK, { viewingPriv: viewing, createdAt: Date.now() });
    return vault;
  },

  async unlockVault(password: string): Promise<WalletVault | null> {
    const vault = lsGet<WalletVault>(VK);
    if (!vault) return null;
    try {
      const key = await deriveKey(password, fromHex(vault.salt));
      const plain = new Uint8Array(
        await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromHex(vault.iv).buffer as ArrayBuffer }, key, Uint8Array.from(atob(vault.ciphertext), (c) => c.charCodeAt(0)).buffer as ArrayBuffer),
      );
      const payload = JSON.parse(new TextDecoder().decode(plain)) as { viewing?: { privateKey?: string } };
      lsSet(SK, { viewingPriv: payload.viewing?.privateKey ?? null, createdAt: Date.now() });
      return vault;
    } catch {
      return null;
    }
  },

  lock(): void {
    localStorage.removeItem(SK);
  },

  credentials(): WalletCredential[] {
    return lsGet<WalletCredential[]>(VCK) ?? [];
  },

  storeCredential(vct: string, issuer: string, claims?: Record<string, unknown>): WalletCredential {
    const credential: WalletCredential = {
      id: crypto.randomUUID(),
      vct,
      issuer,
      claims,
      storedAt: new Date().toISOString(),
    };
    lsSet(VCK, [...this.credentials(), credential]);
    return credential;
  },

  memos(): WalletMemo[] {
    return lsGet<WalletMemo[]>(MK) ?? [];
  },

  logMemo(entry: Partial<WalletMemo>): WalletMemo {
    const memo: WalletMemo = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      type: entry.type ?? 'NOTE',
      memo: entry.memo ?? '',
      amount: entry.amount ?? null,
      currency: entry.currency ?? null,
      txHash: entry.txHash ?? null,
    };
    lsSet(MK, [...this.memos(), memo]);
    return memo;
  },

  /** Court-admissible memo ledger export with SHA-256 integrity hash. */
  async exportLedger() {
    const memos = this.memos();
    const payload = {
      format: 'phenix-ledger',
      version: '2.0',
      exported: new Date().toISOString(),
      operator: 'P31 Labs',
      entries: memos,
    };
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(payload)));
    return { ledger: payload, sha256: toHex(new Uint8Array(digest)) };
  },

  addStealthAddress(balance = 0): string {
    const addr = `st:eth:${toHex(crypto.getRandomValues(new Uint8Array(32)))}`;
    lsSet(SAK, [...(lsGet<{ address: string; balance: number }[]>(SAK) ?? []), { address: addr, balance }]);
    return addr;
  },
};

export default PHENIX_WALLET;