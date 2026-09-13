import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { PinChangeCard } from '../components/PinChangeCard';
import { useQpjStore, DEFAULT_CAREGIVER_PIN, mergePersistedQpj, type QpjState } from '../store/useQpjStore';

function defaultState(): QpjState {
  return useQpjStore.getInitialState();
}

describe('pin change — caregiver door', () => {
  beforeEach(() => {
    useQpjStore.setState({
      mode: 'workshop',
      passportId: 'gherkin',
      caregiverPin: DEFAULT_CAREGIVER_PIN,
      caregiverPinSet: false,
      toast: null,
    });
  });

  afterEach(() => cleanup());

  it('starts on the factory-default 4-digit PIN that everyone can use', () => {
    expect(DEFAULT_CAREGIVER_PIN).toBe('1234');
    expect(useQpjStore.getState().caregiverPin).toBe('1234');
    expect(useQpjStore.getState().caregiverPinSet).toBe(false);
  });

  it('verifies the current PIN before revealing the new-PIN step', async () => {
    render(<PinChangeCard />);
    fireEvent.click(screen.getByRole('button', { name: /change caregiver pin/i }));

    expect(screen.getByRole('dialog', { name: /current caregiver pin/i })).toBeTruthy();

    fireEvent.change(screen.getByLabelText(/4-digit caregiver pin/i), { target: { value: '9999' } });
    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: /current caregiver pin/i })).toBeTruthy();
    });
    expect(useQpjStore.getState().caregiverPin).toBe('1234');

    fireEvent.change(screen.getByLabelText(/4-digit caregiver pin/i), { target: { value: '1234' } });
    await waitFor(() => {
      expect(screen.getByLabelText(/new 4-digit caregiver pin/i)).toBeTruthy();
    });
  });

  it('rejects a malformed new PIN and keeps the old one', async () => {
    useQpjStore.setState({ caregiverPinSet: true });
    render(<PinChangeCard />);
    fireEvent.click(screen.getByRole('button', { name: /change caregiver pin/i }));
    fireEvent.change(screen.getByLabelText(/4-digit caregiver pin/i), { target: { value: '1234' } });
    await waitFor(() => {
      expect(screen.getByLabelText(/new 4-digit caregiver pin/i)).toBeTruthy();
    });

    fireEvent.change(screen.getByLabelText(/new 4-digit caregiver pin/i), { target: { value: 'abc' } });
    expect(useQpjStore.getState().caregiverPin).toBe('1234');
    expect(useQpjStore.getState().caregiverPinSet).toBe(true);

    fireEvent.change(screen.getByLabelText(/new 4-digit caregiver pin/i), { target: { value: '12' } });
    expect(useQpjStore.getState().caregiverPin).toBe('1234');
  });

  it('sets and marks a custom PIN once four digits land', async () => {
    render(<PinChangeCard />);
    fireEvent.click(screen.getByRole('button', { name: /change caregiver pin/i }));
    fireEvent.change(screen.getByLabelText(/4-digit caregiver pin/i), { target: { value: '1234' } });
    await waitFor(() => {
      expect(screen.getByLabelText(/new 4-digit caregiver pin/i)).toBeTruthy();
    });

    fireEvent.change(screen.getByLabelText(/new 4-digit caregiver pin/i), { target: { value: '9876' } });
    await waitFor(() => {
      expect(useQpjStore.getState().caregiverPin).toBe('9876');
    });
    expect(useQpjStore.getState().caregiverPinSet).toBe(true);
  });
});

describe('caregiver PIN migration — locked-out family rescue', () => {
  it('resets a persisted random PIN to the factory default when it was never set', () => {
    const merged = mergePersistedQpj(
      { caregiverPin: '4872', caregiverPinSet: false } as Partial<QpjState>,
      defaultState(),
    );
    expect(merged.caregiverPin).toBe('1234');
    expect(merged.caregiverPinSet).toBe(false);
  });

  it('keeps a PIN the caregiver explicitly set', () => {
    const merged = mergePersistedQpj(
      { caregiverPin: '9876', caregiverPinSet: true } as Partial<QpjState>,
      defaultState(),
    );
    expect(merged.caregiverPin).toBe('9876');
    expect(merged.caregiverPinSet).toBe(true);
  });

  it('defaults an empty persisted PIN to the factory default too', () => {
    const merged = mergePersistedQpj({} as Partial<QpjState>, defaultState());
    expect(merged.caregiverPin).toBe('1234');
    expect(merged.caregiverPinSet).toBe(false);
  });
});