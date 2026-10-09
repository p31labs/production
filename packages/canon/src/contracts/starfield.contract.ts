/**
 * @p31ca/canon — contracts/starfield.contract.ts (re-grounded)
 *
 * Transcribed from @p31ca/design-core/src/compositions/Starfield.tsx.
 */
import type { ComponentContract } from './schema.js';

export const starfieldContract: ComponentContract = {
  name: 'Starfield',

  layer: 'composition',

  status: 'verified',

  verifiedHash: '50ecc87982d3c6bf4cead914792b8b8795f07b31acffc867b27d749b01884618',
  verifiedAt: '2026-10-08T19:57:42.279Z',

  intent: 'Animated starfield background. Use for ambient backgrounds in shell and marketing.',

  props: [

    {
      name: 'spoons',
      type: 'number',
      required: false,
      description: 'Current spoon level.',
    },

    {
      name: 'voltage',
      type: 'enum',
      required: false,
      description: 'Voltage preset.',
      options: ['GREEN', 'AMBER', 'RED', 'BLUE'],
    },

    {
      name: 'safeMode',
      type: 'boolean',
      required: false,
      description: 'Safe mode.',
    },

    {
      name: 'children',
      type: 'node',
      required: false,
      description: 'Foreground content.',
    },
  ],

  tokenContract: [
    'p31.z.starfield',
    'p31.starfield.hearth',
    'p31.starfield.teal',
    'p31.starfield.remembrance',
  ],

  semanticParts: [
    { name: 'canvas', description: 'The ambient backdrop.' },
    { name: 'content', description: 'The foreground slot.' },
  ],

  requiredAria: [
    { attribute: 'aria-hidden', required: true, description: 'The ambient canvas is decorative.' },
  ],

  interactionStates: {
    default: {
      description: 'Starfield renders in its default state.',
      property: 'background-color',
      matcher: 'not-empty',
      trigger: 'none',
      fixture: {"spoons": 3},
    },
  },

  statesNotApplicable: [
    { state: 'hover', reason: 'Decorative.' },
    { state: 'focus-visible', reason: 'Never focusable.' },
    { state: 'active', reason: 'No press state.' },
    { state: 'disabled', reason: 'Ambient never disables.' },
    { state: 'loading', reason: 'The field is always present.' },
  ],

  caveats: [],

  sources: [
    { kind: 'spec', path: 'src/contracts/schema.ts' },
    { kind: 'token', path: 'tokens/tokens.dtc.json' },
    { kind: 'token', path: 'src/theming/theme-store.ts' },
  ],

  importStatement: "import { Starfield } from '@p31ca/design-core/compositions';",

  antiExamples: [
    { label: 'animating without prefers-reduced-motion', why: 'Must respect reduced motion.', useInstead: 'Gate animation on prefers-reduced-motion.' },
  ],
};
