import { vi } from 'vitest';

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

vi.mock('@sentry/react', () => ({
  init: vi.fn(),
  captureException: vi.fn(),
  withScope: vi.fn(),
  setUser: vi.fn(),
  setTag: vi.fn(),
  setContext: vi.fn(),
  setExtra: vi.fn(),
  BrowserTracing: vi.fn(),
  reactRouterV6LoaderDataIntegration: vi.fn(),
  reactRouterV6ErrorBoundaryIntegration: vi.fn(),
}));
