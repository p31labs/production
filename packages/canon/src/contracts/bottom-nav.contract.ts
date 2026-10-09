/**
 * @p31ca/canon — contracts/bottomnav.contract.ts (re-grounded)
 *
 * Transcribed from @p31ca/design-core/src/compositions/BottomNav.tsx.
 */
import type { ComponentContract } from './schema.js';

export const bottomNavContract: ComponentContract = {
  name: 'BottomNav',

  layer: 'component',

  status: 'verified',

  verifiedHash: 'e8bd74f9587475610e4ef6f9f13e4124b6a4c2dce21f1eaecd7320cb050c9a0a',
  verifiedAt: '2026-10-08T19:57:42.279Z',

  intent: 'Fixed bottom navigation bar for mobile-first apps. Use for primary app navigation.',

  props: [

    {
      name: 'items',
      type: 'array',
      required: false,
      description: 'Structured navigation items.',
    },

    {
      name: 'activeIndex',
      type: 'number',
      required: false,
      description: 'Currently active item index.',
    },

    {
      name: 'onChange',
      type: 'function',
      required: false,
      description: 'Callback when the active item changes.',
    },

    {
      name: 'children',
      type: 'node',
      required: false,
      description: 'Deprecated — pass items instead.',
    },
  ],

  tokenContract: [
    'p31.topbar.height',
    'p31.glass.background',
    'p31.glass.border',
  ],

  semanticParts: [
    { name: 'container', description: 'The nav bar.' },
    { name: 'items', description: 'The navigation items.' },
  ],

  requiredAria: [
    { attribute: 'aria-selected', required: true, description: 'Active item exposes its selected state.' },
  ],

  interactionStates: {
    default: {
      description: 'BottomNav renders in its default state.',
      property: 'background-color',
      matcher: 'not-empty',
      trigger: 'none',
      fixture: {"items": [{"label": "Home"}]},
    },
  },

  statesNotApplicable: [
    { state: 'hover', reason: 'The bar has no hover; items do.' },
    { state: 'focus-visible', reason: 'Not focusable; items own focus.' },
    { state: 'active', reason: 'No press state on the container.' },
    { state: 'disabled', reason: 'A nav bar is never disabled.' },
    { state: 'loading', reason: 'Loading is an item concern.' },
  ],

  caveats: [
    { field: 'tokenContract', reason: "Spacing omitted: design-core's --p31-space-* ladder is a css-dependent clamp() scale, non-portable in DTCG (same class as glass.blur/shadow).", since: '2026-10-08' },
  ],

  sources: [
    { kind: 'spec', path: 'src/contracts/schema.ts' },
    { kind: 'token', path: 'tokens/tokens.dtc.json' },
    { kind: 'token', path: 'src/theming/theme-store.ts' },
  ],

  importStatement: "import { BottomNav } from '@p31ca/design-core/compositions';",

  antiExamples: [
    { label: 'hardcoding the active-item accent', why: 'The accent comes from p31.color.accent.default.', useInstead: 'Consume p31.color.accent.default.' },
  ],
};
