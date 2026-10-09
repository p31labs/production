/**
 * events.ts — the frozen ForgeEvent contract (Wave 0).
 *
 * Every engine tier emits these events; the `/api/forge/stream` SSE endpoint
 * serializes them; the ActivityPane renders them. This file is FROZEN once
 * Wave 0 lands — any new event type requires an explicit Wave 0 amendment,
 * never a Wave 1 improvisation.
 *
 * The SSE event-name convention matches the type discriminant:
 *   event: pipeline.stage   data: {…}
 *   event: agent.start      data: {…}
 *   …
 */

export type PipelineStage = 'intent' | 'ground' | 'dream' | 'repair' | 'shape' | 'gate';

export type AgentId = 'grounder' | 'dreamer' | 'governor' | 'shaper' | 'center' | 'clarifier';

export type ForgeEvent =
  | { type: 'pipeline.stage'; stage: PipelineStage; status: 'start' | 'done'; at: number }
  | { type: 'agent.start'; agent: AgentId; label: string; at: number }
  | { type: 'agent.think'; agent: AgentId; text: string; at: number }
  | { type: 'agent.tool'; agent: AgentId; tool: string; args: unknown; at: number }
  | { type: 'agent.result'; agent: AgentId; summary: string; detail?: string; data?: unknown; at: number }
  | { type: 'agent.done'; agent: AgentId; durationMs: number; at: number }
  | { type: 'repair.applied'; candidateId: string; rule: string; from: string; to: string; at: number }
  | { type: 'repair.fallback'; reason: string; at: number }
  | { type: 'gate.verdict'; status: 'pass' | 'incomplete' | 'needs-review' | 'needs-revision'; axes: Record<string, number>; source?: 'vision' | 'artifact'; at: number }
  | { type: 'artifact.preview'; tree: unknown; at: number }
  | { type: 'artifact.final'; tree: unknown; tier?: 'dream' | 'catalog-walk' | 'fallback'; fellBack?: boolean; at: number }
  | { type: 'stream.end'; reason: 'complete' | 'error'; error?: string; at: number };

/** Serialize one event to an SSE frame: `event: <type>\ndata: <json>\n\n`. */
export function toSseFrame(ev: ForgeEvent): string {
  return `event: ${ev.type}\ndata: ${JSON.stringify(ev)}\n\n`;
}

/** The SSE event-name for a ForgeEvent (its type discriminant). */
export function eventName(ev: ForgeEvent): string {
  return ev.type;
}