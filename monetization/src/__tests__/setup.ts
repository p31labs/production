import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Node-environment test files (e.g. src/lib/oauth21.test.ts) share this setup;
// the DOM reset is only meaningful under jsdom, so guard it.
afterEach(() => {
  if (typeof document === 'undefined') return;
  cleanup();
  document.documentElement.removeAttribute('data-spoons');
  document.documentElement.style.removeProperty('--motion-scale');
});