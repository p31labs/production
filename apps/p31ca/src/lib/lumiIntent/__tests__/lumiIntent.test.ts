import { describe, it, expect } from 'vitest'
import { classifyLumiIntent, LUMI_SUGGESTIONS } from '../../lumiIntent'

describe('classifyLumiIntent — LUMI proposes', () => {
  it('maps "rainbow mode" to setLedMode rainbow', () => {
    const p = classifyLumiIntent('rainbow mode')
    expect(p).not.toBeNull()
    expect(p!.action).toBe('setLedMode')
    expect(p!.value).toBe('rainbow')
  })

  it('maps "pulse the heart" to breath', () => {
    const p = classifyLumiIntent('pulse the heart')
    expect(p!.action).toBe('setLedMode')
    expect(p!.value).toBe('breath')
  })

  it('maps "make it energetic" to spoon level 5', () => {
    const p = classifyLumiIntent('make it energetic')
    expect(p!.action).toBe('setSpoonLevel')
    expect(p!.value).toBe(5)
  })

  it('maps "turn off the lights" to mode off', () => {
    const p = classifyLumiIntent('turn off the lights')
    expect(p!.action).toBe('setLedMode')
    expect(p!.value).toBe('off')
  })

  it('maps "start auto tour" to toggleAutoMode', () => {
    const p = classifyLumiIntent('start auto tour')
    expect(p!.action).toBe('toggleAutoMode')
  })

  it('maps "make it blue" to blob color cyan', () => {
    const p = classifyLumiIntent('make it blue')
    expect(p!.action).toBe('setBlobColor')
    expect(p!.value).toBe('#22d3ee')
  })

  it('returns null for unmatched input (LUMI cannot propose)', () => {
    expect(classifyLumiIntent('hello world how are you')).toBeNull()
  })

  it('is case-insensitive', () => {
    const p = classifyLumiIntent('RAINBOW MODE')
    expect(p!.value).toBe('rainbow')
  })

  it('every suggestion classifies to a real action', () => {
    for (const s of LUMI_SUGGESTIONS) {
      const p = classifyLumiIntent(s)
      expect(p, `suggestion "${s}" should classify`).not.toBeNull()
    }
  })
})
  it('classifies a composition placement (placeBlock) — the chain-worthy action', () => {
    const p = classifyLumiIntent('add an evidence block')
    expect(p).not.toBeNull()
    expect(p?.action).toBe('placeBlock')
    expect(p?.value).toEqual({ blockId: 'evidence-block', slot: 'main', order: 0 })
    expect(p?.confirm).toContain('Approve')
  })

  it('is case-insensitive for placement phrases', () => {
    const p = classifyLumiIntent('ADD EVIDENCE BLOCK')
    expect(p?.action).toBe('placeBlock')
  })
