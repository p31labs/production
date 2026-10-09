/**
 * components/StageTrace.tsx — progressive disclosure of agent work.
 *
 * The three-layer spine (LukeW / ai-web-design-codex):
 *   Layer 1 — the answer (always visible).
 *   Layer 2 — the "why" (expandable): each agent/engine's summary.
 *   Layer 3 — the full event trace (on demand): every event, in order.
 *
 * While work streams, the trace is visible on the left (a detailed progress
 * indicator, not a spinner). When the run finishes, the trace collapses to a
 * summary + link; the user can reopen it. This is the glass box as a surface.
 */
import { useEffect, useMemo, useState } from 'react';
import type { BusEvent } from '../bus/events';
import { ReasoningBlock } from './ReasoningBlock';
import { ApprovalGate } from './ApprovalGate';

export interface StageTraceProps {
  events: BusEvent[];
  running: boolean;
  /** Human-readable label for the block. */
  label?: string;
  /** The answer (layer 1) — rendered above the fold. */
  answer?: React.ReactNode;
}

const STAGE_LABEL: Record<string, string> = {
  'run.started': 'Run started',
  'run.finished': 'Run finished',
  'run.error': 'Run errored',
  'brain.started': 'Brain dump received',
  'brain.parsed': 'Thoughts parsed',
  'brain.elaborating': 'Elaborating thoughts',
  'brain.organizing': 'Organizing themes',
  'brain.researching': 'Researching',
  'brain.complete': 'Report complete',
  'pipeline.stage': 'Stage',
  'reasoning.started': 'Reasoning started',
  'reasoning.content': 'Reasoning',
  'reasoning.ended': 'Reasoning done',
  'state.snapshot': 'State',
  'state.delta': 'State update',
  'subagent.started': 'Sub-agent started',
  'subagent.finished': 'Sub-agent done',
  'subagent.error': 'Sub-agent error',
  'run.interrupted': 'Needs approval',
  'run.resumed': 'Run resumed',
  'agent.started': 'Agent started',
  'agent.thinking': 'Agent reasoning',
  'agent.result': 'Agent result',
  'agent.ended': 'Agent done',
  'gate.verdict': 'Gate verdict',
  'artifact.final': 'Artifact ready',
  'soulsafe.gate': 'Verification gate',
  'love.minted': 'LOVE minted',
  'entitlement.consumed': 'Run metered',
  'model.usage': 'Model usage',
};

function labelFor(ev: BusEvent): string {
  return STAGE_LABEL[ev.type] ?? ev.type;
}

function summaryFor(ev: BusEvent): string | null {
  const p = ev as unknown as Record<string, unknown>;
  switch (ev.type) {
    case 'agent.result': return String(p.summary ?? '');
    case 'agent.ended': return p.durationMs != null ? `${Number(p.durationMs).toFixed(0)}ms` : null;
    case 'gate.verdict': return String(p.status ?? '');
    case 'pipeline.stage': return String(p.stage ?? '');
    case 'brain.complete': return 'synthesized';
    case 'love.minted': return `+${String(p.amount ?? 0)} LOVE`;
    case 'run.interrupted': return `risk: ${String(p.risk ?? '')}`;
    case 'run.resumed': return String(p.outcome ?? '');
    default: return null;
  }
}

