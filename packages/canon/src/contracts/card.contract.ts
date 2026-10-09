/**
 * @p31ca/canon — contracts/card.contract.ts (re-grounded)
 *
 * Transcribed from @p31ca/design-core/src/compositions/Card.tsx.
 */
import type { ComponentContract } from './schema.js';

export const cardContract: ComponentContract = {
  name: 'Card',

  layer: 'composition',

  status: 'verified',

  verifiedHash: 'de02c61d2ca484cb94da1a20fbd5e58893235626c620e5cd56707e4bd4d82567',
  verifiedAt: '2026-10-08T19:57:42.279Z',

  intent: 'Elevated surface with an optional interactive affordance.',

  props: [

    {
      name: 'title',
      type: 'node',
      required: false,
      description: 'Card title.',
    },

    {
      name: 'description',
      type: 'node',
      required: false,
      description: 'Card description.',
    },

    {
      name: 'padding',
      type: 'enum',
      required: false,
      description: 'Container padding.',
      options: ['sm', 'md', 'lg'],
      default: 'md',
    },

    {
      name: 'interactive',
      type: 'boolean',
      required: false,
      description: 'Interactive affordance.',
    },

    {
      name: 'children',
      type: 'node',
      required: false,
      description: 'Card content.',
    },
  ],

  tokenContract: [
    'p31.surface.background',
    'p31.glass.border',
    'p31.color.text.primary',
    'p31.color.text.secondary',
    'p31.radius.md',
  ],

  semanticParts: [
    { name: 'container', description: 'The card surface.' },
    { name: 'content', description: 'The card content.' },
  ],

  requiredAria: [

  ],

  interactionStates: {
    default: {
      description: 'Card renders in its default state.',
      property: 'background-color',
      matcher: 'not-empty',
      trigger: 'none',
      fixture: {"children": "Content"},
    },
  },

  statesNotApplicable: [

  ],

  caveats: [
    { field: 'tokenContract', reason: 'Token shadow in the registry is non-portable (CSS box-shadow); omitted.', since: '2026-10-08' },
  ],

  sources: [
    { kind: 'spec', path: 'src/contracts/schema.ts' },
    { kind: 'token', path: 'tokens/tokens.dtc.json' },
    { kind: 'token', path: 'src/theming/theme-store.ts' },
  ],

  importStatement: "import { Card } from '@p31ca/design-core/compositions';",

  antiExamples: [
    { label: 'hardcoding the card surface', why: 'Surface comes from p31.surface.background.', useInstead: 'Consume p31.surface.background.' },
  ],
};
