import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Topbar, StatusBadge, MetricBadge, SpoonDial, Chameleon, SectionStrip } from '@p31/design-core/compositions';
import { useSpoonsStore } from '../lib/useSpoonsStore';

describe('Portal chrome', () => {
  it('renders the topbar brand', () => {
    render(
      <MemoryRouter>
        <Topbar
          brand={
            <button className="topbar-brand" onClick={() => {}} aria-label="P31 Design System — home">
              <span className="brand-mark" aria-hidden="true">P31</span>
              <span className="brand-word">Design System</span>
              <span className="hide-mobile brand-version">v2.0.0</span>
            </button>
          }
          right={
            <>
              <span className="hide-mobile">
                <StatusBadge status="online" label="Live build" />
              </span>
              <span className="hide-mobile">
                <MetricBadge value="124" label="tokens" icon={<span className="status-dot" />} />
              </span>
            </>
          }
        />
      </MemoryRouter>
    );
    expect(screen.getByText('Design System')).toBeDefined();
    expect(screen.getByText('P31')).toBeDefined();
  });

  it('renders status badges and command palette trigger', () => {
    render(
      <MemoryRouter>
        <Topbar
          brand={
            <button className="topbar-brand" onClick={() => {}} aria-label="P31 Design System — home">
              <span className="brand-mark" aria-hidden="true">P31</span>
              <span className="brand-word">Design System</span>
              <span className="hide-mobile brand-version">v2.0.0</span>
            </button>
          }
          right={
            <>
              <span className="hide-mobile">
                <StatusBadge status="online" label="Live build" />
              </span>
              <span className="hide-mobile">
                <MetricBadge value="124" label="tokens" icon={<span className="status-dot" />} />
              </span>
              <span className="hide-mobile">
                <SpoonDial level={3} onChange={vi.fn()} />
              </span>
              <button
                className="cmdk-trigger"
                onClick={vi.fn()}
                aria-label="Open command palette"
                title="Command palette (⌘K)"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="11" cy="11" r="8" />
                  <path d="M21 21l-4.35-4.35" />
                </svg>
              </button>
            </>
          }
        />
      </MemoryRouter>
    );
    expect(screen.getByText('Live build')).toBeDefined();
    expect(screen.getByLabelText('Open command palette')).toBeDefined();
  });

  it('renders the desktop section strip from design-core', () => {
    render(
      <MemoryRouter>
        <SectionStrip
          items={[
            { id: '/glass', label: 'Glass Lab' },
            { id: '/mcp', label: 'MCP Console' },
          ]}
        />
      </MemoryRouter>
    );
    expect(screen.getByText('Glass Lab')).toBeDefined();
    expect(screen.getByText('MCP Console')).toBeDefined();
  });

  it('opens the adaptive theme panel from the design-core chameleon', () => {
    render(<Chameleon />);
    fireEvent.click(screen.getByLabelText('Adaptive theme controls'));
    expect(screen.getByText('Brand')).toBeDefined();
    expect(screen.getByText('World')).toBeDefined();
    expect(screen.getByText('adult')).toBeDefined();
  });
});