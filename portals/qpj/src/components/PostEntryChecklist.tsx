import { useEffect, useRef, useState } from 'react';
import { Button } from '@p31/design-core/compositions';
import { hasSBTMilestone } from '@p31/sovereign-core';
import { useQpjStore } from '../store/useQpjStore';
import { MILESTONE_CLAIMED_SPACE } from '../hooks/useSBT';
import './post-entry-checklist.css';

interface ChecklistItem {
  id: 'badge' | 'mesh' | 'mode';
  label: string;
  doneCopy: string;
}

const ITEMS: ChecklistItem[] = [
  {
    id: 'badge',
    label: 'Claim your pickle badge',
    doneCopy: 'You made your first key. This door is yours.',
  },
  {
    id: 'mesh',
    label: 'Meet the mesh',
    doneCopy: 'Someone else can see you now.',
  },
  {
    id: 'mode',
    label: 'Unlock your first mode',
    doneCopy: 'The workshop opens when you are ready.',
  },
];

const RING_CIRCUMFERENCE = 97.4;

export function PostEntryChecklist() {
  const meshSeen = useQpjStore((s) => s.meshSeen);
  const hasUnlockedMode = useQpjStore((s) => s.hasUnlockedMode);
  const badgeDoneFlag = useQpjStore((s) => s.badgeDone);
  const dismissed = useQpjStore((s) => s.onboardingChecklistDismissed);
  const reduceMotion = useQpjStore((s) => s.reduceMotion);
  const dismiss = useQpjStore((s) => s.dismissOnboardingChecklist);

  const [legacyBadge] = useState(() => hasSBTMilestone(MILESTONE_CLAIMED_SPACE));
  const badgeDone = badgeDoneFlag || legacyBadge;

  const doneMap: Record<(typeof ITEMS)[number]['id'], boolean> = {
    badge: badgeDone,
    mesh: meshSeen,
    mode: hasUnlockedMode,
  };
  const doneCount = ITEMS.filter((item) => doneMap[item.id]).length;
  const allDone = doneCount === ITEMS.length;

  const [celebration, setCelebration] = useState(false);
  const prevAllDone = useRef(allDone);

  useEffect(() => {
    if (prevAllDone.current) return;
    if (!allDone) return;
    setCelebration(true);
    const timer = window.setTimeout(() => setCelebration(false), 3000);
    return () => window.clearTimeout(timer);
  }, [allDone]);

  useEffect(() => {
    prevAllDone.current = allDone;
  }, [allDone]);

  if (dismissed) return null;

  if (allDone) {
    return celebration ? (
      <p
        className="checklist__celebration"
        data-static={reduceMotion ? 'true' : 'false'}
        role="status"
      >
        🥒 All three done — you are home.
      </p>
    ) : null;
  }

  const ringFill = (doneCount / ITEMS.length) * RING_CIRCUMFERENCE;

  return (
    <section className="checklist card" aria-label="Getting home">
      <h2 className="section-eyebrow">Getting home · {doneCount} of {ITEMS.length}</h2>
      <svg className="checklist__ring" viewBox="0 0 36 36" aria-hidden="true">
        <circle cx="18" cy="18" r="15.5" className="checklist__ring-track" />
        <circle
          cx="18"
          cy="18"
          r="15.5"
          className="checklist__ring-fill"
          strokeDasharray={`${ringFill} ${RING_CIRCUMFERENCE}`}
        />
      </svg>
      <ul className="checklist__items">
        {ITEMS.map((item) => {
          const done = doneMap[item.id];
          return (
            <li key={item.id} className={`checklist__item${done ? ' is-done' : ''}`}>
              <span className="checklist__mark" aria-hidden="true">{done ? '✓' : '·'}</span>
              <span className="checklist__label">{item.label}</span>
              {done && <span className="checklist__done-copy">{item.doneCopy}</span>}
            </li>
          );
        })}
      </ul>
      <div className="checklist__actions">
        <Button size="sm" variant="ghost" onClick={dismiss}>Dismiss</Button>
      </div>
    </section>
  );
}