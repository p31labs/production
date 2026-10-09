/**
 * @p31ca/canon — contracts/notificationstack.contract.ts (re-grounded)
 *
 * Transcribed from @p31ca/design-core/src/compositions/NotificationStack.tsx.
 */
import type { ComponentContract } from './schema.js';

export const notificationStackContract: ComponentContract = {
  name: 'NotificationStack',

  layer: 'composition',

  status: 'verified',

  verifiedHash: '6ac8371a10f148aee5f71589edfae88464d523329c080abc91daf740ddd65058',
  verifiedAt: '2026-10-08T19:57:42.279Z',

  intent: 'Stacked, severity-tinted notification toasts (bottom-right). Store-agnostic — items/onDismiss are props; colors via data-kind.',

  props: [

    {
      name: 'items',
      type: 'array',
      required: true,
      description: 'The notifications.',
    },

    {
      name: 'onDismiss',
      type: 'function',
      required: false,
      description: 'Dismiss one by id.',
    },

    {
      name: 'onClearAll',
      type: 'function',
      required: false,
      description: 'Clear all.',
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
    'p31.color.accent.green.default',
    'p31.color.accent.gold.default',
    'p31.color.accent.red.default',
    'p31.color.text.primary',
    'p31.color.text.secondary',
    'p31.z.floating',
  ],

  semanticParts: [
    { name: 'container', description: 'The stack.' },
    { name: 'toasts', description: 'The individual notifications.' },
  ],

  requiredAria: [
    { attribute: 'aria-label', required: true, description: 'Names the region.' },
  ],

  interactionStates: {
    default: {
      description: 'NotificationStack renders in its default state.',
      property: 'background-color',
      matcher: 'not-empty',
      trigger: 'none',
      fixture: {"items": [{"id": "1", "kind": "info", "title": "Hello"}]},
    },
  },

  statesNotApplicable: [
    { state: 'hover', reason: 'Toasts own hover.' },
    { state: 'focus-visible', reason: 'Dismiss buttons own focus.' },
    { state: 'active', reason: 'Press state on dismiss buttons.' },
    { state: 'disabled', reason: 'The stack is never disabled.' },
    { state: 'loading', reason: 'Per-toast concern.' },
  ],

  caveats: [],

  sources: [
    { kind: 'spec', path: 'src/contracts/schema.ts' },
    { kind: 'token', path: 'tokens/tokens.dtc.json' },
    { kind: 'token', path: 'src/theming/theme-store.ts' },
  ],

  importStatement: "import { NotificationStack } from '@p31ca/design-core/compositions';",

  antiExamples: [
    { label: 'colouring every toast the same', why: 'Severity maps to accent tokens.', useInstead: 'Map kind to p31.color.accent.*.default.' },
  ],
};
