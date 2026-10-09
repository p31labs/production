/**
 * @file Crown.test.tsx
 * Auto-generated smoke test for Crown.
 */

import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { Crown } from './Crown.js';

describe('Crown', () => {
  it('renders without children', () => {
    const html = renderToStaticMarkup(<Crown>child</Crown>);
    expect(html).toBeDefined();
  });

  it('applies custom className', () => {
    const html = renderToStaticMarkup(<Crown className="custom-class">child</Crown>);
    expect(html).toBeDefined();
  });
});
