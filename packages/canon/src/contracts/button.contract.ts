/**
 * @p31ca/canon — contracts/button.contract.ts (re-grounded)
 *
 * Transcribed from @p31ca/design-core/src/compositions/Button.tsx.
 */
import type { ComponentContract } from './schema.js';

export const buttonContract: ComponentContract = {
  name: 'Button',

  layer: 'primitive',

  status: 'verified',

  verifiedHash: 'd6fbe9e1ac231bff7385c4ed1742625be380c7974825c5fd77e8d8a447617b56',
  verifiedAt: '2026-10-08T19:57:42.279Z',

  intent: 'Primary action button. Use for CTAs, form submissions, and key actions.',

  props: [

    {
      name: 'variant',
      type: 'enum',
      required: false,
      description: 'Visual variant.',
      options: ['primary', 'secondary', 'ghost'],
      default: 'primary',
    },

    {
      name: 'size',
      type: 'enum',
      required: false,
      description: 'Size.',
      options: ['sm', 'md', 'lg'],
      default: 'md',
    },

    {
      name: 'disabled',
      type: 'boolean',
      required: false,
      description: 'Whether the button is disabled.',
    },

    {
      name: 'children',
      type: 'node',
      required: true,
      description: 'The button content.',
    },
  ],

  tokenContract: [
    'p31.color.accent.default',
    'p31.radius.md',
  ],

  semanticParts: [
    { name: 'container', description: 'The button element.' },
    { name: 'label', description: 'The button text.' },
  ],

  requiredAria: [
    { attribute: 'aria-disabled', required: false, description: 'Disabled state is announced.' },
  ],

  interactionStates: {
    default: {
      description: 'Button renders in its default state.',
      property: 'background-color',
      matcher: 'not-empty',
      trigger: 'none',
      fixture: {"children": "Save"},
    },
  },

  statesNotApplicable: [
    { state: 'loading', reason: 'design-core Button has no loading state.' },
    { state: 'error', reason: 'No error state.' },
    { state: 'success', reason: 'No success state.' },
  ],

  caveats: [
    { field: 'tokenContract', reason: "Spacing omitted: design-core's --p31-space-* ladder is a css-dependent clamp() scale, non-portable in DTCG (same class as glass.blur/shadow).", since: '2026-10-08' },
  ],

  sources: [
    { kind: 'spec', path: 'src/contracts/schema.ts' },
    { kind: 'token', path: 'tokens/tokens.dtc.json' },
    { kind: 'token', path: 'src/theming/theme-store.ts' },
  ],

  importStatement: "import { Button } from '@p31ca/design-core/compositions';",

  antiExamples: [
    { label: 'a disabled button that still fires onClick', why: 'Disabled must block interaction.', useInstead: 'Block onClick when disabled.' },
  ],
};
