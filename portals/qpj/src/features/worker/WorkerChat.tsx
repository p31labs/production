import { useMemo, useState } from 'react';
import { Button } from '@p31/design-core/compositions';
import { useWorkerStore } from './workerStore';
import { delegateGoal } from './delegation';
import { getPassport } from '../../lib/passports';
import { navigateTo } from '../../lib/routes';
import './worker.css';

interface WorkerChatProps {
  passportId: string;
}

export function WorkerChat({ passportId }: WorkerChatProps) {
  const person = getPassport(passportId);
  const profile = useWorkerStore((s) => s.profiles[passportId]);
  const tasks = useWorkerStore((s) => s.tasks[passportId] ?? []);
  const setAutonomy = useWorkerStore((s) => s.setAutonomy);
  const initWorker = useWorkerStore((s) => s.initWorker);
  const [draft, setDraft] = useState('');

  useMemo(() => {
    if (!profile) initWorker(passportId, person.pickledName);
  }, [passportId, profile, initWorker, person.pickledName]);

  const recent = useMemo(() => tasks.slice(-10).reverse(), [tasks]);

  const send = async () => {
    const goal = draft.trim();
    if (!goal) return;
    setDraft('');
    await delegateGoal(passportId, goal);
    navigateTo('workshop');
  };

  return (
    <section className="worker-chat card" aria-label={`${person.pickledName}'s worker`}>
      <header className="worker-chat__head">
        <div>
          <h2 className="section-eyebrow">Your worker</h2>
          <p className="worker-chat__sub">
            {person.pickledName} · {profile?.totalTasks ?? 0} task{(profile?.totalTasks ?? 0) === 1 ? '' : 's'}
          </p>
        </div>
        <div className="worker-chat__autonomy" role="radiogroup" aria-label="Worker autonomy">
          {(['advisory', 'assisted', 'autonomous'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              className={`worker-chat__mode${profile?.autonomy === mode ? ' is-active' : ''}`}
              aria-pressed={profile?.autonomy === mode}
              onClick={() => { setAutonomy(passportId, mode); }}
            >
              {mode}
            </button>
          ))}
        </div>
      </header>

      <div className="worker-chat__composer">
        <input
          type="text"
          className="worker-chat__input"
          placeholder="Give your worker a goal…"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') void send(); }}
          aria-label="Worker goal"
        />
        <Button size="sm" variant="primary" onClick={() => void send()} disabled={!draft.trim()}>
          Delegate
        </Button>
      </div>

      {recent.length > 0 && (
        <ul className="worker-chat__tasks" aria-label="Recent tasks">
          {recent.map((t) => (
            <li key={t.id} className={`worker-task worker-task--${t.status}`}>
              <span className="worker-task__status" aria-hidden="true">{statusGlyph(t.status)}</span>
              <span className="worker-task__prompt">{t.prompt}</span>
            </li>
          ))}
        </ul>
      )}

      {recent.length === 0 && (
        <div className="worker-chat__empty" role="region" aria-labelledby="worker-empty-title">
          <span className="worker-chat__empty-icon" data-empty-icon aria-hidden="true">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="12" cy="12" r="8" />
              <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
            </svg>
          </span>
          <h2 id="worker-empty-title" className="worker-chat__empty-title">Nothing to review yet</h2>
          <p className="worker-chat__empty-copy" data-empty-suggestion>
            Give your worker a goal above, then check back for a draft.
          </p>
        </div>
      )}
    </section>
  );
}

function statusGlyph(status: string): string {
  return status === 'done' ? '✓'
    : status === 'error' ? '✕'
    : status === 'blocked' ? '⏸'
    : status === 'working' ? '◐'
    : status === 'thinking' ? '…'
    : '·';
}
