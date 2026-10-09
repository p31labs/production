/**
 * @p31ca/canon — contracts/sectionstrip.contract.ts (re-grounded)
 *
 * Transcribed from @p31ca/design-core/src/compositions/SectionStrip.tsx.
 */
import type { ComponentContract } from './schema.js';

export const sectionStripContract: ComponentContract = {
  name: 'SectionStrip',

  layer: 'component',

  status: 'verified',

  verifiedHash: '6646f31684b6063b0c9560edcac72fbe74db6b7d9b422af5397948a2f3242d4a',
  verifiedAt: '2026-10-08T19:57:42.279Z',

  intent: 'Desktop pill navigation strip. Use for primary section navigation on wide viewports.',

  props: [

    {
      name: 'items',
      type: 'array',
      required: true,
      description: 'The sections.',
    },

    {
      name: 'onSelect',
      type: 'function',
      required: false,
      description: 'Called with the section id.',
    },
  ],

  tokenContract: [
    'p31.glass.background',
    'p31.glass.border',
    'p31.radius.candy',
    'p31.color.accent.default',
    'p31.color.text.secondary',
  ],

  semanticParts: [
    { name: 'container', description: 'The pill strip.' },
    { name: 'tabs', description: 'The section tabs.' },
  ],

  requiredAria: [
    { attribute: 'aria-current', required: false, description: 'Active tab exposes page.' },
  ],

  interactionStates: {
    default: {
      description: 'SectionStrip renders in its default state.',
      property: 'background-color',
      matcher: 'not-empty',
      trigger: 'none',
      fixture: {"items": []},
    },
  },

  statesNotApplicable: [
    { state: 'hover', reason: 'Tabs own hover.' },
    { state: 'focus-visible', reason: 'Tabs own focus.' },
    { state: 'active', reason: 'Press state on tabs.' },
    { state: 'disabled', reason: 'The strip is never disabled.' },
    { state: 'loading', reason: 'Loading is a tab concern.' },
  ],

  caveats: [],

  sources: [
    { kind: 'spec', path: 'src/contracts/schema.ts' },
    { kind: 'token', path: 'tokens/tokens.dtc.json' },
    { kind: 'token', path: 'src/theming/theme-store.ts' },
  ],

  importStatement: "import { SectionStrip } from '@p31ca/design-core/compositions';",

  antiExamples: [
    { label: 'hardcoding the pill radius', why: 'Radius comes from p31.radius.candy.', useInstead: 'Consume p31.radius.candy.' },
  ],
};
