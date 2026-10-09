/**
 * @p31ca/canon — contracts/commandtrigger.contract.ts (re-grounded)
 *
 * Transcribed from @p31ca/design-core/src/compositions/CommandTrigger.tsx.
 */
import type { ComponentContract } from './schema.js';

export const commandTriggerContract: ComponentContract = {
  name: 'CommandTrigger',

  layer: 'primitive',

  status: 'verified',

  verifiedHash: 'ab23bfdadfb9a8009f822d09e5ee297539f5e0d73c1dcc3c177b26be2de7529d',
  verifiedAt: '2026-10-08T19:57:42.279Z',

  intent: 'Topbar search affordance — a button with a keyboard hint that opens the command palette.',

  props: [

    {
      name: 'placeholder',
      type: 'string',
      required: false,
      description: 'Placeholder text.',
    },

    {
      name: 'shortcut',
      type: 'string',
      required: false,
      description: 'OS-correct modifier hint.',
    },

    {
      name: 'onOpen',
      type: 'function',
      required: false,
      description: 'Fired when activated.',
    },

    {
      name: 'compact',
      type: 'boolean',
      required: false,
      description: 'Icon-only rendering.',
    },
  ],

  tokenContract: [
    'p31.glass.background',
    'p31.glass.border',
    'p31.radius.full',
    'p31.color.text.secondary',
    'p31.font.family.mono',
  ],

  semanticParts: [
    { name: 'container', description: 'The trigger button.' },
    { name: 'hint', description: 'The keyboard hint.' },
  ],

  requiredAria: [
    { attribute: 'aria-label', required: true, description: 'The trigger is labelled by its placeholder.' },
  ],

  interactionStates: {
    default: {
      description: 'CommandTrigger renders in its default state.',
      property: 'background-color',
      matcher: 'not-empty',
      trigger: 'none',
      fixture: {},
    },
  },

  statesNotApplicable: [
    { state: 'loading', reason: 'A trigger does not load.' },
    { state: 'error', reason: 'No error state.' },
    { state: 'success', reason: 'No success state.' },
  ],

  caveats: [],

  sources: [
    { kind: 'spec', path: 'src/contracts/schema.ts' },
    { kind: 'token', path: 'tokens/tokens.dtc.json' },
    { kind: 'token', path: 'src/theming/theme-store.ts' },
  ],

  importStatement: "import { CommandTrigger } from '@p31ca/design-core/compositions';",

  antiExamples: [
    { label: 'hardcoding the shortcut hint', why: 'The hint uses font.mono, not raw styling.', useInstead: 'Consume p31.font.family.mono.' },
  ],
};
