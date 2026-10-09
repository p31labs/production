/**
 * @p31ca/canon — contracts/dropdown.contract.ts (re-grounded)
 *
 * Transcribed from @p31ca/design-core/src/compositions/Dropdown.tsx.
 */
import type { ComponentContract } from './schema.js';

export const dropdownContract: ComponentContract = {
  name: 'Dropdown',

  layer: 'primitive',

  status: 'verified',

  verifiedHash: '4e6f967dcf67d07dc323a874e2802908827ac0642fce18a03f5333dcb930ae62',
  verifiedAt: '2026-10-08T19:57:42.279Z',

  intent: 'Selectable dropdown menu with options.',

  props: [

    {
      name: 'label',
      type: 'string',
      required: false,
      description: 'Label text.',
    },

    {
      name: 'options',
      type: 'array',
      required: false,
      description: 'The options.',
    },

    {
      name: 'value',
      type: 'string',
      required: false,
      description: 'Selected value.',
    },

    {
      name: 'onChange',
      type: 'function',
      required: false,
      description: 'Called with the new value.',
    },

    {
      name: 'ariaLabel',
      type: 'string',
      required: false,
      description: 'Accessible name.',
    },

    {
      name: 'disabled',
      type: 'boolean',
      required: false,
      description: 'Disabled state.',
    },
  ],

  tokenContract: [
    'p31.surface.background',
    'p31.glass.border',
    'p31.color.text.primary',
    'p31.color.text.secondary',
    'p31.color.accent.default',
    'p31.radius.md',
  ],

  semanticParts: [
    { name: 'trigger', description: 'The clickable trigger.' },
    { name: 'menu', description: 'The popup menu.' },
  ],

  requiredAria: [
    { attribute: 'aria-expanded', required: false, description: 'Exposes open state.' },
  ],

  interactionStates: {
    default: {
      description: 'Dropdown renders in its default state.',
      property: 'background-color',
      matcher: 'not-empty',
      trigger: 'none',
      fixture: { label: 'Choose', options: [] },
    },
  },

  statesNotApplicable: [
    { state: 'loading', reason: 'A dropdown does not load.' },
    { state: 'error', reason: 'No error state.' },
    { state: 'success', reason: 'No success state.' },
  ],

  caveats: [],

  sources: [
    { kind: 'spec', path: 'src/contracts/schema.ts' },
    { kind: 'token', path: 'tokens/tokens.dtc.json' },
    { kind: 'token', path: 'src/theming/theme-store.ts' },
  ],

  importStatement: "import { Dropdown } from '@p31ca/design-core/compositions';",

  antiExamples: [
    { label: 'a dropdown without aria-expanded', why: 'Open state is invisible.', useInstead: 'Set aria-expanded.' },
  ],
};
