/**
 * @p31ca/canon — contracts/spooncluster.contract.ts (re-grounded)
 *
 * Transcribed from @p31ca/design-core/src/compositions/SpoonCluster.tsx.
 */
import type { ComponentContract } from './schema.js';

export const spoonClusterContract: ComponentContract = {
  name: 'SpoonCluster',

  layer: 'component',

  status: 'verified',

  verifiedHash: '792cf5419ba24b14e87b8e9345377a37f109f661497de30649971bd76ffb2635',
  verifiedAt: '2026-10-08T19:57:42.279Z',

  intent: 'Spoon dots in the status cluster — read-only metabolic status.',

  props: [

    {
      name: 'level',
      type: 'number',
      required: true,
      description: 'Current spoon level (0-5).',
    },

    {
      name: 'total',
      type: 'number',
      required: false,
      description: 'Total dots.',
    },
  ],

  tokenContract: [
    'p31.color.accent.default',
    'p31.glass.border',
    'p31.radius.full',
  ],

  semanticParts: [
    { name: 'container', description: 'The spoon dots.' },
    { name: 'dots', description: 'The individual dots.' },
  ],

  requiredAria: [
    { attribute: 'aria-label', required: true, description: 'Names the remaining spoons.' },
  ],

  interactionStates: {
    default: {
      description: 'SpoonCluster renders in its default state.',
      property: 'background-color',
      matcher: 'not-empty',
      trigger: 'none',
      fixture: {"level": 3},
    },
  },

  statesNotApplicable: [
    { state: 'hover', reason: 'Read-only.' },
    { state: 'focus-visible', reason: 'Not focusable.' },
    { state: 'active', reason: 'No press state.' },
    { state: 'disabled', reason: 'Never disabled.' },
    { state: 'loading', reason: 'The level is atomic.' },
  ],

  caveats: [],

  sources: [
    { kind: 'spec', path: 'src/contracts/schema.ts' },
    { kind: 'token', path: 'tokens/tokens.dtc.json' },
    { kind: 'token', path: 'src/theming/theme-store.ts' },
  ],

  importStatement: "import { SpoonCluster } from '@p31ca/design-core/compositions';",

  antiExamples: [
    { label: 'a spoon cluster without an accessible label', why: 'The level is invisible.', useInstead: 'Set aria-label to "N of 5 spoons remaining".' },
  ],
};
