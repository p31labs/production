import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Tokens from '../routes/Tokens/Tokens';
import Components from '../routes/Components/Components';
import GlassLab from '../routes/GlassLab/GlassLab';
import Brands from '../routes/Brands/Brands';
import Recipes from '../routes/Recipes/Recipes';
import Playground from '../routes/Playground/Playground';
import McpConsole from '../routes/McpConsole/McpConsole';
import Accessibility from '../routes/Accessibility/Accessibility';
import Icons from '../routes/Icons/Icons';

describe('Routes', () => {
  it('renders Tokens page', () => {
    render(
      <BrowserRouter>
        <Tokens />
      </BrowserRouter>
    );
    expect(screen.getByText('Design Tokens')).toBeDefined();
  });

  it('renders Components page', () => {
    render(
      <BrowserRouter>
        <Components />
      </BrowserRouter>
    );
    expect(screen.getByText('Components')).toBeDefined();
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

  it('renders Playground page', () => {
    render(
      <BrowserRouter>
        <Playground />
      </BrowserRouter>
    );
    expect(screen.getByText('Run QA Gates')).toBeDefined();
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
