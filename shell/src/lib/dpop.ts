// DPoP (Demonstrated Proof of Possession) — RFC 9449
// Client-side proof generation for OAuth 2.1 sender-constrained tokens.

export function base64urlEncode(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function computeJwkThumbprint(jwk: JsonWebKey): Promise<string> {
  const canonical = JSON.stringify({
    crv: jwk.crv,
    kty: jwk.kty,
    x: jwk.x,
  });
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonical));
  return base64urlEncode(digest);
}

export async function generateDPoPProof(
  method: string,
  url: string,
  accessToken: string,
  privateKey: CryptoKey,
  publicKeyJwk: JsonWebKey,
  nonce?: string,
): Promise<string> {
  const jkt = await computeJwkThumbprint(publicKeyJwk);
  const now = Math.floor(Date.now() / 1000);
  const jti = crypto.randomUUID();

  const header = {
    typ: 'dpop+jwt',
    alg: 'EdDSA',
    jwk: publicKeyJwk,
  };

  const payload: Record<string, unknown> = {
    jti,
    htm: method.toUpperCase(),
    htu: url.split('?')[0],
    iat: now,
    ath: await hashAccessToken(accessToken),
  };

  if (nonce) payload.nonce = nonce;

  const encodedHeader = base64urlEncode(new TextEncoder().encode(JSON.stringify(header)));
  const encodedPayload = base64urlEncode(new TextEncoder().encode(JSON.stringify(payload)));

  const signatureInput = `${encodedHeader}.${encodedPayload}`;
  const signature = await crypto.subtle.sign('Ed25519', privateKey, new TextEncoder().encode(signatureInput));
  const encodedSignature = base64urlEncode(signature);

  return `${signatureInput}.${encodedSignature}`;
}

async function hashAccessToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
  return base64urlEncode(digest);
}

export async function getOrCreateDPoPKeypair(): Promise<{ privateKey: CryptoKey; publicKeyJwk: JsonWebKey }> {
  const stored = localStorage.getItem('p31-dpop-keypair');
  if (stored) {
    try {
      const jwk = JSON.parse(stored) as JsonWebKey;
      const privateKey = await crypto.subtle.importKey(
        'jwk',
        jwk,
        { name: 'Ed25519', namedCurve: 'Ed25519' },
        true,
        ['sign'],
      );
      return { privateKey, publicKeyJwk: jwk };
    } catch {
      // fall through to generate new
    }
  }

  const keypair = await crypto.subtle.generateKey(
    { name: 'Ed25519', namedCurve: 'Ed25519' },
    true,
    ['sign', 'verify'],
  );

  const publicKeyJwk = await crypto.subtle.exportKey('jwk', keypair.publicKey) as JsonWebKey;
  const privateKeyJwk = await crypto.subtle.exportKey('jwk', keypair.privateKey) as JsonWebKey;

  localStorage.setItem('p31-dpop-keypair', JSON.stringify(privateKeyJwk));

  return { privateKey: keypair.privateKey, publicKeyJwk };
}
