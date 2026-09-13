import { describe, it, expect } from 'vitest';
import { render, screen, within, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Home from '../routes/Home/Home';

describe('Home Route — Sovereign Workbench', () => {
  it('renders the workbench hero and energy dial', () => {
    render(
      <BrowserRouter>
        <Home />
      </BrowserRouter>
    );
    expect(
      screen.getByRole('heading', { name: /Sovereign Design Tokens/i }),
    ).toBeDefined();
    expect(screen.getByLabelText('Spoon level: 3 of 5')).toBeDefined();
  });

  it('lists catalog entries and filters by category', () => {
    render(
      <BrowserRouter>
        <Home />
      </BrowserRouter>
    );
    expect(screen.getByText('Button')).toBeDefined();
    expect(screen.getByText('GlassPanel')).toBeDefined();

    const rail = screen.getByRole('navigation', { name: 'Catalog filters' });
    fireEvent.click(within(rail).getByRole('button', { name: /surface/i }));

    expect(screen.getByText('GlassPanel')).toBeDefined();
    expect(screen.queryByText('Button')).toBeNull();
  });

  it('expands a row to reveal the live render and semantic contract', () => {
    render(
      <BrowserRouter>
        <Home />
      </BrowserRouter>
    );

    const buttonRow = screen.getAllByRole('button', { name: /Button/ })[0];
    fireEvent.click(buttonRow);

    expect(screen.getByText('Live render')).toBeDefined();
    expect(screen.getByText('Semantic contract')).toBeDefined();
    expect(screen.getByText('Semantic parts')).toBeDefined();
    expect(screen.getByText('Design tokens mapped')).toBeDefined();
  });
});