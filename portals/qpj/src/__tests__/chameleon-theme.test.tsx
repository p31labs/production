import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup, waitFor, fireEvent } from '@testing-library/react';
import { Chameleon } from '@p31ca/design-core/compositions';
import { useThemeStore } from '@p31ca/design-core/theming/theme-store';
import { useQpjStore } from '../store/useQpjStore';
import { useThemeEffects } from '../hooks/useThemeEffects';
import { ThemeCharm } from '../components/ThemeCharm';

function ThemeWrapper() {
  useThemeEffects();
  return <div data-testid="theme-wrapper" />;
}

describe('chameleon-theme — foundation', () => {
  beforeEach(() => {
    useQpjStore.setState({
      mode: 'spark',
      passportId: 'dillpickle',
      caregiverPin: '1234',
      toast: null,
    });
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.removeAttribute('data-age');
    document.documentElement.removeAttribute('data-brand');
    for (const key of Object.keys(document.documentElement.style)) {
      document.documentElement.style.removeProperty(key);
    }
  });

  afterEach(() => cleanup());

  it('renders the Chameleon control from design-core', () => {
    render(<Chameleon />);
    expect(screen.getByRole('button', { name: /Adaptive theme controls/i })).toBeTruthy();
  });

  it('theme change applies tokens to <html> via Chameleon', async () => {
    render(<Chameleon />);
    useThemeStore.getState().setTheme('garden');
    await waitFor(() => {
      expect(document.documentElement.getAttribute('data-theme')).toBe('garden');
    });
  });

  it('workshop warm-dark survives Chameleon token swaps', async () => {
    useQpjStore.setState({ mode: 'workshop', passportId: 'dillpickle' });
    render(<ThemeWrapper />);

    expect(document.documentElement.style.getPropertyValue('--p31-bg')).toBe('oklch(15% 0.02 75)');

    useThemeStore.getState().setTheme('garden');
    await waitFor(() => {
      expect(document.documentElement.style.getPropertyValue('--p31-bg')).toBe('oklch(15% 0.02 75)');
    });
    expect(document.documentElement.style.getPropertyValue('--p31-text')).toBe('oklch(92% 0.008 75)');
  });

  it('does not override workshop tokens when not in workshop mode', async () => {
    useQpjStore.setState({ mode: 'spark', passportId: 'dillpickle' });
    render(<ThemeWrapper />);

    useThemeStore.getState().setTheme('garden');
    await waitFor(() => {
      expect(document.documentElement.getAttribute('data-theme')).toBe('garden');
    });
    expect(useQpjStore.getState().mode).toBe('spark');
  });
});

describe('theme packs — Space default, Lantern chooseable', () => {
  beforeEach(() => {
    useQpjStore.setState({
      mode: 'spark',
      passportId: 'dillpickle',
      qpjTheme: 'space',
      caregiverPin: '1234',
      toast: null,
    });
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.removeAttribute('data-age');
    document.documentElement.removeAttribute('data-brand');
    document.documentElement.removeAttribute('data-qpj-theme');
    for (const key of Object.keys(document.documentElement.style)) {
      document.documentElement.style.removeProperty(key);
    }
  });

  afterEach(() => cleanup());

  it('boots on the space pack with the starfield sky', () => {
    render(<ThemeWrapper />);
    expect(document.documentElement.getAttribute('data-qpj-theme')).toBe('space');
    expect(document.documentElement.style.getPropertyValue('--p31-bg')).toBe('oklch(15% 0.02 75)');
  });

  it('choosing the lantern pack restores the warm cream world in spark', async () => {
    render(<ThemeWrapper />);
    useQpjStore.getState().setQpjTheme('lantern');
    await waitFor(() => {
      expect(document.documentElement.getAttribute('data-qpj-theme')).toBe('lantern');
      expect(document.documentElement.style.getPropertyValue('--p31-bg')).toBe('oklch(98% 0.012 85)');
    });
  });

  it('workshop keeps the space pack even when lantern is chosen', async () => {
    useQpjStore.setState({ mode: 'workshop', qpjTheme: 'lantern' });
    render(<ThemeWrapper />);
    await waitFor(() => {
      expect(document.documentElement.style.getPropertyValue('--p31-bg')).toBe('oklch(15% 0.02 75)');
    });
  });

  it('lantern pack beats a design-core world swap in spark', async () => {
    useQpjStore.setState({ qpjTheme: 'lantern' });
    render(<ThemeWrapper />);
    useThemeStore.getState().setTheme('zen');
    await waitFor(() => {
      expect(document.documentElement.style.getPropertyValue('--p31-bg')).toBe('oklch(98% 0.012 85)');
    });
  });

  it('ThemeCharm exposes both packs and applies the picked one', async () => {
    render(<ThemeCharm />);
    fireEvent.click(screen.getByRole('button', { name: /Theme pack and adaptive appearance/i }));
    expect(screen.getByRole('button', { name: /Space/ })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Lantern/ }));
    await waitFor(() => {
      expect(useQpjStore.getState().qpjTheme).toBe('lantern');
      expect(document.documentElement.style.getPropertyValue('--p31-bg')).toBe('oklch(98% 0.012 85)');
    });
  });
});
