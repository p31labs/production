import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, act, fireEvent } from '@testing-library/react';
import { CrisisOverlay } from '../components/CrisisOverlay';
import { CommandPalette, qpjCommands, runQpjCommand } from '../components/CommandPalette';
import { useQpjStore, DEFAULT_SPOONS } from '../store/useQpjStore';
import { useNotifStore } from '../store/useNotifStore';

beforeEach(() => {
  useQpjStore.setState({
    mode: 'spark',
    passportId: 'dillpickle',
    caregiverPin: '1234',
    spoons: DEFAULT_SPOONS,
    reduceMotion: false,
  });
  useNotifStore.setState({ items: [], seq: 0 });
});

afterEach(() => {
  cleanup();
});

describe('CrisisOverlay', () => {
  it('renders nothing while spoons are above zero', () => {
    useQpjStore.setState({ spoons: 2 });
    const { container } = render(<CrisisOverlay />);
    expect(container.textContent).toBe('');
  });

  it('opens when spoons fall to zero', () => {
    useQpjStore.setState({ spoons: 1 });
    render(<CrisisOverlay />);
    expect(screen.queryByText('The jar is running low')).toBeNull();
    act(() => useQpjStore.setState({ spoons: 0 }));
    expect(screen.getByText('The jar is running low')).toBeTruthy();
    expect(screen.getByRole('dialog').getAttribute('data-crisis')).toBe('true');
  });

  it('rest the day refills the jar and closes', () => {
    useQpjStore.setState({ spoons: 1 });
    render(<CrisisOverlay />);
    act(() => useQpjStore.setState({ spoons: 0 }));
    fireEvent.click(screen.getByRole('button', { name: 'Rest the day' }));
    expect(useQpjStore.getState().spoons).toBe(DEFAULT_SPOONS);
    expect(screen.queryByText('The jar is running low')).toBeNull();
    expect(useNotifStore.getState().items).toHaveLength(1);
  });

  it('keep going dismisses without refilling', () => {
    useQpjStore.setState({ spoons: 1 });
    render(<CrisisOverlay />);
    act(() => useQpjStore.setState({ spoons: 0 }));
    fireEvent.click(screen.getByRole('button', { name: 'Keep going' }));
    expect(useQpjStore.getState().spoons).toBe(0);
    expect(screen.queryByText('The jar is running low')).toBeNull();
  });

  it('escape dismisses and does not nag again while still at zero', () => {
    useQpjStore.setState({ spoons: 1 });
    render(<CrisisOverlay />);
    act(() => useQpjStore.setState({ spoons: 0 }));
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByText('The jar is running low')).toBeNull();
    expect(screen.queryByText('The jar is running low')).toBeNull();
  });

  it('re-entering zero after climbing back triggers it again', () => {
    useQpjStore.setState({ spoons: 1 });
    render(<CrisisOverlay />);
    act(() => useQpjStore.setState({ spoons: 0 }));
    fireEvent.click(screen.getByRole('button', { name: 'Keep going' }));
    act(() => useQpjStore.setState({ spoons: 2 }));
    expect(screen.queryByText('The jar is running low')).toBeNull();
    act(() => useQpjStore.setState({ spoons: 0 }));
    expect(screen.getByText('The jar is running low')).toBeTruthy();
  });
});

describe('CommandPalette', () => {
  const jump = () => screen.getByPlaceholderText('Jump to a door…');

  it('opens on ⌘K / Ctrl+K and closes on Escape', () => {
    render(<CommandPalette />);
    expect(screen.queryByRole('dialog')).toBeNull();
    fireEvent.keyDown(window, { key: 'k', metaKey: true });
    expect(screen.getByRole('dialog')).toBeTruthy();
    fireEvent.keyDown(jump(), { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('hides maker+ doors a spark cannot reach', () => {
    useQpjStore.setState({ mode: 'spark' });
    render(<CommandPalette />);
    fireEvent.keyDown(window, { key: 'k', metaKey: true });
    expect(screen.queryByText('Workshop')).toBeNull();
    expect(screen.queryByText('Craft')).toBeNull();
    expect(screen.getByText('Street')).toBeTruthy();
    expect(screen.getByText('Rest the day')).toBeTruthy();
  });

  it('shows workshop doors once the mode allows', () => {
    useQpjStore.setState({ mode: 'workshop' });
    render(<CommandPalette />);
    fireEvent.keyDown(window, { key: 'k', metaKey: true });
    expect(screen.getByText('Workshop')).toBeTruthy();
    expect(screen.getByText('Craft')).toBeTruthy();
  });

  it('filters commands and executes with Enter', () => {
    useQpjStore.setState({ mode: 'spark' });
    render(<CommandPalette />);
    fireEvent.keyDown(window, { key: 'k', metaKey: true });
    fireEvent.change(jump(), { target: { value: 'rest' } });
    expect(screen.getByText('Rest the day')).toBeTruthy();
    expect(screen.queryByText('Street')).toBeNull();
    fireEvent.keyDown(jump(), { key: 'Enter' });
    expect(useQpjStore.getState().spoons).toBe(DEFAULT_SPOONS);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('executes a navigation command and follows the route', () => {
    useQpjStore.setState({ mode: 'spark' });
    render(<CommandPalette />);
    fireEvent.keyDown(window, { key: 'k', ctrlKey: true });
    fireEvent.change(jump(), { target: { value: 'switch' } });
    fireEvent.keyDown(jump(), { key: 'Enter' });
    expect(window.location.hash).toContain('/switch');
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('builds mode-filtered commands and dispatches them', () => {
    const sparkLabels = qpjCommands('spark').map((c) => c.label);
    expect(sparkLabels).toContain('Street');
    expect(sparkLabels).not.toContain('Workshop');
    expect(sparkLabels).not.toContain('Craft');
    const workshopLabels = qpjCommands('workshop').map((c) => c.label);
    expect(workshopLabels).toContain('Workshop');
    expect(workshopLabels).toContain('Craft');

    runQpjCommand('action:restart');
    expect(useQpjStore.getState().spoons).toBe(DEFAULT_SPOONS);
    expect(useNotifStore.getState().items).toHaveLength(1);
  });
});