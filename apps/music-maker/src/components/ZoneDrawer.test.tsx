import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen, fireEvent } from '@testing-library/react';
import { ZoneDrawer } from './ZoneDrawer';
import type { MusicZone } from '../scene/musicZone';

afterEach(cleanup);

/**
 * The selected-zone inspector (drawer) — pins the committed rename + clear
 * surfaces and the family play history.
 */

const ZONE: MusicZone = { id: 'zone:a', position: [1, 0, 0], timbre: 'hydrogen', name: 'the sun' };

function base() {
  return {
    onRename: vi.fn(),
    onClear: vi.fn(),
    onClose: vi.fn(),
    announce: vi.fn(),
    playCount: 0,
    recentPlays: [] as Array<{ author: string; at: number }>,
  };
}

describe('ZoneDrawer', () => {
  it('renders nothing when no zone is selected', () => {
    const { container } = render(<ZoneDrawer zone={null} {...base()} />);
    expect(container.querySelector('.mm-drawer')).toBeNull();
  });

  it('shows the selected zone timbre + name', () => {
    render(<ZoneDrawer zone={ZONE} {...base()} />);
    expect(screen.getByText('the sun')).toBeTruthy();
    expect(screen.getByText('hydrogen')).toBeTruthy();
  });

  it('shows the position and the family play history', () => {
    render(
      <ZoneDrawer
        zone={ZONE}
        {...base()}
        playCount={3}
        recentPlays={[{ author: 'Cornichon', at: Date.now() - 120_000 }]}
      />,
    );
    expect(screen.getByText(/heard here/)).toBeTruthy();
    expect(screen.getByText('3 times')).toBeTruthy();
    expect(screen.getByText(/Cornichon/)).toBeTruthy();
  });

  it('renames through the committed onRename callback', () => {
    const { onRename, announce } = base();
    render(<ZoneDrawer zone={ZONE} onRename={onRename} onClear={vi.fn()} onClose={vi.fn()} announce={announce} playCount={0} recentPlays={[]} />);
    const input = document.getElementById('mm-zone-name') as HTMLInputElement;
    act(() => {
      fireEvent.change(input, { target: { value: 'the moon' } });
    });
    act(() => {
      fireEvent.submit(input.closest('form')!);
    });
    expect(onRename).toHaveBeenCalledWith('zone:a', 'the moon');
    expect(announce).toHaveBeenCalledWith('this zone is now called the moon');
  });

  it('clears the zone through the committed onClear callback', () => {
    const { onClear } = base();
    render(<ZoneDrawer zone={ZONE} onRename={vi.fn()} onClear={onClear} onClose={vi.fn()} announce={vi.fn()} playCount={0} recentPlays={[]} />);
    const btn = screen.getByRole('button', { name: 'clear this zone' });
    fireEvent.click(btn);
    expect(onClear).toHaveBeenCalledWith('zone:a');
  });

  it('closes via the close button', () => {
    const { onClose } = base();
    render(<ZoneDrawer zone={ZONE} onRename={vi.fn()} onClear={vi.fn()} onClose={onClose} announce={vi.fn()} playCount={0} recentPlays={[]} />);
    const btn = screen.getByRole('button', { name: 'close the zone panel' });
    fireEvent.click(btn);
    expect(onClose).toHaveBeenCalled();
  });
});