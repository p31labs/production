/**
 * Synthetic dispatcher fixture — MISMATCH pair (expect drift-detector exit 1).
 * Dispatches 3 of the 4 advertised tools: validate_component is missing.
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