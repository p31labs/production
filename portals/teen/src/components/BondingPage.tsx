import { useState } from 'react';

interface BondingPageProps {
  active: boolean;
  sovereignEnabled: boolean;
  onMintLove: (type: string, meta?: Record<string, unknown>) => Promise<boolean>;
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

const ATOMS = ['H', 'C', 'N', 'O', 'P', 'Ca'];
const VALENCES: Record<string, number> = { H: 1, C: 4, N: 3, O: 2, P: 5, Ca: 2 };
const WEIGHTS: Record<string, number> = { H: 1, C: 4, N: 5, O: 3, P: 8, Ca: 10 };

export default function BondingPage({ active, sovereignEnabled, onMintLove, showToast }: BondingPageProps) {
  const [molecule, setMolecule] = useState<string[]>([]);

  const selectAtom = (atom: string) => {
    setMolecule((prev) => [...prev, atom]);
  };

  const clearMolecule = () => {
    setMolecule([]);
  };

  const submitMolecule = () => {
    if (molecule.length === 0) {
      showToast('Empty molecule!', 'error');
      return;
    }
    const counts: Record<string, number> = {};
    molecule.forEach((a) => { counts[a] = (counts[a] || 0) + 1; });
    const formula = Object.entries(counts)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([a, c]) => `${a}${c > 1 ? c : ''}`)
      .join('');
    const score = molecule.reduce((s, a) => s + WEIGHTS[a], 0);
    const totalV = molecule.reduce((s, a) => s + VALENCES[a], 0);
    const stable = totalV % 2 === 0;
    const valid = stable;
    const msg = valid ? `Stable ${formula}` : `Unstable ${formula}`;

    if (valid && sovereignEnabled) {
      onMintLove('MOLECULE_COMPLETE', { formula, score });
      showToast(`✅ ${msg} +${score} LOVE`, 'success');
    } else {
      showToast(valid ? `✅ ${msg}` : `❌ ${msg}`, valid ? 'success' : 'error');
    }
    setMolecule([]);
  };

  return (
    <section className={`page${active ? ' active' : ''}`} id="page-bonding" role="tabpanel">
      <h2>🧬 BONDING</h2>
      <div className="glass-card">
        <h3 style={{ fontSize: '13px', marginBottom: 'var(--p31-space-sm)' }}>Molecule Builder</h3>
        <div className="atom-palette" id="atomPalette">
          {ATOMS.map((atom) => (
            <button
              key={atom}
              className={`atom-button${molecule.includes(atom) ? ' selected' : ''}`}
              onClick={() => selectAtom(atom)}
            >
              {atom}
            </button>
          ))}
        </div>
        <div style={{ marginTop: 'var(--p31-space-md)' }}>
          <div style={{ fontSize: '11px', color: 'var(--p31-text-secondary)', marginBottom: '4px' }}>Your Molecule</div>
          <div className="molecule-display" id="moleculeDisplay">
            {molecule.length ? molecule.join('') : '-'}
          </div>
        </div>
        <div className="grid-2" style={{ marginTop: 'var(--p31-space-md)' }}>
          <button className="button secondary" onClick={clearMolecule}>Clear</button>
          <button className="button" onClick={submitMolecule}>Submit</button>
        </div>
      </div>
    </section>
  );
}
