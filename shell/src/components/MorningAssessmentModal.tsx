import { useState } from 'react';
import A2Modal from './ui/A2Modal';
import A2Button from './ui/A2Button';
import { useDualEconomyStore } from '../features/economy';
import { useAppStore } from '../store/useAppStore';

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--p31-space-tiny)' }}>
      <span style={{ color: 'var(--p31-text)', fontSize: 'var(--p31-scale-sm)' }}>{label}</span>
      {children}
    </div>
  );
}

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className="btn"
      style={{
        background: on ? 'var(--p31-accent)' : 'var(--p31-glass-bg)',
        color: on ? '#000' : 'var(--p31-text-secondary)',
        minWidth: 44,
      }}
    >
      {on ? 'On' : 'Off'}
    </button>
  );
}

export default function MorningAssessmentModal({ onClose }: { onClose: () => void }) {
  const showToast = useAppStore((s) => s.showToast);
  const [medicationTaken, setMedicationTaken] = useState(true);
  const [painLevel, setPainLevel] = useState(0);
  const [courtDay, setCourtDay] = useState(false);
  const [fragile, setFragile] = useState(false);
  const [busy, setBusy] = useState(false);

  const run = async () => {
    setBusy(true);
    try {
      const store = useDualEconomyStore.getState();
      await store.runMorningAssessment({ medicationTaken, painLevel, courtDay, fragile });
      const b = useDualEconomyStore.getState().budget;
      showToast(`Budget set — ${b.remaining}/${b.netBudget} (${b.tier})`, 'success');
      onClose();
    } catch {
      showToast('Assessment failed', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <A2Modal
      title="Morning assessment"
      visible
      onClose={onClose}
      actions={[
        { label: 'Cancel', onClick: onClose, disabled: busy },
        { label: 'Run assessment', onClick: run, disabled: busy },
      ]}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--p31-space-xs)' }}>
        <Row label="Medication taken">
          <Toggle on={medicationTaken} onChange={setMedicationTaken} />
        </Row>
        <Row label={`Pain level (${painLevel}/10)`}>
          <input
            type="range"
            min={0}
            max={10}
            value={painLevel}
            aria-label="Pain level"
            onChange={(e) => setPainLevel(Number(e.target.value))}
            style={{ flex: 1, minWidth: 0 }}
          />
        </Row>
        <Row label="Court day">
          <Toggle on={courtDay} onChange={setCourtDay} />
        </Row>
        <Row label="Fragile / emotional">
          <Toggle on={fragile} onChange={setFragile} />
        </Row>
      </div>
    </A2Modal>
  );
}
