import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Showcase from '../routes/Showcase/Showcase';
import Marketplace from '../routes/Marketplace/Marketplace';
import Catalog from '../routes/Catalog/Catalog';
import Tokens from '../routes/Tokens/Tokens';
import GlassLab from '../routes/GlassLab/GlassLab';
import Brands from '../routes/Brands/Brands';
import Recipes from '../routes/Recipes/Recipes';
import Playground from '../routes/Playground/Playground';
import McpConsole from '../routes/McpConsole/McpConsole';
import Accessibility from '../routes/Accessibility/Accessibility';
import Icons from '../routes/Icons/Icons';

describe('Routes', () => {
  it('renders Showcase page', () => {
    render(
      <BrowserRouter>
        <Showcase />
      </BrowserRouter>
    );
    expect(screen.getByText('P31 Design System')).toBeDefined();
  });

  it('renders Marketplace page', () => {
    render(
      <BrowserRouter>
        <Marketplace />
      </BrowserRouter>
    );
    expect(screen.getByText('Marketplace')).toBeDefined();
    expect(screen.getAllByText(/MCP marketplace/i).length).toBeGreaterThan(0);
  });

  it('renders Catalog page', () => {
    render(
      <BrowserRouter>
        <Catalog />
      </BrowserRouter>
    );
    expect(screen.getByText('Catalog')).toBeDefined();
  });

  it('renders Tokens page', () => {
    render(
      <BrowserRouter>
        <Tokens />
      </BrowserRouter>
    );
    expect(screen.getByText('Design Tokens')).toBeDefined();
  });

  it('renders GlassLab page', () => {
    render(
      <BrowserRouter>
        <GlassLab />
      </BrowserRouter>
    );
    expect(screen.getByText('Glass Lab')).toBeDefined();
  });

  it('renders Brands page', () => {
    render(
      <BrowserRouter>
        <Brands />
      </BrowserRouter>
    );
    expect(screen.getByText('Brands')).toBeDefined();
  });

  it('renders Recipes page', () => {
    render(
      <BrowserRouter>
        <Recipes />
      </BrowserRouter>
    );
    expect(screen.getByPlaceholderText('Search 171 recipes… (e.g. glass, btn, topbar)')).toBeDefined();
    expect(screen.getByText('glass-panel')).toBeDefined();
  });

  it('renders Playground page with the live component lab', () => {
    render(
      <BrowserRouter>
        <Playground />
      </BrowserRouter>
    );
    expect(screen.getByText('Live components')).toBeDefined();
    expect(screen.getByText('Intent DSL')).toBeDefined();
  });

  it('renders McpConsole page', () => {
    render(
      <BrowserRouter>
        <McpConsole />
      </BrowserRouter>
    );
    expect(screen.getByText('MCP Console')).toBeDefined();
  });

  it('renders Accessibility page', () => {
    render(
      <BrowserRouter>
        <Accessibility />
      </BrowserRouter>
    );
    expect(screen.getByText('Accessibility')).toBeDefined();
  });

  it('renders Icons page', () => {
    render(
      <BrowserRouter>
        <Icons />
      </BrowserRouter>
    );
    expect(screen.getByText('Icons')).toBeDefined();
  });
});