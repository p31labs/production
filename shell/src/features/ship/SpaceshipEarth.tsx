import { useState, useEffect, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import { useAppStore } from '../../store/useAppStore';
import { useShellStore } from '../../store/useShellStore';
import { useSensoryStore } from '../../store/useSensoryStore';
import { useEffectsStore } from '../../store/useEffectsStore';
import { useLedStore } from '../../store/useLedStore';
import { DomeGeometry, sourceToNode, domeState, type DomeMode, type SurfaceMode } from '@p31ca/shell-chrome';
import type { LedSource } from '@p31ca/shell-chrome';
import CosmosFX from './CosmosFX';
import QuantumFX from './QuantumFX';
import NodeActions, { type ActiveNode } from './NodeActions';
import { useLarmorAudio } from './useLarmor';
import { coherenceForSpoons } from '../../lib/coherence';
import HUDShell from '../../components/HUDShell';

export default function SpaceshipEarth() {
  const spoons = useAppStore((s) => s.spoons);
  const tab = useAppStore((s) => s.tab);
  const reduceMotion = useAppStore((s) => s.reduceMotion);
  const notifications = useShellStore((s) => s.notifications);
  const lastNotifPulse = useShellStore((s) => s.lastNotifPulse);
  const setHeaderDrawerOpen = useShellStore((s) => s.setHeaderDrawerOpen);
  const calm = useSensoryStore((s) => s.calm);
  const simple = useSensoryStore((s) => s.simple);
  const domeAccent = useEffectsStore((s) => s.domeAccent);
  const aurora = useEffectsStore((s) => s.aurora);
  const cometTrails = useEffectsStore((s) => s.cometTrails);
  const quantum = useEffectsStore((s) => s.quantum);
  const ledMode = useLedStore((s) => s.mode);
  const ledSpeed = useLedStore((s) => s.speed);
  const ledColor = useLedStore((s) => s.color);
  const ledBrightness = useLedStore((s) => s.brightness);
  const ledColors = useLedStore((s) => s.colors);
  const led: LedSource = useMemo(
    () => ({ mode: ledMode, speed: ledSpeed, color: ledColor, brightness: ledBrightness, colors: ledColors }),
    [ledMode, ledSpeed, ledColor, ledBrightness, ledColors],
  );
  const loveBalance = useAppStore((s) => s.loveBalance);

  const accentColor = useMemo(() => {
    const v = getComputedStyle(document.documentElement).getPropertyValue('--p31-accent').trim();
    return v || '#c97b52';
  }, [domeAccent]);

  const [mode, setMode] = useState<'delta' | 'posner'>('delta');
  const [activeNode, setActiveNode] = useState<ActiveNode | null>(null);
  const coherence = useMemo(() => coherenceForSpoons(spoons), [spoons]);
  useLarmorAudio(coherence);

  useEffect(() => {
    if (tab === 'cockpit') {
      domeState.targetScale = 1.0;
      domeState.targetOpacity = 1.0;
      domeState.targetMode = 'cockpit';
      setHeaderDrawerOpen(false);
    } else {
      domeState.targetScale = 0.25;
      domeState.targetOpacity = 0.4;
      domeState.targetMode = tab as unknown as SurfaceMode;
    }
  }, [tab, setHeaderDrawerOpen]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'l' || e.key === 'L') setMode((m) => (m === 'delta' ? 'posner' : 'delta')); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  const { highUnread, highlightNode } = useMemo(() => {
    const high = notifications.filter((n) => !n.read && n.priority === 'high').length;
    const latest = [...notifications].sort((a, b) => b.time - a.time)[0];
    const nodeCount = mode === 'delta' ? 4 : 12;
    return {
      highUnread: high,
      highlightNode: latest ? sourceToNode(latest.source, nodeCount) : -1,
    };
  }, [notifications, mode]);
  return (
    <div className="ship-root">
      <HUDShell />

      {/* SHIP VIEWPORT */}
      <div className="ship-viewport">
        <Canvas
          style={{ position: 'absolute', inset: 0 }}
          camera={{ position: [0, 1.5, 9], fov: 55 }}
          gl={{ alpha: true, antialias: true, powerPreference: 'high-performance' }}
          dpr={[1, 1.5]}
        >
          <ambientLight intensity={0.5} />
          <directionalLight position={[4, 6, 5]} intensity={0.9} />
          <PerspectiveCamera makeDefault position={[0, 1.5, 8]} />
          <OrbitControls enablePan={false} maxPolarAngle={Math.PI / 2} minDistance={3} maxDistance={20} />
          <DomeGeometry
            mode={mode}
            spoons={spoons}
            isUrgent={highUnread > 0}
            pulseAt={lastNotifPulse}
            highlightNode={highlightNode}
            calm={calm}
            reduceMotion={reduceMotion}
            domeAccent={domeAccent}
            accentColor={accentColor}
            coherence={coherence}
            surfaceMode={domeState.surfaceMode}
            onNodeClick={(index, source, x, y) => setActiveNode({ index, source, x, y })}
            nodeCount={12}
            loveBalance={loveBalance}
            led={led}
          />
          <CosmosFX aurora={aurora} comets={cometTrails} calm={calm} reduceMotion={reduceMotion} spoons={spoons} />
          <QuantumFX quantum={quantum} spoons={spoons} calm={calm} reduceMotion={reduceMotion} mode={mode} />
        </Canvas>

        <NodeActions node={activeNode} onClose={() => setActiveNode(null)} />
      </div>
    </div>
  );
}
