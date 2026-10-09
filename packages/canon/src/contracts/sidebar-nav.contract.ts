/**
 * @p31ca/canon — contracts/sidebarnav.contract.ts (re-grounded)
 *
 * Transcribed from @p31ca/design-core/src/compositions/SidebarNav.tsx.
 */
import type { ComponentContract } from './schema.js';

export const sidebarNavContract: ComponentContract = {
  name: 'SidebarNav',

  layer: 'component',

  status: 'verified',

  verifiedHash: '0139611818c0bb36e7d85840feba119b74d76d28864d1e81f3f7573975574f9a',
  verifiedAt: '2026-10-08T19:57:42.279Z',

  intent: 'Flat suite navigation rail (emoji + label), active state per route. Store-agnostic — items/activePath/onNavigate are props.',

  props: [

    {
      name: 'items',
      type: 'array',
      required: true,
      description: 'Navigation items.',
    },

    {
      name: 'activePath',
      type: 'string',
      required: false,
      description: 'Currently active path.',
    },

    {
      name: 'onNavigate',
      type: 'function',
      required: false,
      description: 'Navigate handler.',
    },

    {
      name: 'renderItem',
      type: 'function',
      required: false,
      description: 'Custom item renderer.',
    },

    {
      name: 'ariaLabel',
      type: 'string',
      required: false,
      description: 'Accessible name.',
    },
  ],

  tokenContract: [
    'p31.glass.surface',
    'p31.glass.border',
    'p31.color.accent.default',
    'p31.color.text.secondary',
    'p31.radius.full',
    'p31.font.family.sans',
  ],

  semanticParts: [
    { name: 'container', description: 'The nav rail.' },
    { name: 'items', description: 'The navigation items.' },
  ],

  requiredAria: [
    { attribute: 'aria-current', required: false, description: 'Active item exposes page.' },
  ],

  interactionStates: {
    default: {
      description: 'SidebarNav renders in its default state.',
      property: 'background-color',
      matcher: 'not-empty',
      trigger: 'none',
      fixture: {"items": [{"path": "/", "label": "Home"}]},
    },
  },

  statesNotApplicable: [
    { state: 'hover', reason: 'Items own hover.' },
    { state: 'focus-visible', reason: 'Items own focus.' },
    { state: 'active', reason: 'Press state on items.' },
    { state: 'disabled', reason: 'A nav rail is never disabled.' },
    { state: 'loading', reason: 'Loading is an item concern.' },
  ],

  caveats: [],

  sources: [
    { kind: 'spec', path: 'src/contracts/schema.ts' },
    { kind: 'token', path: 'tokens/tokens.dtc.json' },
    { kind: 'token', path: 'src/theming/theme-store.ts' },
  ],

  importStatement: "import { SidebarNav } from '@p31ca/design-core/compositions';",

  antiExamples: [
    { label: 'hand-rolling nav links', why: 'The canon renders <a> semantics via renderItem.', useInstead: 'Use renderItem for real href semantics.' },
  ],
};
