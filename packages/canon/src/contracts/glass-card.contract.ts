/**
 * @p31ca/canon — contracts/glasscard.contract.ts (re-grounded)
 *
 * Transcribed from @p31ca/design-core/src/compositions/GlassCard.tsx.
 */
import type { ComponentContract } from './schema.js';

export const glassCardContract: ComponentContract = {
  name: 'GlassCard',

  layer: 'composition',

  status: 'verified',

  verifiedHash: 'd44a170c0f978a330aec0d3b367203264556378ae7063625ee845deff71828c8',
  verifiedAt: '2026-10-08T19:57:42.279Z',

  intent: 'Padded glassmorphic card for content grouping. Use for feature cards, paper listings, and content tiles.',

  props: [

    {
      name: 'children',
      type: 'node',
      required: false,
      description: 'Card content.',
    },

    {
      name: 'strong',
      type: 'boolean',
      required: false,
      description: 'Stronger glass opacity.',
    },

    {
      name: 'href',
      type: 'string',
      required: false,
      description: 'Deprecated — use <GlassCard strong> with a wrapping <a>.',
    },

    {
      name: 'onClick',
      type: 'function',
      required: false,
      description: 'Deprecated — use a wrapping element onClick.',
    },
  ],

  tokenContract: [
    'p31.glass.background',
    'p31.glass.border',
    'p31.glass.radius',
  ],

  semanticParts: [
    { name: 'container', description: 'The glass card.' },
    { name: 'content', description: 'The content.' },
  ],

  requiredAria: [

  ],

  interactionStates: {
    default: {
      description: 'GlassCard renders in its default state.',
      property: 'background-color',
      matcher: 'not-empty',
      trigger: 'none',
      fixture: {"children": "Content"},
    },
  },

  statesNotApplicable: [
    { state: 'hover', reason: 'No hover surface (deprecated href/onClick aliases removed).' },
    { state: 'focus-visible', reason: 'Not focusable.' },
    { state: 'active', reason: 'No press state.' },
    { state: 'disabled', reason: 'Never disabled.' },
    { state: 'loading', reason: 'Loading is a content concern.' },
  ],

  caveats: [
    { field: 'tokenContract', reason: 'glass.blur/shadow are non-portable CSS functions; omitted.', since: '2026-10-08' },
    { field: 'tokenContract', reason: "Spacing omitted: design-core's --p31-space-* ladder is a css-dependent clamp() scale, non-portable in DTCG (same class as glass.blur/shadow).", since: '2026-10-08' },
  ],

  sources: [
    { kind: 'spec', path: 'src/contracts/schema.ts' },
    { kind: 'token', path: 'tokens/tokens.dtc.json' },
    { kind: 'token', path: 'src/theming/theme-store.ts' },
  ],

  importStatement: "import { GlassCard } from '@p31ca/design-core/compositions';",

  antiExamples: [
    { label: 'hardcoding the glass tint', why: 'Tint comes from p31.glass.background.', useInstead: 'Consume p31.glass.background.' },
  ],
};
