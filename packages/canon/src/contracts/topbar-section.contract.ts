/**
 * @p31ca/canon — contracts/topbarsection.contract.ts (re-grounded)
 *
 * Transcribed from @p31ca/design-core/src/compositions/TopbarSection.tsx.
 */
import type { ComponentContract } from './schema.js';

export const topbarSectionContract: ComponentContract = {
  name: 'TopbarSection',

  layer: 'component',

  status: 'verified',

  verifiedHash: '0084b8d692f598720eb11fc954ff395cef72f5c47d491289bbaf86ea14b9d3d1',
  verifiedAt: '2026-10-08T19:57:42.279Z',

  intent: 'Vertically-centered, gap-consistent slot group inside a Topbar. Owns internal spacing; the Topbar owns arrangement.',

  props: [

    {
      name: 'slot',
      type: 'enum',
      required: true,
      description: 'Slot identity.',
      options: ['leading', 'brand', 'center', 'status', 'mode', 'trailing', 'mobile-trailing', 'identity'],
      default: 'brand',
    },

    {
      name: 'children',
      type: 'node',
      required: false,
      description: 'Section content.',
    },
  ],

  tokenContract: [
    'p31.glass.background',
  ],

  semanticParts: [
    { name: 'container', description: 'The slot group.' },
    { name: 'content', description: 'The section content.' },
  ],

  requiredAria: [

  ],

  interactionStates: {
    default: {
      description: 'TopbarSection renders in its default state.',
      property: 'background-color',
      matcher: 'not-empty',
      trigger: 'none',
      fixture: {"slot": "brand", "children": "Brand"},
    },
  },

  statesNotApplicable: [
    { state: 'hover', reason: 'No hover surface.' },
    { state: 'focus-visible', reason: 'Children own focus.' },
    { state: 'active', reason: 'No press state.' },
    { state: 'disabled', reason: 'Never disabled.' },
    { state: 'loading', reason: 'Loading is a child concern.' },
  ],

  caveats: [
    { field: 'tokenContract', reason: "Spacing omitted: design-core's --p31-space-* ladder is a css-dependent clamp() scale, non-portable in DTCG (same class as glass.blur/shadow).", since: '2026-10-08' },
  ],

  sources: [
    { kind: 'spec', path: 'src/contracts/schema.ts' },
    { kind: 'token', path: 'tokens/tokens.dtc.json' },
    { kind: 'token', path: 'src/theming/theme-store.ts' },
  ],

  importStatement: "import { TopbarSection } from '@p31ca/design-core/compositions';",

  antiExamples: [
  ],
};
