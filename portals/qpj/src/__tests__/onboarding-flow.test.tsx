import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { OnboardingFlow } from '../pages/you/OnboardingFlow';
import { useQpjStore } from '../store/useQpjStore';
import { loadIdentity, setDeviceKey } from '../lib/identity';

describe('onboarding-flow — four steps to a verified DID', () => {
  beforeEach(async () => {
    localStorage.clear();
    const key = await crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt'],
    );
    setDeviceKey(key);
    useQpjStore.setState({
      mode: 'spark',
      passportId: 'dillpickle',
      caregiverPin: '1234',
      toast: null,
      identity: { status: 'none', identity: null },
    });
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('walks all four steps and creates a verified identity', async () => {
    render(<OnboardingFlow passportId="dillpickle" onDone={() => {}} />);

    // step 0: passport
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    // step 1: name + avatar
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    // step 2: pick a hue
    const hue = screen.getByLabelText('sky');
    fireEvent.click(hue);
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    // step 3: claim
    fireEvent.click(screen.getByRole('button', { name: /Claim my identity/ }));

    await waitFor(async () => {
      const id = await loadIdentity('dillpickle');
      expect(id).not.toBeNull();
      expect(id?.verified).toBe(true);
      expect(id?.did).toMatch(/^did:key:z/);
    }, { timeout: 3000 });
  });
});
