/**
 * bus/events.ts — the normalized P31 event contract (the seam).
 *
 * Every engine (ui-forge, brain, soulsafe, love, entitlement) emits into this
 * union; every surface (studio trace, monetization metrics, design preview)
 * reads from the same stream. Modeled on the AG-UI event shape: run lifecycle,
 * message streaming, tool calls, state, plus P31 domain events.
 *
 * This is the single seam — one request in, one ordered typed event stream out.
 */

/** The event envelope every frame carries. */
export interface BusEnvelope<T = unknown> {
  /** Event type discriminant. */
  type: string;
  /** The payload (shape varies by type). */
  payload: T;
  /** ISO timestamp. */
  timestamp: string;
  /** Unique event id. */
  id: string;
  /** Session id (the run this event belongs to). */
  sessionId?: string;
  /** DID of the actor, when known. */
  did?: string;
  /** The face that emitted the event. */
  face?: string;
}

/** Run lifecycle (AG-UI: run.started / run.finished / run.error). */
export interface RunStarted { type: 'run.started'; sessionId: string; face?: string; task?: string }
export interface RunFinished { type: 'run.finished'; sessionId: string; ok: boolean; durationMs?: number }
export interface RunError { type: 'run.error'; sessionId: string; error: string }

/** Human-in-the-loop interrupt / resume (AG-UI interrupt outcomes). */
export interface RunInterrupted {
  type: 'run.interrupted';
  sessionId: string;
  interruptId: string;
  reason: string;
  risk: 'medium' | 'high';
  /** The pending consequential action, for the approval gate. */
  pendingAction?: string;
}
export interface RunResumed {
  type: 'run.resumed';
  sessionId: string;
  interruptId: string;
  outcome: 'approved' | 'rejected' | 'modified';
}

/** Message streaming (AG-UI: message.start / content / end). */
export interface MessageStarted { type: 'message.started'; sessionId: string }
export interface MessageContent {
  type: 'message.content';
  sessionId: string;
  text: string;
  role?: 'user' | 'assistant';
  /** Stable id for this message across coalesced flushes (upsert key). */
  messageKey?: string;
  /** True while the model is still generating (not the final flush). */
  partial?: boolean;
  /** The author's DID — stamped client-side for user messages, server-side from
   *  the request's identity header for assistant messages. Attribution. */
  authorDid?: string;
}
export interface MessageEnded { type: 'message.ended'; sessionId: string }

/** Two-phase turn marker: phase 1 = tools, phase 2 = streamed response. */
export interface PhaseStarted {
  type: 'phase.started';
  sessionId: string;
  phase: 'action' | 'response';
}

/** Reasoning lifecycle (AG-UI: REASONING_START / CONTENT / END). */
export interface ReasoningStarted { type: 'reasoning.started'; sessionId: string; agent?: string; label?: string }
export interface ReasoningContent { type: 'reasoning.content'; sessionId: string; agent?: string; text: string }
export interface ReasoningEnded { type: 'reasoning.ended'; sessionId: string; agent?: string; durationMs?: number }

/** Shared agent state (AG-UI: STATE_SNAPSHOT / STATE_DELTA with RFC 6902). */
export type JsonPatchOp =
  | { op: 'add'; path: string; value: unknown }
  | { op: 'remove'; path: string }
  | { op: 'replace'; path: string; value: unknown }
  | { op: 'move'; from: string; path: string }
  | { op: 'copy'; from: string; path: string }
  | { op: 'test'; path: string; value: unknown };
export interface StateSnapshot { type: 'state.snapshot'; sessionId: string; state: Record<string, unknown> }
export interface StateDelta { type: 'state.delta'; sessionId: string; patch: JsonPatchOp[] }

/** Sub-agent lifecycle (AG-UI: SUBAGENT_STARTED / FINISHED / ERROR). */
export interface SubagentStarted { type: 'subagent.started'; sessionId: string; agent: string; label?: string; parent?: string }
export interface SubagentFinished { type: 'subagent.finished'; sessionId: string; agent: string; durationMs?: number }
export interface SubagentError { type: 'subagent.error'; sessionId: string; agent: string; error: string }

/** Tool / agent activity (AG-UI: tool.start / args / result / end). */
export interface AgentStarted { type: 'agent.started'; sessionId: string; agent: string; label?: string }
export interface AgentThinking { type: 'agent.thinking'; sessionId: string; agent: string; text: string }
export interface AgentResult { type: 'agent.result'; sessionId: string; agent: string; summary: string; detail?: string }
export interface AgentEnded { type: 'agent.ended'; sessionId: string; agent: string; durationMs?: number }

