import { describe, it, expect } from 'vitest'
import { ENVIRONMENTS, ENVIRONMENT_IDS, environmentFor } from '../../themeEnvironments'

describe('theme environments', () => {
  it('has all 5 canon environments', () => {
    expect(ENVIRONMENT_IDS).toHaveLength(5)
    for (const id of ENVIRONMENT_IDS) {
      expect(ENVIRONMENTS[id]).toBeTruthy()
    }
  })

  it('every environment defines all 8 tokens', () => {
    for (const id of ENVIRONMENT_IDS) {
      const e = ENVIRONMENTS[id]
      expect(e.hull).toBeTruthy()
      expect(e.mesh).toBeTruthy()
      expect(e.heartCore).toBeTruthy()
      expect(e.heartPlasma).toBeTruthy()
      expect(e.starWarm).toBeTruthy()
      expect(e.starCool).toBeTruthy()
      expect(e.accent).toBeTruthy()
      expect(e.perimeter).toBeTruthy()
    }
  })

  it('every value is an oklch() string', () => {
    for (const id of ENVIRONMENT_IDS) {
      const e = ENVIRONMENTS[id]
      for (const v of [e.hull, e.mesh, e.heartCore, e.heartPlasma, e.starWarm, e.starCool, e.accent, e.perimeter]) {
        expect(v).toMatch(/^oklch\(/)
      }
    }
  })

  it('environmentFor falls back to ocean', () => {
    expect(environmentFor('nonsense').id).toBe('ocean')
  })
})