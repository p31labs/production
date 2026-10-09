/**
 * shell/otelSpanTree.ts — the invoke_agent span tree.
 *
 * Builds the GenAI span hierarchy from a turn's event stream. One
 * `invoke_agent` root per turn; Phase 1 and Phase 2 are `chat` siblings; each
 * tool call is an `execute_tool` sibling. The model span ends before a
 * requested tool runs, so model latency does not include tool execution time.
 * Span names derive from identifiers (agentName, toolName, model) — never from
 * display labels, because a rename breaks aggregation and the span name must
 * not follow it.
 */
import type { BusEvent } from '../bus/events';
import { ATTR, AGENT_NAME, PROMPT_VERSION, GENAI_SEMCONV_VERSION } from './otel';

export interface SpanNode {
  name: string;
  attributes: Record<string, string | number | boolean>;
  children: SpanNode[];
}

/** The model the turn runs — kept in one place so the span name stays stable. */
const CHAT_MODEL = '@cf/mistralai/mistral-small-3.1-24b-instruct';

export function buildTurnSpanTree(events: BusEvent[], sessionId: string): SpanNode {
  const root: SpanNode = {
    name: `invoke_agent ${AGENT_NAME}`,
    attributes: {
      [ATTR.CONVERSATION_ID]: sessionId,
      [ATTR.AGENT_NAME]: AGENT_NAME,
      [ATTR.OPERATION_NAME]: 'invoke_agent',
      'gen_ai.semconv.version': GENAI_SEMCONV_VERSION,
    },
    children: [],
  };

  for (const ev of events) {
    if (ev.type === 'phase.started') {
      root.children.push({
        name: `chat ${CHAT_MODEL}`,
        attributes: {
          [ATTR.CONVERSATION_ID]: sessionId,
          [ATTR.OPERATION_NAME]: 'chat',
          [ATTR.REQUEST_MODEL]: CHAT_MODEL,
          [ATTR.PROMPT_VERSION]: PROMPT_VERSION,
        },
        children: [],
      });
    }
    if (ev.type === 'tool.call.started') {
      root.children.push({
        name: `execute_tool ${ev.toolName}`,
        attributes: {
          [ATTR.CONVERSATION_ID]: sessionId,
          [ATTR.OPERATION_NAME]: 'execute_tool',
          [ATTR.TOOL_NAME]: ev.toolName,
          [ATTR.TOOL_CALL_ID]: ev.toolCallId,
        },
        children: [],
      });
    }
  }

  return root;
}