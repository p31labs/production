/**
 * @p31ca/canon — contracts/spoon-dial.contract.ts
 *
 * The SpoonDial contract — re-grounded to the real design-core implementation
 * (`@p31ca/design-core/src/compositions/SpoonDial.tsx`). Props transcribed from
 * the source (the registry `props` field under-reports this component — it
 * lists only `level`/`onChange`; the source also exposes `onCrisis`, `min`,
 * `max`, and the deprecated `value`/`label` aliases).
 *
 * A `role="radiogroup"` of spoon buttons, 0–5, neurodivergent-first.
 */
import type { ComponentContract } from './schema.js';

export const spoonDialContract: ComponentContract = {
  name: 'SpoonDial',

  layer: 'component',

  status: 'verified',

  verifiedHash: '9d762a3d318486637cf5e6731371eb94e4202f1ef85f6387cbe24417cb9cbaa3',
  verifiedAt: '2026-10-08T19:57:42.279Z',

  intent: 'Cognitive load selector (0-5 spoons). Use for neurodivergent-first accessibility control.',

  props: [
    { name: 'level', type: 'number', required: false, description: 'Current spoon level (0-5).' },
    { name: 'onChange', type: 'function', required: false, description: 'Callback when the level changes.' },
    { name: 'onCrisis', type: 'function', required: false, description: 'Calm rest button — sets level to its minimum.' },
    { name: 'min', type: 'number', required: false, description: 'Minimum level.' },
    { name: 'max', type: 'number', required: false, description: 'Maximum level.' },
    { name: 'value', type: 'number', required: false, description: 'Deprecated alias for level.' },
    { name: 'label', type: 'string', required: false, description: 'Deprecated alias for onChange.' },
  ],

  tokenContract: [
    'p31.radius.full',
    'p31.glass.background',
    'p31.glass.border',
    'p31.color.accent.default',
    'p31.color.text.muted',
  ],

  semanticParts: [
    { name: 'container', description: 'The radiogroup of spoon buttons.' },
    { name: 'buttons', description: 'The individual level buttons.' },
  ],

  requiredAria: [
    { attribute: 'aria-checked', required: true, description: 'Each spoon button exposes its checked state.' },
    { attribute: 'aria-label', required: true, description: 'Names each level for assistive tech.' },
  ],

  interactionStates: {
    default: {
      description: 'The radiogroup renders with the current level filled.',
      property: 'background-color',
      matcher: 'not-empty',
      trigger: 'none',
      fixture: { level: 3 },
    },
  },

  statesNotApplicable: [
    { state: 'hover', reason: 'The container has no hover; the buttons own it.' },
    { state: 'focus-visible', reason: 'Focus lives on the individual buttons.' },
    { state: 'active', reason: 'Press state lives on the buttons.' },
    { state: 'disabled', reason: 'The dial stays adjustable, even at crisis (0).' },
    { state: 'loading', reason: 'The level is atomic, not loading.' },
  ],

  caveats: [
    {
      field: 'props',
      reason: 'design-core/registry.json lists only level/onChange; the source also exposes onCrisis/min/max and the deprecated value/label aliases. The contract transcribes the source, not the registry.',
      since: '2026-10-08',
    },
  ],

  sources: [
    { kind: 'spec', path: 'src/contracts/schema.ts' },
    { kind: 'token', path: 'tokens/tokens.dtc.json' },
    { kind: 'token', path: 'src/theming/theme-store.ts' },
  ],

  importStatement: "import { SpoonDial } from '@p31ca/design-core/compositions';",

  antiExamples: [
    {
      label: 'hardcoding the spoon fill per level',
      why: 'The accent/glass tokens come from the contract, not raw values.',
      useInstead: 'Consume p31.color.accent.default and p31.glass.background.',
    },
    {
      label: 'a spoon dial without aria-checked on each button',
      why: 'The level state is invisible to assistive tech.',
      useInstead: 'Set aria-checked on each button to its selected state.',
    },
  ],
};