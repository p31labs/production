/**
 * Base64url codec (RFC 4648 §5) — dependency-free and workerd-safe.
 *
 * Avoids `btoa`/`atob` so the same code paths run identically in the worker,
 * in vitest (Node), and in the browser bundle. Padding is never emitted.
 */

const B64URL = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

const LOOKUP: Record<string, number> = {};
for (let i = 0; i < B64URL.length; i += 1) LOOKUP[B64URL[i]] = i;

/** Encode bytes as unpadded base64url. */
export function bytesToB64url(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i];
    const b = i + 1 < bytes.length ? bytes[i + 1] : 0;
    const c = i + 2 < bytes.length ? bytes[i + 2] : 0;
    out += B64URL[a >> 2];
    out += B64URL[((a & 3) << 4) | (b >> 4)];
    if (i + 1 < bytes.length) out += B64URL[((b & 15) << 2) | (c >> 6)];
    if (i + 2 < bytes.length) out += B64URL[c & 63];
  }
  return out;
}

/** Decode unpadded (or padded) base64url to bytes. Ignores non-alphabet characters. */
export function b64urlToBytes(s: string): Uint8Array<ArrayBuffer> {
  const clean = s.replace(/[^A-Za-z0-9\-_]/g, '');
  const out = new Uint8Array(Math.floor((clean.length * 3) / 4));
  let j = 0;
  for (let i = 0; i < clean.length; i += 4) {
    const n =
      ((LOOKUP[clean[i]] ?? 0) << 18) |
      ((LOOKUP[clean[i + 1]] ?? 0) << 12) |
      ((LOOKUP[clean[i + 2]] ?? 0) << 6) |
      (LOOKUP[clean[i + 3]] ?? 0);
    out[j++] = (n >> 16) & 255;
    if (i + 2 < clean.length && clean[i + 2] !== undefined) out[j++] = (n >> 8) & 255;
    if (i + 3 < clean.length && clean[i + 3] !== undefined) out[j++] = n & 255;
  }
  return out.subarray(0, j);
}

/** Decode base64url bytes to a UTF-8 string. */
export function b64urlToString(s: string): string {
  return new TextDecoder().decode(b64urlToBytes(s));
}

/** Encode a UTF-8 string as unpadded base64url. */
export function stringToB64url(s: string): string {
  return bytesToB64url(new TextEncoder().encode(s));
}