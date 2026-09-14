import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { WorkerChat } from '../features/worker/WorkerChat';
import { WorkshopPage } from '../pages/workshop/WorkshopPage';
import { useWorkerStore } from '../features/worker/workerStore';

const here = dirname(fileURLToPath(import.meta.url));
const src = (...p: string[]) => resolve(here, '..', ...p);
const read = (p: string) => readFileSync(src(p), 'utf8');

beforeEach(() => {
  cleanup();
  window.localStorage.clear();
  window.location.hash = '';
  useWorkerStore.setState({ tasks: {}, profiles: {}, memory: {} });
});

describe('triad — SiteShell (regression guards)', () => {
  it('page frame padding is the clamp decision, not a flat default', () => {
    const css = read('index.css');
    expect(css).toMatch(/\.shell\s*\{[\s\S]*?padding:\s*0\s+clamp\(12px,\s*3vw,\s*24px\)/);
    expect(css).toMatch(/\.shell\s*\{[\s\S]*?max-width:\s*980px/);
  });

  it('ThemeCharm is mounted inside the topbar cluster, not fixed-positioned', () => {
    const app = read('App.tsx');
    expect(app).toMatch(/qpj-topbar__right[\s\S]{0,2000}<ThemeCharm/);
    const css = read('index.css');
    expect(css).not.toMatch(/\.themecharm[^{]*\{[^}]*position:\s*fixed/);
  });
});

describe('triad — WorkerChat', () => {
  it('renders a tokenized empty state when there are no tasks', async () => {
    useWorkerStore.setState({ tasks: { smoke: [] } });
    render(<WorkerChat passportId="smoke" />);

    await waitFor(() => {
      const empty = screen.queryByRole('status');
      expect(empty).toBeTruthy();
      expect(empty!.className).toMatch(/worker-chat__empty/);
      expect(empty!.querySelector('[data-empty-icon]')).toBeTruthy();
      expect(empty!.querySelector('h3')).toBeTruthy();
      expect(empty!.querySelector('[data-empty-suggestion]')).toBeTruthy();
    });
  });

  it('composer uses a spacing token, not a hardcoded gap', () => {
    const css = read('features/worker/worker.css');
    expect(css).toMatch(/\.worker-chat__composer\s*\{[\s\S]*?gap:\s*var\(--space-2\)/);
    expect(css).not.toMatch(/\.worker-chat__composer\s*\{[^}]*gap:\s*8px/);
  });

  it('does not render tool output as raw <pre> blocks', () => {
    const tsx = read('features/worker/WorkerChat.tsx');
    expect(tsx).not.toMatch(/<pre\b/);
  });
});

describe('triad — WorkshopPage', () => {
  it('gate overlay blur is tokenized, not a raw blur', () => {
    const css = read('index.css');
    expect(css).not.toMatch(/backdrop-filter:\s*blur\(6px\)/);
    expect(css).not.toMatch(/-webkit-backdrop-filter:\s*blur\(6px\)/);
    expect(css).toMatch(/\.pin-dialog\s*\{[\s\S]*?backdrop-filter:\s*var\(--p31-glass-blur\)/);
  });

  it('PIN entry sits inside a labeled, bordered container', async () => {
    render(<WorkshopPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Change caregiver PIN' }));

    const input = (await waitFor(() =>
      screen.getByLabelText(/4-digit caregiver PIN/i),
    )) as HTMLInputElement;
    fireEvent.change(input, { target: { value: '1234' } });

    await waitFor(() => {
      const group = screen.queryByRole('group', { name: /new caregiver pin/i });
      expect(group).toBeTruthy();
      const parent = group!.parentElement;
      expect(parent?.className).toMatch(/pin-change__panel/);
    });
  });

  it('tool cards use grid gap, not stacked margins', () => {
    const css = read('pages/workshop/workshop.css');
    expect(css).toMatch(/\.wbench__powers\s*\{[\s\S]*?display:\s*grid/);
    expect(css).toMatch(/\.wbench__powers\s*\{[\s\S]*?gap:\s*var\(--p31-space-3/);
    expect(css).not.toMatch(/\.wbench__powers\s*\{[^}]*margin-bottom:\s*24px/);
  });
});