import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, cleanup } from '@testing-library/react';
import { useSensorySync } from '../hooks/useSensorySync';
import { useQpjStore } from '../store/useQpjStore';

const mockUpdate = vi.fn();
const mockGetProfile = vi.fn(() => ({
  tetrahedron: {
    vertices: [
      { type: 'did' as const, value: '' },
      {
        type: 'reputation' as const,
        value: { careScore: 0.5, trustTier: 0, sbts: [], loveBalance: 0 },
      },
      {
        type: 'preferences' as const,
        value: {
          spoons: 3,
          spoonQuadrants: [3, 3, 3, 3],
          darkMode: false,
          reduceMotion: false,
          soundEffects: true,
          mood: null,
          motionScale: 0.8,
          soundScale: 0.5,
          contrastTarget: 'AAA' as const,
          density: 'compact' as const,
          breathPattern: '5-5-5' as const,
          zeitgeber: { tone: true, freq: 172.35 },
        },
      },
      {
        type: 'relations' as const,
        value: { familyDid: null, guardianDid: null, meshPeers: [], caregiverPin: '' },
      },
    ],
  },
}));

vi.mock('@p31/sovereign-core', () => ({
  getProfile: () => mockGetProfile(),
  updateTetrahedronVertex: (...args: unknown[]) => mockUpdate(...args),
}));

describe('useSensorySync', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockUpdate.mockClear();
    localStorage.clear();
    useQpjStore.setState({
      motionScale: 1,
      soundScale: 0.6,
      contrastTarget: 'AA',
      density: 'comfortable',
      breathPattern: '4-4-6',
      zeitgeber: { tone: false, freq: 863 },
      spoonQuadrants: [3, 3, 3, 3],
      mood: null,
      reduceMotion: false,
      soundEffects: true,
      darkMode: false,
      spoons: 3,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    cleanup();
  });

  it('hydrates store from tetrahedron on mount', () => {
    renderHook(() => useSensorySync());
    const s = useQpjStore.getState();
    expect(s.motionScale).toBe(0.8);
    expect(s.soundScale).toBe(0.5);
    expect(s.contrastTarget).toBe('AAA');
    expect(s.density).toBe('compact');
    expect(s.breathPattern).toBe('5-5-5');
    expect(s.zeitgeber.tone).toBe(true);
    expect(s.zeitgeber.freq).toBe(172.35);
    expect(s.reduceMotion).toBe(false);
    expect(s.soundEffects).toBe(true);
  });

  it('does not write to tetrahedron during boot hydration', () => {
    renderHook(() => useSensorySync());
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('debounces continuous slider changes', () => {
    renderHook(() => useSensorySync());
    mockUpdate.mockClear();

    useQpjStore.getState().setMotionScale(0.9);
    useQpjStore.getState().setMotionScale(0.8);
    useQpjStore.getState().setMotionScale(0.7);

    expect(mockUpdate).not.toHaveBeenCalled();

    vi.advanceTimersByTime(300);
    expect(mockUpdate).toHaveBeenCalledTimes(1);
    expect(mockUpdate.mock.calls[0][0]).toBe(2);
    expect(mockUpdate.mock.calls[0][1].motionScale).toBe(0.7);
  });

  it('flushes immediately on discrete change', () => {
    renderHook(() => useSensorySync());
    mockUpdate.mockClear();

    useQpjStore.getState().setBreathPattern('4-7-8');

    expect(mockUpdate).toHaveBeenCalledTimes(1);
    expect(mockUpdate.mock.calls[0][1].breathPattern).toBe('4-7-8');
  });

  it('flushes pending write on pagehide', () => {
    renderHook(() => useSensorySync());
    mockUpdate.mockClear();

    useQpjStore.getState().setMotionScale(0.4);
    window.dispatchEvent(new Event('pagehide'));

    expect(mockUpdate).toHaveBeenCalledTimes(1);
    expect(mockUpdate.mock.calls[0][1].motionScale).toBe(0.4);
  });

  it('flushes pending write on visibilitychange (hidden)', () => {
    renderHook(() => useSensorySync());
    mockUpdate.mockClear();

    useQpjStore.getState().setSoundScale(0.3);
    Object.defineProperty(document, 'hidden', { value: true, configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));

    expect(mockUpdate).toHaveBeenCalledTimes(1);
    expect(mockUpdate.mock.calls[0][1].soundScale).toBe(0.3);
  });
});
