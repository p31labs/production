import { renderHook, act, cleanup } from '@testing-library/react'
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { usePresentationState } from './usePresentationState'
import type { PresentationPrefs } from './profile'

afterEach(() => {
  cleanup()
  localStorage.clear()
})

const SEED: PresentationPrefs = {
  density: 'comfortable',
  motion: 'full',
  saturation: 'normal',
  literalLabels: false,
  letterSpacing: 'normal',
  lineSpacing: 'normal',
}

beforeEach(() => {
  vi.stubGlobal('localStorage', (() => {
    let store: Record<string, string> = {}
    return {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => { store[k] = v },
      removeItem: (k: string) => { delete store[k] },
      clear: () => { store = {} },
    }
  })())
})

describe('usePresentationState', () => {
  it('seeds from the profile-resolved prefs', () => {
    const { result } = renderHook(() => usePresentationState(SEED))
    expect(result.current.motion).toBe('full')
    expect(result.current.saturation).toBe('normal')
    expect(result.current.density).toBe('comfortable')
    expect(result.current.literalLabels).toBe(false)
    expect(result.current.calm).toBe(false)
  })

  it('Calm mode applies the low-stimulation preset', () => {
    const { result } = renderHook(() => usePresentationState(SEED))
    act(() => result.current.toggleCalm())
    expect(result.current.calm).toBe(true)
    expect(result.current.motion).toBe('reduced')
    expect(result.current.saturation).toBe('muted')
    expect(result.current.density).toBe('spacious')
    expect(result.current.literalLabels).toBe(true)
  })

  it('Calm mode is reversible', () => {
    const { result } = renderHook(() => usePresentationState(SEED))
    act(() => result.current.toggleCalm())
    act(() => result.current.toggleCalm())
    expect(result.current.calm).toBe(false)
    expect(result.current.motion).toBe('full')
    expect(result.current.saturation).toBe('normal')
  })

  it('persists axis changes to localStorage', () => {
    const { result } = renderHook(() => usePresentationState(SEED))
    act(() => result.current.setSaturation('muted'))
    const raw = JSON.parse(localStorage.getItem('loom:presentation') ?? '{}')
    expect(raw.saturation).toBe('muted')
  })
})