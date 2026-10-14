/**
 * Split — WCAG 2.5.7 keyboard fallback + pointer-drag parity.
 *
 * Client-rendered under jsdom because the interactions dispatch real events
 * against the live DOM (pointer capture drag, keydown toggles). The SSR shape
 * (data-collapsible, aria contract) is asserted via renderToStaticMarkup.
 *
 * @vitest-environment jsdom
 */
import { describe, expect, it, afterEach, beforeEach, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act, type ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Split } from '../src/compositions/canon-v2';

let container: HTMLDivElement | null = null;
let root: Root | null = null;

beforeEach(() => {
  (globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;
});

function render(node: ReactElement) {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root!.render(node);
  });
  return container;
}

function deleteProto(key: string) {
  delete (Element.prototype as unknown as Record<string, unknown>)[key];
}

afterEach(() => {
  act(() => {
    root?.unmount();
  });
  container?.remove();
  container = null;
  root = null;
  deleteProto('setPointerCapture');
  deleteProto('releasePointerCapture');
});

const q = (sel: string) => {
  const el = container!.querySelector(sel);
  if (!el) throw new Error(`expected ${sel} in the rendered tree`);
  return el as HTMLElement;
};
const handle = () => q('[data-p31="split-handle"]');
const rootEl = () => q('[data-p31="split"]');

function key(k: string) {
  act(() => {
    handle().dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }));
  });
}

function doubleClick() {
  act(() => {
    handle().dispatchEvent(new MouseEvent('dblclick', { bubbles: true, cancelable: true }));
  });
}

function pointer(clientX: number, type: 'pointerdown' | 'pointermove' | 'pointerup') {
  const ev = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperty(ev, 'clientX', { value: clientX });
  act(() => {
    handle().dispatchEvent(ev);
  });
}

describe('Split — WCAG 2.5.7 keyboard fallback', () => {
  it('ArrowLeft/ArrowRight nudge the ratio by the 5% step and aria-valuenow tracks it', () => {
    const changes: number[] = [];
    render(<Split a={<p>a</p>} b={<p>b</p>} defaultRatio={0.5} onRatioChange={(r) => changes.push(r)} />);
    expect(handle().getAttribute('aria-valuenow')).toBe('50');
    key('ArrowRight');
    expect(handle().getAttribute('aria-valuenow')).toBe('55');
    key('ArrowRight');
    key('ArrowLeft');
    expect(handle().getAttribute('aria-valuenow')).toBe('55');
    expect(changes[0]).toBeCloseTo(0.55, 10);
    expect(changes[1]).toBeCloseTo(0.6, 10); // float step: 0.55 + 0.05 → 0.6000000000000001
    expect(changes[2]).toBeCloseTo(0.55, 10);
  });

  it('Home/End snap to the min/max bounds and the step keys clamp there', () => {
    render(<Split a={<p>a</p>} b={<p>b</p>} defaultRatio={0.5} />);
    key('End');
    expect(handle().getAttribute('aria-valuenow')).toBe('80');
    key('ArrowRight');
    expect(handle().getAttribute('aria-valuenow')).toBe('80');
    key('Home');
    expect(handle().getAttribute('aria-valuenow')).toBe('20');
    key('ArrowLeft');
    expect(handle().getAttribute('aria-valuenow')).toBe('20');
  });

  it('Enter toggles collapse when collapsible; the handle survives as the restore affordance', () => {
    render(<Split a={<p>a</p>} b={<p>b</p>} collapsible defaultRatio={0.5} />);
    expect(handle().hasAttribute('data-collapsible')).toBe(true);
    expect(rootEl().hasAttribute('data-collapsed')).toBe(false);
    key('Enter');
    expect(rootEl().hasAttribute('data-collapsed')).toBe(true);
    expect(handle().getAttribute('aria-valuenow')).toBe('80');
    expect(handle().getAttribute('aria-valuetext')).toBe('pane B collapsed');
    key(' '); // Space restores
    expect(rootEl().hasAttribute('data-collapsed')).toBe(false);
    expect(handle().getAttribute('aria-valuenow')).toBe('50');
    expect(handle().getAttribute('aria-valuetext')).toBeNull();
  });

  it('double-click collapses when collapsible (single-pointer alternative)', () => {
    render(<Split a={<p>a</p>} b={<p>b</p>} collapsible />);
    doubleClick();
    expect(rootEl().hasAttribute('data-collapsed')).toBe(true);
    doubleClick();
    expect(rootEl().hasAttribute('data-collapsed')).toBe(false);
  });

  it('Enter/Space and double-click stay inert without collapsible', () => {
    render(<Split a={<p>a</p>} b={<p>b</p>} />);
    key('Enter');
    key(' ');
    doubleClick();
    expect(rootEl().hasAttribute('data-collapsed')).toBe(false);
    expect(handle().hasAttribute('data-collapsible')).toBe(false);
  });

  it('calls onCollapsedChange when controlled, without owning the state', () => {
    const spy = vi.fn();
    render(<Split a={<p>a</p>} b={<p>b</p>} collapsible collapsed={false} onCollapsedChange={spy} />);
    key('Enter');
    expect(spy).toHaveBeenCalledWith(true);
    expect(rootEl().hasAttribute('data-collapsed')).toBe(false); // controlled: state stays with the caller
  });

  it('legacy collapsed prop still renders no handle when not collapsible', () => {
    render(<Split a={<p>a</p>} b={<p>b</p>} collapsed />);
    expect(rootEl().hasAttribute('data-collapsed')).toBe(true);
    expect(container!.querySelector('[data-p31="split-handle"]')).toBeNull();
  });

  it('pointer drag still resizes identically (capture path smoke)', () => {
    const changes: number[] = [];
    render(<Split a={<p>a</p>} b={<p>b</p>} defaultRatio={0.5} onRatioChange={(r) => changes.push(r)} />);
    rootEl().getBoundingClientRect = () =>
      ({ left: 0, right: 1000, width: 1000, top: 0, bottom: 400, height: 400, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect;
    (Element.prototype as unknown as Record<string, unknown>).setPointerCapture = () => {};
    (Element.prototype as unknown as Record<string, unknown>).releasePointerCapture = () => {};
    pointer(0, 'pointerdown');
    expect(handle().hasAttribute('data-dragging')).toBe(true);
    pointer(250, 'pointermove');
    expect(handle().getAttribute('aria-valuenow')).toBe('25');
    pointer(0, 'pointerup');
    expect(handle().hasAttribute('data-dragging')).toBe(false);
    expect(changes).toEqual([0.25]);
  });

  it('renders the data-collapsible + aria contract (SSR shape)', () => {
    const html = renderToStaticMarkup(<Split a={<p>a</p>} b={<p>b</p>} collapsible defaultRatio={0.35} />);
    expect(html).toContain('data-p31="split-handle"');
    expect(html).toContain('data-collapsible');
    expect(html).toContain('aria-valuenow="35"');
    expect(html).toContain('aria-valuemin="20"');
    expect(html).toContain('aria-valuemax="80"');
    expect(html).toContain('tabindex="0"');
  });
});