import { useState } from 'react';
import { parseIntent, runQaGates } from '@p31ca/design-core/agentic';
import { GlassPanel } from '@p31ca/design-core/compositions';

const STARTER = `component: AffirmButton
narrative: |
  An action button that affirms user intent. Celebratory at high spoon
  levels, minimal and restful at low. Every successful action earns LOVE.
constraints:
  accessibility: { wcag: AAA, contrast: 7, touchTarget: 48 }
  spoonAware: true
  performance: { bundle: 3, renderTime: 16.67 }
  loveSemantics:
    - { trigger: on-success, reward: 5, recipient: [user, caregiver] }
variants:
  - { name: affirm, description: Positive action, color: accent }
`;

/** Live Intent DSL editor + Opus gate runner (the agentic pipeline, in the browser). */
export default function IntentPlayground() {
  const [yaml, setYaml] = useState(STARTER);
  const [result, setResult] = useState<{ type: 'pass' | 'reject' | 'invalid'; lines: string[] } | null>(null);

  const run = () => {
    const parsed = parseIntent(yaml);
    if (!parsed.ok) {
      setResult({ type: 'invalid', lines: parsed.errors ?? [] });
      return;
    }
    const report = runQaGates(parsed.spec!);
    const lines = report.checks.map((c) => `${c.status === 'pass' ? '✅' : c.status === 'warn' ? '⚠️' : '❌'} ${c.name}: ${c.detail}`);
    setResult({ type: report.approved ? 'pass' : 'reject', lines });
  };

  return (
    <div data-mcp-tool="intentDsl" data-mcp-state="ready">
      <GlassPanel strong>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div>
            <h5 className="label-tiny">intent.design.yml</h5>
            <textarea
              className="input"
              value={yaml}
              onChange={(e) => setYaml(e.target.value)}
              spellCheck={false}
              aria-label="Intent DSL editor"
              style={{ height: 320, resize: 'vertical', fontFamily: 'var(--p31-font-mono, ui-monospace, monospace)', fontSize: 12, lineHeight: 1.6 }}
            />
            <div className="meta-row" style={{ marginTop: 12 }}>
              <button type="button" className="btn btn-primary" onClick={run}>Run Opus gates</button>
            </div>
          </div>

          <div aria-live="polite">
            <div className="meta-row">
              <h5 className="label-tiny">Opus QA report</h5>
              {result && (
                <span className={`chip ${result.type === 'pass' ? 'chip-ok' : result.type === 'reject' ? 'chip-err' : 'chip-warn'}`}>
                  {result.type === 'pass' ? 'APPROVED' : result.type === 'reject' ? 'REJECTED' : 'INVALID'}
                </span>
              )}
            </div>
            {result ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontFamily: 'var(--p31-font-mono, ui-monospace, monospace)', fontSize: 12 }}>
                {result.lines.map((l, i) => (
                  <div key={i} style={{ color: 'var(--p31-text-secondary)', padding: '6px 10px', borderRadius: 8, background: 'var(--p31-glass-bg)' }}>{l}</div>
                ))}
              </div>
            ) : (
              <div className="preview-box" style={{ minHeight: 320 }}>
                <span className="preview-box__text">Edit the intent and run the gates. WCAG-AAA, spoon ladder, touch targets, and LOVE semantics are enforced.</span>
              </div>
            )}
          </div>
        </div>
      </GlassPanel>
    </div>
  )
}