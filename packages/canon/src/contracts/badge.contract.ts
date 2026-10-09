/**
 * @p31ca/canon — contracts/badge.contract.ts
 *
 * The Badge contract — re-grounded to the real design-core implementation
 * (`@p31ca/design-core/src/compositions/Badge.tsx`). Props and tokens are
 * transcribed from design-core/registry.json, not invented:
 *
 *   tone:  'success' | 'warning' | 'error' | 'info' | 'neutral'  (default "neutral")
 *   label: string (optional)
 *
 * Tone → token: success → accent.green, warning → accent.gold, error →
 * accent.red, info/neutral → accent. Crisis mode keeps colors but forces
 * opaque surfaces (design-core invariant).
 */
import type { ComponentContract } from './schema.js';

export const badgeContract: ComponentContract = {
  name: 'Badge',

  layer: 'component',

  status: 'verified',

  verifiedHash: '4abe66ac5255f428a89dfe8a358bed6eea7368d816f07de74b0bc5a682d32e12',
  verifiedAt: '2026-10-08T19:57:42.279Z',

  intent: 'Compact status label. Crisis mode keeps colors but forces opaque surfaces.',

  props: [
    {
      name: 'tone',
      type: 'enum',
      required: false,
      description: 'Status tone.',
      options: ['success', 'warning', 'error', 'info', 'neutral'],
      default: 'neutral',
    },
    {
      name: 'children',
      type: 'node',
      required: false,
      description: 'Label text (design-core renders it as children).',
    },
  ],

  tokenContract: [
    'p31.color.accent.default',
    'p31.color.accent.green.default',
    'p31.color.accent.gold.default',
    'p31.color.accent.red.default',
    'p31.radius.full',
    'p31.font.family.sans',
  ],

  semanticParts: [
    { name: 'container', description: 'The pill element.' },
    { name: 'label', description: 'The text content.' },
  ],

  requiredAria: [],

  interactionStates: {
    default: {
      description: 'Pill renders with the tone applied and the label visible.',
      property: 'background-color',
      matcher: 'not-empty',
      trigger: 'none',
      fixture: { children: 'Active', tone: 'neutral' },
    },
  },

  statesNotApplicable: [
    { state: 'hover', reason: 'Non-interactive pill — no hover surface.' },
    { state: 'focus-visible', reason: 'Not focusable; the label has no keyboard target.' },
    { state: 'active', reason: 'No press state — the pill is display-only.' },
    { state: 'disabled', reason: 'A status label is never disabled, only replaced.' },
    { state: 'loading', reason: 'A badge does not load.' },
  ],

  caveats: [],
  sources: [
    { kind: 'spec', path: 'src/contracts/schema.ts' },
    { kind: 'token', path: 'tokens/tokens.dtc.json' },
    { kind: 'token', path: 'src/theming/theme-store.ts' },
  ],

  importStatement: "import { Badge } from '@p31ca/design-core/compositions';",

  antiExamples: [
    {
      label: 'tone="success" but a hardcoded green',
      why: 'Bypasses the token contract — the tone must come from p31.color.accent.green.default.',
      useInstead: 'Consume p31.color.accent.green.default via the tone prop.',
    },
    {
      label: 'referencing flat primitive names like p31.radius-full',
      why: 'Contracts name semantic paths, not primitives.',
      useInstead: 'Use p31.radius.full and p31.font.family.sans.',
    },
  ],
};