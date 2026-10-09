/**
 * @p31ca/design-core — shell/loadRemote.ts
 *
 * The T1 loader runtime: loads a remote cartridge's entryPoint as an ESM
 * module with SRI integrity verification and ownership validation — the
 * contract declared by CartridgeManifest (entryPoint/integrity/capabilities).
 *
 * Trust model (honest): a T1 remote IS code — module federation loads an
 * untrusted module into the host. The integrity hash is the gate: the source
 * is fetched, hashed, and compared to the manifest's SRI BEFORE import. The
 * capabilities field is the declared host-function surface the module may
 * touch (the runtime for T3/WASM gating; here it is carried + validated, the
 * host's enforcement is portal-side).
 *
 * Dependency-injected so the loader is pure + testable in Node (dynamic
 * `import()` of http URLs is browser-only). The default importFn is the real
 * dynamic import; tests inject a fake.
 *
 * Failure is a discriminated union result — the shell renders the reason,
 * never throws (the broken-cartridge invariant holds at the loader too).
 */

import { validateCartridgeOwnership, type CartridgeManifest } from './cartridge';

export interface LoadRemoteOptions {
  /** ESM import — default is the real dynamic import (browser). */
  importFn?: (url: string) => Promise<unknown>;
  /** Fetch the source for SRI verification (default: global fetch). */
  fetchFn?: typeof fetch;
  /** Verify integrity against the fetched source before import. Default true
   *  when the manifest declares an integrity hash. */
  verifyIntegrity?: boolean;
}

export type RemoteCartridgeResult =
  | { ok: true; module: unknown }
  | { ok: false; reason: 'ownership' | 'integrity' | 'load'; message: string };

/** Verify an SRI hash (`sha256-<b64>` / `sha384-<b64>` / `sha512-<b64>`)
 *  against source content. WebCrypto-only (canon's sha256Hex pattern). */
export async function verifySRI(source: string, integrity: string): Promise<boolean> {
  const parts = integrity.trim().split(' ');
  // any of the space-separated hashes passing is acceptable (SRI semantics)
  for (const part of parts) {
    const m = /^(sha(?:256|384|512))-(.+)$/.exec(part.trim());
    if (!m) continue;
    const algo = m[1] as string;
    const b64 = m[2] as string;
    const webcryptoName: Record<string, string> = { sha256: 'SHA-256', sha384: 'SHA-384', sha512: 'SHA-512' };
    const name = webcryptoName[algo];
    if (!name) continue;
    const digest = new Uint8Array(await crypto.subtle.digest(name, new TextEncoder().encode(source)));
    const computed = Buffer.from(digest).toString('base64');
    if (computed === b64) return true;
  }
  return false;
}

/** Load a remote cartridge module. Never throws — returns the failure reason
 *  so the shell can render it inside #main (frame intact). */
export async function loadRemoteCartridge(
  manifest: CartridgeManifest,
  opts: LoadRemoteOptions = {},
): Promise<RemoteCartridgeResult> {
  const violations = validateCartridgeOwnership(manifest);
  if (violations.length > 0) {
    return { ok: false, reason: 'ownership', message: violations.join('; ') };
  }
  if (!manifest.entryPoint) {
    return { ok: false, reason: 'load', message: `T${manifest.tier} cartridge requires entryPoint` };
  }

  const importFn = opts.importFn ?? ((url: string) => import(url));
  const fetchFn = opts.fetchFn ?? globalThis.fetch;

  // SRI gate: verify the source BEFORE import (the module is untrusted).
  if (manifest.integrity && (opts.verifyIntegrity ?? true)) {
    try {
      const res = await fetchFn(manifest.entryPoint);
      if (!res.ok) {
        return { ok: false, reason: 'integrity', message: `fetch failed: ${res.status}` };
      }
      const source = await res.text();
      const valid = await verifySRI(source, manifest.integrity);
      if (!valid) {
        return { ok: false, reason: 'integrity', message: 'SRI mismatch — refusing to import untrusted module' };
      }
    } catch (e) {
      return { ok: false, reason: 'integrity', message: (e as Error).message };
    }
  }

  try {
    const module = await importFn(manifest.entryPoint);
    return { ok: true, module };
  } catch (e) {
    return { ok: false, reason: 'load', message: (e as Error).message };
  }
}