export function StageTrace({ events, running, label = 'The agents are working', answer }: StageTraceProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);

  const finished = !running && events.some((e) => e.type === 'run.finished' || e.type === 'run.error');

  useEffect(() => {
    if (finished) setCollapsed(true);
  }, [finished]);

  const grouped = useMemo(() => {
    // Group by agent/session for the "why" layer: the last summary per agent.
    const byAgent = new Map<string, string[]>();
    for (const ev of events) {
      const agent = (ev as unknown as { agent?: string }).agent;
      const s = summaryFor(ev);
      if (agent && s) {
        const arr = byAgent.get(agent) ?? [];
        arr.push(s);
        byAgent.set(agent, arr);
      }
    }
    return [...byAgent.entries()].map(([agent, summaries]) => ({ agent, summaries: summaries[summaries.length - 1] }));
  }, [events]);

  // Layer 2.5 — reasoning: aggregate reasoning.content into one streaming text.
  const reasoning = useMemo(() => {
    const texts: string[] = [];
    let started = false;
    let ended = false;
    let startAt: number | null = null;
    for (const ev of events) {
      if (ev.type === 'reasoning.started') { started = true; startAt = (ev as unknown as { at?: number }).at ?? null; }
      if (ev.type === 'reasoning.content') texts.push((ev as unknown as { text: string }).text);
      if (ev.type === 'reasoning.ended') ended = true;
    }
    return {
      text: texts.join(' '),
      streaming: started && !ended,
      durationMs: ended ? ((startAt ? Date.now() - startAt : 0)) : undefined,
    };
  }, [events]);

  // Approval gate: the latest open interrupt (run.interrupted w/o a resume).
  const interrupt = useMemo(() => {
    for (let i = events.length - 1; i >= 0; i--) {
      const ev = events[i];
      if (ev.type === 'run.interrupted') return ev as unknown as {
        sessionId: string; interruptId: string; reason: string; risk: 'medium' | 'high'; pendingAction?: string;
      };
      if (ev.type === 'run.resumed') return null;
    }
    return null;
  }, [events]);

  const count = events.length;

  // The trace ID — one id across model, retrieval, tools, cost, and outcome
  // (the Observability evidence gate). Derived from the first event's sessionId.
  const traceId = useMemo(() => {
    const first = events.find((e) => (e as unknown as { sessionId?: string }).sessionId);
    return (first as unknown as { sessionId?: string } | undefined)?.sessionId;
  }, [events]);

  // The cost/token meter (the Cost-control gate): aggregate model.usage events.
  const usage = useMemo(() => {
    let totalTokens = 0;
    let calls = 0;
    let cachedTokens = 0;
    for (const ev of events) {
      if (ev.type === 'model.usage') {
        const u = ev as unknown as { total_tokens?: number; cached_tokens?: number };
        totalTokens += u.total_tokens ?? 0;
        cachedTokens += u.cached_tokens ?? 0;
        calls += 1;
      }
    }
    return { totalTokens, calls, cachedTokens };
  }, [events]);

  return (
    <div className="stagetrace" role="status" aria-live="polite">
      {/* Layer 1 — the answer (always visible). */}
      {answer && <div className="stagetrace__answer">{answer}</div>}

      {/* The block header — collapses to a summary when done. */}
      <button
        type="button"
        className="stagetrace__head"
        onClick={() => setCollapsed((v) => !v)}
        aria-expanded={!collapsed}
        data-agent-kind="status"
      >
        <span className="stagetrace__head-title">{label}</span>
        {traceId && <code className="stagetrace__trace-id" title="Trace ID">{traceId.slice(0, 8)}</code>}
        {usage.calls > 0 && (
          <span className="stagetrace__meter" title="Model usage" data-agent-kind="status">
            {usage.totalTokens.toLocaleString()} tokens · {usage.calls} call{usage.calls === 1 ? '' : 's'}
            {usage.cachedTokens > 0 ? ` · ${usage.cachedTokens.toLocaleString()} cached` : ''}
          </span>
        )}
        {finished ? (
          <span className="stagetrace__head-summary">done · {count} events · <span className="stagetrace__head-link">show</span></span>
        ) : (
          <span className="stagetrace__head-live" aria-hidden="true">⟳ working…</span>
        )}
      </button>

      {!collapsed && (
        <>
          {/* Layer 2 — the "why": per-agent summaries. */}
          <ol className="stagetrace__agents">
            {grouped.map((g) => (
              <li key={g.agent} className="stagetrace__agent">
                <span className="stagetrace__agent-name">{g.agent}</span>
                <span className="stagetrace__agent-summary">{g.summaries}</span>
              </li>
            ))}
            {running && <li className="stagetrace__agent stagetrace__agent--live">⟳ streaming…</li>}
          </ol>

          {/* Layer 2.5 — the reasoning (streaming disclosure). */}
          {reasoning.text && (
            <ReasoningBlock
              text={reasoning.text}
              streaming={reasoning.streaming}
              agent="engine"
              durationMs={reasoning.durationMs}
            />
          )}

          {/* Human-in-the-loop: an open approval gate pauses the run. */}
          {interrupt && (
            <ApprovalGate
              sessionId={interrupt.sessionId}
              interruptId={interrupt.interruptId}
              reason={interrupt.reason}
              risk={interrupt.risk}
              pendingAction={interrupt.pendingAction}
            />
          )}

          {/* Layer 3 — the full trace (on demand). */}
          <button
            type="button"
            className="stagetrace__trace-toggle"
            onClick={() => setDetailOpen((v) => !v)}
            aria-expanded={detailOpen}
            data-agent-kind="action"
            data-agent-action="shell.trace.toggle"
            data-agent-danger="none"
            data-agent-confirm="never"
          >
            {detailOpen ? 'Hide the full trace' : 'Show the full trace'}
          </button>
          {detailOpen && (
            <ol className="stagetrace__events">
              {events.map((ev, i) => (
                <li key={`${ev.type}-${i}`} className={`stagetrace__event stagetrace__event--${ev.type.split('.')[0]}`}>
                  <span className="stagetrace__event-type">{labelFor(ev)}</span>
                  <code className="stagetrace__event-data">{JSON.stringify(ev).slice(0, 160)}</code>
                </li>
              ))}
            </ol>
          )}
        </>
      )}
    </div>
  );
}