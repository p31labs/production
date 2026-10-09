import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { useCartridgeConsole, type CartridgeManifest } from '../src/shell';
import { CartridgeConsole } from '../src/shell/CartridgeConsole';
import { CartridgeComposer } from '../src/shell/CartridgeComposer';

const make = (over: Partial<CartridgeManifest> = {}): CartridgeManifest => ({
  id: 'design', name: 'design', version: '1.0.0', tier: 'T4', themeDefault: 'ocean',
  wordmark: 'P31 Design System', search: 'Search…', action: '', actionKind: 'none',
  identity: { kind: 'sign-in', to: '#identity', label: 'Claim identity' },
  nav: [{ path: '/', label: 'Home', emoji: '🏠' }],
  routes: { '/': [{ t: 'hero', eyebrow: 'P31', title: 'P31 Design System' }] },
  ...over,
});

/** Reset the persisted store between tests. */
const resetStore = () => useCartridgeConsole.setState({ registry: { order: [], byId: {} }, active: '', userPickedTheme: false, userTheme: null });

/** pickTheme drives the theme-store applyTheme (touches DOM). Stub it for the
 *  theme-travel tests — we only assert the resolve logic, not CSS application. */
function stubDom() {
  vi.stubGlobal('document', {
    documentElement: {
      dataset: {},
      style: { setProperty: () => {} },
      setAttribute: () => {},
    },
  });
  vi.stubGlobal('window', { __P31_STAR_COLORS__: {} });
}
const unstubDom = () => { vi.unstubAllGlobals(); };

describe('useCartridgeConsole — the persisted console store', () => {
  beforeEach(resetStore);

  it('first registered cartridge becomes active', () => {
    useCartridgeConsole.getState().register(make());
    const s = useCartridgeConsole.getState();
    expect(s.active).toBe('design');
    expect(s.registry.order).toEqual(['design']);
  });

  it('register rejects an ownership-violating manifest (gate can fail)', () => {
    const bad = make({ topbarHeight: 80 } as any);
    useCartridgeConsole.getState().register(bad);
    expect(useCartridgeConsole.getState().active).toBe('');
  });

  it('activate switches the active cartridge', () => {
    useCartridgeConsole.getState().register(make());
    useCartridgeConsole.getState().register(make({ id: 'forge', name: 'forge', themeDefault: 'volt' }));
    useCartridgeConsole.getState().activate('forge');
    expect(useCartridgeConsole.getState().active).toBe('forge');
  });

  it('theme-travel: activeTheme returns the user pick after pickTheme', () => {
    stubDom();
    try {
      useCartridgeConsole.getState().register(make({ themeDefault: 'ocean' }));
      expect(useCartridgeConsole.getState().activeTheme()).toBe('ocean');
      useCartridgeConsole.getState().pickTheme('volt');
      expect(useCartridgeConsole.getState().activeTheme()).toBe('volt');
    } finally { unstubDom(); }
  });

  it('cartridge themeDefault applies only before the user ever picks', () => {
    stubDom();
    try {
      useCartridgeConsole.getState().register(make({ themeDefault: 'garden' }));
      expect(useCartridgeConsole.getState().activeTheme()).toBe('garden');
      useCartridgeConsole.getState().pickTheme('ocean');
      useCartridgeConsole.getState().register(make({ id: 'forge', name: 'forge', themeDefault: 'volt' }));
      useCartridgeConsole.getState().activate('forge');
      // user picked ocean — travels even to the volt-default forge cartridge
      expect(useCartridgeConsole.getState().activeTheme()).toBe('ocean');
    } finally { unstubDom(); }
  });

  it('compose registers + activates a valid manifest and returns no violations', () => {
    const v = useCartridgeConsole.getState().compose(make({ id: 'mine', name: 'mine' }));
    expect(v).toEqual([]);
    expect(useCartridgeConsole.getState().active).toBe('mine');
  });

  it('compose rejects an invalid manifest and does not activate it (negative control)', () => {
    const v = useCartridgeConsole.getState().compose(make({ id: 'bad', topbarHeight: 10 } as any));
    expect(v.length).toBeGreaterThan(0);
    expect(useCartridgeConsole.getState().active).toBe('');
  });
});

describe('CartridgeConsole — the host', () => {
  beforeEach(resetStore);

  it('renders the active cartridge through the frame with switcher + theme chrome', () => {
    useCartridgeConsole.getState().register(make());
    const html = renderToStaticMarkup(<CartridgeConsole />);
    expect(html).toContain('app-shell');
    expect(html).toContain('cartridge-switcher');
    expect(html).toContain('theme-picker');
    expect(html).toContain('Claim identity');
    expect(html).toContain('P31 Design System');
  });

  it('renders "No cartridges registered" before any cartridge (empty store)', () => {
    const html = renderToStaticMarkup(<CartridgeConsole />);
    expect(html).toContain('No cartridges registered');
  });
});

describe('CartridgeComposer — the T4 wizard', () => {
  beforeEach(resetStore);

  it('renders the compose trigger (closed state)', () => {
    const html = renderToStaticMarkup(<CartridgeComposer />);
    expect(html).toContain('Compose');
  });

  it('save produces a validated manifest via the store compose path', () => {
    // Drive the store directly with what save() would compose:
    const v = useCartridgeConsole.getState().compose(make({ id: 'p31-my-cartridge', name: 'p31-my-cartridge' }));
    expect(v).toEqual([]);
    expect(useCartridgeConsole.getState().active).toBe('p31-my-cartridge');
  });
});