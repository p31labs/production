/**
 * Synthetic registry fixture — MISMATCH pair (expect drift-detector exit 1).
 * Advertises 4 schemas, one of which (validate_component) has NO handler in
 * dispatch-mismatch.ts — the shape of the real 17-vs-13 drift finding.
 */
export const MCP_TOOLS = [
  {
    name: 'list_tokens',
    description: 'List tokens.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'resolve_token',
    description: 'Resolve a token.',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'token path' },
      },
      required: ['path'],
    },
  },
  {
    name: 'get_tier_tokens',
    description: 'Tier tokens.',
    inputSchema: {
      type: 'object',
      properties: {
        tier: { type: 'string', enum: ['mobile', 'tablet', 'desktop'] },
      },
      required: ['tier'],
    },
  },
  {
    name: 'validate_component',
    description: 'Validate component usage.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'component name' },
      },
      required: ['name'],
    },
  },
];