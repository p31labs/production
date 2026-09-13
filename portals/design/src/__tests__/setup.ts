import { vi, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => cleanup());

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

HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
  fillStyle: '',
  fillRect: vi.fn(),
  beginPath: vi.fn(),
  arc: vi.fn(),
  fill: vi.fn(),
  clearRect: vi.fn(),
  getImageData: vi.fn(() => ({ data: [] })),
  putImageData: vi.fn(),
  createImageData: vi.fn(() => []),
  setTransform: vi.fn(),
  drawImage: vi.fn(),
  save: vi.fn(),
  restore: vi.fn(),
  scale: vi.fn(),
  rotate: vi.fn(),
  translate: vi.fn(),
  transform: vi.fn(),
  rect: vi.fn(),
  clip: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  closePath: vi.fn(),
  stroke: vi.fn(),
  measureText: vi.fn(() => ({ width: 0 })),
  fillText: vi.fn(),
  strokeText: vi.fn(),
  createLinearGradient: vi.fn(() => ({
    addColorStop: vi.fn(),
  })),
  createRadialGradient: vi.fn(() => ({
    addColorStop: vi.fn(),
  })),
  createPattern: vi.fn(),
  getLineDash: vi.fn(() => []),
  setLineDash: vi.fn(),
  lineDashOffset: 0,
  lineCap: 'butt',
  lineJoin: 'miter',
  lineWidth: 1,
  miterLimit: 10,
  font: '10px sans-serif',
  textAlign: 'start',
  textBaseline: 'alphabetic',
  direction: 'ltr',
  globalAlpha: 1,
  globalCompositeOperation: 'source-over',
  imageSmoothingEnabled: true,
  imageSmoothingQuality: 'low',
  strokeStyle: '#000000',
  shadowBlur: 0,
  shadowColor: '#000000',
  shadowOffsetX: 0,
  shadowOffsetY: 0,
  canvas: { width: 300, height: 150 },
})) as unknown as typeof HTMLCanvasElement.prototype.getContext;

HTMLCanvasElement.prototype.toDataURL = vi.fn(() => 'data:image/png;base64,');
HTMLCanvasElement.prototype.toBlob = vi.fn();

class ResizeObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}
Object.defineProperty(window, 'ResizeObserver', {
  writable: true,
  value: ResizeObserver,
});

Object.defineProperty(window, 'requestAnimationFrame', {
  writable: true,
  value: vi.fn(() => 1),
});

Object.defineProperty(window, 'cancelAnimationFrame', {
  writable: true,
  value: vi.fn(),
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

vi.mock('@p31/design-core/theming/theme-store', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@p31/design-core/theming/theme-store')>();
  return {
    ...actual,
    useThemeStore: () => ({
      theme: 'ocean' as const,
      setTheme: vi.fn(),
      age: 'adult' as const,
      setAge: vi.fn(),
      muted: false,
      setMuted: vi.fn(),
      warmLight: false,
      setWarmLight: vi.fn(),
      brand: null,
      setBrand: vi.fn(),
      applyTheme: vi.fn(),
    }),
    resolveBrandTokens: vi.fn(() => ({})),
  };
});
