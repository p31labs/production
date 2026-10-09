import { describe, it, expect, vi } from 'vitest';
import { verifySRI, loadRemoteCartridge, type RemoteCartridgeResult } from '../src/shell/loadRemote';
import type { CartridgeManifest } from '../src/shell/cartridge';

const remote: CartridgeManifest = {
  id: 'remote-app', name: 'remote-app', version: '1.0.0', tier: 'T1',
  wordmark: 'Remote App', search: 'Search…', action: '', actionKind: 'none',
  nav: [{ path: '/', label: 'Home' }],
  routes: {},
  entryPoint: 'https://example.invalid/remote.js',
};

async function sha256B64(text: string): Promise<string> {
  const d = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)));
  return Buffer.from(d).toString('base64');
}

describe('verifySRI — the integrity gate', () => {
  it('accepts a matching sha256 hash', async () => {
    const src = 'export const x = 1;';
    const integrity = `sha256-${await sha256B64(src)}`;
    expect(await verifySRI(src, integrity)).toBe(true);
  });
  it('rejects a mismatched hash (negative control — the gate can fail)', async () => {
    const integrity = `sha256-${await sha256B64('different source')}`;
    expect(await verifySRI('the real source', integrity)).toBe(false);
  });
  it('accepts when any of several space-separated hashes match (SRI semantics)', async () => {
    const src = 'hello';
    const integrity = `sha384-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA sha256-${await sha256B64(src)}`;
    expect(await verifySRI(src, integrity)).toBe(true);
  });
  it('rejects malformed integrity', async () => {
    expect(await verifySRI('x', 'not-a-hash')).toBe(false);
  });
});

describe('loadRemoteCartridge — the T1 loader', () => {
  it('loads a compliant remote through the injected importFn', async () => {
    const importFn = vi.fn().mockResolvedValue({ default: () => 'remote' });
    const res = await loadRemoteCartridge({ ...remote, integrity: undefined }, { importFn });
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.module).toMatchObject({ default: expect.any(Function) });
  });
  it('rejects an ownership-violating manifest before any network', async () => {
    const bad = { ...remote, topbarHeight: 80 } as unknown as CartridgeManifest;
    const importFn = vi.fn();
    const res = await loadRemoteCartridge(bad, { importFn });
    expect(res).toMatchObject({ ok: false, reason: 'ownership' });
    expect(importFn).not.toHaveBeenCalled();
  });
  it('requires entryPoint for T1', async () => {
    const noEp = { ...remote, entryPoint: undefined } as unknown as CartridgeManifest;
    const res = await loadRemoteCartridge(noEp, { importFn: vi.fn() });
    expect(res).toMatchObject({ ok: false, reason: 'load' });
  });
  it('verifies SRI against the fetched source before import', async () => {
    const source = 'export default () => "remote";';
    const integrity = `sha256-${await sha256B64(source)}`;
    const importFn = vi.fn().mockResolvedValue({ default: () => 'remote' });
    const fetchFn = vi.fn().mockResolvedValue({ ok: true, status: 200, text: async () => source });
    const res = await loadRemoteCartridge({ ...remote, integrity }, { importFn, fetchFn });
    expect(res.ok).toBe(true);
    expect(fetchFn).toHaveBeenCalledWith(remote.entryPoint);
    expect(importFn).toHaveBeenCalledTimes(1);
  });
  it('refuses to import when SRI mismatches (negative control)', async () => {
    const source = 'export default () => "remote";';
    const integrity = `sha256-${await sha256B64('something else entirely')}`;
    const importFn = vi.fn();
    const fetchFn = vi.fn().mockResolvedValue({ ok: true, status: 200, text: async () => source });
    const res = await loadRemoteCartridge({ ...remote, integrity }, { importFn, fetchFn });
    expect(res.ok).toBe(false);
    expect((res as Extract<RemoteCartridgeResult, { ok: false }>).reason).toBe('integrity');
    expect(importFn).not.toHaveBeenCalled();
  });
  it('returns a load failure without throwing (broken-cartridge invariant)', async () => {
    const importFn = vi.fn().mockRejectedValue(new Error('boom'));
    const res = await loadRemoteCartridge({ ...remote, integrity: undefined }, { importFn });
    expect(res.ok).toBe(false);
    expect((res as Extract<RemoteCartridgeResult, { ok: false }>).reason).toBe('load');
  });
});