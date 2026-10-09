import { describe, it, expect, beforeEach } from 'vitest'
import { isComplete, loadJourney, markComplete, resetJourney, setStep } from '../../journey'

beforeEach(() => {
  localStorage.clear()
  resetJourney()
})

describe('journey — persistence', () => {
  it('starts empty', () => {
    const s = loadJourney()
    expect(s.completed).toEqual([])
    expect(s.currentStep).toBe(0)
    expect(s.currentMember).toBeNull()
  })

  it('marks a member complete idempotently', () => {
    markComplete('caregiver-one')
    markComplete('caregiver-one')
    expect(loadJourney().completed).toEqual(['caregiver-one'])
    expect(isComplete('caregiver-one')).toBe(true)
    expect(isComplete('caregiver-two')).toBe(false)
  })

  it('persists and resumes the current step', () => {
    setStep(3, 'young-one')
    const s = loadJourney()
    expect(s.currentStep).toBe(3)
    expect(s.currentMember).toBe('young-one')
  })

  it('resetJourney clears everything', () => {
    markComplete('caregiver-one')
    setStep(2, 'caregiver-one')
    resetJourney()
    const s = loadJourney()
    expect(s.completed).toEqual([])
    expect(s.currentStep).toBe(0)
  })

  it('tolerates malformed storage', () => {
    localStorage.setItem('p31:journey:v1', '{not json')
    const s = loadJourney()
    expect(s.completed).toEqual([])
    expect(s.currentStep).toBe(0)
  })
})