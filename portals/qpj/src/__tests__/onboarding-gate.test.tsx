import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { EntryPage } from '../pages/EntryPage';
import { StreetPage } from '../pages/StreetPage';
import { TalkPage } from '../pages/TalkPage';
import { AvatarMenu } from '../components/AvatarMenu';
import { useQpjStore } from '../store/useQpjStore';
import { createIdentity, setDeviceKey, type Identity } from '../lib/identity';
import { hashToPath, routeForPath } from '../lib/routes';

const COPY = 'Set up your shelf to keep what you make — keys stay on this device.';

const READY_IDENTITY: Identity = {
  did: 'did:key:z6MkTest',
  name: 'Dillpickle',
  avatar: '🧸',
  accentHue: 75,
  createdAt: 1,
  verified: true,
};

async function seedDeviceKey() {
  const key = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt'],
  );
  setDeviceKey(key);
}

async function seedReadyIdentity() {
  await seedDeviceKey();
  await createIdentity('dillpickle', { name: 'Dillpickle', avatar: '🧸', accentHue: 75 });
  useQpjStore.setState({ identity: { status: 'none', identity: null } });
}

describe('onboarding gate — #/entry', () => {
  beforeEach(async () => {
    localStorage.clear();
    await seedDeviceKey();
    useQpjStore.setState({
      mode: 'spark',
      passportId: 'dillpickle',
      caregiverPin: '1234',
      toast: null,
      talkTarget: 'family',
      identity: { status: 'none', identity: null },
    });
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  it('resolves #/entry as the external front door route', () => {
    expect(hashToPath('#/entry')).toBe('/entry');
    expect(routeForPath('/entry')).toBe('entry');
    expect(routeForPath('/entry')).not.toBe('street');
  });

  it('renders the onboarding flow for a first-run guest', async () => {
    render(<EntryPage />);
    const flow = await screen.findByRole('region', { name: 'Set up your identity' });
    expect(flow).toBeTruthy();
  });

  it('shows the ready card once an identity already exists', async () => {
    await seedReadyIdentity();
    render(<EntryPage />);
    expect(await screen.findByText(/Your shelf is set up/)).toBeTruthy();
  });

  it('completing onboarding from the gate flips the store to ready and lands on the street', async () => {
    render(<EntryPage />);
    await screen.findByRole('button', { name: 'Next' });

    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    fireEvent.click(screen.getByLabelText('sage'));
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    fireEvent.click(screen.getByRole('button', { name: /Claim my identity/ }));

    await waitFor(() => {
      expect(useQpjStore.getState().identity.status).toBe('ready');
      expect(window.location.hash).toBe('#/street');
    });
  });
});

describe('onboarding gate — street guest banner', () => {
  beforeEach(() => {
    localStorage.clear();
    useQpjStore.setState({
      mode: 'spark',
      passportId: 'dillpickle',
      caregiverPin: '1234',
      toast: null,
      identity: { status: 'none', identity: null },
    });
  });

  afterEach(() => cleanup());

  it('shows the quiet set-up banner for guests and hides it once ready', () => {
    const { rerender } = render(<StreetPage />);
    expect(screen.getByText(/Set up your shelf to keep what you make/)).toBeTruthy();
    expect(screen.getByText(/keys stay on this device/)).toBeTruthy();

    useQpjStore.setState({ identity: { status: 'ready', identity: READY_IDENTITY } });
    rerender(<StreetPage />);
    expect(screen.queryByText(/Set up your shelf/)).toBeNull();
    expect(screen.queryByText(/keys stay on this device/)).toBeNull();
  });
});

describe('onboarding gate — talk prompt-on-trigger', () => {
  beforeEach(() => {
    localStorage.clear();
    useQpjStore.setState({
      mode: 'spark',
      passportId: 'dillpickle',
      caregiverPin: '1234',
      toast: null,
      talkTarget: 'family',
      talkMessages: [],
      identity: { status: 'none', identity: null },
    });
  });

  afterEach(() => cleanup());

  it('guests sending a message get the set-up nudge but can still send as guest', () => {
    render(<TalkPage />);
    fireEvent.change(screen.getByLabelText(/Message Family notebook/), {
      target: { value: 'hi fam' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send message' }));

    expect(screen.getByRole('dialog', { name: 'Set up your shelf' })).toBeTruthy();
    expect(useQpjStore.getState().talkMessages.length).toBe(0);

    fireEvent.click(screen.getByRole('button', { name: 'Send as guest' }));
    expect(screen.queryByRole('dialog', { name: 'Set up your shelf' })).toBeNull();
    expect(useQpjStore.getState().talkMessages.length).toBe(1);
    expect(useQpjStore.getState().talkMessages[0].body).toBe('hi fam');
  });

  it('guests who choose set-up navigate to the entry gate', async () => {
    render(<TalkPage />);
    fireEvent.change(screen.getByLabelText(/Message Family notebook/), {
      target: { value: 'draft' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send message' }));

    fireEvent.click(screen.getByRole('button', { name: /Set up your shelf/ }));
    expect(window.location.hash).toBe('#/entry');
  });
});

describe('onboarding gate — topbar one-tap switcher', () => {
  beforeEach(() => {
    localStorage.clear();
    useQpjStore.setState({
      mode: 'spark',
      passportId: 'dillpickle',
      caregiverPin: '1234',
      toast: null,
      identity: { status: 'none', identity: null },
    });
  });

  afterEach(() => cleanup());

  it('avatar menu swaps passengers in one tap, without any confirm', () => {
    render(
      <AvatarMenu
        passportId="dillpickle"
        open
        onRequestOpen={() => {}}
        onClose={() => {}}
        onSwitchPersona={() => {}}
        onWorkshop={() => {}}
        onRestartDay={() => {}}
      />,
    );

    const halfSourBtn = screen.getByRole('button', { name: 'Switch to Half-Sour' });
    fireEvent.click(halfSourBtn);

    expect(useQpjStore.getState().passportId).toBe('halfsour');
    expect(useQpjStore.getState().toast?.message).toContain('Half-Sour');
    expect(window.location.hash).toBe('#/street');
  });
});