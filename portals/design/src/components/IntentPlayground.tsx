import { useState } from 'react';
import { parseIntent, runQaGates } from '@p31/design-core/agentic';

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
    <div className="intent-playground">
      <div className="intent-grid">
        <div className="intent-editor">
          <div className="recipe-preview-head"><span className="mono">intent.design.yml</span></div>
          <textarea
            className="intent-textarea"
            value={yaml}
            onChange={(e) => setYaml(e.target.value)}
            spellCheck={false}
            aria-label="Intent DSL editor"
          />
          <div className="explorer-toolbar" style={{ paddingTop: 12 }}>
            <button className="btn btn-primary" onClick={run}>Run Opus gates</button>
          </div>
        </div>
        <div className="intent-report" aria-live="polite">
          <div className="recipe-preview-head">
            <span className="mono">Opus QA report</span>
            {result && (
              <span className={`chip ${result.type === 'pass' ? 'chip-pass' : result.type === 'reject' ? 'chip-reject' : 'chip-warn'}`}>
                {result.type === 'pass' ? 'APPROVED' : result.type === 'reject' ? 'REJECTED' : 'INVALID'}
              </span>
            )}
          </div>
          {result ? (
            <div className="gate-report">
              {result.lines.map((l, i) => <div key={i} className="gate-line">{l}</div>)}
            </div>
          ) : (
            <div className="token-empty">Edit the intent and run the gates. WCAG-AAA, spoon ladder, touch targets, and LOVE semantics are enforced.</div>
          )}
        </div>
      </div>
    </div>
  );
}
