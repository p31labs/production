import { useState } from 'react';
import { Button } from '@p31/design-core/compositions';
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

interface GateRun {
  type: 'pass' | 'reject' | 'invalid';
  lines: string[];
}

/** Live Intent DSL editor + Opus gate runner — the agentic pipeline, in the browser. */
export function Playground() {
  const [yaml, setYaml] = useState(STARTER);
  const [result, setResult] = useState<GateRun | null>(null);

  const run = () => {
    const parsed = parseIntent(yaml);
    if (!parsed.ok) {
      setResult({ type: 'invalid', lines: parsed.errors ?? [] });
      return;
    }
    const report = runQaGates(parsed.spec!);
    const lines = report.checks.map((c) => `${statusText(c.status)} ${c.name}: ${c.detail}`);
    setResult({ type: report.approved ? 'pass' : 'reject', lines });
  };

  return (
    <div className="intent">
      <p className="wbench__lede">
        Write a piece in plain Intent DSL and run the Opus QA gates — right here, no
        network. Wrong contrast, undersized touch targets, spoon-blind claims: all caught.
      </p>
      <div className="intent__toolbar">
        <Button onClick={run}>Run QA Gates</Button>
      </div>
      <div className="intent__layout">
        <textarea
          className="intent__editor"
          value={yaml}
          onChange={(e) => setYaml(e.target.value)}
          aria-label="Intent DSL input"
          spellCheck={false}
        />
        <div className="intent__results">
          {result ? (
            <div className="intent__report" aria-live="polite">
              <p className={`intent__verdict intent__verdict--${result.type}`}>
                {result.type === 'pass'
                  ? 'PASS — ship it'
                  : result.type === 'reject'
                    ? 'REJECT — fix before generation'
                    : 'INVALID — not parseable Intent DSL'}
              </p>
              {result.lines.map((line, i) => (
                <div key={i} className={`intent__line intent__line--${toneOf(line)}`}>
                  {line}
                </div>
              ))}
            </div>
          ) : (
            <div className="token-empty">Click “Run QA Gates” to validate your Intent DSL.</div>
          )}
        </div>
      </div>
    </div>
  );
}

function statusText(status: 'pass' | 'warn' | 'reject'): string {
  return status === 'pass' ? 'PASS' : status === 'warn' ? 'WARN' : 'REJECT';
}

function toneOf(line: string): 'pass' | 'warn' | 'reject' {
  if (line.startsWith('PASS')) return 'pass';
  if (line.startsWith('WARN')) return 'warn';
  return 'reject';
}