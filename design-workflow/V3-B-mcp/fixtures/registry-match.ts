/**
 * Synthetic registry fixture — MATCH pair (expect drift-detector exit 0).
 * Advertising exactly the tools dispatched in dispatch-match.ts.
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
];