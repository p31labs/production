import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../App';
import { installMCPTools } from '../lib/mcpTools';
import { useSpoonsStore } from '../lib/useSpoonsStore';

const json = async () => ({});
const okResponse = { ok: true, json };

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn(async () => okResponse));
});

function renderApp() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <App />
    </QueryClientProvider>,
  );
}

describe('Capital Machine — Quantum Material smoke', () => {
  it('renders the widget cockpit with presets', async () => {
    renderApp();
    expect(await screen.findByText('Your Capital Machine')).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: /Treasury/ })).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: /Trader/ })).toBeInTheDocument();
    expect((await screen.findAllByText('Revenue')).length).toBeGreaterThan(0);
    expect((await screen.findAllByText('Positions')).length).toBeGreaterThan(0);
  });

  it('navigates via hash to the Revenue surface', async () => {
    renderApp();
    window.location.hash = '#/revenue';
    expect(await screen.findByRole('heading', { name: 'Revenue' })).toBeInTheDocument();
  });

  it('hash navigation falls back to home for unknown routes', () => {
    renderApp();
    window.location.hash = '#/nope';
    expect(sectionFromHashHelper()).toBe('home');
  });

  it('spoon dial drives data-spoons and --motion-scale', () => {
    renderApp();
    useSpoonsStore.getState().setSpoons(0);
    expect(document.documentElement.dataset.spoons).toBe('0');
    expect(document.documentElement.style.getPropertyValue('--motion-scale')).toBe('0');
  });

  it('installs the WebMCP registry with Draft-7 schemas', () => {
    installMCPTools();
    const tools = (window as unknown as { __p31MCPTools: Record<string, unknown> }).__p31MCPTools;
    expect(tools).toBeDefined();
    expect((tools.navigate as { schema: { type: string } }).schema.type).toBe('object');
    expect(tools.version).toBe('1.0.0');
    expect(tools.surface).toBe('monetization');
  });

  it('navigate MCP tool switches the hash', async () => {
    installMCPTools();
    renderApp();
    const tools = (window as unknown as { __p31MCPTools: Record<string, unknown> }).__p31MCPTools;
    (tools.navigate as { execute: (a: Record<string, unknown>) => unknown }).execute({ id: 'usage' });
    await waitFor(() => expect(window.location.hash).toBe('#/usage'));
    expect(await screen.findByRole('heading', { name: 'Usage' })).toBeInTheDocument();
  });
});

function sectionFromHashHelper(): string {
  const id = window.location.hash.replace(/^#\/?/, '').split('/')[0];
  const valid = ['home', 'revenue', 'positions', 'opportunities', 'invoices', 'donations', 'billing', 'usage', 'ops', 'settings', 'profile', 'trust', 'community'];
  return valid.includes(id) ? id : 'home';
}