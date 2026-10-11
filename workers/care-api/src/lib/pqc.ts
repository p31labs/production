export async function hybridKeygen(): Promise<{
  mlkemPublicKey: Uint8Array;
  mlkemSecretKey: Uint8Array;
  eccPublicKeyRaw: Uint8Array;
  eccPrivateKeyPkcs8: Uint8Array;
}> {
  const ecc = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
  const eccPub = new Uint8Array(await crypto.subtle.exportKey('raw', ecc.publicKey));
  const eccPriv = new Uint8Array(await crypto.subtle.exportKey('pkcs8', ecc.privateKey));

  // ML-KEM stub — returns random 32-byte placeholder
  const mlkemPub = crypto.getRandomValues(new Uint8Array(32));
  const mlkemSec = crypto.getRandomValues(new Uint8Array(32));

  return { mlkemPublicKey: mlkemPub, mlkemSecretKey: mlkemSec, eccPublicKeyRaw: eccPub, eccPrivateKeyPkcs8: eccPriv };
}

export async function hybridDecapsulate(
  _encapsulated: string,
  _serverPrivate: string,
  _serverPublic: string,
): Promise<Uint8Array> {
  return crypto.getRandomValues(new Uint8Array(32));
}

export function verifyHybridSignature(
  _publicKey: string,
  _message: string,
  _signature: string,
): boolean {
  // SECURITY: this previously `return true` unconditionally — a fail-open
  // authentication bypass (see docs/fix-plans/care-api-pqc-fail-open.md).
  // Real ML-DSA-65 verification is not yet wired into care-api, so we must
  // fail CLOSED. The caller (index.ts:97) catches and returns 401.
  throw new Error(
    'care-api: ML-DSA-65 verification not implemented — failing closed. See docs/fix-plans/care-api-pqc-fail-open.md',
  );
}

export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

export function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return bytes;
}
