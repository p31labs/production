/**
 * @p31ca/canon — contracts/calmindicator.contract.ts (re-grounded)
 *
 * Transcribed from @p31ca/design-core/src/compositions/CalmIndicator.tsx.
 */
import type { ComponentContract } from './schema.js';

export const calmIndicatorContract: ComponentContract = {
  name: 'CalmIndicator',

  layer: 'component',

  status: 'verified',

  verifiedHash: 'de17dd57517e2114096c94c9fc5b90eba0641f96d0926a9d2ad074b756266de1',
  verifiedAt: '2026-10-08T19:57:42.279Z',

  intent: 'Calm pill in the status cluster — reads spoon level and opens the calm overlay.',

  props: [

    {
      name: 'spoons',
      type: 'number',
      required: true,
      description: 'Current spoon level (0-5).',
    },

    {
      name: 'onOpen',
      type: 'function',
      required: false,
      description: 'Fired when tapped.',
    },
  ],

  tokenContract: [
    'p31.color.accent.green.default',
    'p31.color.accent.red.default',
    'p31.glass.background',
    'p31.radius.full',
  ],

  semanticParts: [
    { name: 'container', description: 'The calm pill.' },
    { name: 'label', description: 'The calm state text.' },
  ],

  requiredAria: [
    { attribute: 'aria-label', required: true, description: 'Reflects the calm state.' },
  ],

  interactionStates: {
    default: {
      description: 'CalmIndicator renders in its default state.',
      property: 'background-color',
      matcher: 'not-empty',
      trigger: 'none',
      fixture: {"spoons": 3},
    },
  },

  statesNotApplicable: [
    { state: 'hover', reason: 'Tint changes with spoons, not hover.' },
    { state: 'focus-visible', reason: 'Focus ring from global :focus-visible.' },
    { state: 'active', reason: 'Press opens the overlay, not a state.' },
    { state: 'disabled', reason: 'Never disabled.' },
    { state: 'loading', reason: 'Spoon level is atomic.' },
  ],

  caveats: [],

  sources: [
    { kind: 'spec', path: 'src/contracts/schema.ts' },
    { kind: 'token', path: 'tokens/tokens.dtc.json' },
    { kind: 'token', path: 'src/theming/theme-store.ts' },
  ],

  importStatement: "import { CalmIndicator } from '@p31ca/design-core/compositions';",

  antiExamples: [
    { label: 'hardcoding the calm tint', why: 'Tint comes from p31.color.accent.green.default / p31.color.accent.red.default.', useInstead: 'Consume the accent tokens by spoon level.' },
  ],
};
