/**
 * @p31ca/canon — contracts/checkbox.contract.ts (re-grounded)
 *
 * Transcribed from @p31ca/design-core/src/compositions/Checkbox.tsx.
 */
import type { ComponentContract } from './schema.js';

export const checkboxContract: ComponentContract = {
  name: 'Checkbox',

  layer: 'primitive',

  status: 'verified',

  verifiedHash: '275ef843fdcb06d235290fe78d190e31db18c523d505b6b703683d38ced95c34',
  verifiedAt: '2026-10-08T19:57:42.279Z',

  intent: 'Tri-state checkbox (checked / unchecked / indeterminate).',

  props: [

    {
      name: 'label',
      type: 'string',
      required: false,
      description: 'Label text.',
    },

    {
      name: 'checked',
      type: 'boolean',
      required: false,
      description: 'Checked state.',
    },

    {
      name: 'indeterminate',
      type: 'boolean',
      required: false,
      description: 'Indeterminate state.',
    },

    {
      name: 'disabled',
      type: 'boolean',
      required: false,
      description: 'Disabled state.',
    },

    {
      name: 'onChange',
      type: 'function',
      required: false,
      description: 'Callback with the new state.',
    },
  ],

  tokenContract: [
    'p31.color.accent.default',
    'p31.color.text.primary',
    'p31.color.text.secondary',
    'p31.radius.sm',
  ],

  semanticParts: [
    { name: 'container', description: 'The checkbox.' },
    { name: 'indicator', description: 'The check/indeterminate mark.' },
    { name: 'label', description: 'The label text.' },
  ],

  requiredAria: [
    { attribute: 'aria-checked', required: true, description: 'Exposes the tri-state value.' },
  ],

  interactionStates: {
    default: {
      description: 'Checkbox renders in its default state.',
      property: 'background-color',
      matcher: 'not-empty',
      trigger: 'none',
      fixture: {"checked": false, "label": "Agree"},
    },
  },

  statesNotApplicable: [
    { state: 'loading', reason: 'A checkbox does not load.' },
    { state: 'error', reason: 'No error state.' },
    { state: 'success', reason: 'No success state.' },
  ],

  caveats: [
    { field: 'tokenContract', reason: 'Token border in the registry is aspirational; omitted.', since: '2026-10-08' },
  ],

  sources: [
    { kind: 'spec', path: 'src/contracts/schema.ts' },
    { kind: 'token', path: 'tokens/tokens.dtc.json' },
    { kind: 'token', path: 'src/theming/theme-store.ts' },
  ],

  importStatement: "import { Checkbox } from '@p31ca/design-core/compositions';",

  antiExamples: [
    { label: 'a checkbox without aria-checked', why: 'Tri-state is invisible to assistive tech.', useInstead: 'Set aria-checked (true/false/mixed).' },
  ],
};
