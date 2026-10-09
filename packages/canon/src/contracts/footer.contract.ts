/**
 * @p31ca/canon — contracts/footer.contract.ts (re-grounded)
 *
 * Transcribed from @p31ca/design-core/src/compositions/Footer.tsx.
 */
import type { ComponentContract } from './schema.js';

export const footerContract: ComponentContract = {
  name: 'Footer',

  layer: 'composition',

  status: 'verified',

  verifiedHash: 'd08c9e9fe8e8498ed7e02b5f9685c1145d7769f8bc92567733f2568174c73852',
  verifiedAt: '2026-10-08T19:57:42.279Z',

  intent: 'Site footer with configurable columns, branding, and legal text.',

  props: [

    {
      name: 'columns',
      type: 'array',
      required: false,
      description: 'The footer columns.',
    },

    {
      name: 'brandLabel',
      type: 'string',
      required: false,
      description: 'Brand label.',
    },

    {
      name: 'brandIcon',
      type: 'node',
      required: false,
      description: 'Brand icon.',
    },

    {
      name: 'tagline',
      type: 'string',
      required: false,
      description: 'Tagline.',
    },

    {
      name: 'copyright',
      type: 'string',
      required: false,
      description: 'Copyright line.',
    },

    {
      name: 'legalText',
      type: 'string',
      required: false,
      description: 'Legal text.',
    },
  ],

  tokenContract: [
    'p31.surface.background',
    'p31.color.text.primary',
    'p31.color.text.secondary',
  ],

  semanticParts: [
    { name: 'container', description: 'The footer.' },
    { name: 'columns', description: 'The column links.' },
  ],

  requiredAria: [
    { attribute: 'aria-label', required: false, description: 'Navigation sections are labelled.' },
  ],

  interactionStates: {
    default: {
      description: 'Footer renders in its default state.',
      property: 'background-color',
      matcher: 'not-empty',
      trigger: 'none',
      fixture: {},
    },
  },

  statesNotApplicable: [
    { state: 'hover', reason: 'The footer has no hover surface.' },
    { state: 'focus-visible', reason: 'Links own focus.' },
    { state: 'active', reason: 'No press state on the container.' },
    { state: 'disabled', reason: 'A footer is never disabled.' },
    { state: 'loading', reason: 'Loading is a child concern.' },
  ],

  caveats: [
    { field: 'tokenContract', reason: 'Token border.subtle in the registry is aspirational; omitted.', since: '2026-10-08' },
    { field: 'tokenContract', reason: "Spacing omitted: design-core's --p31-space-* ladder is a css-dependent clamp() scale, non-portable in DTCG (same class as glass.blur/shadow).", since: '2026-10-08' },
  ],

  sources: [
    { kind: 'spec', path: 'src/contracts/schema.ts' },
    { kind: 'token', path: 'tokens/tokens.dtc.json' },
    { kind: 'token', path: 'src/theming/theme-store.ts' },
  ],

  importStatement: "import { Footer } from '@p31ca/design-core/compositions';",

  antiExamples: [
    { label: 'hardcoding the footer surface', why: 'Surface comes from p31.surface.background.', useInstead: 'Consume p31.surface.background.' },
  ],
};
