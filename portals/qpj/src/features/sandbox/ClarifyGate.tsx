import { useState } from 'react';
import { Button } from '@p31ca/design-core/compositions';
import type { ClarifyQuestion } from './clarify';

interface ClarifyGateProps {
  originalPrompt: string;
  questions: ClarifyQuestion[];
  onResolve: (answers: Record<string, string>) => void;
  onCancel: () => void;
}

export default function ClarifyGate({ originalPrompt, questions, onResolve, onCancel }: ClarifyGateProps) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  const answerCount = questions.filter((q) => answers[q.key]).length;
  const allAnswered = answerCount === questions.length;

  const submit = () => {
    if (!allAnswered || submitted) return;
    setSubmitted(true);
    onResolve(answers);
  };

  return (
    <div className="clarify-gate" role="region" aria-label="Clarify before generating">
      <div className="clarify-gate-panel">
        <div className="clarify-gate-head">
          <span className="clarify-gate-title">Before I build — a couple of quick decisions</span>
          <span className="clarify-gate-prompt">{originalPrompt.slice(0, 90)}{originalPrompt.length > 90 ? '…' : ''}</span>
        </div>

        <div className="clarify-gate-questions">
          {questions.map((q, qi) => (
            <div key={q.key} className="clarify-question">
              <span className="clarify-question-label">
                {qi + 1}. {q.question}
              </span>
              <div className="clarify-options">
                {q.options.map((opt) => {
                  const selected = answers[q.key] === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      className={`clarify-option${selected ? ' clarify-option--selected' : ''}`}
                      onClick={() => setAnswers((a) => ({ ...a, [q.key]: opt.value }))}
                      aria-pressed={selected}
                      aria-label={opt.hint ? `${opt.label} — ${opt.hint}` : opt.label}
                    >
                      <span className="clarify-option-label">{opt.label}</span>
                      {opt.hint && <span className="clarify-option-hint">{opt.hint}</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="clarify-gate-actions">
          <Button variant="ghost" size="sm" onClick={onCancel}>
            Skip
          </Button>
          <Button variant="primary" size="sm" onClick={submit} disabled={!allAnswered}>
            {answerCount === 0 ? 'Let defaults decide' : `Generate with ${answerCount} choice${answerCount > 1 ? 's' : ''}`}
          </Button>
        </div>
      </div>
    </div>
  );
}