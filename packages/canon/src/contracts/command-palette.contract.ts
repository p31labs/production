/**
 * @p31ca/canon — contracts/commandpalette.contract.ts (re-grounded)
 *
 * Transcribed from @p31ca/design-core/src/compositions/CommandPalette.tsx.
 */
import type { ComponentContract } from './schema.js';

export const commandPaletteContract: ComponentContract = {
  name: 'CommandPalette',

  layer: 'composition',

  status: 'verified',

  verifiedHash: 'ab056461cd0c394a89d68fa10d05571dfe35f1007031e51dec443691fee262ea',
  verifiedAt: '2026-10-08T19:57:42.279Z',

  intent: 'Keyboard-friendly command palette (⌘K). Use for site-wide search and command invocation.',

  props: [

    {
      name: 'open',
      type: 'boolean',
      required: true,
      description: 'Whether the palette is open.',
    },

    {
      name: 'onClose',
      type: 'function',
      required: true,
      description: 'Called to close.',
    },

    {
      name: 'items',
      type: 'array',
      required: true,
      description: 'The command items.',
    },

    {
      name: 'onSelect',
      type: 'function',
      required: true,
      description: 'Called with the selected item id.',
    },

    {
      name: 'placeholder',
      type: 'string',
      required: false,
      description: 'Search placeholder.',
    },

    {
      name: 'leadingIcon',
      type: 'node',
      required: false,
      description: 'Leading icon.',
    },
  ],

  tokenContract: [
    'p31.glass.background',
    'p31.glass.border',
    'p31.color.accent.default',
    'p31.radius.md',
    'p31.z.modal',
  ],

  semanticParts: [
    { name: 'container', description: 'The dialog surface.' },
    { name: 'search', description: 'The search input.' },
    { name: 'results', description: 'The results list.' },
  ],

  requiredAria: [
    { attribute: 'aria-modal', required: true, description: 'The palette is modal.' },
  ],

  interactionStates: {
    default: {
      description: 'CommandPalette renders in its default state.',
      property: 'background-color',
      matcher: 'not-empty',
      trigger: 'none',
      fixture: {"open": true, "onClose": () => {}, "items": [{"id": "a", "label": "Alpha"}], "onSelect": () => {}},
    },
  },

  statesNotApplicable: [
    { state: 'hover', reason: 'No hover surface on the container.' },
    { state: 'focus-visible', reason: 'Focus lives in the search input.' },
    { state: 'active', reason: 'No press state on the container.' },
    { state: 'disabled', reason: 'Never disabled; dismissed instead.' },
    { state: 'loading', reason: 'Results load inside the list.' },
  ],

  caveats: [],

  sources: [
    { kind: 'spec', path: 'src/contracts/schema.ts' },
    { kind: 'token', path: 'tokens/tokens.dtc.json' },
    { kind: 'token', path: 'src/theming/theme-store.ts' },
  ],

  importStatement: "import { CommandPalette } from '@p31ca/design-core/compositions';",

  antiExamples: [
    { label: 'a palette without keyboard navigation', why: 'It must be keyboard-operable.', useInstead: 'Handle ArrowUp/Down + Enter + Escape.' },
  ],
};
