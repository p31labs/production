/**
 * @file StatusBadge.test.tsx
 * Auto-generated smoke test for StatusBadge.
 */

import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { StatusBadge } from './StatusBadge.js';

describe('StatusBadge', () => {
  it('renders a status', () => {
    const html = renderToStaticMarkup(<StatusBadge status="online" />);
    expect(html).toContain('online');
  });

  it('applies custom className', () => {
    const html = renderToStaticMarkup(<StatusBadge status="offline" className="custom-class" />);
    expect(html).toContain('custom-class');
  });
});