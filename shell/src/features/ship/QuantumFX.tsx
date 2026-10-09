// QuantumFX — "quantum constellation" overlay for the P31 dome.
// Uses real, verified math from @p31ca/quantum-core to drive the visuals:
//  - the K₄ complete graph / SIC-POVM geometry (4 tetra vertices, 6 edges,
//    pairwise overlap 1/3) as an additive star constellation around the dome
//  - the 12-house ring, colored per HOUSE_NEURO_MAP, phased by the
//    morphogenetic field layers (Φ-scaled Clifford rotations)
// The interpretive framing (houses ↔ neuro systems) is decorative only —
// see QF1_CONTESTED_SCIENCE.md. Resolved state is exposed for the verify
// gate via window.__p31_quantum when __P31_VERIFY__ is set.
//
// Spoon-adaptive phases (progressive disclosure, neuroinclusive):
//  - low  (spoons 0–1): K₄ skeleton only, muted, motion fully disabled
//  - mid  (spoons 2–3): K₄ + edges + 6 houses, half rotation speed
//  - full (spoons 4–5): complete K₄ + edges + 12-house ring
// Freezes whenever calm or reduceMotion is set (WCAG 2.3.3 / 2.2.2 parity).
import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { regularTetra, icosahedron12 } from '../../lib/tetra';
import { domePose } from '../../lib/domePose';
import { coherenceForSpoons } from '../../lib/coherence';
import { HOUSE_NEURO_MAP, computeMorphogeneticField } from '@p31ca/quantum-core';
import InstancedEdges from './InstancedEdges';
import { getLoveEngine } from '../../lib/loveEngine';

const PHI = 1.618033988749895;

const TETRA = regularTetra(2.4);
const STAR_POSITIONS = [TETRA.v0, TETRA.v1, TETRA.v2, TETRA.v3] as [number, number, number][];

type QuantumPhase = 'low' | 'mid' | 'full';

function phaseFor(spoons: number): QuantumPhase {
  if (spoons <= 1) return 'low';
  if (spoons <= 3) return 'mid';
  return 'full';
}

function makeSpriteTexture(): THREE.Texture {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 64;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.35, 'rgba(255,255,255,0.55)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

function StarSprite({
  position, color, size = 0.16, phase = 0, texture, baseOpacity = 0.8, frozen = false,
}: {
  position: [number, number, number];
  color: string;
  size?: number;
  phase?: number;
  texture: THREE.Texture;
  baseOpacity?: number;
  frozen?: boolean;
}) {
  const ref = useRef<THREE.Sprite>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    if (frozen) {
      ref.current.scale.setScalar(size);
      (ref.current.material as THREE.SpriteMaterial).opacity = baseOpacity;
      return;
    }
    const t = clock.getElapsedTime();
    const tw = 0.75 + 0.25 * Math.sin(t * 0.9 + phase * Math.PI * 2);
    ref.current.scale.setScalar(size * (0.85 + 0.15 * tw));
    (ref.current.material as THREE.SpriteMaterial).opacity = baseOpacity * (0.5 + 0.5 * tw);
  });
  return (
    <sprite ref={ref} position={position}>
      <spriteMaterial
        map={texture as any}
        color={color}
        transparent
        opacity={baseOpacity}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </sprite>
  );
}

