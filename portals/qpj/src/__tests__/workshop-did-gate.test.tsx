import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { ModeGuard } from '../components/ModeGuard';
import { useQpjStore } from '../store/useQpjStore';
import { setDeviceKey } from '../lib/identity';
import * as routes from '../lib/routes';

vi.mock('../lib/routes', () => ({
  navigateTo: vi.fn(),
}));

describe('ModeGuard — DID gate for workshop', () => {
  beforeEach(async () => {
    localStorage.clear();
    const key = await crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt'],
    );
    setDeviceKey(key);
  });

  afterEach(() => {
    localStorage.clear();
    vi.mocked(routes.navigateTo).mockClear();
  });

  it('workshop with a verified DID lets children through', async () => {
    useQpjStore.setState({
      mode: 'spark',
      passportId: 'dillpickle',
      caregiverPin: '1234',
      toast: null,
       identity: { status: 'ready', identity: { did: 'did:key:ztest', name: 'Dillpickle', avatar: '🧸', accentHue: 75, createdAt: 0, verified: true } },
    });

    render(
      <ModeGuard required="workshop" auth="did">
        <div data-testid="workshop-content">workshop</div>
      </ModeGuard>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('workshop-content')).toBeTruthy();
    });
    expect(useQpjStore.getState().mode).toBe('workshop');
  });

  it('workshop with no identity redirects to /you (no PIN prompt)', async () => {
    useQpjStore.setState({
      mode: 'spark',
      passportId: 'dillpickle',
      caregiverPin: '1234',
      toast: null,
      identity: { status: 'none', identity: null },
    });

    render(
      <ModeGuard required="workshop" auth="did">
        <div data-testid="workshop-content">workshop</div>
      </ModeGuard>,
    );

    expect(screen.queryByTestId('workshop-content')).toBeNull();
    expect(routes.navigateTo).toHaveBeenCalledWith('you');
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('craft keeps the caregiver PIN gate', async () => {
    useQpjStore.setState({
      mode: 'spark',
      passportId: 'dillpickle',
      caregiverPin: '1234',
      toast: null,
      identity: { status: 'none', identity: null },
    });

    render(
      <ModeGuard required="maker" auth="pin">
        <div data-testid="craft-content">craft</div>
      </ModeGuard>,
    );

    expect(screen.queryByTestId('craft-content')).toBeNull();
    expect(screen.getByRole('dialog')).toBeTruthy();
  });
});
