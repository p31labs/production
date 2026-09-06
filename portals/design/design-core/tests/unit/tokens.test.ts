import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { colorRamps, RAMP_STEPS } from '../../src/tokens/color';
import { fontWeightTokens } from '../../src/tokens/typography';
import { spoonLadder } from '../../src/tokens/motion';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');
const ladderCss = readFileSync(join(ROOT, 'src/generated/spoon-ladder.css'), 'utf8');

describe('token sources', () => {
  it('every ramp has valid hex shades (7 steps, neutral extends to 950)', () => {
    for (const [, shades] of Object.entries(colorRamps)) {
      expect([7, 8]).toContain(shades.length);
      for (const hex of shades) expect(hex).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  it('only two font weights exist', () => {
    expect(Object.values(fontWeightTokens)).toEqual([400, 500]);
  });

  it('spoon ladder covers 0..5 and crisis levels are still', () => {
    expect(spoonLadder.map((s) => s.level)).toEqual([0, 1, 2, 3, 4, 5]);
    for (const s of spoonLadder.slice(0, 2)) {
      expect(s.motion).toBe('0ms');
      expect(s.blur).toBe('0px');
      expect(s.opacity).toBe('100%');
    }
  });
});

describe('generated css', () => {
  it('ladder overrides motion+blur per level', () => {
    for (const s of spoonLadder) {
      expect(ladderCss).toContain(`[data-spoons="${s.level}"]`);
      expect(ladderCss).toContain(`--p31-motion-fast: ${s.motion}`);
      expect(ladderCss).toContain(`--p31-glass-blur: ${s.blur}`);
    }
  });

  it('crisis forces opaque surfaces + high contrast', () => {
    expect(ladderCss).toContain('--p31-glass-bg: var(--p31-surface)');
    expect(ladderCss).toContain('--p31-text-secondary: var(--p31-text)');
  });

  it('no weight beyond 500 anywhere in shipped recipes', () => {
    const sheets = [
      'src/generated/spoon-ladder.css',
      'src/generated/color-palette.css',
      'src/recipes/forms.css',
      'src/recipes/responsive.css',
      'src/styles/accessibility.css',
    ];
    for (const f of sheets) {
      const weights = readFileSync(join(ROOT, f), 'utf8').match(/font-weight:\s*(\d{3})/g) ?? [];
      for (const w of weights) {
        const n = Number(w.split(':')[1]);
        expect([400, 500]).toContain(n);
      }
    }
  });
});
