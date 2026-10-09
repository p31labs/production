import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { CartridgeShell, CartridgeError } from '../src/shell/CartridgeShell';
import type { CartridgeManifest } from '../src/shell/cartridge';

const design: CartridgeManifest = {
  id: 'design', name: 'design', version: '1.0.0', tier: 'T4', themeDefault: 'ocean',
  wordmark: 'P31 <span>Design System</span>', search: 'Search surfaces…',
  action: 'End session', actionKind: 'ghost',
  identity: { kind: 'sign-in', to: '#identity', label: 'Claim identity' },
  nav: [{ path: '/', label: 'Home', emoji: '🏠' }, { path: '/catalog', label: 'Catalog', emoji: '🧩' }],
  routes: {
    '/': [{ t: 'hero', eyebrow: 'P31', title: 'P31 Design System', lede: 'One shell, many faces.' }],
  },
};

describe('CartridgeShell — the cartridge renderer (productionized prototype)', () => {
  it('renders the manifest through the immutable PortalShell frame', () => {
    const html = renderToStaticMarkup(
      <CartridgeShell manifest={design} userTheme={null} userPicked={false} />,
    );
    expect(html).toContain('app-shell');
    expect(html).toContain('skip-link');
    expect(html).toContain('P31 Design System');
    expect(html).toContain('Claim identity');
    expect(html).toContain('Home');
    expect(html).toContain('Catalog');
    expect(html).toContain('One shell, many faces');
  });

  it('theme-travel: user-picked theme wins over the cartridge default', () => {
    const cb = vi.fn();
    renderToStaticMarkup(<CartridgeShell manifest={design} userTheme="volt" userPicked onResolveTheme={cb} />);
    expect(cb).toHaveBeenCalledWith('volt');
  });

  it('cartridge default applies only when the user never picked', () => {
    const cb = vi.fn();
    renderToStaticMarkup(<CartridgeShell manifest={design} userTheme={null} userPicked={false} onResolveTheme={cb} />);
    expect(cb).toHaveBeenCalledWith('ocean');
  });

  it('renderCartridgeRoute renders the route blocks', () => {
    const html = renderToStaticMarkup(<CartridgeShell manifest={design} userTheme={null} userPicked={false} path="/" />);
    expect(html).toContain('eyebrow');
  });

  it('throws a route → error renders inside main; the frame stays intact', () => {
    const broken: CartridgeManifest = {
      ...design, id: 'broken', name: 'broken',
      routes: { '/': (() => { throw new Error('This cartridge deliberately throws.'); }) as any },
    };
    const html = renderToStaticMarkup(<CartridgeShell manifest={broken} userTheme={null} userPicked={false} />);
    // the error renders as the main-slot content…
    expect(html).toContain('failed to load');
    expect(html).toContain('deliberately throws');
    // …and the frame (skip-link, wordmark, identity, nav) never unmounts
    expect(html).toContain('skip-link');
    expect(html).toContain('Claim identity');
    expect(html).toContain('Home');
  });
});

describe('CartridgeError — scoped boundary', () => {
  it('renders children when no error', () => {
    const html = renderToStaticMarkup(<CartridgeError><div>fine</div></CartridgeError>);
    expect(html).toContain('fine');
  });
});