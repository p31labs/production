import { useState } from 'react';
import { parseIntent, runQaGates } from '@p31/design-core/agentic';
import { PageHeader } from '@p31/design-core/compositions';

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
    const lines = report.checks.map((c) => `${c.status === 'pass' ? 'PASS' : c.status === 'warn' ? 'WARN' : 'REJECT'} ${c.name}: ${c.detail}`);
    setResult({ type: report.approved ? 'pass' : 'reject', lines });
  };

  return (
    <>
      <PageHeader
        eyebrow="Agentic pipeline"
        title="Playground"
        lede="Write Intent DSL, run the Opus QA gates in-browser, and watch a component spec pass or reject — with LOVE semantics intact."
      />
      <div className="intent-playground">
        <div className="explorer-toolbar">
          <button onClick={run} className="px-4 py-2 rounded-lg bg-accent text-void font-semibold hover:opacity-80 transition-opacity">
            Run QA Gates
          </button>
        </div>

        <div className="playground-layout">
          <textarea
            className="input flex-1 h-96 font-mono text-sm resize-none"
            value={yaml}
            onChange={(e) => setYaml(e.target.value)}
            aria-label="Intent DSL input"
          />
          <div className="flex-1">
            {result ? (
              <pre className="p-4 rounded-lg border border-glass-border bg-void text-text font-mono text-sm">
                {result.lines.map((line, i) => (
                  <div key={i}>{line}</div>
                ))}
              </pre>
            ) : (
              <div className="p-4 rounded-lg border border-glass-border bg-glass-bg text-text-tertiary text-center">
                Click "Run QA Gates" to validate your Intent DSL
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}