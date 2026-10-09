/**
 * @p31ca/canon — contracts/topbar.contract.ts (re-grounded)
 *
 * Transcribed from @p31ca/design-core/src/compositions/Topbar.tsx.
 */
import type { ComponentContract } from './schema.js';

export const topbarContract: ComponentContract = {
  name: 'Topbar',

  layer: 'composition',

  status: 'verified',

  verifiedHash: 'c5a4cfafac71e7f62fe0d875597e3276f7a45c838095bce05c99219ed0464c89',
  verifiedAt: '2026-10-08T19:57:42.279Z',

  intent: 'Unified app-chrome shell — slot-based three-region layout. Brand / center / statusCluster / mode / trailing, with variant (app|marketing|game) and mobile overrides.',

  props: [

    {
      name: 'brand',
      type: 'node',
      required: false,
      description: 'Left cluster.',
    },

    {
      name: 'left',
      type: 'node',
      required: false,
      description: 'Legacy alias for brand.',
    },

    {
      name: 'center',
      type: 'node',
      required: false,
      description: 'Center region.',
    },

    {
      name: 'right',
      type: 'node',
      required: false,
      description: 'Legacy right cluster.',
    },

    {
      name: 'statusCluster',
      type: 'node',
      required: false,
      description: 'Status segments.',
    },

    {
      name: 'mode',
      type: 'node',
      required: false,
      description: 'Mode control.',
    },

    {
      name: 'trailing',
      type: 'node',
      required: false,
      description: 'Trailing actions.',
    },

    {
      name: 'identity',
      type: 'node',
      required: false,
      description: 'Identity region.',
    },

    {
      name: 'mobileLeading',
      type: 'node',
      required: false,
      description: 'Mobile leading override.',
    },

    {
      name: 'mobileTrailing',
      type: 'node',
      required: false,
      description: 'Mobile trailing override.',
    },

    {
      name: 'variant',
      type: 'enum',
      required: false,
      description: 'Visual variant.',
      options: ['app', 'marketing', 'game'],
      default: 'app',
    },

    {
      name: 'sticky',
      type: 'boolean',
      required: false,
      description: 'Sticky at top.',
    },

    {
      name: 'glass',
      type: 'boolean',
      required: false,
      description: 'Glassmorphic background.',
    },

    {
      name: 'aria-label',
      type: 'string',
      required: false,
      description: 'Accessible name for the banner.',
    },
  ],

  tokenContract: [
    'p31.topbar.height',
    'p31.glass.background',
    'p31.glass.border',
    'p31.radius.candy',
    'p31.color.accent.default',
    'p31.color.accent.gold.default',
    'p31.color.accent.green.default',
  ],

  semanticParts: [
    { name: 'container', description: 'The topbar.' },
    { name: 'brand', description: 'The brand region.' },
    { name: 'trailing', description: 'The trailing region.' },
  ],

  requiredAria: [
    { attribute: 'aria-label', required: true, description: 'Names the banner.' },
  ],

  interactionStates: {
    default: {
      description: 'Topbar renders in its default state.',
      property: 'background-color',
      matcher: 'not-empty',
      trigger: 'none',
      fixture: {},
    },
  },

  statesNotApplicable: [
    { state: 'hover', reason: 'Regions own hover.' },
    { state: 'focus-visible', reason: 'Controls own focus.' },
    { state: 'active', reason: 'No press state on the bar.' },
    { state: 'disabled', reason: 'A topbar is never disabled.' },
    { state: 'loading', reason: 'Loading is a region concern.' },
  ],

  caveats: [
    { field: 'tokenContract', reason: "Spacing omitted: design-core's --p31-space-* ladder is a css-dependent clamp() scale, non-portable in DTCG (same class as glass.blur/shadow).", since: '2026-10-08' },
  ],

  sources: [
    { kind: 'spec', path: 'src/contracts/schema.ts' },
    { kind: 'token', path: 'tokens/tokens.dtc.json' },
    { kind: 'token', path: 'src/theming/theme-store.ts' },
  ],

  importStatement: "import { Topbar } from '@p31ca/design-core/compositions';",

  antiExamples: [
    { label: 'hardcoding the topbar height', why: 'Height comes from p31.topbar.height.', useInstead: 'Consume p31.topbar.height.' },
  ],
};
