// OAuth 2.1 client helpers for the P31 Sovereign Shell.
// Handles PKCE flow initiation, PAR (RFC 9126), callback parsing, and DPoP proof generation.

const OAUTH_RELAY = import.meta.env.VITE_OAUTH_RELAY_URL || 'https://oauth-relay-p31.trimtab-signal.workers.dev';
const SHELL_ORIGIN = window.location.origin;

function base64urlEncode(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64urlDecode(str: string): Uint8Array {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(base64.length + (4 - base64.length % 4) % 4, '=');
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export function generatePKCEVerifier(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return base64urlEncode(bytes);
}

export function generateState(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return base64urlEncode(bytes);
}

export async function computeCodeChallenge(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  return base64urlEncode(digest);
}

export function buildOAuthUrl(provider: 'google' | 'github', state: string, codeChallenge: string): string {
  const url = new URL(`${OAUTH_RELAY}/oauth/authorize`);
  url.searchParams.set('provider', provider);
  url.searchParams.set('redirect', `${SHELL_ORIGIN}/oauth-callback`);
  url.searchParams.set('state', state);
  url.searchParams.set('code_challenge', codeChallenge);
  url.searchParams.set('code_challenge_method', 'S256');
  return url.toString();
}

/**
 * Start OAuth flow using PAR (Pushed Authorization Requests) — RFC 9126.
 *
 * 1. Generate PKCE verifier + code challenge
 * 2. POST to /oauth/par with client credentials
 * 3. Receive request_uri
 * 4. Redirect to /oauth/authorize?request_uri=...
 *
 * PAR removes sensitive parameters from the front-channel URL,
 * reducing attack surface compared to direct redirects.
 */
export async function startOAuthFlowPAR(provider: 'google' | 'github'): Promise<void> {
  const verifier = generatePKCEVerifier();
  const state = generateState();
  const codeChallenge = await computeCodeChallenge(verifier);

  sessionStorage.setItem('p31-oauth-verifier', verifier);
  sessionStorage.setItem('p31-oauth-state', state);

  const credentials = btoa('shell:shell');
  const parResponse = await fetch(`${OAUTH_RELAY}/oauth/par`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${credentials}`,
    },
    body: JSON.stringify({
      client_id: 'shell',
      redirect_uri: `${SHELL_ORIGIN}/oauth-callback`,
      provider,
      state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    }),
  });

  if (!parResponse.ok) {
    const error = await parResponse.json() as { error?: string };
    throw new Error(`PAR failed: ${error.error ?? parResponse.status}`);
  }

  const { request_uri } = await parResponse.json() as { request_uri: string; expires_in: number };
  window.location.href = `${OAUTH_RELAY}/oauth/authorize?request_uri=${encodeURIComponent(request_uri)}`;
}

export function parseCallbackUrl(url: string): { did?: string; provider?: string; userId?: string; tokenId?: string; error?: string } {
  try {
    const u = new URL(url);
    const error = u.searchParams.get('error');
    if (error) return { error };

    return {
      did: u.searchParams.get('did') || undefined,
      provider: u.searchParams.get('provider') || undefined,
      userId: u.searchParams.get('user_id') || undefined,
      tokenId: u.searchParams.get('token_id') || undefined,
    };
  } catch {
    return { error: 'Invalid callback URL' };
  }
}

export async function pollForToken(tokenId: string, retries = 10, delay = 500): Promise<{ access_token: string; did_key: string; provider: string } | null> {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(`${OAUTH_RELAY}/oauth/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token_id: tokenId }),
      });

      if (res.ok) {
        const data = await res.json();
        return {
          access_token: data.access_token,
          did_key: data.did_key,
          provider: data.provider,
        };
      }

      if (res.status === 404 || res.status === 410) {
        return null;
      }
    } catch {
      // transient network error — retry
    }
    await new Promise(r => setTimeout(r, delay));
  }
  return null;
}

export function storeOAuthSession(provider: string, didKey: string, tokenId: string): void {
  const session = {
    provider,
    did_key: didKey,
    token_id: tokenId,
    created_at: Date.now(),
  };
  localStorage.setItem('p31-oauth-session', JSON.stringify(session));
}

export function getOAuthSession(): { provider: string; did_key: string; token_id: string } | null {
  try {
    const raw = localStorage.getItem('p31-oauth-session');
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function clearOAuthSession(): void {
  localStorage.removeItem('p31-oauth-session');
}
