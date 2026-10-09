import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { getOrCreateDidKey } from '../../lib/identity';
import { getLoveEngine } from '../../lib/loveEngine';
import TetrahedronVisualizer from '../../components/TetrahedronVisualizer';
import {
  atomsFromMesh,
  bondsFromAtoms,
  fillGhosts,
  generateRituals,
  spoonTint,
  timeAgo,
  type Atom,
  type MeshRosterNode,
} from '../../lib/meatspace/game';
import { computeSymmetry, computeCurvature, type Edge, type NodeData } from '../../lib/meatspace/tetrahedron';
import { getBondingState, subscribeBonding } from './bondingState';
import { completeRitualById, getRituals, setRituals, subscribeRituals } from './questEngine';
import GlassCard from '../../components/ui/GlassCard';
import RitualCard from '../../components/RitualCard';
import PageHeader from '../../components/PageHeader';

function triggerBurst(container: HTMLElement | null): void {
  if (!container || typeof (container as HTMLElement & { animate?: unknown }).animate !== 'function') return;
  const colors = ['var(--p31-accent)', 'var(--p31-accent-alt)', 'var(--p31-accent-red)', 'var(--p31-accent-gold)', 'var(--p31-accent-green)', 'var(--p31-accent-violet)'];
  for (let i = 0; i < 16; i++) {
    const p = document.createElement('span');
    p.style.cssText = `position:absolute;left:50%;top:50%;width:8px;height:8px;border-radius:50%;background:${colors[i % colors.length]};pointer-events:none;`;
    container.appendChild(p);
    const angle = (i / 16) * Math.PI * 2;
    const dist = 60 + Math.random() * 60;
    const dx = Math.cos(angle) * dist;
    const dy = Math.sin(angle) * dist;
    p.animate(
      [
        { transform: 'translate(-50%,-50%) scale(1)', opacity: 1 },
        { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(0.4)`, opacity: 0 },
      ],
      { duration: 700, easing: 'cubic-bezier(.2,.8,.2,1)' },
    ).onfinish = () => p.remove();
  }
}

const TIER_ORDER = ['GHOST', 'STRUT', 'COHERENT', 'RESONANT'] as const;

function computeTrustTier(symmetry: number, _curvature: number): typeof TIER_ORDER[number] {
  if (symmetry >= 80) return 'RESONANT';
  if (symmetry >= 60) return 'COHERENT';
  if (symmetry >= 35) return 'STRUT';
  return 'GHOST';
}

export default function BondingSurface() {
  const spoons = useAppStore((s) => s.spoons);
  const loveBalance = useAppStore((s) => s.loveBalance);
  const refreshLoveBalance = useAppStore((s) => s.refreshLoveBalance);
  const showToast = useAppStore((s) => s.showToast);

  const [did, setDid] = useState<string | null>(null);
  const [peers, setPeers] = useState<number>(() => (window as any).__p31_meshSync?.peers ?? 0);
  const [phase, setPhase] = useState(1);

  const burstRef = useRef<HTMLDivElement | null>(null);
  const loveRef = useRef<number>(getBondingState().loveDelta);
  const trustTierRef = useRef<string>('GHOST');

  const rituals = useSyncExternalStore(subscribeRituals, getRituals);
  const bonding = useSyncExternalStore(subscribeBonding, getBondingState);

  // Local DID.
  useEffect(() => {
    getOrCreateDidKey().then(setDid).catch(() => {});
  }, []);

  // Live mesh peer count (libp2p signaling exposes a count, not per-peer DIDs).
  useEffect(() => {
    const sync = () => setPeers((window as any).__p31_meshSync?.peers ?? 0);
    sync();
    const iv = window.setInterval(sync, 5000);
    return () => window.clearInterval(iv);
  }, []);

  // Refresh LOVE balance when the surface mounts.
  useEffect(() => {
    refreshLoveBalance?.().catch(() => {});
  }, [refreshLoveBalance]);

  // Celebration burst when the local LOVE delta ticks up.
  useEffect(() => {
    const unsub = subscribeBonding(() => {
      const cur = getBondingState().loveDelta;
      if (cur > loveRef.current) triggerBurst(burstRef.current);
      loveRef.current = cur;
    });
    return unsub;
  }, []);

  // Roster → atoms → bonds (K₄) → ghost-filled nodes + edges.
  const atoms: Atom[] = useMemo(() => {
    const roster: MeshRosterNode[] = [];
    if (did) roster.push({ did, name: 'You', spoons, role: 'admin', lastSeen: Date.now() });
    for (let i = 1; i <= Math.min(peers, 3); i++) {
      roster.push({ did: `did:mesh:peer-${i}`, name: `Peer ${i}`, spoons: 3, role: 'guest', lastSeen: Date.now() });
    }
    return atomsFromMesh(roster);
  }, [did, spoons, peers]);

  const bonds = useMemo(() => bondsFromAtoms(atoms), [atoms]);
  const filled = useMemo(() => fillGhosts(atoms), [atoms]);

  const nodes: NodeData[] = useMemo(
    () =>
      filled.map((a) => ({
        id: a.id,
        label: a.name,
        spoons: a.spoons,
        role: a.id.startsWith('ghost-') ? 'ghost' : 'guest',
      })),
    [filled],
  );

  const tetraEdges: Edge[] = useMemo(() => {
    const edges: Edge[] = [];
    for (let i = 0; i < filled.length; i++) {
      for (let j = i + 1; j < filled.length; j++) {
        const bond = bonds.find(
          (b) => (b.a === filled[i].id && b.b === filled[j].id) || (b.a === filled[j].id && b.b === filled[i].id),
        );
        edges.push({ a: i, b: j, weight: bond?.weight ?? 0.15 });
      }
    }
    return edges;
  }, [filled, bonds]);

  const symmetry = useMemo(() => computeSymmetry(nodes), [nodes]);
  const curvature = useMemo(() => computeCurvature(tetraEdges), [tetraEdges]);

  const trustTier = useMemo(() => computeTrustTier(symmetry, curvature), [symmetry, curvature]);

  useEffect(() => {
    const prev = trustTierRef.current;
    if (trustTier !== prev) {
      const prevIdx = TIER_ORDER.indexOf(prev as typeof TIER_ORDER[number]);
      const currIdx = TIER_ORDER.indexOf(trustTier);
      if (currIdx > prevIdx) {
        try {
          const engine = getLoveEngine();
          engine.ingest('BOND_TRUST_CHANGED', {
            previousTier: prev,
            currentTier: trustTier,
          });
        } catch {
          // local ledger best-effort
        }
      }
      trustTierRef.current = trustTier;
    }
  }, [trustTier]);

  // Regenerate ritual quests from the current bonds; restore completed flags.
  useEffect(() => {
    if (!did) return;
    const rs = generateRituals(bonds, atoms).map((r) => ({
      ...r,
      completed: getBondingState().completed.includes(r.id),
    }));
    setRituals(rs);
  }, [did, bonds, atoms]);

  const handleComplete = useCallback(
    async (id: string) => {
      const res = await completeRitualById(id);
      if (res.ok) {
        showToast(`💎 +${res.loveReward} LOVE — ${res.solo ? 'self-care' : 'ritual'} complete`, 'success');
      }
    },
    [showToast],
  );

  // Verify hook: expose bonding state for the suite.
  useEffect(() => {
    if (import.meta.env.MODE !== 'production' || (typeof window !== 'undefined' && (window as any).__P31_VERIFY__)) {
      const sync = () => {
        (window as any).__p31_bonding = {
          render: true,
          meshPeers: peers,
          tetrad: {
            atoms: atoms.map((a) => ({ id: a.id, name: a.name, spoons: a.spoons, zone: a.zone })),
            bonds: bonds.map((b) => ({ id: b.id, weight: b.weight, curvature: b.curvature })),
            curvature,
            symmetry,
          },
          quests: rituals.length,
          completed: getBondingState().completed.length,
          loveDelta: getBondingState().loveDelta,
        };
      };
      sync();
      const unsub1 = subscribeRituals(sync);
      const unsub2 = subscribeBonding(sync);
      return () => { unsub1(); unsub2(); };
    }
  }, [atoms, bonds, rituals, curvature, symmetry, peers]);

  const soloMode = rituals.length === 0;

  return (
    <div className="bonding" style={{ padding: 'var(--p31-space-xs)', paddingTop: 0, display: 'flex', flexDirection: 'column', gap: 'var(--p31-space-xs)', overflow: 'auto', position: 'relative' }}>
      <PageHeader
        title="Bonding — Meatspace Tetra"
        icon={<span style={{ fontSize: 28 }}>🧬</span>}
        pageKey="bonding"
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gridAutoRows: '1fr', gap: 'var(--p31-space-xs)', alignItems: 'stretch' }}>

        {/* Tetrahedron */}
        <GlassCard variant="bonding" title="Tetrahedron" className="bonding-tetra-card" style={{ height: '100%' }}>
          <div style={{ flex: 1, minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <TetrahedronVisualizer
              nodes={nodes}
              edges={tetraEdges}
              phase={phase}
              symmetry={symmetry}
              curvature={curvature}
              onPhaseChange={setPhase}
              showControls
              size={typeof window !== 'undefined' && window.innerWidth < 1000 ? 220 : 300}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap', fontSize: 'var(--p31-scale-xs)', color: 'var(--p31-text-secondary)' }}>
            <span>🕸️ {peers} mesh peer{peers === 1 ? '' : 's'}</span>
            <span style={{ color: symmetry >= 60 ? 'var(--p31-accent-green)' : 'var(--p31-accent-gold)' }}>Resilience {symmetry}%</span>
            <span>{bonds.length}/6 bonds live</span>
          </div>
        </GlassCard>

        {/* Right rail */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--p31-space-xs)' }}>

          {/* Stats */}
          <GlassCard variant="bonding" title="Vitals">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--p31-space-xs)' }}>
              <div>
                <div style={{ fontSize: 'var(--p31-scale-xs)', color: 'var(--p31-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>LOVE</div>
                <div style={{ fontSize: 'var(--p31-scale-lg)', color: 'var(--p31-accent)', fontWeight: 700 }}>{loveBalance?.availableBalance ?? '—'}</div>
                <div style={{ fontSize: 'var(--p31-scale-xs)', color: 'var(--p31-text-tertiary)' }}>on ledger</div>
              </div>
              <div>
                <div style={{ fontSize: 'var(--p31-scale-xs)', color: 'var(--p31-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>This session</div>
                <div style={{ fontSize: 'var(--p31-scale-lg)', color: 'var(--p31-accent-gold)', fontWeight: 700 }}>+{bonding.loveDelta}</div>
                <div style={{ fontSize: 'var(--p31-scale-xs)', color: 'var(--p31-text-tertiary)' }}>LOVE earned</div>
              </div>
              <div>
                <div style={{ fontSize: 'var(--p31-scale-xs)', color: 'var(--p31-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Spoons</div>
                <div style={{ fontSize: 'var(--p31-scale-lg)', color: spoonTint(spoons), fontWeight: 700 }}>{spoons}/5</div>
                <div style={{ fontSize: 'var(--p31-scale-xs)', color: 'var(--p31-text-tertiary)' }}>your energy</div>
              </div>
            </div>
          </GlassCard>

          {/* Ritual quests */}
          <GlassCard variant="bonding" title="Ritual quests">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 'var(--p31-scale-xs)', color: 'var(--p31-text-tertiary)' }}>{rituals.filter((r) => !r.completed).length} pending</span>
            </div>

            {soloMode ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <p style={{ margin: 0, color: 'var(--p31-text-secondary)', fontSize: 'var(--p31-scale-sm)', lineHeight: 1.5 }}>
                  No mesh peers yet — the tetrahedron is mostly ghost nodes. Practice connection solo:
                </p>
                <button type="button" className="btn primary" style={{ alignSelf: 'flex-start' }} onClick={() => handleComplete('solo-care')}>
                  💗 Self-care check-in · +1 LOVE
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 220, overflowY: 'auto' }}>
                {rituals.map((ritual) => (
                  <RitualCard
                    key={ritual.id}
                    ritual={ritual}
                    userAge={18} // TODO: Get from profile/appStore
                    onComplete={handleComplete}
                  />
                ))}
              </div>
            )}
          </GlassCard>

          {/* Atom roster */}
          <GlassCard variant="bonding" title="Atoms in the mesh">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 220, overflowY: 'auto' }}>
            {filled.map((a, i) => (
              <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 'var(--p31-scale-sm)' }}>
                <span
                  style={{
                    width: 26, height: 26, borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    background: a.id.startsWith('ghost-') ? 'transparent' : 'color-mix(in oklch, var(--p31-accent) 15%, transparent)',
                    border: `1px dashed ${a.id.startsWith('ghost-') ? 'var(--p31-glass-border)' : 'var(--p31-accent)'}`,
                    color: a.id.startsWith('ghost-') ? 'var(--p31-text-tertiary)' : 'var(--p31-text)',
                    fontSize: 'var(--p31-scale-xs)',
                  }}
                >
                  {a.av}
                </span>
                <span style={{ flex: 1, color: a.id.startsWith('ghost-') ? 'var(--p31-text-tertiary)' : 'var(--p31-text)' }}>
                  {a.name}{a.id.startsWith('ghost-') ? ' (awaiting atom)' : ''}
                </span>
                <span style={{ fontSize: 'var(--p31-scale-xs)', color: spoonTint(a.spoons) }}>{i < 4 ? `v${i + 1}` : '·'} · {a.spoons}🥄</span>
              </div>
            ))}
            </div>
          </GlassCard>

        </div>
      </div>

      {/* Celebration burst layer */}
      <div ref={burstRef} style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 50 }} />
    </div>
  );
}
