import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { ONBOARDING_STEPS, KEY_LOSS_COPY, getAllOnboardingCopy } from '../pages/you/onboarding-copy';
import { OnboardingFlow } from '../pages/you/OnboardingFlow';
import { PostEntryChecklist } from '../components/PostEntryChecklist';
import { useQpjStore } from '../store/useQpjStore';

const { claimed } = vi.hoisted(() => ({ claimed: { value: false } }));

vi.mock('@p31/sovereign-core', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...(actual as Record<string, unknown>),
    hasSBTMilestone: () => claimed.value,
  };
});

const NAMES = ['Dillpickle', 'Bread & Butter', 'Cornichon', 'Gherkin', 'Half-Sour'];

beforeEach(() => {
  claimed.value = false;
  useQpjStore.setState({
    mode: 'spark',
    passportId: 'dillpickle',
    caregiverPin: '1234',
    toast: null,
    reduceMotion: false,
    meshSeen: false,
    hasUnlockedMode: false,
    badgeDone: false,
    onboardingChecklistDismissed: false,
  });
});

afterEach(() => cleanup());

describe('onboarding copy — language layer', () => {
  it('has exactly four steps in order', () => {
    expect(ONBOARDING_STEPS).toHaveLength(4);
    expect(ONBOARDING_STEPS.map((s) => s.key)).toEqual(['passport', 'label', 'hue', 'keys']);
    for (const step of ONBOARDING_STEPS) {
      expect(step.eyebrow.length).toBeGreaterThan(0);
      expect(step.heading.length).toBeGreaterThan(0);
      expect(step.body.length).toBeGreaterThan(0);
      expect(step.consequence.length).toBeGreaterThan(0);
    }
  });

  it('contains no hardcoded passenger names', () => {
    const copy = getAllOnboardingCopy();
    for (const name of NAMES) {
      expect(copy).not.toContain(name);
    }
  });

  it('addresses key-loss anxiety before the claim step', () => {
    const keysStep = ONBOARDING_STEPS[3];
    expect(keysStep.consequence).toBe(KEY_LOSS_COPY);
    expect(KEY_LOSS_COPY).toMatch(/lives on this device/);
    expect(KEY_LOSS_COPY).toMatch(/backup/);
  });

  it('each consequence names what the step changed', () => {
    expect(ONBOARDING_STEPS[2].consequence).toContain('Your hue is set');
    expect(ONBOARDING_STEPS[1].consequence).toContain('label');
    expect(ONBOARDING_STEPS[0].consequence).toContain('one shelf');
  });
});

describe('onboarding flow — consequence + key-loss', () => {
  it('renders a visible consequence after each step', () => {
    render(<OnboardingFlow passportId="dillpickle" onDone={() => {}} />);

    expect(screen.getByText(/This device now speaks for one shelf/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByText(/You will show up by this label/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByText(/Your hue is set/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByText(/lives on this device/)).toBeTruthy();
  });

  it('keeps the claim action last, after the key-loss copy', () => {
    render(<OnboardingFlow passportId="dillpickle" onDone={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));

    const claim = screen.getByRole('button', { name: /Claim my identity/ });
    const copy = screen.getByText(/lives on this device/);
    expect(claim).toBeTruthy();
    expect(copy.compareDocumentPosition(claim) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});

describe('post-entry checklist', () => {
  it('renders three items and a progress ring when nothing is done', () => {
    render(<PostEntryChecklist />);
    const items = document.querySelectorAll('.checklist__item');
    expect(items.length).toBe(3);
    expect(document.querySelector('.checklist__ring')).toBeTruthy();
    expect(screen.getByText(/Claim your pickle badge/)).toBeTruthy();
    expect(screen.getByText(/Meet the mesh/)).toBeTruthy();
    expect(screen.getByText(/Unlock your first mode/)).toBeTruthy();
  });

  it('auto-checks the badge when claimed_space mints (live store flag)', () => {
    useQpjStore.setState({ badgeDone: true });
    render(<PostEntryChecklist />);
    const items = document.querySelectorAll('.checklist__item');
    expect(items[0]?.classList.contains('is-done')).toBe(true);
    expect(items[1]?.classList.contains('is-done')).toBe(false);
  });

  it('hydrates a legacy claimed milestone at mount', () => {
    claimed.value = true;
    render(<PostEntryChecklist />);
    const items = document.querySelectorAll('.checklist__item');
    expect(items[0]?.classList.contains('is-done')).toBe(true);
    expect(items[1]?.classList.contains('is-done')).toBe(false);
  });

  it('auto-checks mesh and mode via store flags', () => {
    useQpjStore.setState({ meshSeen: true, hasUnlockedMode: true });
    render(<PostEntryChecklist />);
    const items = document.querySelectorAll('.checklist__item');
    expect(items[0]?.classList.contains('is-done')).toBe(false);
    expect(items[1]?.classList.contains('is-done')).toBe(true);
    expect(items[2]?.classList.contains('is-done')).toBe(true);
  });

  it('hides for returning users who finished everything', () => {
    claimed.value = true;
    useQpjStore.setState({ meshSeen: true, hasUnlockedMode: true });
    const { container } = render(<PostEntryChecklist />);
    expect(container.querySelector('.checklist')).toBeNull();
  });

  it('celebrates the all-done transition with a static badge in reduced-motion', async () => {
    claimed.value = true;
    useQpjStore.setState({ meshSeen: true, reduceMotion: true });
    render(<PostEntryChecklist />);

    useQpjStore.setState({ hasUnlockedMode: true });

    await waitFor(() => expect(screen.getByRole('status')).toBeTruthy());
    const status = screen.getByRole('status');
    expect(status.getAttribute('data-static')).toBe('true');
    expect(status.textContent).toContain('All three done');
    expect(document.querySelector('.checklist__ring')).toBeNull();
  });

  it('dismisses and stays hidden', () => {
    render(<PostEntryChecklist />);
    expect(document.querySelector('.checklist')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(document.querySelector('.checklist')).toBeNull();
    expect(useQpjStore.getState().onboardingChecklistDismissed).toBe(true);
  });
});

describe('store — unlock signals', () => {
  it('elevating past the spark default marks hasUnlockedMode', () => {
    useQpjStore.setState({ passportId: 'dillpickle', hasUnlockedMode: false });
    expect(useQpjStore.getState().mode).toBe('spark');
    useQpjStore.getState().setMode('maker');
    expect(useQpjStore.getState().hasUnlockedMode).toBe(true);
  });

  it('staying at the default mode does not mark it', () => {
    useQpjStore.setState({ passportId: 'dillpickle', hasUnlockedMode: false });
    useQpjStore.getState().setMode('spark');
    expect(useQpjStore.getState().hasUnlockedMode).toBe(false);
  });

  it('markBadgeDone sets the durable badge flag', () => {
    useQpjStore.setState({ badgeDone: false });
    useQpjStore.getState().markBadgeDone();
    expect(useQpjStore.getState().badgeDone).toBe(true);
  });
});