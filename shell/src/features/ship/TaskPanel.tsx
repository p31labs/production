// TaskPanel — task mode hub for the cockpit right rail.
// Aggregates spoon forecast + goal breakdown (numbered 1-of-N step cards, COGA o1p04)
// + time estimate + next-action, self-contained via the cognitive-prosthetic lib.
import { useEffect, useMemo, useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { getForecast } from '../../lib/spoonHistory';
import { taskBreakdown, timeEstimate, nextAction, persistGoal, getGoalHistory, completeStep, rebreakdownGoal } from '../../lib/cognitive';
import type { Step } from '../../lib/cognitive';

interface HistoryEntry { id: string; goal: string; steps: Step[]; createdAt: number }

export default function TaskPanel() {
  const spoons = useAppStore((s) => s.spoons);
  const [goal, setGoal] = useState('');
  const [steps, setSteps] = useState<Step[] | null>(null);
  const [currentGoalId, setCurrentGoalId] = useState<string | null>(null);
  const [estimate, setEstimate] = useState<{ minutes: number; note: string } | null>(null);
  const [forecast, setForecast] = useState('No pattern yet — logging spoons builds your forecast.');
  const [saved, setSaved] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  useEffect(() => {
    getForecast().then((f) => setForecast(f.message || 'No pattern yet — logging spoons builds your forecast.'));
    getGoalHistory()
      .then((entries) => setHistory(entries.sort((a, b) => b.createdAt - a.createdAt).slice(0, 5)))
      .catch(() => setHistory([]));
  }, []);

  const next = useMemo(() => nextAction({ tasks: (steps ?? []).map((s) => s.text), spoons }), [steps, spoons]);

  const runBreakdown = async () => {
    if (!goal.trim()) return;
    const parts = await taskBreakdown({ goal: goal.trim() });
    const stepObjects = parts.map((s) => ({ text: s, done: false }));
    setSteps(stepObjects);
    setEstimate(timeEstimate({ complexity: 3, spoons }));
    persistGoal(goal.trim(), parts)
      .then((id) => {
        setCurrentGoalId(id);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
        getGoalHistory()
          .then((entries) => setHistory(entries.sort((a, b) => b.createdAt - a.createdAt).slice(0, 5)))
          .catch(() => {});
      })
      .catch(() => {});
  };

  const handleComplete = async (stepIndex: number) => {
    if (!currentGoalId || !steps) return;
    const updated = steps.map((s, i) => (i === stepIndex ? { ...s, done: !s.done } : s));
    setSteps(updated);
    await completeStep(currentGoalId, stepIndex);
    getGoalHistory()
      .then((entries) => setHistory(entries.sort((a, b) => b.createdAt - a.createdAt).slice(0, 5)))
      .catch(() => {});
  };

  const handleRebreakdown = async () => {
    if (!currentGoalId) return;
    const newParts = await rebreakdownGoal(currentGoalId);
    if (newParts) {
      setSteps(newParts.map((s) => ({ text: s, done: false })));
      getGoalHistory()
        .then((entries) => setHistory(entries.sort((a, b) => b.createdAt - a.createdAt).slice(0, 5)))
        .catch(() => {});
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minHeight: 0 }}>
      <div style={{ fontSize: 10, color: 'var(--p31-text-tertiary)', lineHeight: 1.5 }}>
        🥄 {forecast}
      </div>

      <input
        type="text"
        value={goal}
        onChange={(e) => setGoal(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') runBreakdown(); }}
        placeholder="What's the task?"
        style={{
          padding: '7px 9px', borderRadius: 6, border: '1px solid var(--p31-glass-border)',
          background: 'var(--p31-glass-bg)', color: 'var(--p31-text)', fontSize: 11,
          fontFamily: 'var(--p31-font-sans)', outline: 'none',
        }}
        aria-label="Task goal"
      />
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <button type="button" onClick={runBreakdown}
          style={{ alignSelf: 'flex-start', width: 'auto', height: 'auto', padding: '5px 10px', borderRadius: 999, border: '1px solid var(--p31-glass-border)', color: 'var(--p31-text-secondary)', fontSize: 10, background: 'var(--p31-glass-bg)', cursor: 'pointer', fontFamily: 'var(--p31-font-sans)' }}>
          📋 Break down
        </button>
        {saved && (
          <span style={{ fontSize: 9, color: 'var(--p31-accent)', paddingTop: 4 }}>✓ saved</span>
        )}
      </div>

      {steps && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: 10, color: 'var(--p31-text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em' }}>
              Steps · 1 of {steps.length}
            </div>
            <button type="button" onClick={handleRebreakdown}
              style={{ padding: '3px 8px', borderRadius: 999, border: '1px solid var(--p31-glass-border)', color: 'var(--p31-text-secondary)', fontSize: 9, background: 'var(--p31-glass-bg)', cursor: 'pointer', fontFamily: 'var(--p31-font-sans)' }}>
              🔄 Re-break down
            </button>
          </div>
          <ol style={{ margin: 0, paddingLeft: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 4, minHeight: 0 }}>
            {steps.map((s, i) => (
              <li key={i} style={{ display: 'flex', gap: 7, alignItems: 'flex-start', fontSize: 10.5, color: s.done ? 'var(--p31-text-tertiary)' : 'var(--p31-text-secondary)' }}>
                <button type="button" onClick={() => handleComplete(i)}
                  style={{
                    flexShrink: 0, width: 16, height: 16, borderRadius: 3, border: '1px solid var(--p31-glass-border)',
                    background: s.done ? 'var(--p31-accent)' : 'var(--p31-glass-bg)',
                    color: s.done ? '#000' : 'transparent', display: 'grid', placeItems: 'center',
                    fontSize: 10, fontWeight: 800, cursor: 'pointer', padding: 0, lineHeight: 1,
                  }}>
                  {s.done ? '✓' : ''}
                </button>
                <span style={{ textDecoration: s.done ? 'line-through' : 'none' }}>{s.text}</span>
              </li>
            ))}
          </ol>
        </>
      )}

      {estimate && (
        <div style={{ fontSize: 10.5, color: 'var(--p31-text-secondary)', borderTop: '1px solid var(--p31-glass-border)', paddingTop: 6 }}>
          ⏱ ≈ {estimate.minutes} min · {estimate.note}
        </div>
      )}

      <div style={{ fontSize: 10.5, color: 'var(--p31-text-tertiary)', borderTop: '1px solid var(--p31-glass-border)', paddingTop: 6 }}>
        ➡ {next}
      </div>

      {history.length > 0 && (
        <div style={{ borderTop: '1px solid var(--p31-glass-border)', paddingTop: 8 }}>
          <div style={{ fontSize: 9, color: 'var(--p31-text-tertiary)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>
            Recent goals
          </div>
          {history.map((entry) => {
            const doneCount = entry.steps.filter((s) => s.done).length;
            return (
              <div key={entry.id} style={{ fontSize: 9.5, color: 'var(--p31-text-tertiary)', marginBottom: 4, lineHeight: 1.4 }}>
                <span style={{ color: 'var(--p31-text-secondary)' }}>{entry.goal}</span>
                <span style={{ marginLeft: 6, opacity: 0.6 }}>{entry.steps.length} steps{entry.steps.length > 0 ? ` · ✓ ${doneCount}/${entry.steps.length} done` : ''}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
