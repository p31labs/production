import { signWithDid, getEd25519PubKeyB64, verifyWithDid } from './identity';

const PASSKEY_URL = 'https://p31ca.org/api/hardware';

export interface PairChallenge {
  challenge: string;
  code: number;
  expires: number;
}

export interface PairResult {
  ok: boolean;
  did?: string;
  deviceId?: string;
}

export interface TelemetryData {
  did: string;
  deviceId: string;
  spoons?: number;
  battery?: number;
  temperature?: number;
  uptime?: number;
  timestamp: number;
}

export async function requestPairChallenge(): Promise<PairChallenge | null> {
  try {
    const res = await fetch(`${PASSKEY_URL}/challenge`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({}),
    });
    if (!res.ok) return null;
    return (await res.json()) as PairChallenge;
  } catch {
    return null;
  }
}

export async function confirmPair(did: string, challenge: string, code: number, publicKeyB64: string): Promise<PairResult | null> {
  try {
    const res = await fetch(`${PASSKEY_URL}/pair`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ did, challenge, code, ed25519_pub: publicKeyB64 }),
    });
    if (!res.ok) return null;
    return (await res.json()) as PairResult;
  } catch {
    return null;
  }
}

export async function sendTelemetry(did: string, deviceId: string): Promise<boolean> {
  try {
    const res = await fetch(`${PASSKEY_URL}/telemetry`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ did, deviceId, timestamp: Date.now() }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export type PairState = 'idle' | 'challenging' | 'pending-confirm' | 'paired' | 'error';

export class PairSession {
  state: PairState = 'idle';
  deviceId: string | null = null;
  did: string | null = null;
  challenge: string = '';
  errorMessage: string = '';

  async startPairing(): Promise<{ challenge: string; code: number; expires: number } | null> {
    this.errorMessage = '';
    this.challenge = '';
    const chal = await requestPairChallenge();
    if (!chal) {
      this.state = 'error';
      this.errorMessage = 'Could not reach Node Zero pairing service';
      return null;
    }
    this.state = 'challenging';
    this.challenge = chal.challenge;
    return chal;
  }

  async submitCode(code: number, publicKeyB64: string): Promise<boolean> {
    if (!this.did) {
      this.state = 'error';
      this.errorMessage = 'No DID set';
      return false;
    }
    this.state = 'pending-confirm';
    const result = await confirmPair(this.did, this.challenge, code, publicKeyB64);
    if (result?.ok) {
      this.state = 'paired';
      this.deviceId = result.deviceId ?? 'paired';
      return true;
    }
    this.state = 'error';
    this.errorMessage = 'Pairing failed — check the code and try again';
    return false;
  }

  async simulatePairing(): Promise<boolean> {
    const challenge = 'sim-' + crypto.randomUUID();
    this.challenge = challenge;
    this.state = 'challenging';

    const sig = await signWithDid(challenge);
    const pub = await getEd25519PubKeyB64();
    if (!sig || !pub) {
      this.state = 'error';
      this.errorMessage = 'Crypto keys not available';
      return false;
    }

    const ok = await verifyWithDid(challenge, sig, pub);
    if (!ok) {
      this.state = 'error';
      this.errorMessage = 'Challenge-response verification failed';
      return false;
    }

    this.state = 'paired';
    this.deviceId = 'sim:' + crypto.randomUUID().slice(0, 8);
    return true;
  }

  reset(): void {
    this.state = 'idle';
    this.deviceId = null;
    this.did = null;
    this.challenge = '';
    this.errorMessage = '';
  }
}

export const pairSession = new PairSession();

if (import.meta.env.MODE !== 'production' || (typeof window !== 'undefined' && (window as any).__P31_VERIFY__)) {
  (window as any).__p31_nodeZero = {
    get state() { return pairSession.state; },
    get deviceId() { return pairSession.deviceId; },
    get did() { return pairSession.did; },
    simulatePairing: () => pairSession.simulatePairing(),
  };
}
