/**
 * @p31ca/canon — contracts/modepill.contract.ts (re-grounded)
 *
 * Transcribed from @p31ca/design-core/src/compositions/ModePill.tsx.
 */
import type { ComponentContract } from './schema.js';

export const modePillContract: ComponentContract = {
  name: 'ModePill',

  layer: 'primitive',

  status: 'verified',

  verifiedHash: 'a2b2e73c3470d8da8eff9168eae69f17acd6584729da0a62513858d3d5139906',
  verifiedAt: '2026-10-08T19:57:42.279Z',

  intent: 'Primary mode control (SPARK / MAKER / WORKSHOP) with a tone dot.',

  props: [

    {
      name: 'mode',
      type: 'enum',
      required: true,
      description: 'Current mode.',
      options: ['spark', 'maker', 'workshop'],
      default: 'spark',
    },

    {
      name: 'onCycle',
      type: 'function',
      required: false,
      description: 'Fired when activated.',
    },
  ],

  tokenContract: [
    'p31.color.accent.default',
    'p31.color.accent.gold.default',
    'p31.color.accent.green.default',
    'p31.glass.background',
    'p31.radius.full',
  ],

  semanticParts: [
    { name: 'container', description: 'The pill.' },
    { name: 'tone', description: 'The tone dot.' },
  ],

  requiredAria: [
    { attribute: 'aria-label', required: true, description: 'Includes the current mode.' },
  ],

  interactionStates: {
    default: {
      description: 'ModePill renders in its default state.',
      property: 'background-color',
      matcher: 'not-empty',
      trigger: 'none',
      fixture: {"mode": "spark"},
    },
  },

  statesNotApplicable: [
    { state: 'loading', reason: 'A mode pill does not load.' },
    { state: 'error', reason: 'No error state.' },
    { state: 'success', reason: 'No success state.' },
  ],

  caveats: [],

  sources: [
    { kind: 'spec', path: 'src/contracts/schema.ts' },
    { kind: 'token', path: 'tokens/tokens.dtc.json' },
    { kind: 'token', path: 'src/theming/theme-store.ts' },
  ],

  importStatement: "import { ModePill } from '@p31ca/design-core/compositions';",

  antiExamples: [
    { label: 'hardcoding the mode tone', why: 'Tone comes from the accent tokens.', useInstead: 'Consume p31.color.accent.*.default.' },
  ],
};
