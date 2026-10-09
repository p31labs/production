/**
 * @p31ca/canon — contracts/chatshell.contract.ts (re-grounded)
 *
 * Transcribed from @p31ca/design-core/src/compositions/ChatShell.tsx.
 */
import type { ComponentContract } from './schema.js';

export const chatShellContract: ComponentContract = {
  name: 'ChatShell',

  layer: 'composition',

  status: 'verified',

  verifiedHash: 'c31124a7b4a9ebf8a002cf625174817154bd1c8aad6a5e802a6d631f20ae4628',
  verifiedAt: '2026-10-08T19:57:42.279Z',

  intent: 'Conversational shell with a header, drawer, and chat surface.',

  props: [

    {
      name: 'header',
      type: 'node',
      required: false,
      description: 'Header slot.',
    },

    {
      name: 'drawerLabel',
      type: 'string',
      required: true,
      description: 'Accessible label for the drawer.',
    },

    {
      name: 'drawerOpen',
      type: 'boolean',
      required: true,
      description: 'Whether the drawer is open.',
    },

    {
      name: 'onCloseDrawer',
      type: 'function',
      required: true,
      description: 'Called when the drawer closes.',
    },

    {
      name: 'drawer',
      type: 'node',
      required: true,
      description: 'Drawer content.',
    },

    {
      name: 'children',
      type: 'node',
      required: true,
      description: 'Main chat content.',
    },
  ],

  tokenContract: [
    'p31.surface.background',
    'p31.glass.border',
    'p31.color.text.primary',
    'p31.color.text.secondary',
    'p31.radius.lg',
  ],

  semanticParts: [
    { name: 'container', description: 'The chat surface.' },
    { name: 'thread', description: 'The message list.' },
    { name: 'drawer', description: 'The mobile drawer.' },
  ],

  requiredAria: [
    { attribute: 'aria-label', required: true, description: 'Names the drawer region.' },
  ],

  interactionStates: {
    default: {
      description: 'ChatShell renders in its default state.',
      property: 'background-color',
      matcher: 'not-empty',
      trigger: 'none',
      fixture: {"drawerLabel": "Drawer", "drawerOpen": true, "onCloseDrawer": () => {}, "drawer": "D", "children": "Chat"},
    },
  },

  statesNotApplicable: [

  ],

  caveats: [],

  sources: [
    { kind: 'spec', path: 'src/contracts/schema.ts' },
    { kind: 'token', path: 'tokens/tokens.dtc.json' },
    { kind: 'token', path: 'src/theming/theme-store.ts' },
  ],

  importStatement: "import { ChatShell } from '@p31ca/design-core/compositions';",

  antiExamples: [
    { label: 'a drawer without an accessible label', why: 'Assistive tech cannot name it.', useInstead: 'Set drawerLabel.' },
  ],
};
