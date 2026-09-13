import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { ModeGuard } from '../components/ModeGuard';
import { canAccess } from '../lib/passports';
import { useQpjStore } from '../store/useQpjStore';

describe('mode-locks — progressive disclosure', () => {
  beforeEach(() => {
    useQpjStore.setState({
      mode: 'spark',
      passportId: 'dillpickle',
      caregiverPin: '1234',
      toast: null,
    });
  });

  afterEach(() => cleanup());

  it('canAccess ranks modes: spark < maker < workshop', () => {
    expect(canAccess('spark', 'maker')).toBe(false);
    expect(canAccess('spark', 'workshop')).toBe(false);
    expect(canAccess('maker', 'maker')).toBe(true);
    expect(canAccess('maker', 'workshop')).toBe(false);
    expect(canAccess('workshop', 'spark')).toBe(true);
  });

  it('spark mode renders ZERO workshop/craft children behind a maker route', () => {
    render(
      <ModeGuard required="maker" title="Locked shed">
        <div data-testid="secret-workshop-thing" />
      </ModeGuard>
    );

    expect(screen.queryByTestId('secret-workshop-thing')).toBeNull();
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(screen.getByText('Locked shed')).toBeTruthy();
  });

  it('a correct caregiver PIN elevates the session and reveals the content', () => {
    render(
      <ModeGuard required="maker" title="Locked shed">
        <div data-testid="secret-workshop-thing" />
      </ModeGuard>
    );

    expect(screen.queryByTestId('secret-workshop-thing')).toBeNull();

    fireEvent.change(screen.getByLabelText(/4-digit caregiver PIN/i), {
      target: { value: '1234' },
    });

    expect(screen.getByTestId('secret-workshop-thing')).toBeTruthy();
    expect(useQpjStore.getState().mode).toBe('maker');
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('a wrong PIN keeps the dialog up and does not elevate', () => {
    render(
      <ModeGuard required="maker" title="Locked shed">
        <div data-testid="secret-workshop-thing" />
      </ModeGuard>
    );

    fireEvent.change(screen.getByLabelText(/4-digit caregiver PIN/i), {
      target: { value: '0000' },
    });

    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(screen.queryByTestId('secret-workshop-thing')).toBeNull();
    expect(useQpjStore.getState().mode).toBe('spark');
  });
});