/**
 * @p31ca/canon — contracts/calmoverlay.contract.ts (re-grounded)
 *
 * Transcribed from @p31ca/design-core/src/compositions/CalmOverlay.tsx.
 */
import type { ComponentContract } from './schema.js';

export const calmOverlayContract: ComponentContract = {
  name: 'CalmOverlay',

  layer: 'composition',

  status: 'unverifiable',

  intent: 'Calm-mode overlay shown at spoon level 0. Breathing circle rest stop. Store-agnostic — spoons/onReturn are props.',

  props: [

    {
      name: 'spoons',
      type: 'number',
      required: true,
      description: 'Current spoon level; calm activates at 0.',
    },

    {
      name: 'onExit',
      type: 'function',
      required: true,
      description: 'Called when the user exits calm.',
    },

    {
      name: 'onEnterCalm',
      type: 'function',
      required: false,
      description: 'Fired on entry.',
    },

    {
      name: 'onSessionEnd',
      type: 'function',
      required: false,
      description: 'Called when a calm session ends.',
    },

    {
      name: 'sighFirst',
      type: 'boolean',
      required: false,
      description: 'Sigh first, then coherence.',
    },
  ],

  tokenContract: [
    'p31.surface.background',
    'p31.color.accent.default',
    'p31.color.text.primary',
    'p31.z.floating',
  ],

  semanticParts: [
    { name: 'container', description: 'The dialog overlay.' },
    { name: 'content', description: 'The breathing rest stop.' },
  ],

  requiredAria: [
    { attribute: 'aria-modal', required: true, description: 'The overlay is modal.' },
  ],

  interactionStates: {},

  statesNotApplicable: [
    { state: 'hover', reason: 'No hover surface.' },
    { state: 'focus-visible', reason: 'Focus is trapped inside the dialog.' },
    { state: 'active', reason: 'No press state on the overlay.' },
    { state: 'disabled', reason: 'Calm never disables; it exits.' },
    { state: 'loading', reason: 'Calm is immediate.' },
  ],

  caveats: [
    { field: 'tokenContract', reason: 'Tokens border/cloud in the registry are aspirational (no CSS value in design-core); omitted.', since: '2026-10-08' },
    { field: 'interactionStates', reason: 'Renders null by design — calm is subtraction, not a modal; it drives data-calm on <html>, not a DOM surface. No renderable state to verify.', since: '2026-10-08' },
  ],

  sources: [
    { kind: 'spec', path: 'src/contracts/schema.ts' },
    { kind: 'token', path: 'tokens/tokens.dtc.json' },
    { kind: 'token', path: 'src/theming/theme-store.ts' },
  ],

  importStatement: "import { CalmOverlay } from '@p31ca/design-core/compositions';",

  antiExamples: [
    { label: 'hardcoding the calm backdrop', why: 'The surface comes from p31.surface.background and p31.glass.background.', useInstead: 'Consume the surface/glass tokens.' },
  ],
};
