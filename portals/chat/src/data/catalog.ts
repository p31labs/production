import { COMPONENT_DEFS } from '@p31/design-core/mcp/data';
import type { ComponentDef } from '@p31/design-core/mcp/data';

export interface CatalogEntry {
  name: string;
  description: string;
  cssClass: string;
  category: string;
  tokens: string[];
  spoonCost: number;
  system: string;
  type: 'design-core' | 'contract';
  parts?: string[];
  states?: string[];
  forbidden?: string[];
}

const CONTRACT_META: Record<string, Partial<CatalogEntry>> = {
  'chat-composer': {
    description: 'Chat input composer with textarea, action buttons, and streaming status. Send messages, attach tools, and monitor AI response streaming.',
    tokens: ['surface.default', 'border.glass', 'space.2', 'space.3', 'space.4', 'scale.sm', 'scale.md'],
    type: 'contract',
    parts: ['input-area', 'send-button', 'ai-suggestions'],
    states: ['empty', 'typing', 'sending', 'error'],
    forbidden: ['auto-submit on idle'],
  },
  'chat-message': {
    description: 'Chat message bubble with content, tools, timestamp, and streaming cursor. Renders user messages right-aligned and assistant messages full-width.',
    tokens: ['color.text', 'color.textSecondary', 'color.textTertiary', 'space.1', 'space.2', 'space.3', 'scale.xs', 'scale.sm'],
    type: 'contract',
    parts: ['content', 'tools', 'timestamp', 'streaming-cursor'],
    states: ['user', 'assistant', 'streaming', 'completed'],
    forbidden: ['user message on right', 'missing timestamp'],
  },
  'artifact-pane': {
    description: 'Artifact workspace with tabs, header, body, and footer. Displays code, diffs, console output, and deploy status for generated artifacts.',
    tokens: ['surface.default', 'border.glass', 'space.1', 'space.2', 'space.3', 'space.4'],
    type: 'contract',
    parts: ['header', 'canvas', 'code-viewer', 'footer'],
    states: ['idle', 'running', 'rendering', 'error'],
    forbidden: ['blocking modal over canvas'],
  },
};

function contractFor(def: ComponentDef): { parts: string[]; states: string[]; forbidden: string[] } {
  const parts = def.slots ?? def.variants ?? [def.css_class];
  const states = def.variants ?? ['default'];
  const forbidden: string[] = [];
  if (def.category === 'action') {
    forbidden.push('no auto-trigger without explicit intent');
  }
  if (def.category === 'surface') {
    forbidden.push('shadow without elevation token');
  }
  if (def.status === 'beta') {
    forbidden.push('use in production without opt-in');
  }
  return { parts, states, forbidden };
}

function buildCatalog(): CatalogEntry[] {
  const entries: CatalogEntry[] = [];

  for (const [name, def] of Object.entries(COMPONENT_DEFS)) {
    const contract = contractFor(def);
    entries.push({
      name,
      description: def.description || '',
      cssClass: def.css_class || name.toLowerCase(),
      category: def.category || 'ambient',
      tokens: def.tokens || [],
      spoonCost: def.category === 'action' ? 1 : def.category === 'surface' ? 2 : 1,
      system: 'design-core',
      type: 'design-core',
      ...contract,
    });
  }

  for (const [name, meta] of Object.entries(CONTRACT_META)) {
    const def = COMPONENT_DEFS[name] as ComponentDef | undefined;
    const contract = def ? contractFor(def) : { parts: [], states: [], forbidden: [] };
    entries.push({
      name,
      description: meta.description || def?.description || '',
      cssClass: meta.cssClass || name.replace(/-/g, '-'),
      category: 'contract',
      tokens: meta.tokens || [],
      spoonCost: 2,
      system: 'p31-portals/chat',
      type: 'contract',
      parts: meta.parts ?? contract.parts,
      states: meta.states ?? contract.states,
      forbidden: meta.forbidden ?? contract.forbidden,
    });
  }

  return entries;
}

export const CATALOG = buildCatalog();
export const CATALOG_BY_NAME = new Map(CATALOG.map((e) => [e.name, e]));
