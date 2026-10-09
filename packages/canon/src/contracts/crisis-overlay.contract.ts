/**
 * @p31ca/canon — contracts/crisisoverlay.contract.ts (re-grounded)
 *
 * Transcribed from @p31ca/design-core/src/compositions/CrisisOverlay.tsx.
 */
import type { ComponentContract } from './schema.js';

export const crisisOverlayContract: ComponentContract = {
  name: 'CrisisOverlay',

  layer: 'composition',

  status: 'verified',

  verifiedHash: '8f513ba846ce61329945c0361b1d97bc655e034212263cc1b1d5ead236e9b840',
  verifiedAt: '2026-10-08T19:57:42.279Z',

  intent: 'Full-screen crisis mode overlay. Shown when spoons=0. Only exit control visible.',

  props: [

    {
      name: 'message',
      type: 'string',
      required: false,
      description: 'Message shown to the user.',
    },

    {
      name: 'buttonLabel',
      type: 'string',
      required: false,
      description: 'Label for the exit button.',
    },

    {
      name: 'onReady',
      type: 'function',
      required: false,
      description: 'Called when dismissed.',
    },

    {
      name: 'visible',
      type: 'boolean',
      required: false,
      description: 'Whether the overlay is visible.',
    },

    {
      name: 'children',
      type: 'node',
      required: false,
      description: 'Overlay content.',
    },
  ],

  tokenContract: [
    'p31.surface.background',
    'p31.color.text.primary',
    'p31.color.accent.default',
    'p31.z.crisis',
  ],

  semanticParts: [
    { name: 'container', description: 'The full-screen overlay.' },
    { name: 'message', description: 'The message.' },
    { name: 'exit', description: 'The exit control.' },
  ],

  requiredAria: [
    { attribute: 'aria-modal', required: true, description: 'The crisis overlay is modal.' },
  ],

  interactionStates: {
    default: {
      description: 'CrisisOverlay renders in its default state.',
      property: 'background-color',
      matcher: 'not-empty',
      trigger: 'none',
      fixture: { visible: true, message: 'Rest' },
    },
  },

  statesNotApplicable: [
    { state: 'hover', reason: 'No hover surface.' },
    { state: 'focus-visible', reason: 'Focus is trapped inside.' },
    { state: 'active', reason: 'No press state on the overlay.' },
    { state: 'disabled', reason: 'Crisis never disables; it exits.' },
    { state: 'loading', reason: 'Crisis is immediate.' },
  ],

  caveats: [],

  sources: [
    { kind: 'spec', path: 'src/contracts/schema.ts' },
    { kind: 'token', path: 'tokens/tokens.dtc.json' },
    { kind: 'token', path: 'src/theming/theme-store.ts' },
  ],

  importStatement: "import { CrisisOverlay } from '@p31ca/design-core/compositions';",

  antiExamples: [
    { label: 'using a brand accent for the crisis boundary', why: 'Crisis must read as error, not decoration.', useInstead: 'Consume p31.color.accent.red.default.' },
  ],
};
