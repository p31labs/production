import { useEffect, useRef, useState } from 'react';
import { Button } from '@p31ca/design-core/compositions';
import { useQpjStore } from '../store/useQpjStore';
import { useNotifStore } from '../store/useNotifStore';
import { navigateTo } from '../lib/routes';
import './crisis.css';

export function CrisisOverlay() {
  const spoons = useQpjStore((s) => s.spoons);
  const restartDay = useQpjStore((s) => s.restartDay);
  const [open, setOpen] = useState(false);
  const prevSpoons = useRef(spoons);

  useEffect(() => {
    if (spoons === 0 && prevSpoons.current > 0) {
      setOpen(true);
    }
    prevSpoons.current = spoons;
  }, [spoons]);

  useEffect(() => {
    if (!open) return undefined;
    document.getElementById('crisis-primary')?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  if (!open) return null;

  const rest = () => {
    restartDay();
    useNotifStore.getState().notify({
      kind: 'success',
      title: 'The jar is refilled',
      body: 'Spoons are back — the day starts gently again.',
    });
    setOpen(false);
  };

  return (
    <div
      className="crisis"
      role="dialog"
      aria-modal="true"
      aria-labelledby="crisis-title"
      data-crisis="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) setOpen(false);
      }}
    >
      <div className="crisis__card">
        <p className="crisis__kicker">Rest stop</p>
        <h2 id="crisis-title" className="crisis__title">
          The jar is running low
        </h2>
        <p className="crisis__text">
          No spoons left — this is the floor, not a punishment. Rest the day to
          refill the jar, or keep going gentle.
        </p>
        <div className="crisis__actions">
          <Button id="crisis-primary" size="sm" onClick={rest}>
            Rest the day
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
            Keep going
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setOpen(false);
              navigateTo('switch');
            }}
          >
            Switch lanes
          </Button>
        </div>
      </div>
    </div>
  );
}