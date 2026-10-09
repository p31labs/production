/**
 * @p31ca/canon — contracts/crown.contract.ts (re-grounded)
 *
 * Transcribed from @p31ca/design-core/src/compositions/Crown.tsx.
 */
import type { ComponentContract } from './schema.js';

export const crownContract: ComponentContract = {
  name: 'Crown',

  layer: 'component',

  status: 'verified',

  verifiedHash: 'dcbcd286bd1f66f33638e1d902817df41e1fd89757f730030bde9c4bb817c881',
  verifiedAt: '2026-10-08T19:57:42.279Z',

  intent: 'Compact brand crown mark with a label.',

  props: [

    {
      name: 'label',
      type: 'string',
      required: false,
      description: 'Visible label beside the mark.',
    },
  ],

  tokenContract: [
    'p31.color.accent.default',
    'p31.color.text.primary',
    'p31.font.family.sans',
  ],

  semanticParts: [
    { name: 'mark', description: 'The crown glyph.' },
    { name: 'label', description: 'The label text.' },
  ],

  requiredAria: [

  ],

  interactionStates: {
    default: {
      description: 'Crown renders in its default state.',
      property: 'background-color',
      matcher: 'not-empty',
      trigger: 'none',
      fixture: {"label": "Crown"},
    },
  },

  statesNotApplicable: [
    { state: 'hover', reason: 'Decorative — no hover surface.' },
    { state: 'focus-visible', reason: 'Not focusable.' },
    { state: 'active', reason: 'No press state.' },
    { state: 'disabled', reason: 'Never disabled.' },
    { state: 'loading', reason: 'A mark does not load.' },
  ],

  caveats: [],

  sources: [
    { kind: 'spec', path: 'src/contracts/schema.ts' },
    { kind: 'token', path: 'tokens/tokens.dtc.json' },
    { kind: 'token', path: 'src/theming/theme-store.ts' },
  ],

  importStatement: "import { Crown } from '@p31ca/design-core/compositions';",

  antiExamples: [
    { label: 'hardcoding the crown accent', why: 'The accent comes from p31.color.accent.default.', useInstead: 'Consume p31.color.accent.default.' },
  ],
};