/** P31 domain events (the ForgeEvent vocabulary, promoted to the bus). */
export interface StageChanged { type: 'pipeline.stage'; sessionId: string; stage: string; status: 'start' | 'done'; extra?: Record<string, unknown> }
export interface GateVerdict { type: 'gate.verdict'; sessionId: string; status: 'pass' | 'incomplete' | 'needs-review' | 'needs-revision'; axes?: Record<string, number>; source?: 'vision' | 'artifact' }
export interface ArtifactFinal { type: 'artifact.final'; sessionId: string; tree?: unknown; tier?: 'dream' | 'catalog-walk' | 'fallback'; fellBack?: boolean }

/** Artifact sharing / durable tier (Wave 7). */
export interface ArtifactProvenance {
  generated: boolean;
  model?: string;
  sessionId?: string;
  generatedAt?: number;
}
export interface ArtifactShared {
  type: 'artifact.shared';
  sessionId: string;
  artifactKey: string;
  shareId: string;
  retentionSecs?: number;
  authorDid?: string;
  provenance?: ArtifactProvenance;
}
export interface ArtifactShareExpired {
  type: 'artifact.share.expired';
  sessionId: string;
  artifactKey: string;
  shareId?: string;
}
export interface ArtifactPersisted {
  type: 'artifact.persisted';
  sessionId: string;
  artifactKey: string;
  kind: string;
  title: string;
  contentHash: string;
  authorDid?: string;
  createdAt?: string;
  provenance?: ArtifactProvenance;
}

/** brain-dump pipeline events (phos-forge/brain.mjs vocabulary). */
export interface BrainStarted { type: 'brain.started'; sessionId: string; mode?: string; spoon?: number; textLength?: number }
export interface BrainParsed { type: 'brain.parsed'; sessionId: string; fragments?: number }
export interface BrainElaborating { type: 'brain.elaborating'; sessionId: string; index?: number; total?: number }
export interface BrainOrganizing { type: 'brain.organizing'; sessionId: string }
export interface BrainResearching { type: 'brain.researching'; sessionId: string; theme?: string; index?: number; total?: number }
export interface BrainComplete { type: 'brain.complete'; sessionId: string; report?: unknown }

/** governance / economy / entitlement events. */
export interface SoulsafeGate { type: 'soulsafe.gate'; sessionId: string; gate: 1 | 2 | 3; status: 'pass' | 'fail' | 'review'; note?: string }
export interface LoveMinted { type: 'love.minted'; sessionId: string; amount: number; reason?: string; total?: number }
export interface EntitlementConsumed { type: 'entitlement.consumed'; sessionId: string; did?: string; remaining?: number }

/** Model usage (the cost-control / observability gate): real token counts from
 *  Workers AI, the numbers the neuron charge is computed from. */
export interface ModelUsage {
  type: 'model.usage';
  sessionId: string;
  model?: string;
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
  cached_tokens?: number;
  /** Tokens written INTO the provider's prompt cache (the five-way split). */
  cache_creation_tokens?: number;
  /** Output tokens spent on internal reasoning (a sub-count of output). */
  reasoning_tokens?: number;
  /** The author whose turn produced this usage (the token meter splits per did). */
  authorDid?: string;
  /** The credential fingerprint that paid for this turn (BYOK attribution). */
  fingerprint?: string;
}

/** Tool call lifecycle (the tool protocol). Two rows per call — started before
 *  execution, resolved after — so every tool invocation is auditable. */
export interface ToolCallStarted {
  type: 'tool.call.started';
  sessionId: string;
  toolCallId: string;
  toolName: string;
  args?: Record<string, unknown>;
}
export interface ToolCallResolved {
  type: 'tool.call.resolved';
  sessionId: string;
  toolCallId: string;
  toolName: string;
  status: 'ok' | 'denied' | 'error';
  result?: string;
}
/** The human's approval decision — audited separately from its consequence. */
export interface ToolApprovalRecorded {
  type: 'tool.approval.recorded';
  sessionId: string;
  toolCallId: string;
  approved: boolean;
  reason?: string;
}

/** Multiplayer room lifecycle (Wave 8). The only presence rows in the ledger:
 *  discrete join/leave events — awareness itself is ephemeral, never appended. */
export interface SessionJoined {
  type: 'session.joined';
  sessionId: string;
  did: string;
}
export interface SessionLeft {
  type: 'session.left';
  sessionId: string;
  did: string;
}

/** Pages/Spaces lifecycle (Wave 9a). Deletion is a trash move (trashed_at set),
 *  never a blast; restore clears it. */
export interface PageCreated {
  type: 'page.created';
  sessionId: string;
  pageId: string;
  spaceId?: string;
  parentPageId?: string;
  title: string;
  authorDid?: string;
}
export interface PageDeleted {
  type: 'page.deleted';
  sessionId: string;
  pageId: string;
}
export interface PageRestored {
  type: 'page.restored';
  sessionId: string;
  pageId: string;
}
/** An agent proposes a block replacement anchored to a range; a human accepts
 *  or rejects. The server is the only privileged writer. */
