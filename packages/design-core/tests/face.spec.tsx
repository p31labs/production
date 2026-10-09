import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { validateFace, PortalTopbar, type TopbarFace } from '../src/shell';

const face: TopbarFace = {
  wordmark: 'P31 Forge',
  searchPlaceholder: 'Search packs, docs, contracts…',
  mode: 'spark',
  action: { kind: 'primary', label: 'Compile', onActivate: () => {} },
  identity: { kind: 'sign-in', to: '/identity', label: 'Claim identity' },
  themeDefault: 'ocean',
};

describe('validateFace — the one-shell-many-faces contract', () => {
  it('accepts a compliant face', () => {
    expect(validateFace(face)).toEqual([]);
  });
  it('rejects an unknown field (the shell owns the arrangement)', () => {
    const bad = { ...face, topbarHeight: 80 } as unknown as TopbarFace;
    const v = validateFace(bad);
    expect(v.some((x) => x.includes('shell owns the arrangement'))).toBe(true);
  });
  it('rejects an invalid mode (negative control)', () => {
    const bad = { ...face, mode: 'hyperdrive' } as unknown as TopbarFace;
    const v = validateFace(bad);
    expect(v.some((x) => x.includes('invalid mode'))).toBe(true);
  });
});

describe('PortalTopbar — the canonical shell shape', () => {
  it('renders the same arrangement for any face (design or forge)', () => {
    const forgeHtml = renderToStaticMarkup(<PortalTopbar face={face} spoons={3} />);
    const designHtml = renderToStaticMarkup(<PortalTopbar face={{ ...face, wordmark: 'P31 Design System', searchPlaceholder: 'Search surfaces…', action: { kind: 'ghost', label: 'End session', onActivate: () => {} }, identity: { kind: 'account-menu', spec: { trigger: { emoji: 'A', name: 'Aya' }, primaryLinks: [], onSignOut: () => {} } } }} spoons={3} />);
    // both render the same chrome structure
    for (const marker of ['theme-picker', 'search-box', 'badge', 'spoon-dial']) {
      expect(forgeHtml).toContain(marker);
      expect(designHtml).toContain(marker);
    }
    // content differs — the switcharoo
    expect(forgeHtml).toContain('P31 Forge');
    expect(designHtml).toContain('P31 Design System');
  });
});