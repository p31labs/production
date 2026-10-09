/**
 * @file journey.ts — journey progress persistence.
 *
 * Versioned localStorage key (p31:journey:v1). Tracks:
 *   - completed: which roster members have finished the wizard
 *   - currentStep: the resumable position (0-indexed)
 *   - currentMember: the last member the wizard was working with
 *
 * The wizard never re-runs for a completed member; it resumes from the
 * last step for an in-progress one. Pure + edge-safe (no imports).
 */

const JOURNEY_KEY = 'p31:journey:v1'

export interface JourneyState {
  completed: string[]
  currentStep: number
  currentMember: string | null
}

const DEFAULT: JourneyState = { completed: [], currentStep: 0, currentMember: null }

export function loadJourney(): JourneyState {
  try {
    const raw = localStorage.getItem(JOURNEY_KEY)
    if (!raw) return DEFAULT
    const parsed = JSON.parse(raw) as Partial<JourneyState>
    return {
      completed: Array.isArray(parsed.completed) ? parsed.completed : [],
      currentStep: typeof parsed.currentStep === 'number' ? parsed.currentStep : 0,
      currentMember: typeof parsed.currentMember === 'string' ? parsed.currentMember : null,
    }
  } catch {
    return DEFAULT
  }
}

export function saveJourney(state: JourneyState): void {
  try {
    localStorage.setItem(JOURNEY_KEY, JSON.stringify(state))
  } catch {
    /* storage unavailable — keep in memory only */
  }
}

export function isComplete(memberId: string): boolean {
  return loadJourney().completed.includes(memberId)
}

export function markComplete(memberId: string): void {
  const s = loadJourney()
  if (!s.completed.includes(memberId)) {
    s.completed.push(memberId)
    saveJourney(s)
  }
}

export function setStep(step: number, memberId: string | null): void {
  const s = loadJourney()
  s.currentStep = step
  s.currentMember = memberId
  saveJourney(s)
}

export function resetJourney(): void {
  saveJourney(DEFAULT)
}