function QuantumConstellation({ frozen, coherence, phase, mode, housePositions }: {
  frozen: boolean;
  coherence: number;
  phase: QuantumPhase;
  mode: 'delta' | 'posner';
  housePositions: Array<{ pos: [number, number, number]; color: string; phase: number }>;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const texture = useMemo(makeSpriteTexture, []);

  // Perf ceiling: at ≤ 16–28 stars individual THREE.Sprite objects are the
  // happy path (one draw call each, negligible). If the constellation ever
  // grows past ~50 stars, batch into a single THREE.Points + BufferAttributes
  // with one shader (gl_PointSize) instead of per-sprite materials.
  const starColor = phase === 'low' ? '#8a95ad' : '#7dd3fc';
  const starOpacity = phase === 'low' ? 0.65 : phase === 'mid' ? 0.5 : 0.8;
  const houseCount = phase === 'low' ? 0 : phase === 'mid' ? 6 : HOUSE_NEURO_MAP.length;
  const houseOpacity = phase === 'full' ? 0.8 : 0.5;
  const rotMul = phase === 'low' ? 0 : phase === 'mid' ? 0.5 : 1;

  const edgeSegments = useMemo(() => {
    const pairs: [number, number][] = [];
    for (let i = 0; i < STAR_POSITIONS.length; i++)
      for (let j = i + 1; j < STAR_POSITIONS.length; j++)
        pairs.push([i, j]);
    return pairs.map(([a, b]) => [
      new THREE.Vector3(...STAR_POSITIONS[a]),
      new THREE.Vector3(...STAR_POSITIONS[b]),
    ]) as [THREE.Vector3, THREE.Vector3][];
  }, []);

  useEffect(() => () => texture.dispose(), [texture]);

  useFrame(({ clock }) => {
    if (frozen || !groupRef.current) return;
    if (mode === 'posner' && domePose.valid) {
      // Glue the overlay to the rotating dome so houses stay on their nodes.
      groupRef.current.quaternion.copy(domePose.quaternion);
      return;
    }
    const t = clock.getElapsedTime();
    groupRef.current.rotation.y += 0.004 * PHI * 0.1 * rotMul;
    groupRef.current.rotation.z = Math.sin(t * 0.05) * 0.03 * rotMul;
  });

  return (
    <group ref={groupRef as any}>
      {phase !== 'low' && (
        <InstancedEdges
          segments={edgeSegments}
          color="#7dd3fc"
          radius={0.02}
          opacity={0.12 + coherence * 0.75}
        />
      )}
      {STAR_POSITIONS.map((p, i) => (
        <StarSprite
          key={`k4-${i}`}
          position={p}
          color={starColor}
          size={0.22}
          phase={i / 4}
          texture={texture}
          baseOpacity={starOpacity}
          frozen={frozen}
        />
      ))}
      {housePositions.slice(0, houseCount).map((h, i) => (
        <StarSprite
          key={`house-${i}`}
          position={h.pos}
          color={h.color}
          size={0.14}
          phase={h.phase}
          texture={texture}
          baseOpacity={houseOpacity}
          frozen={frozen}
        />
      ))}
    </group>
  );
}

export default function QuantumFX({ quantum, spoons, calm, reduceMotion, mode = 'delta' }: {
  quantum: boolean;
  spoons: number;
  calm: boolean;
  reduceMotion: boolean;
  mode?: 'delta' | 'posner';
}) {
  const phase = phaseFor(spoons);
  const frozen = calm || reduceMotion || phase === 'low';
  const edges = phase === 'low' ? 0 : 6;
  const houses = phase === 'low' ? 0 : phase === 'mid' ? 6 : HOUSE_NEURO_MAP.length;

  // Coherence rises with spoons; shared with the Larmor audio coupling in
  // SpaceshipEarth via lib/coherence.ts so both read the same value.
  const coherence = useMemo(() => coherenceForSpoons(spoons), [spoons]);
  const housePositions = useMemo(() => housePositionsFor(mode), [mode]);
  const lastCoherenceGift = useRef<number>(0);

  useEffect(() => {
    if (import.meta.env.MODE !== 'production' || (typeof window !== 'undefined' && (window as any).__P31_VERIFY__)) {
      (window as any).__p31_quantum = {
        enabled: quantum, stars: STAR_POSITIONS.length, edges, houses, coherence, phase, frozen, mode,
        housePositions: housePositions.map((h) => h.pos),
      };
    }
  }, [quantum, coherence, phase, frozen, edges, houses, mode, housePositions]);

  useEffect(() => {
    if (coherence >= 0.65) {
      const now = Date.now();
      if (now - lastCoherenceGift.current > 60_000) {
        lastCoherenceGift.current = now;
        try {
          getLoveEngine().ingest('COHERENCE_CHANGED', { qValue: coherence });
        } catch {
          // LOVE ledger is best-effort
        }
      }
    }
  }, [coherence]);

  if (!quantum) return null;
  return <QuantumConstellation frozen={frozen} coherence={coherence} phase={phase} mode={mode} housePositions={housePositions} />;
}

function housePositionsFor(mode: 'delta' | 'posner') {
  const r = 3.6;
  const posner = mode === 'posner';
  const base: [number, number, number][] = posner
    ? icosahedron12(2.3)
    : Array.from({ length: HOUSE_NEURO_MAP.length }, (_, i) => {
        const ang = (i / 12) * Math.PI * 2 - Math.PI / 2;
        return [Math.cos(ang) * r, Math.sin(ang) * r, 0.4] as [number, number, number];
      });
  const layers = computeMorphogeneticField(0.5, HOUSE_NEURO_MAP.length, Math.PI / 4, 1.9);
  const max = Math.max(...layers.map((v) => Math.abs(v)));
  return HOUSE_NEURO_MAP.map((h, i) => ({
    pos: base[i],
    color: h.color,
    phase: 0.25 + 0.5 * Math.abs(layers[i] || 0) / (max || 1),
  }));
}
