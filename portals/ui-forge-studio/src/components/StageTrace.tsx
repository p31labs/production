/**
 * StageTrace — the glass-box rendering of a pipeline run, inline in the chat
 * flow (the DeepSeek/Claude "thinking block" pattern).
 *
 * While the pipeline streams, each agent renders as a one-line blurb with a
 * status glyph (⟳ running / ✓ done / ○ pending) plus its summary. Each row
 * is a <details> — the header stays visible always; expanding reveals the
 * paragraph-length `detail` prose the engine emits. When the run finishes,
 * the whole block collapses to a summary line ("✓ 4 operations · 2.1s").
 *
 * Polish (Wave 1):
 *  - Skeleton rows are rendered in final order (Grounder → Dreamer → Shaper →
 *    Governor) the moment streaming starts, so the layout never shifts as
 *    events arrive — the acknowledged-then-filled pattern.
 *  - A 4-step pipeline progress bar above the rows shows the run's position.
 *  - A brief success pulse fires on the block when the run completes.
 *
 * This is the glass box: the process is the product surface, not a hidden
 * implementation detail.
 */
import { useEffect, useMemo, useState } from 'react';
import type { AgentId, ForgeEvent } from '../lib/events';

export interface StageTraceProps {
  events: ForgeEvent[];
  running: boolean;
  /** Human-readable title for the block (e.g. "Your schema"). */
  label?: string;
  /** Pipeline stages in run order — used for the progress bar + skeleton. */
  stages?: string[];
}

interface AgentRow {
  agent: AgentId;
  label: string;
  summary: string;
  detail?: string;
  running: boolean;
  durationMs?: number;
}

const AGENT_LABEL: Record<AgentId, string> = {
  grounder: 'Grounder',
  dreamer: 'Dreamer',
  shaper: 'Shaper',
  governor: 'Governor',
  center: 'Center',
  clarifier: 'Clarifier',
};

/** The pipeline's expected agent order — the skeleton the block fills in.
 *  Rendered up front so the timeline doesn't shift as events stream in. */
const PIPELINE_AGENTS: AgentId[] = ['grounder', 'dreamer', 'shaper', 'governor'];

/** Map pipeline.stage order → progress fraction for the 4-step bar. */
const STAGE_ORDER: Array<'intent' | 'ground' | 'dream' | 'repair' | 'shape' | 'gate'> = ['intent', 'ground', 'dream', 'repair', 'shape', 'gate'];

