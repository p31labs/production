/**
 * The music maker — guided tour state.
 *
 * Pins the gradual-reveal logic: the tour shows the FIRST undone step,
 * completing any step completes the earlier ones, completing the last step
 * dismisses the tour, and skip persists.
 */
import { describe, expect, it, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTourState } from './useTourState';

describe('useTourState', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('starts on the identity (welcome) card', () => {
    const { result } = renderHook(() => useTourState());
    expect(result.current.currentStep).toBe('welcome');
  });

  it('advances one step at a time in order', () => {
    const { result } = renderHook(() => useTourState());
    act(() => result.current.markDone('welcome'));
    expect(result.current.currentStep).toBe('look');
    act(() => result.current.markDone('look'));
    expect(result.current.currentStep).toBe('place');
    act(() => result.current.markDone('place'));
    expect(result.current.currentStep).toBe('play');
  });

  it('completing the last step dismisses the tour', () => {
    const { result } = renderHook(() => useTourState());
    act(() => result.current.markDone('play'));
    expect(result.current.currentStep).toBeNull();
  });

  it('completing a later step completes the earlier ones too', () => {
    const { result } = renderHook(() => useTourState());
    act(() => result.current.markDone('place'));
    // place implies look — the tour jumps straight to the next undone step.
    expect(result.current.currentStep).toBe('play');
  });

  it('dismiss persists and stays dismissed across renders', () => {
    const { result } = renderHook(() => useTourState());
    act(() => result.current.dismiss());
    expect(result.current.currentStep).toBeNull();
    const again = renderHook(() => useTourState());
    expect(again.result.current.currentStep).toBeNull();
  });
});