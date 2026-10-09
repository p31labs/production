/**
 * @p31ca/canon — contracts/pageheader.contract.ts (re-grounded)
 *
 * Transcribed from @p31ca/design-core/src/compositions/PageHeader.tsx.
 */
import type { ComponentContract } from './schema.js';

export const pageHeaderContract: ComponentContract = {
  name: 'PageHeader',

  layer: 'composition',

  status: 'verified',

  verifiedHash: 'd9e3135583d51992b34244975c193eb07aeb858cf785e3645bd0570876ce90e0',
  verifiedAt: '2026-10-08T19:57:42.279Z',

  intent: 'Inner-page hero: mono eyebrow, gradient title, and lede. Use at the top of content routes.',

  props: [

    {
      name: 'eyebrow',
      type: 'string',
      required: true,
      description: 'Mono eyebrow.',
    },

    {
      name: 'title',
      type: 'string',
      required: true,
      description: 'Gradient title.',
    },

    {
      name: 'lede',
      type: 'string',
      required: false,
      description: 'Lede.',
    },

    {
      name: 'children',
      type: 'node',
      required: false,
      description: 'Header content.',
    },
  ],

  tokenContract: [
    'p31.color.text.secondary',
  ],

  semanticParts: [
    { name: 'container', description: 'The header.' },
    { name: 'eyebrow', description: 'The eyebrow.' },
    { name: 'title', description: 'The title.' },
  ],

  requiredAria: [

  ],

  interactionStates: {
    default: {
      description: 'PageHeader renders in its default state.',
      property: 'background-color',
      matcher: 'not-empty',
      trigger: 'none',
      fixture: {"eyebrow": "EYEBROW", "title": "Title"},
    },
  },

  statesNotApplicable: [
    { state: 'hover', reason: 'No hover surface.' },
    { state: 'focus-visible', reason: 'Actions own focus.' },
    { state: 'active', reason: 'No press state.' },
    { state: 'disabled', reason: 'A header is never disabled.' },
    { state: 'loading', reason: 'Loading is a child concern.' },
  ],

  caveats: [
    { field: 'tokenContract', reason: 'Token title.gradient is aspirational; omitted.', since: '2026-10-08' },
    { field: 'tokenContract', reason: "Spacing omitted: design-core's --p31-space-* ladder is a css-dependent clamp() scale, non-portable in DTCG (same class as glass.blur/shadow).", since: '2026-10-08' },
  ],

  sources: [
    { kind: 'spec', path: 'src/contracts/schema.ts' },
    { kind: 'token', path: 'tokens/tokens.dtc.json' },
    { kind: 'token', path: 'src/theming/theme-store.ts' },
  ],

  importStatement: "import { PageHeader } from '@p31ca/design-core/compositions';",

  antiExamples: [
    { label: 'a gradient title without text fallback', why: 'The gradient must pair with real text.', useInstead: 'Pair the gradient with a text node.' },
  ],
};
