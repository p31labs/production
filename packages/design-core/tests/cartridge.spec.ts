import { describe, it, expect } from 'vitest';
import { resolveShellTheme, validateCartridgeOwnership, type CartridgeManifest } from '../src/shell/cartridge';

const good: CartridgeManifest = {
  id: 'design', name: 'design', version: '1.0.0', tier: 'T4',
  themeDefault: 'ocean', wordmark: 'P31 Design System', search: 'Search…',
  action: 'End session', actionKind: 'ghost',
  identity: { kind: 'sign-in', to: '#identity' },
  nav: [{ path: '/', label: 'Home', emoji: '🏠' }],
  routes: { '/': [{ t: 'hero', title: 'P31' }] },
};

describe('resolveShellTheme (theme-travel rule)', () => {
  it('user-picked theme travels across cartridges', () => {
    expect(resolveShellTheme({ userTheme: 'volt', userPicked: true, cartridgeThemeDefault: 'ocean' })).toBe('volt');
  });
  it('cartridge default applies only when user never picked', () => {
    expect(resolveShellTheme({ userTheme: null, userPicked: false, cartridgeThemeDefault: 'garden' })).toBe('garden');
  });
  it('defaults to ocean when nothing is supplied', () => {
    expect(resolveShellTheme({ userTheme: null, userPicked: false })).toBe('ocean');
  });
});

describe('validateCartridgeOwnership (ownership line)', () => {
  it('accepts a compliant manifest', () => {
    expect(validateCartridgeOwnership(good)).toEqual([]);
  });
  it('rejects a layout override (geometry is shell-owned)', () => {
    const bad = { ...good, topbarHeight: 80 } as unknown as CartridgeManifest;
    const v = validateCartridgeOwnership(bad);
    expect(v.some((x) => x.includes('geometry is shell-owned'))).toBe(true);
  });
  it('rejects an unknown field (additive-only)', () => {
    const bad = { ...good, mystery: true } as unknown as CartridgeManifest;
    const v = validateCartridgeOwnership(bad);
    expect(v.some((x) => x.includes('unknown field'))).toBe(true);
  });
  it('rejects a T2 cartridge without an entry point', () => {
    const bad = { ...good, tier: 'T2' as const };
    const v = validateCartridgeOwnership(bad);
    expect(v.some((x) => x.includes('T2 cartridge requires entryPoint'))).toBe(true);
  });
  it('rejects a malformed SRI integrity hash', () => {
    const bad = { ...good, tier: 'T2' as const, entryPoint: 'https://example.com/remote.js', integrity: 'abc123' };
    const v = validateCartridgeOwnership(bad);
    expect(v.some((x) => x.includes('SRI hash'))).toBe(true);
  });
  it('accepts a T2 cartridge with entry point + valid SRI (negative control for the above two)', () => {
    const ok = { ...good, tier: 'T2' as const, entryPoint: 'https://example.com/remote.js', integrity: 'sha256-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=' };
    expect(validateCartridgeOwnership(ok)).toEqual([]);
  });
});