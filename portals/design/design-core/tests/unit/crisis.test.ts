import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');
const a11y = readFileSync(join(ROOT, 'src/styles/accessibility.css'), 'utf8');
const forms = readFileSync(join(ROOT, 'src/recipes/forms.css'), 'utf8');

describe('crisis completion contract', () => {
  it('hides decorative svgs at spoons 0-1', () => {
    expect(a11y).toContain('[data-spoons="0"] svg.decorative');
    expect(a11y).toContain('.decorative');
    expect(a11y).toMatch(/display:\s*none !important/);
  });

  it('enhances focus without glow', () => {
    expect(a11y).toMatch(/\[data-spoons="0"\] \*:focus-visible[\s\S]*outline: 2px solid var\(--p31-text\)/);
    expect(a11y).toContain('box-shadow: none !important');
  });

  it('forces opaque modal overlays', () => {
    expect(forms).toMatch(/\[data-spoons="0"\] \.modal-overlay/);
    expect(a11y).toMatch(/backdrop-filter: none !important/);
  });

  it('kills ambient animation loops', () => {
    expect(a11y).toContain('animation-iteration-count: 1 !important');
  });
});
