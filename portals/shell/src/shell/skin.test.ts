/**
 * shell/skin.test.ts — the frozen Skin interface (one design, many backends).
 */
import { describe, expect, it } from 'vitest';
import { validateSkin, normalizeSkin, type Skin } from './skin-contract';

const GOOD: Skin = {
  id: 'family',
  name: 'Family',
  persona: 'family',
  chrome: { wordmark: 'Home', themeDefault: 'still earth', ambient: 'calm' },
};

describe('skin contract', () => {
  it('accepts a valid skin', () => {
    expect(validateSkin(GOOD)).toEqual([]);
  });

  it('rejects a missing id', () => {
    expect(validateSkin({ ...GOOD, id: '' })).toContain('id is required (string)');
  });

  it('rejects an unknown persona', () => {
    expect(validateSkin({ ...GOOD, persona: 'astronaut' as never })).toEqual(
      expect.arrayContaining([expect.stringContaining('persona must be one of')]),
    );
  });

  it('rejects unknown fields', () => {
    expect(validateSkin({ ...GOOD, layout: 'grid' } as never)).toEqual(
      expect.arrayContaining(['unknown field: layout']),
    );
  });

  it('rejects geometry overrides (the shell owns geometry)', () => {
    expect(validateSkin({ ...GOOD, sidebarWidth: '300px' } as never)).toEqual(
      expect.arrayContaining(['geometry override not allowed: sidebarWidth']),
    );
  });

  it('rejects a token override (canon owns appearance)', () => {
    expect(validateSkin({ ...GOOD, '--p31-accent': 'red' } as never)).toEqual(
      expect.arrayContaining(['geometry override not allowed: --p31-accent']),
    );
  });

  it('normalize fills defaults and throws on violations', () => {
    const s = normalizeSkin({ id: 'x', name: 'X', persona: 'clinical', chrome: { wordmark: 'W' } });
    expect(s.roleFloor).toBeUndefined();
    expect(s.chrome.themeDefault).toBeUndefined();
    expect(() => normalizeSkin({ name: 'no-id' })).toThrow();
  });
});