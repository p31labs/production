import { useRef, useState } from 'react';
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
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const answerCount = questions.filter((q) => answers[q.key]).length;
  const allAnswered = answerCount === questions.length;

  const submit = () => {
    if (!allAnswered || submitted) return;
    setSubmitted(true);
    onResolve(answers);
  };

  const pick = (key: string, value: string) => {
    if (submitted) return;
    setAnswers((a) => ({ ...a, [key]: value }));
  };

  const onGroupKeyDown = (e: React.KeyboardEvent, qi: number) => {
    const groupOptions = questions[qi].options;
    const current = groupOptions.findIndex((o) => answers[questions[qi].key] === o.value);
    const base = questions.slice(0, qi).reduce((n, q) => n + q.options.length, 0);
    const index = current >= 0 ? current : 0;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      const next = (index + 1) % groupOptions.length;
      optionRefs.current[base + next]?.focus();
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      const prev = (index - 1 + groupOptions.length) % groupOptions.length;
      optionRefs.current[base + prev]?.focus();
    } else if (e.key === 'Home') {
      e.preventDefault();
      optionRefs.current[base]?.focus();
    } else if (e.key === 'End') {
      e.preventDefault();
      optionRefs.current[base + groupOptions.length - 1]?.focus();
    }
  };

  const optionIndex = (qi: number, oi: number) =>
    questions.slice(0, qi).reduce((n, q) => n + q.options.length, 0) + oi;

  return (
    <div className="clarify-gate" role="region" aria-label="Clarify before generating">
      <div className="clarify-gate-panel">
        <div className="clarify-gate-head">
          <span className="clarify-gate-title">Before I build — a couple of quick decisions</span>
          <span className="clarify-gate-prompt">{originalPrompt.slice(0, 90)}{originalPrompt.length > 90 ? '…' : ''}</span>
        </div>

        <div className="clarify-gate-questions">
          {questions.map((q, qi) => (
            <fieldset key={q.key} className="clarify-question">
              <legend className="clarify-question-label">
                {qi + 1}. {q.question}
              </legend>
              <div className="clarify-options" role="radiogroup" aria-label={q.question}>
                {q.options.map((opt, oi) => {
                  const selected = answers[q.key] === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      ref={(el) => { optionRefs.current[optionIndex(qi, oi)] = el; }}
                      className={`clarify-option${selected ? ' clarify-option--selected' : ''}`}
                      onClick={() => pick(q.key, opt.value)}
                      onKeyDown={(e) => onGroupKeyDown(e, qi)}
                      aria-label={opt.hint ? `${opt.label} — ${opt.hint}` : opt.label}
                      data-agent-kind="action"
                      data-agent-action="chat.clarify.resolve"
                    >
                      <span className="clarify-option-label">{opt.label}</span>
                      {opt.hint && <span className="clarify-option-hint">{opt.hint}</span>}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          ))}
        </div>

        <div className="clarify-gate-actions">
          <Button variant="ghost" size="sm" onClick={onCancel}>
            Skip
          </Button>
          <Button variant="primary" size="sm" onClick={submit} disabled={!allAnswered}>
            Generate{answerCount > 0 ? ` with ${answerCount} choice${answerCount > 1 ? 's' : ''}` : ''}
          </Button>
        </div>
      </div>
    </div>
  );
}