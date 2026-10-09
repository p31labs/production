/**
 * @file lumiIntent.ts — the LUMI scene-command intent classifier.
 *
 * LUMI is the Loom's scoped agent: it *proposes*, a human *decides*. This
 * module is LUMI's proposal generator — it turns a natural-language scene
 * request into a structured, typed action (a proposal). Nothing here acts on
 * its own; the UI presents the proposal and the human confirms ("GO") before
 * the action is applied.
 *
 * What is recorded on the Loom chain: a composition placement (placeBlock) is
 * written as a LUMI `propose` + human `approve` pair — the propose body carries
 * the BlockPlacement, the approve commits it. Ambient scene actions (LED modes,
 * spoons, blob) are LOCAL PREFERENCES — they apply to the scene store and are
 * not chain events (an append-only audit log is not a preference store).
 *
 * Pure + edge-safe: no imports, no IO — deterministic, fully unit-testable.
 */

export type LumiActionKind =
  | 'setLedMode'
  | 'setSpoonLevel'
  | 'toggleAudioReactive'
  | 'toggleAutoMode'
  | 'setBlobBrightness'
  | 'setBlobSpeed'
  | 'setBlobColor'
  | 'placeBlock'

export interface LumiProposal {
  action: LumiActionKind
  value?: number | string | boolean | Record<string, unknown>
  /** A short human-readable label for the proposal card. */
  label: string
  /** The phrase the human would approve. */
  confirm: string
}

const MODE_ALIASES: Record<string, string> = {
  rainbow: 'rainbow',
  chase: 'chase',
  trail: 'chase',
  breath: 'breath',
  pulse: 'breath',
  solid: 'solid',
  gradient: 'gradient',
  dual: 'dual-chase',
  'dual chase': 'dual-chase',
  off: 'off',
  none: 'off',
}

const WORDS = [
  'rainbow',
  'chase',
  'trail',
  'breath',
  'pulse',
  'solid',
  'gradient',
  'dual',
  'energetic',
  'calm',
  'spoons',
  'energy',
  'auto',
  'tour',
  'audio',
  'bright',
  'dim',
  'slow',
  'fast',
  'blue',
  'green',
  'warm',
  'color',
  'off',
  'lights',
]

function hasAny(haystack: string, needles: string[]): string | null {
  const h = haystack.toLowerCase()
  for (const n of needles) {
    if (n.split(' ').every((w) => h.includes(w))) return n
  }
  return null
}

/**
 * Classify a scene request into a LUMI proposal. Returns null when nothing
 * maps — the UI treats that as "LUMI couldn't propose anything for that."
 */
export function classifyLumiIntent(question: string): LumiProposal | null {
  const q = question.toLowerCase()

  // Turn off the lights / dark / off mode
  if (hasAny(q, ['turn off', 'off the lights', 'lights off', 'dark'])) {
    return {
      action: 'setLedMode',
      value: 'off',
      label: 'Turn the LED ring off',
      confirm: 'Approve: LED ring off (heart still glows)',
    }
  }

  // Explicit mode keywords
  for (const [alias, mode] of Object.entries(MODE_ALIASES)) {
    if (q.includes(alias)) {
      return {
        action: 'setLedMode',
        value: mode,
        label: `LED mode → ${mode}`,
        confirm: `Approve: set the ring to ${mode}`,
      }
    }
  }

  // Energy / spoon level
  if (hasAny(q, ['make it energetic', 'more energetic', 'energetic', 'high energy'])) {
    return {
      action: 'setSpoonLevel',
      value: 5,
      label: 'Raise the energy (spoons 5)',
      confirm: 'Approve: raise spoons to 5 — the dome livens up',
    }
  }
  if (hasAny(q, ['calm down', 'settle', 'low energy', 'tired'])) {
    return {
      action: 'setSpoonLevel',
      value: 1,
      label: 'Lower the energy (spoons 1)',
      confirm: 'Approve: lower spoons to 1 — the dome slows to a rest',
    }
  }

  // Auto tour
  if (hasAny(q, ['auto tour', 'start tour', 'tour'])) {
    return {
      action: 'toggleAutoMode',
      value: true,
      label: 'Start the auto tour',
      confirm: 'Approve: LUMI cycles the scene automatically',
    }
  }

  // Audio-reactive
  if (q.includes('audio')) {
    return {
      action: 'toggleAudioReactive',
      value: true,
      label: 'Make the heart audio-reactive',
      confirm: 'Approve: heart reacts to sound',
    }
  }

  // Brightness
  if (hasAny(q, ['brighter', 'brighten', 'more light'])) {
    return {
      action: 'setBlobBrightness',
      value: 90,
      label: 'Brighten the heart',
      confirm: 'Approve: heart brightness to 90',
    }
  }
  if (hasAny(q, ['dimmer', 'dim the', 'less light', 'soften'])) {
    return {
      action: 'setBlobBrightness',
      value: 25,
      label: 'Dim the heart',
      confirm: 'Approve: heart brightness to 25',
    }
  }

  // Speed
  if (q.includes('faster')) {
    return {
      action: 'setBlobSpeed',
      value: 90,
      label: 'Speed the heart wobble up',
      confirm: 'Approve: blob speed to 90',
    }
  }
  if (q.includes('slower')) {
    return {
      action: 'setBlobSpeed',
      value: 20,
      label: 'Slow the heart wobble down',
      confirm: 'Approve: blob speed to 20',
    }
  }

  // Color
  if (hasAny(q, ['blue heart', 'make it blue', 'blue'])) {
    return {
      action: 'setBlobColor',
      value: '#22d3ee',
      label: 'Heart → cyan',
      confirm: 'Approve: heart color to cyan',
    }
  }
  if (hasAny(q, ['green heart', 'make it green', 'green'])) {
    return {
      action: 'setBlobColor',
      value: '#44ffaa',
      label: 'Heart → green',
      confirm: 'Approve: heart color to green',
    }
  }
  if (hasAny(q, ['warm heart', 'make it warm', 'warm', 'orange'])) {
    return {
      action: 'setBlobColor',
      value: '#ff9944',
      label: 'Heart → warm orange',
      confirm: 'Approve: heart color to warm orange',
    }
  }

  // Composition — place a canon page block (see @p31ca/design-core shell
  // contract + src/registry/blocks.json). The value is a BlockPlacement the
  // proposer carries; the human approve commits it on the Loom chain.
  if (hasAny(q, ['add an evidence block', 'add evidence block', 'evidence block', 'show evidence'])) {
    return {
      action: 'placeBlock',
      value: { blockId: 'evidence-block', slot: 'main', order: 0 },
      label: 'Place an EvidenceBlock in main',
      confirm: 'Approve: place an EvidenceBlock in the main slot',
    }
  }

  // Nothing matched — LUMI can't propose.
  return null
}

/** A short roster of suggestion chips the scene command offers. */
export const LUMI_SUGGESTIONS: string[] = [
  'Rainbow mode',
  'Pulse the heart',
  'Start auto tour',
  'Turn off the lights',
  'Make it energetic',
]

export { WORDS }