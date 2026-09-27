import { useEffect, useRef } from 'react';
import { Button } from '@p31ca/design-core/compositions';
import type { PipelineStep, ContractIssue } from './pipeline';

const KIND_LABEL: Record<PipelineStep['kind'], string> = {
  clarify: 'Clarify intent',
  generate: 'Generate',
  verify: 'Verify output',
  'visual-diff': 'Visual diff',
  rubric: 'P31 rubric',
  repair: 'Repair',
  deploy: 'Deploy',
};

const STATUS_LABEL: Record<PipelineStep['status'], string> = {
  pending: 'Queued',
  running: 'Running',
  done: 'Done',
  blocked: 'Blocked on you',
  error: 'Failed',
  skipped: 'Skipped',
};

interface ToolTimelineProps {
  steps: PipelineStep[];
  onRepair: (issue: ContractIssue) => void;
  onRetry: () => void;
  onContinue: () => void;
}

export default function ToolTimeline({ steps, onRepair, onRetry, onContinue }: ToolTimelineProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [steps]);

  if (steps.length === 0) return null;

  return (
    <div className="tool-timeline" role="list" aria-label="Generation pipeline" ref={scrollRef}>
      <div className="tool-timeline-head">
        <span className="tool-timeline-title">Pipeline</span>
        <span className="tool-timeline-progress">
          {steps.filter((s) => s.status === 'done' || s.status === 'error' || s.status === 'blocked').length}/{steps.length}
        </span>
      </div>

      <div className="tool-timeline-steps">
        {steps.map((step) => {
          const isActive = step.status === 'running';
          const isBlocked = step.status === 'blocked';
          const hasIssues = (step.issues?.length ?? 0) > 0;

          return (
            <div
              key={step.id}
              role="listitem"
              className={`tool-step tool-step--${step.status}${hasIssues ? ' tool-step--has-issues' : ''}`}
              aria-current={isActive ? 'true' : undefined}
            >
              <div className="tool-step-row">
                <span className={`tool-step-indicator${isActive ? ' tool-step-indicator--spin' : ''}`} aria-hidden="true" />
                <span className="tool-step-name">{KIND_LABEL[step.kind]}</span>
                <span className="tool-step-status">{STATUS_LABEL[step.status]}{step.detail ? ` — ${step.detail}` : ''}</span>
              </div>

              {isBlocked && (
                <div className="tool-step-action" role="group" aria-label={`${KIND_LABEL[step.kind]} intervention`}>
                  <Button variant="ghost" size="sm" onClick={onRetry}>Retry</Button>
                  <Button variant="primary" size="sm" onClick={onContinue}>Continue</Button>
                </div>
              )}

              {step.status === 'error' && (
                <div className="tool-step-action" role="group" aria-label="Recover from error">
                  <Button variant="ghost" size="sm" onClick={onRetry}>Retry</Button>
                </div>
              )}

              {hasIssues && (
                <div className="tool-step-issues">
                  {step.issues!.map((issue) => (
                    <div key={`${issue.code}-${issue.priority}`} className={`tool-step-issue tool-step-issue--${issue.severity}`}>
                      <div className="tool-step-issue-line">
                        <span className={`issue-badge issue-badge--${issue.severity}`} aria-label={issue.severity}>
                          {issue.severity === 'error' ? '!' : 'i'}
                        </span>
                        <span className="issue-message">{issue.message}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onRepair(issue)}
                          aria-label={`Repair: ${issue.message.slice(0, 60)}`}
                        >
                          Fix
                        </Button>
                      </div>
                      <div className="tool-step-issue-suggestion">{issue.suggestion}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}