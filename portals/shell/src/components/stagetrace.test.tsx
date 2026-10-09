/**
 * components/stagetrace.test.ts — progressive disclosure logic: the
 * streaming machine + interrupt detection (extracted, tested via the
 * event-array transforms in StageTrace).
 */
import { describe, expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import { ReasoningBlock } from './ReasoningBlock';
import { ApprovalGate } from './ApprovalGate';
import { StageTrace } from './StageTrace';
import type { BusEvent } from '../bus/events';

describe('ReasoningBlock (streaming disclosure)', () => {
  it('renders the "Thought for Xs" affordance when finished', () => {
    const html = renderToString(<ReasoningBlock text="exploring layouts" streaming={false} durationMs={3200} agent="Dreamer" />);
    expect(html).toContain('Dreamer reasoning');
    expect(html).toContain('3.2');
    expect(html).toContain('Thought for');
  });

  it('shows a live affordance while streaming', () => {
    const html = renderToString(<ReasoningBlock text="designing" streaming agent="Shaper" />);
    expect(html).toContain('Shaper reasoning');
    expect(html).not.toContain('Thought for');
  });
});

describe('ApprovalGate (human-in-the-loop)', () => {
  it('renders a high-risk gate with both actions', () => {
    const html = renderToString(
      <ApprovalGate sessionId="s1" interruptId="i1" reason="deploy to production" risk="high" pendingAction="publish the artifact" />,
    );
    expect(html).toContain('high risk');
    expect(html).toContain('Reject');
    expect(html).toContain('Approve');
    expect(html).toContain('publish the artifact');
  });

  it('renders a medium-risk gate with a softer badge', () => {
    const html = renderToString(
      <ApprovalGate sessionId="s1" interruptId="i2" reason="delete old records" risk="medium" />,
    );
    expect(html).toContain('needs approval');
  });

  it('auto-approves when the role holds the consequential action (admin deploy)', () => {
    const html = renderToString(
      <ApprovalGate sessionId="s1" interruptId="i3" reason="publish the artifact" risk="high" action="deploy" role="admin" />,
    );
    expect(html).toContain('Auto-approved');
    expect(html).not.toContain('approval__buttons');
  });

  it('gates when the role lacks the consequential action (viewer deploy)', () => {
    const html = renderToString(
      <ApprovalGate sessionId="s1" interruptId="i4" reason="publish the artifact" risk="high" action="deploy" role="viewer" />,
    );
    expect(html).toContain('approval__buttons');
    expect(html).toContain('Approve');
    expect(html).not.toContain('Auto-approved');
  });

  it('auto-approves a non-consequential action regardless of role (view)', () => {
    const html = renderToString(
      <ApprovalGate sessionId="s1" interruptId="i5" reason="inspect the ledger" risk="medium" action="view" role="viewer" />,
    );
    expect(html).toContain('Auto-approved');
  });

  it('fail-closed: no action gates even for an admin (unknown action)', () => {
    const html = renderToString(
      <ApprovalGate sessionId="s1" interruptId="i6" reason="unknown operation" risk="high" role="admin" />,
    );
    expect(html).toContain('approval__buttons');
  });
});

describe('StageTrace (trace ID surfacing)', () => {
  it('surfaces the trace id from the first event sessionId', () => {
    const events: BusEvent[] = [
      { type: 'run.started', sessionId: '346061d4-b83f-44e2-9164-376815a50f24' },
      { type: 'agent.result', sessionId: '346061d4-b83f-44e2-9164-376815a50f24', agent: 'grounder', summary: '3 facts' },
      { type: 'run.finished', sessionId: '346061d4-b83f-44e2-9164-376815a50f24', ok: true },
    ];
    const html = renderToString(<StageTrace events={events} running={false} label="The agents are working" />);
    expect(html).toContain('346061d4');
    expect(html).toContain('stagetrace__trace-id');
  });

  it('omits the trace id when no event carries a sessionId', () => {
    const events: BusEvent[] = [
      { type: 'agent.result', agent: 'grounder', summary: '3 facts' } as BusEvent,
    ];
    const html = renderToString(<StageTrace events={events} running={false} label="x" />);
    expect(html).not.toContain('stagetrace__trace-id');
  });
});

describe('StageTrace (usage meter)', () => {
  it('shows the token meter when model.usage events are present', () => {
    const events: BusEvent[] = [
      { type: 'run.started', sessionId: 's1' },
      { type: 'model.usage', sessionId: 's1', model: 'm', total_tokens: 1200, cached_tokens: 900 },
      { type: 'model.usage', sessionId: 's1', model: 'm', total_tokens: 340 },
      { type: 'run.finished', sessionId: 's1', ok: true },
    ];
    const html = renderToString(<StageTrace events={events} running={false} label="x" />);
    // React SSR inserts `<!-- -->` separators between text and JSX expressions;
    // strip them so the assertions read the clean text.
    const clean = html.replace(/<!-- -->/g, '');
    expect(clean).toContain('stagetrace__meter');
    expect(clean).toContain('1,540 tokens');
    expect(clean).toContain('2 calls');
    expect(clean).toContain('900 cached');
  });

  it('omits the meter when no model.usage events are present', () => {
    const events: BusEvent[] = [
      { type: 'run.started', sessionId: 's1' },
      { type: 'run.finished', sessionId: 's1', ok: true },
    ];
    const html = renderToString(<StageTrace events={events} running={false} label="x" />);
    expect(html).not.toContain('stagetrace__meter');
  });
});