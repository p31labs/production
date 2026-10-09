/**
 * @p31ca/canon — contracts/mobilebottomnav.contract.ts (re-grounded)
 *
 * Transcribed from @p31ca/design-core/src/compositions/MobileBottomNav.tsx.
 */
import type { ComponentContract } from './schema.js';

export const mobileBottomNavContract: ComponentContract = {
  name: 'MobileBottomNav',

  layer: 'component',

  status: 'verified',

  verifiedHash: '7f8384baf5b62f0d7ea08f254e78a44cd7cf18c046aac761d6b9d7cdd092e8fa',
  verifiedAt: '2026-10-08T19:57:42.279Z',

  intent: 'Mobile bottom navigation bar — flagship items only (suite pattern). Store-agnostic.',

  props: [

    {
      name: 'items',
      type: 'array',
      required: true,
      description: 'Navigation items (flagships only).',
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
  ],

  semanticParts: [
    { name: 'container', description: 'The nav bar.' },
    { name: 'items', description: 'The flagship items.' },
  ],

  requiredAria: [
    { attribute: 'aria-current', required: false, description: 'Active item exposes page.' },
  ],

  interactionStates: {
    default: {
      description: 'MobileBottomNav renders in its default state.',
      property: 'background-color',
      matcher: 'not-empty',
      trigger: 'none',
      fixture: {"items": [{"path": "/", "label": "Home"}]},
    },
  },

  statesNotApplicable: [
    { state: 'hover', reason: 'Items own hover.' },
    { state: 'focus-visible', reason: 'Items own focus.' },
    { state: 'active', reason: 'Press state lives on items.' },
    { state: 'disabled', reason: 'A nav bar is never disabled.' },
    { state: 'loading', reason: 'Loading is an item concern.' },
  ],

  caveats: [],

  sources: [
    { kind: 'spec', path: 'src/contracts/schema.ts' },
    { kind: 'token', path: 'tokens/tokens.dtc.json' },
    { kind: 'token', path: 'src/theming/theme-store.ts' },
  ],

  importStatement: "import { MobileBottomNav } from '@p31ca/design-core/compositions';",

  antiExamples: [
    { label: 'hand-rolling the nav links', why: 'The canon renders <a> semantics via renderItem.', useInstead: 'Use renderItem for real href semantics.' },
  ],
};
