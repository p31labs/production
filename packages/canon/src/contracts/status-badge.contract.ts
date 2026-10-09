/**
 * @p31ca/canon — contracts/statusbadge.contract.ts (re-grounded)
 *
 * Transcribed from @p31ca/design-core/src/compositions/StatusBadge.tsx.
 */
import type { ComponentContract } from './schema.js';

export const statusBadgeContract: ComponentContract = {
  name: 'StatusBadge',

  layer: 'component',

  status: 'verified',

  verifiedHash: 'c8adc4653fdf67292fe9a5e24432efd58b8337cdfc739b79f8a5c13e2177890a',
  verifiedAt: '2026-10-08T19:57:42.279Z',

  intent: 'Status indicator badge. Use for system status, health indicators, and state labels.',

  props: [

    {
      name: 'status',
      type: 'enum',
      required: false,
      description: 'Status.',
      options: ['online', 'offline', 'busy', 'away'],
      default: 'online',
    },

    {
      name: 'label',
      type: 'string',
      required: false,
      description: 'Label text.',
    },

    {
      name: 'variant',
      type: 'enum',
      required: false,
      description: 'Deprecated — use status.',
      options: ['live', 'beta', 'research'],
    },
  ],

  tokenContract: [
    'p31.radius.full',
    'p31.scale.xs',
    'p31.color.accent.green.default',
    'p31.color.accent.red.default',
    'p31.color.accent.gold.default',
  ],

  semanticParts: [
    { name: 'container', description: 'The pill.' },
    { name: 'label', description: 'The label text.' },
  ],

  requiredAria: [

  ],

  interactionStates: {
    default: {
      description: 'StatusBadge renders in its default state.',
      property: 'background-color',
      matcher: 'not-empty',
      trigger: 'none',
      fixture: {"status": "online", "label": "Online"},
    },
  },

  statesNotApplicable: [
    { state: 'hover', reason: 'Non-interactive.' },
    { state: 'focus-visible', reason: 'Not focusable.' },
    { state: 'active', reason: 'No press state.' },
    { state: 'disabled', reason: 'Never disabled.' },
    { state: 'loading', reason: 'A status badge does not load.' },
  ],

  caveats: [],

  sources: [
    { kind: 'spec', path: 'src/contracts/schema.ts' },
    { kind: 'token', path: 'tokens/tokens.dtc.json' },
    { kind: 'token', path: 'src/theming/theme-store.ts' },
  ],

  importStatement: "import { StatusBadge } from '@p31ca/design-core/compositions';",

  antiExamples: [
    { label: 'a status badge that is colour-only', why: 'Colourblind users need icon + text.', useInstead: 'Pair colour with an icon and label.' },
  ],
};