function titleCase(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Fold agent.* events into ordered rows, preserving the stream's sequence. */
function buildRows(events: ForgeEvent[]): AgentRow[] {
  const rows: AgentRow[] = [];
  for (const ev of events) {
    switch (ev.type) {
      case 'agent.start': {
        rows.push({
          agent: ev.agent,
          label: ev.label ?? AGENT_LABEL[ev.agent] ?? titleCase(ev.agent),
          summary: '',
          detail: undefined,
          running: true,
        });
        break;
      }
      case 'agent.result': {
        const row = lastRow(rows, ev.agent);
        if (row) {
          row.summary = ev.summary;
          row.detail = ev.detail;
        }
        break;
      }
      case 'agent.done': {
        const row = lastRow(rows, ev.agent);
        if (row) {
          row.running = false;
          row.durationMs = ev.durationMs;
        }
        break;
      }
      default:
        break;
    }
  }
  return rows;
}

function lastRow(rows: AgentRow[], agent: AgentId): AgentRow | undefined {
  for (let i = rows.length - 1; i >= 0; i--) {
    if (rows[i].agent === agent) return rows[i];
  }
  return undefined;
}

function computeDurationMs(events: ForgeEvent[]): number {
  const start = events.find((e) => e.type === 'agent.start')?.at;
  const end = events.find((e) => e.type === 'stream.end')?.at;
  if (start !== undefined && end !== undefined && end > start) return end - start;
  for (let i = events.length - 1; i >= 0; i--) {
    const ev = events[i];
    if (ev.type === 'agent.done') return ev.durationMs;
  }
  return 0;
}

/** How many pipeline stages have completed — the progress bar position. */
function stageProgress(events: ForgeEvent[]): number {
  const done = new Set(
    events
      .filter((e): e is Extract<ForgeEvent, { type: 'pipeline.stage' }> => e.type === 'pipeline.stage' && e.status === 'done')
      .map((e) => e.stage),
  );
  let n = 0;
  for (const s of STAGE_ORDER) {
    if (!done.has(s)) break;
    n += 1;
  }
  return Math.max(0, n);
}

export default function StageTrace({ events, running, label = 'The agents are working', stages }: StageTraceProps) {
  const [open, setOpen] = useState(true);
  const [collapsed, setCollapsed] = useState(false);
  const [pulse, setPulse] = useState(false);

  const finished = !running && events.some((e) => e.type === 'stream.end' && e.reason === 'complete');

  // Auto-collapse to a summary once the run finishes (LukeW pattern), and fire
  // a brief success pulse. The pulse respects --motion-scale via the class.
  useEffect(() => {
    if (finished) {
      setCollapsed(true);
      setPulse(true);
      const t = window.setTimeout(() => setPulse(false), 500);
      return () => window.clearTimeout(t);
    }
  }, [finished]);

  const rows = useMemo(() => buildRows(events), [events]);
  const progress = stageProgress(events);
  const doneCount = rows.filter((r) => !r.running).length;
  const durationMs = computeDurationMs(events);
  const summary = `✓ ${doneCount} operations · ${(durationMs / 1000).toFixed(1)}s`;

  // Skeleton rows in final order: an agent already in `rows` renders from its
  // live row; an agent still pending renders a calm placeholder so the layout
  // is stable from the first frame (no shift when events arrive).
  const skeleton = running ? PIPELINE_AGENTS.filter((a) => !rows.some((r) => r.agent === a)) : [];
  const stageList = stages?.length ? stages : STAGE_ORDER;

  return (
    <div className={`stagetrace${collapsed ? ' stagetrace--collapsed' : ''}${pulse ? ' stagetrace--pulse' : ''}`} role="status" aria-live="polite">
      {/* Header — always visible. Collapses the whole block when done. */}
      <button
        type="button"
        className="stagetrace-head"
        onClick={() => setCollapsed((v) => !v)}
        aria-expanded={!collapsed}
        data-agent-kind="status"
      >
        <span className="stagetrace-head__title">{label}</span>
        {collapsed ? (
          <span className="stagetrace-head__summary">{summary} · <span className="stagetrace-head__expand">show</span></span>
        ) : (
          <span className="stagetrace-head__chevron" aria-hidden="true">▾</span>
        )}
      </button>

      {!collapsed && (
        <>
          {running && (
            <div className="stagetrace-progress" role="progressbar" aria-valuemin={0} aria-valuemax={stageList.length} aria-valuenow={progress} aria-label="Pipeline progress">
              {stageList.map((s, i) => (
                <span key={s} className={`stagetrace-progress__step ${i < progress ? 'is-done' : ''} ${i === progress ? 'is-current' : ''}`} aria-hidden="true" />
              ))}
            </div>
          )}
          <ol className="stagetrace-list">
            {rows.map((row, idx) => (
              <AgentRowView key={`${row.agent}-${idx}`} row={row} open={open} onToggle={() => setOpen((v) => !v)} />
            ))}
            {skeleton.map((agent) => (
              <SkeletonRowView key={agent} agent={agent} />
            ))}
            {running && rows.length === 0 && skeleton.length === 0 && (
              <li className="stagetrace-row stagetrace-row--running">
                <span className="stagetrace-glyph">⟳</span>
                <span className="stagetrace-row__label">Starting…</span>
              </li>
            )}
          </ol>
        </>
      )}
    </div>
  );
}

function AgentRowView({ row, open, onToggle }: { row: AgentRow; open: boolean; onToggle: () => void }) {
  const glyph = row.running ? '⟳' : '✓';
  return (
    <li className={`stagetrace-row ${row.running ? 'stagetrace-row--running' : 'stagetrace-row--done'}`}>
      <details open={open && !row.running && !!row.detail}>
        <summary onClick={onToggle} className="stagetrace-row__summary">
          <span className="stagetrace-glyph">{glyph}</span>
          <span className="stagetrace-row__label">{row.label}</span>
          {row.summary && <span className="stagetrace-row__sum">{row.summary}</span>}
          {!row.running && row.durationMs !== undefined && (
            <span className="stagetrace-row__dur">{(row.durationMs / 1000).toFixed(1)}s</span>
          )}
          {row.running && <span className="stagetrace-row__badge">running</span>}
        </summary>
        {row.detail && (
          <div className="stagetrace-row__detail">
            <p className="stagetrace-detail">{row.detail}</p>
          </div>
        )}
      </details>
    </li>
  );
}

/** A calm pending placeholder — same min-height as a real row, so the list's
 *  geometry is identical whether the agent has started or not. */
function SkeletonRowView({ agent }: { agent: AgentId }) {
  return (
    <li className="stagetrace-row stagetrace-row--pending" aria-hidden="true">
      <span className="stagetrace-glyph">○</span>
      <span className="stagetrace-row__label">{AGENT_LABEL[agent] ?? titleCase(agent)}</span>
      <span className="stagetrace-row__badge">pending</span>
    </li>
  );
}