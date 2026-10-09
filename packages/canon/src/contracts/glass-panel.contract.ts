/**
 * @p31ca/canon — contracts/glasspanel.contract.ts (re-grounded)
 *
 * Transcribed from @p31ca/design-core/src/compositions/GlassPanel.tsx.
 */
import type { ComponentContract } from './schema.js';

export const glassPanelContract: ComponentContract = {
  name: 'GlassPanel',

  layer: 'composition',

  status: 'verified',

  verifiedHash: '43d72ceb1f53ad83fb1591eaf77154d7d8460740552db6d545bcb06e28af1878',
  verifiedAt: '2026-10-08T19:57:42.279Z',

  intent: 'Elevated glassmorphic surface with backdrop blur. Use for modals, drawers, and elevated content areas.',

  props: [

    {
      name: 'children',
      type: 'node',
      required: false,
      description: 'Panel content.',
    },

    {
      name: 'padding',
      type: 'enum',
      required: false,
      description: 'Padding size.',
      options: ['sm', 'md', 'lg'],
      default: 'md',
    },

    {
      name: 'strong',
      type: 'boolean',
      required: false,
      description: 'Stronger glass opacity.',
    },

    {
      name: 'hover',
      type: 'boolean',
      required: false,
      description: 'Deprecated — use strong.',
    },
  ],

  tokenContract: [
    'p31.glass.background',
    'p31.glass.border',
    'p31.glass.radius',
  ],

  semanticParts: [
    { name: 'container', description: 'The glass panel.' },
    { name: 'content', description: 'The content.' },
  ],

  requiredAria: [

  ],

  interactionStates: {
    default: {
      description: 'GlassPanel renders in its default state.',
      property: 'background-color',
      matcher: 'not-empty',
      trigger: 'none',
      fixture: {"children": "Content"},
    },
  },

  statesNotApplicable: [
    { state: 'hover', reason: 'Deprecated hover alias removed.' },
    { state: 'focus-visible', reason: 'Focus styles inherit globally.' },
    { state: 'active', reason: 'No press state.' },
    { state: 'disabled', reason: 'Never disabled.' },
    { state: 'loading', reason: 'Loading is a content concern.' },
  ],

  caveats: [
    { field: 'tokenContract', reason: 'glass.blur/shadow are non-portable CSS functions; omitted.', since: '2026-10-08' },
  ],

  sources: [
    { kind: 'spec', path: 'src/contracts/schema.ts' },
    { kind: 'token', path: 'tokens/tokens.dtc.json' },
    { kind: 'token', path: 'src/theming/theme-store.ts' },
  ],

  importStatement: "import { GlassPanel } from '@p31ca/design-core/compositions';",

  antiExamples: [
    { label: 'hardcoding the glass tint', why: 'Tint comes from p31.glass.background.', useInstead: 'Consume p31.glass.background.' },
  ],
};
