/**
 * @p31ca/canon — contracts/metricbadge.contract.ts (re-grounded)
 *
 * Transcribed from @p31ca/design-core/src/compositions/MetricBadge.tsx.
 */
import type { ComponentContract } from './schema.js';

export const metricBadgeContract: ComponentContract = {
  name: 'MetricBadge',

  layer: 'component',

  status: 'verified',

  verifiedHash: '0873bb15848b8a565a23ed0887fcf16954b8b2990d4f0677619cadb9b043b8c2',
  verifiedAt: '2026-10-08T19:57:42.279Z',

  intent: 'Compact metric display with icon. Use for dashboard KPIs and telemetry.',

  props: [

    {
      name: 'icon',
      type: 'node',
      required: false,
      description: 'Icon.',
    },

    {
      name: 'value',
      type: 'node',
      required: true,
      description: 'The metric value.',
    },

    {
      name: 'label',
      type: 'string',
      required: false,
      description: 'Label.',
    },

    {
      name: 'clickable',
      type: 'boolean',
      required: false,
      description: 'Clickable affordance.',
    },
  ],

  tokenContract: [
    'p31.glass.background',
    'p31.glass.border',
    'p31.radius.sm',
    'p31.scale.xs',
    'p31.color.text.secondary',
  ],

  semanticParts: [
    { name: 'container', description: 'The badge.' },
    { name: 'value', description: 'The value text.' },
  ],

  requiredAria: [

  ],

  interactionStates: {
    default: {
      description: 'MetricBadge renders in its default state.',
      property: 'background-color',
      matcher: 'not-empty',
      trigger: 'none',
      fixture: {"value": "12"},
    },
  },

  statesNotApplicable: [
    { state: 'hover', reason: 'Not interactive unless clickable.' },
    { state: 'focus-visible', reason: 'Not focusable unless clickable.' },
    { state: 'active', reason: 'No press state unless clickable.' },
    { state: 'disabled', reason: 'Never disabled.' },
    { state: 'loading', reason: 'A metric does not load.' },
  ],

  caveats: [],

  sources: [
    { kind: 'spec', path: 'src/contracts/schema.ts' },
    { kind: 'token', path: 'tokens/tokens.dtc.json' },
    { kind: 'token', path: 'src/theming/theme-store.ts' },
  ],

  importStatement: "import { MetricBadge } from '@p31ca/design-core/compositions';",

  antiExamples: [
    { label: 'a metric value hidden from screen readers', why: 'The value must be accessible.', useInstead: 'Render the value as text, not a bare icon.' },
  ],
};
