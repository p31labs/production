/**
 * @p31ca/canon — contracts/candyheader.contract.ts (re-grounded)
 *
 * Transcribed from @p31ca/design-core/src/compositions/CandyHeader.tsx.
 */
import type { ComponentContract } from './schema.js';

export const candyHeaderContract: ComponentContract = {
  name: 'CandyHeader',

  layer: 'composition',

  status: 'verified',

  verifiedHash: '357343ae3092310166a8b76b8e2041ffc2415e60a38de56bf47537cc563fb351',
  verifiedAt: '2026-10-08T19:57:42.279Z',

  intent: 'Candy-rounded glass header for the sovereign stack.',

  props: [

    {
      name: 'eyebrow',
      type: 'node',
      required: false,
      description: 'Eyebrow line.',
    },

    {
      name: 'title',
      type: 'node',
      required: false,
      description: 'Title.',
    },

    {
      name: 'lede',
      type: 'node',
      required: false,
      description: 'Supporting lede.',
    },
  ],

  tokenContract: [
    'p31.glass.surface',
    'p31.glass.border',
    'p31.radius.candy',
    'p31.color.text.primary',
    'p31.color.accent.default',
  ],

  semanticParts: [
    { name: 'container', description: 'The candy header.' },
    { name: 'title', description: 'The title text.' },
  ],

  requiredAria: [

  ],

  interactionStates: {
    default: {
      description: 'CandyHeader renders in its default state.',
      property: 'background-color',
      matcher: 'not-empty',
      trigger: 'none',
      fixture: {"title": "Hello"},
    },
  },

  statesNotApplicable: [

  ],

  caveats: [],

  sources: [
    { kind: 'spec', path: 'src/contracts/schema.ts' },
    { kind: 'token', path: 'tokens/tokens.dtc.json' },
    { kind: 'token', path: 'src/theming/theme-store.ts' },
  ],

  importStatement: "import { CandyHeader } from '@p31ca/design-core/compositions';",

  antiExamples: [
    { label: 'hardcoding the candy radius', why: 'The radius comes from p31.radius.candy.', useInstead: 'Consume p31.radius.candy.' },
  ],
};
