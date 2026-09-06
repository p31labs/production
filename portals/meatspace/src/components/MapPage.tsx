import { useState, useMemo } from 'react';
import { ZONES, ZONE_EMOJI, ZONE_NAME, type Atom, type Bond } from '../lib/game';
import AtomRow from './AtomRow';
import TetrahedronVisualizer from './TetrahedronVisualizer';
import { useMeshTetraNodes, edgeWeight } from '../hooks/useMeshTetraNodes';

interface MapPageProps {
  active?: boolean;
  atoms: Atom[];
  onCheckIn: (zone: string) => void;
  onPing: (atom: Atom) => void;
}

export default function MapPage({ active, atoms, onCheckIn, onPing }: MapPageProps) {
  const [viewMode, setViewMode] = useState<'atoms' | 'mesh'>('atoms');

  const handleCheckIn = () => {
    const zone = ZONES[Math.floor(Math.random() * ZONES.length)];
    onCheckIn(ZONE_NAME[zone]);
  };

  const sorted = [...atoms].sort((a, b) => b.bonds - a.bonds);

  // Tetrahedron data
  const { nodes: tetraNodes } = useMeshTetraNodes();

  const tetraEdges = useMemo(() => {
    const e: { a: number; b: number; weight: number }[] = [];
    for (let i = 0; i < tetraNodes.length; i++) {
      for (let j = i + 1; j < tetraNodes.length; j++) {
        e.push({ a: i, b: j, weight: edgeWeight(tetraNodes[i], tetraNodes[j]) });
      }
    }
    return e;
  }, [tetraNodes]);

  const symmetry = useMemo(() => {
    const active = tetraNodes.filter(n => n.spoons > 0 && n.role !== 'ghost').length;
    return Math.round((active / Math.max(1, Math.min(4, tetraNodes.length))) * 100);
  }, [tetraNodes]);

  const curvature = useMemo(() => {
    if (tetraEdges.length === 0) return 0;
    return tetraEdges.reduce((s, e) => s + (e.weight - 0.5), 0) * 2 / tetraEdges.length;
  }, [tetraEdges]);

  return (
    <section id="page-map" className={`page ${active ? 'active' : ''}`} role="tabpanel" aria-labelledby="tab-map">
      <div className="map-toolbar" style={{ display: 'flex', gap: '6px', marginBottom: '12px' }}>
        <button
          className={`btn-autonomy${viewMode === 'atoms' ? ' active' : ''}`}
          onClick={() => setViewMode('atoms')}
        >
          🌍 Atoms
        </button>
        <button
          className={`btn-autonomy${viewMode === 'mesh' ? ' active' : ''}`}
          onClick={() => setViewMode('mesh')}
        >
          🔺 Mesh
        </button>
      </div>

      {viewMode === 'atoms' ? (
        <>
          <div className="map-wrapper">
            <div className="map-grid" />
            <div className="map-zones" role="img" aria-label="Zone map">
              {ZONES.map((zone) => (
                <span key={zone} className={`zone-badge ${zone}`}>
                  {ZONE_EMOJI[zone]} {ZONE_NAME[zone]}
                </span>
              ))}
            </div>
            <button className="fab" id="checkinBtn" onClick={handleCheckIn} aria-label="Check in">
              📍
            </button>
          </div>
          <div className="nearby">
            <h3 style={{ fontSize: 'var(--p31-scale-sm)', fontWeight: 600, color: 'var(--p31-text-secondary)', marginBottom: '8px' }}>
              🌟 Nearby Atoms
            </h3>
            {sorted.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--p31-text-secondary)', fontSize: 'var(--p31-scale-xs)' }}>
                No atoms nearby. Check in to be discovered.
              </div>
            ) : (
              <div id="nearbyList" role="list">
                {sorted.map((atom) => (
                  <AtomRow key={atom.id} atom={atom} onPing={onPing} />
                ))}
              </div>
            )}
          </div>
        </>
      ) : (
        <div style={{ background: 'var(--p31-surface)', borderRadius: 'var(--p31-radius-lg)', border: '1px solid var(--p31-glass-border)', padding: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <TetrahedronVisualizer
            nodes={tetraNodes}
            edges={tetraEdges}
            phase={atoms.length >= 4 ? 1 : atoms.length >= 2 ? 0.5 : 0.25}
            symmetry={symmetry}
            curvature={curvature}
            showControls={true}
            size={300}
          />
        </div>
      )}
    </section>
  );
}