export interface SuggestionCreated {
  type: 'suggestion.created';
  sessionId: string;
  pageId: string;
  suggestionId: string;
  anchor?: unknown;
  replacement: string;
  authorDid?: string;
}
export interface SuggestionResolved {
  type: 'suggestion.resolved';
  sessionId: string;
  pageId: string;
  suggestionId: string;
  accepted: boolean;
}

/** Comment threads (Wave 9b). The thread body is CRDT state (the page's Yjs
 *  doc); only the lifecycle transitions reach the ledger. */
export interface CommentCreated {
  type: 'comment.created';
  sessionId: string;
  pageId: string;
  commentId: string;
  threadId: string;
  authorDid?: string;
  mentions?: string[];
}
export interface CommentResolved {
  type: 'comment.resolved';
  sessionId: string;
  pageId: string;
  threadId: string;
}
export interface CommentReopened {
  type: 'comment.reopened';
  sessionId: string;
  pageId: string;
  threadId: string;
}

/** BYOK credential lifecycle (Wave 9b). Carry the fingerprint, never the key. */
export interface CredentialConnected {
  type: 'credential.connected';
  sessionId: string;
  did: string;
  provider: string;
  fingerprint: string;
}
export interface CredentialDisconnected {
  type: 'credential.disconnected';
  sessionId: string;
  did: string;
  provider: string;
  fingerprint: string;
}

/** Retention policy (Wave 10 compliance). A session's retention is configured
 *  down to a 180-day floor; the change itself is a ledger event. */
export interface SessionRetentionChanged {
  type: 'session.retention.changed';
  sessionId: string;
  retentionDays: number;
}

/** The full bus event union. */
export type BusEvent =
  | RunStarted | RunFinished | RunError
  | RunInterrupted | RunResumed
  | MessageStarted | MessageContent | MessageEnded
  | PhaseStarted
  | ReasoningStarted | ReasoningContent | ReasoningEnded
  | StateSnapshot | StateDelta
  | SubagentStarted | SubagentFinished | SubagentError
  | AgentStarted | AgentThinking | AgentResult | AgentEnded
  | StageChanged | GateVerdict | ArtifactFinal
  | ArtifactShared | ArtifactShareExpired | ArtifactPersisted
  | BrainStarted | BrainParsed | BrainElaborating | BrainOrganizing | BrainResearching | BrainComplete
  | SoulsafeGate | LoveMinted | EntitlementConsumed
  | ModelUsage
  | ToolCallStarted | ToolCallResolved | ToolApprovalRecorded
  | SessionJoined | SessionLeft
  | PageCreated | PageDeleted | PageRestored
  | SuggestionCreated | SuggestionResolved
  | CommentCreated | CommentResolved | CommentReopened
  | CredentialConnected | CredentialDisconnected
  | SessionRetentionChanged;

/** All known bus event type discriminants. */
export const BUS_EVENT_TYPES = [
  'run.started', 'run.finished', 'run.error',
  'run.interrupted', 'run.resumed',
  'message.started', 'message.content', 'message.ended',
  'phase.started',
  'reasoning.started', 'reasoning.content', 'reasoning.ended',
  'state.snapshot', 'state.delta',
  'subagent.started', 'subagent.finished', 'subagent.error',
  'agent.started', 'agent.thinking', 'agent.result', 'agent.ended',
  'pipeline.stage', 'gate.verdict', 'artifact.final',
  'artifact.shared', 'artifact.share.expired', 'artifact.persisted',
  'brain.started', 'brain.parsed', 'brain.elaborating', 'brain.organizing', 'brain.researching', 'brain.complete',
  'soulsafe.gate', 'love.minted', 'entitlement.consumed',
  'model.usage',
  'tool.call.started', 'tool.call.resolved', 'tool.approval.recorded',
  'session.joined', 'session.left',
  'page.created', 'page.deleted', 'page.restored',
  'suggestion.created', 'suggestion.resolved',
  'comment.created', 'comment.resolved', 'comment.reopened',
  'credential.connected', 'credential.disconnected',
  'session.retention.changed',
] as const;

/** Serialize one event to an SSE frame. */
export function toSseFrame(ev: BusEvent): string {
  return `event: ${ev.type}\ndata: ${JSON.stringify(ev)}\n\n`;
}

/** The event type of a bus event (its discriminant). */
export function eventType(ev: BusEvent): string {
  return ev.type;
}

/** Create an envelope around a bus event with defaults stamped. */
export function envelope(ev: BusEvent, overrides: Partial<Pick<BusEnvelope, 'sessionId' | 'did' | 'face'>> = {}): BusEnvelope {
  return {
    ...ev,
    sessionId: (ev as { sessionId?: string }).sessionId ?? overrides.sessionId,
    did: overrides.did,
    face: overrides.face,
    timestamp: new Date().toISOString(),
    id: crypto.randomUUID(),
  } as unknown as BusEnvelope;
}