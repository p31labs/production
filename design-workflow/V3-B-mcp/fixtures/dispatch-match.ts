/**
 * Synthetic dispatcher fixture — MATCH pair (expect drift-detector exit 0).
 * Dispatches exactly the tools advertised in registry-match.ts.
 */
export function handleToolCall(name, args = {}) {
  switch (name) {
    case 'list_tokens': {
      return { content: [{ type: 'text', text: 'ok' }] };
    }
    case 'resolve_token': {
      return { content: [{ type: 'text', text: 'ok' }] };
    }
    case 'get_tier_tokens': {
      return { content: [{ type: 'text', text: 'ok' }] };
    }
    default:
      return { content: [{ type: 'text', text: `Unknown tool: ${name}` }], isError: true };
  }
}