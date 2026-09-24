import { describe, it, expect } from 'vitest'
import { classifyIntent, dispatch, forgeKindFor, planFor } from './kernel'

describe('kernel — classifyIntent', () => {
  it('routes "letter" to forge-letter (hub theme)', () => {
    const i = classifyIntent('draft a letter to the school')
    expect(i.kind).toBe('forge-letter')
    expect(i.theme).toBe('hub')
  })

  it('routes "report" to forge-report (scene theme)', () => {
    const i = classifyIntent('generate a report on the hash chain')
    expect(i.kind).toBe('forge-report')
    expect(i.theme).toBe('scene')
  })

  it('defaults anything else to forge-memo (hub)', () => {
    const i = classifyIntent('make a note about dinner')
    expect(i.kind).toBe('forge-memo')
    expect(i.theme).toBe('hub')
  })
})

describe('kernel — planFor', () => {
  it('returns only stages that actually run (classify + render)', () => {
    expect(planFor()).toEqual(['classify', 'render'])
  })
})

describe('kernel — forgeKindFor', () => {
  it('maps letter → letter/hub', () => {
    expect(forgeKindFor(classifyIntent('draft a letter'))).toEqual({ kind: 'letter', theme: 'hub' })
  })

  it('maps report → report/scene', () => {
    expect(forgeKindFor(classifyIntent('generate a report'))).toEqual({ kind: 'report', theme: 'scene' })
  })

  it('maps memo/unknown → memo/hub', () => {
    expect(forgeKindFor(classifyIntent('a note'))).toEqual({ kind: 'memo', theme: 'hub' })
  })
})

describe('kernel — dispatch', () => {
  it('returns intent, plan, and pack in one call', () => {
    const d = dispatch('draft a letter to the school')
    expect(d.intent.kind).toBe('forge-letter')
    expect(d.plan).toEqual(['classify', 'render'])
    expect(d.pack).toEqual({ kind: 'letter', theme: 'hub' })
  })

  it('the pack it returns is what Drive will render (single source of truth)', () => {
    const d = dispatch('generate a report on the chain')
    expect(d.pack).toEqual({ kind: 'report', theme: 'scene' })
  })
})