/**
 * @p31ca/canon — contracts/statuscluster.contract.ts (re-grounded)
 *
 * Transcribed from @p31ca/design-core/src/compositions/StatusCluster.tsx.
 */
import type { ComponentContract } from './schema.js';

export const statusClusterContract: ComponentContract = {
  name: 'StatusCluster',

  layer: 'component',

  status: 'verified',

  verifiedHash: 'e31d9946f3e841258a4aa03a6386f9ba5cf8bb5fc25a536fc405bb73796bde40',
  verifiedAt: '2026-10-08T19:57:42.279Z',

  intent: 'Read-only status row in the topbar right region. Scrolls horizontally with edge fades when it outgrows the bar.',

  props: [

    {
      name: 'children',
      type: 'node',
      required: true,
      description: 'The status segments.',
    },
  ],

  tokenContract: [
    'p31.glass.background',
  ],

  semanticParts: [
    { name: 'container', description: 'The status row.' },
    { name: 'segments', description: 'The status pills.' },
  ],

  requiredAria: [

  ],

  interactionStates: {
    default: {
      description: 'StatusCluster renders in its default state.',
      property: 'background-color',
      matcher: 'not-empty',
      trigger: 'none',
      fixture: {"children": "Status"},
    },
  },

  statesNotApplicable: [
    { state: 'hover', reason: 'Read-only.' },
    { state: 'focus-visible', reason: 'Segments are not focusable.' },
    { state: 'active', reason: 'No press state.' },
    { state: 'disabled', reason: 'Never disabled.' },
    { state: 'loading', reason: 'The cluster is atomic.' },
  ],

  caveats: [
    { field: 'tokenContract', reason: "Spacing omitted: design-core's --p31-space-* ladder is a css-dependent clamp() scale, non-portable in DTCG (same class as glass.blur/shadow).", since: '2026-10-08' },
  ],

  sources: [
    { kind: 'spec', path: 'src/contracts/schema.ts' },
    { kind: 'token', path: 'tokens/tokens.dtc.json' },
    { kind: 'token', path: 'src/theming/theme-store.ts' },
  ],

  importStatement: "import { StatusCluster } from '@p31ca/design-core/compositions';",

  antiExamples: [
    { label: 'opening in-flow absolute panels', why: 'Children must not open in-flow overlays.', useInstead: 'Keep segments read-only.' },
  ],
};
