import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { WorkshopPage } from '../pages/workshop/WorkshopPage';
import { hashToPath, routeForPath } from '../lib/routes';

function setHash(hash: string) {
  window.location.hash = hash;
  window.dispatchEvent(new HashChangeEvent('hashchange'));
}

beforeEach(() => {
  cleanup();
  window.localStorage.clear();
});

describe('workshop sub-routes', () => {
  it('normalizes #/workshop/* to the workshop route for the guard + shell', () => {
    expect(hashToPath('#/workshop/tokens')).toBe('/workshop');
    expect(routeForPath('/workshop/recipes')).toBe('workshop');
    expect(hashToPath('#/craft/anything')).toBe('/craft');
  });

  it('defaults to the hub when the hash is bare', () => {
    setHash('#/workshop');
    render(<WorkshopPage />);
    expect(screen.getByRole('heading', { name: /workshop/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /workbench/i })).toBeTruthy();
  });

  it('falls back to the hub on an unknown sub-route', () => {
    setHash('#/workshop/nonsense');
    render(<WorkshopPage />);
    expect(screen.getByRole('button', { name: /workbench/i })).toBeTruthy();
  });

  it('shows the contrast tab when the hash targets it', () => {
    setHash('#/workshop/contrast');
    render(<WorkshopPage />);
    expect(screen.getByText('Large text 24px')).toBeTruthy();
  });

  it('shows the hub powers when the hash targets the hub tab', () => {
    setHash('#/workshop');
    render(<WorkshopPage />);
    expect(screen.getByText('Describe a piece — generate, prove, and ship it live.')).toBeTruthy();
  });

  it('mounts the studio tab behind the workshop PIN surface', () => {
    setHash('#/workshop/studio');
    render(<WorkshopPage />);
    const tab = screen.getByRole('button', { name: /studio/i });
    expect(tab.getAttribute('aria-current')).toBe('page');
    expect(screen.getByText('What are we building today?')).toBeTruthy();
  });
});