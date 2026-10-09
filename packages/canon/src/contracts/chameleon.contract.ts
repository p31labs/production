/**
 * @p31ca/canon — contracts/chameleon.contract.ts (re-grounded)
 *
 * Transcribed from @p31ca/design-core/src/compositions/Chameleon.tsx.
 */
import type { ComponentContract } from './schema.js';

export const chameleonContract: ComponentContract = {
  name: 'Chameleon',

  layer: 'composition',

  status: 'verified',

  verifiedHash: '373487238d7837aa3075b50224b18c8d6988ec8da82bf99ce1f5217036f6bb8f',
  verifiedAt: '2026-10-08T19:57:42.279Z',

  intent: 'Adaptive theme controls: brand × world × age × sensory modes. Zero-reload token swaps.',

  props: [

  ],

  tokenContract: [
    'p31.color.accent.default',
  ],

  semanticParts: [
    { name: 'container', description: 'The adaptive controls.' },
    { name: 'panel', description: 'The theme panel.' },
  ],

  requiredAria: [
    { attribute: 'aria-haspopup', required: true, description: 'Opens a dialog panel.' },
    { attribute: 'aria-expanded', required: false, description: 'Exposes open state.' },
    { attribute: 'aria-pressed', required: false, description: 'Chips expose pressed state.' },
  ],

  interactionStates: {
    default: {
      description: 'Chameleon renders in its default state.',
      property: 'background-color',
      matcher: 'not-empty',
      trigger: 'none',
      fixture: {},
    },
  },

  statesNotApplicable: [

  ],

  caveats: [
    { field: 'tokenContract', reason: 'Tokens brand.*/theme.*/sensory.* are group wildcards with no single CSS value; omitted.', since: '2026-10-08' },
  ],

  sources: [
    { kind: 'spec', path: 'src/contracts/schema.ts' },
    { kind: 'token', path: 'tokens/tokens.dtc.json' },
    { kind: 'token', path: 'src/theming/theme-store.ts' },
  ],

  importStatement: "import { Chameleon } from '@p31ca/design-core/compositions';",

  antiExamples: [
    { label: 'hardcoding a theme token', why: 'Theme switching must be a token swap.', useInstead: 'Consume p31.color.accent.default.' },
  ],
};
