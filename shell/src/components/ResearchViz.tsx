import { useEffect, useRef, useState, useMemo, Suspense } from 'react';
import * as THREE from 'three';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Float, Line, Html } from '@react-three/drei';
import { trustedHtml } from '../lib/trustedTypes';
import {
  sicPovmStates,
  sicPovmFidelity,
  sicPovmProbabilities,
  posnerAtoms,
  createPosnerState,
  K4Graph,
  initBanditState,
  reinforceBandit,
  computeMorphogeneticField,
} from '@p31ca/quantum-core';
import type { Variant } from '@p31ca/quantum-core';

// Three.js material colors (required as strings by Three.js — not CSS)
const C = {
  cyan: '#4db8a8',
  violet: '#A78BFA',
  amber: '#F59E0B',
  rose: '#FB7185',
  emerald: '#34D399',
  white: '#E2E8F0',
  dim: '#64748B',
};

// ─── strict $...$ LaTeX renderer ───
// Splits a string on $ delimiters: even parts are plain text, odd parts are math.
function Latex({ text }: { text: string }) {
  const parts = text.split('$');
  return (
    <span>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <span
            key={i}
            dangerouslySetInnerHTML={{
              __html: trustedHtml(katex.renderToString(part, { throwOnError: false })),
            }}
          />
        ) : (
          part
        ),
      )}
    </span>
  );
}

// ─── scene lighting preset ───
function SceneLighting() {
  return (
    <>
      <ambientLight intensity={0.5} color={C.cyan} />
      <pointLight position={[5, 6, 4]} intensity={2} color={C.white} />
      <pointLight position={[-5, -2, 3]} intensity={0.8} color={C.violet} />
      <pointLight position={[0, -4, 5]} intensity={0.4} color={C.cyan} />
    </>
  );
}

// ─── research clock ───
export function useResearchClock() {
  const [paused, setPaused] = useState(() =>
    typeof window !== 'undefined'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false,
  );

  useEffect(() => {
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handler = (e: MediaQueryListEvent) => {
      if (e.matches) setPaused(true);
    };
    mql.addEventListener('change', handler);

    const visHandler = () => {
      if (document.hidden) setPaused(true);
    };
    document.addEventListener('visibilitychange', visHandler);

    return () => {
      mql.removeEventListener('change', handler);
      document.removeEventListener('visibilitychange', visHandler);
    };
  }, []);

  return { paused, setPaused };
}

// ════════════════════════════════════════════════════════════════════
//  1. SIC-POVM  —  Bloch Sphere with Tetrahedron Inscribed
// ══════════════════════════════════════════════════════════════════

function SphereWireframe() {
  const points = useMemo(() => {
    const pts: [number, number, number][] = [];
    for (let i = 0; i <= 24; i++) {
      for (let j = 0; j <= 12; j++) {
        const phi = (i / 24) * Math.PI * 2;
        const theta = (j / 12) * Math.PI;
        pts.push([
          Math.sin(theta) * Math.cos(phi),
          Math.cos(theta),
          Math.sin(theta) * Math.sin(phi),
        ]);
      }
    }
    return pts;
  }, []);

  return (
    <>
      {points.map((p, i) => (
        <mesh
          key={`wf-${i}`}
          position={[...p] as [number, number, number]}
        >
          <sphereGeometry args={[0.02, 4, 4]} />
          <meshStandardMaterial
            color={C.cyan}
            transparent
            opacity={0.12}
            roughness={0.5}
            metalness={0.5}
          />
        </mesh>
      ))}
    </>
  );
}

function SicPovmScene({
  paused,
  states,
  fidelity,
}: {
  paused: boolean;
  states: number[][];
  fidelity: number;
}) {
  const grp = useRef<THREE.Group>(null);
  const verts = useMemo(
    () => states.map(([x, y]) => [x * 1.3, y * 1.3, 0] as const),
    [states],
  );
  const tetEdges = useMemo(() => {
    const p: [number, number][] = [];
    for (let i = 0; i < 4; i++) {
      for (let j = i + 1; j < 4; j++) {
        p.push([i, j]);
      }
    }
    return p;
  }, []);

  useFrame((_, dt) => {
    if (!paused && grp.current) {
      grp.current.rotation.y += dt * 0.25;
    }
  });

  return (
    <group ref={grp as any}>
      <SphereWireframe />
      {tetEdges.map(([a, b], i) => (
        <Float key={`te-${i}`} speed={2} rotationIntensity={0} floatIntensity={0}>
          <Line
            points={[
              new THREE.Vector3(...verts[a]),
              new THREE.Vector3(...verts[b]),
            ]}
            color={C.cyan}
            transparent
            opacity={0.4}
            lineWidth={1.5}
          />
        </Float>
      ))}
      {verts.map((v, i) => (
        <Float key={`tv-${i}`} speed={3 + i} rotationIntensity={0} floatIntensity={0.3}>
          <mesh position={[...v] as [number, number, number]}>
            <sphereGeometry args={[0.1, 32, 32]} />
            <meshStandardMaterial
              color={C.cyan}
              emissive={C.cyan}
              emissiveIntensity={0.5}
              roughness={0.1}
              metalness={0.9}
            />
          </mesh>
        </Float>
      ))}
    </group>
  );
}

export function SicPovmViz({ paused }: { paused: boolean }) {
  const states = useMemo(() => sicPovmStates(), []);
  const fidelity = useMemo(() => sicPovmFidelity(), []);

  return (
    <div className="viz-card">
      <div className="viz-label"><Latex text="SIC-POVM $d=2$" /></div>
      <p className="viz-desc"><Latex text={`$F = ${fidelity.toFixed(4)}$`} /></p>
      <Canvas camera={{ position: [0, 0, 5], fov: 45 }} className="viz-canvas">
        <Suspense>
          <SceneLighting />
          <OrbitControls makeDefault enableZoom enablePan={false} minDistance={2} maxDistance={8} />
          <SicPovmScene paused={paused} states={states} fidelity={fidelity} />
        </Suspense>
      </Canvas>
      <p className="viz-honest-label">
        <Latex
          text={
            'Weyl-Heisenberg orbit inscribed in the Bloch sphere. ' +
            'Overlap $\\vert{}\\langle \\psi_j \\vert{} \\psi_k \\rangle\\vert{}^2 = 1/3$. ' +
            'Decorative framing.'
          }
        />
      </p>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
//  2. Posner Molecule  —  $\text{Ca}_9(\text{PO}_4)_6$ 3D Structure
// ════════════════════════════════════════════════════════════════════

function PosnerScene({
  paused,
  atoms,
}: {
  paused: boolean;
  atoms: ReturnType<typeof posnerAtoms>;
}) {
  const grp = useRef<THREE.Group>(null);

  useFrame((_, dt) => {
    if (!paused && grp.current) {
      grp.current.rotation.y += dt * 0.3;
      grp.current.rotation.x += dt * 0.1;
    }
  });

  const bonds = useMemo(() => {
    const ca = atoms.filter((a) => a.element === 'Ca');
    const pairs: [THREE.Vector3, THREE.Vector3][] = [];
    for (let i = 0; i < ca.length; i++) {
      for (let j = i + 1; j < ca.length; j++) {
        const p1 = new THREE.Vector3(...ca[i].position);
        const p2 = new THREE.Vector3(...ca[j].position);
        if (p1.distanceTo(p2) < 1.5) {
          pairs.push([p1, p2]);
        }
      }
    }
    return pairs;
  }, [atoms]);

  return (
    <group ref={grp as any}>
      <Float speed={2} rotationIntensity={0} floatIntensity={0.08}>
        <>
          {bonds.map(([a, b], i) => {
            const mid = a.clone().add(b).multiplyScalar(0.5);
            const dir = b.clone().sub(a);
            const len = dir.length();
            const q = new THREE.Quaternion().setFromUnitVectors(
              new THREE.Vector3(0, 1, 0),
              dir.normalize(),
            );
            return (
              <mesh key={`b-${i}`} position={mid.toArray() as [number, number, number]} quaternion={q.toArray().slice(0, 4) as [number, number, number, number]}>
                <cylinderGeometry args={[0.03, 0.03, len, 8]} />
                <meshStandardMaterial
                  color={C.cyan}
                  transparent
                  opacity={0.3}
                  roughness={0.5}
                  metalness={0.5}
                />
              </mesh>
            );
          })}
          {atoms.map((a, i) => {
            const s =
              a.element === 'Ca' ? 0.28 : a.element === 'P' ? 0.22 : 0.16;
            const col =
              a.element === 'Ca' ? C.cyan : a.element === 'P' ? C.amber : C.rose;

            return (
              <mesh key={`a-${i}`} position={a.position as [number, number, number]}>
                <sphereGeometry args={[s, 32, 32]} />
                <meshStandardMaterial
                  color={col}
                  emissive={col}
                  emissiveIntensity={0.4}
                  roughness={0.2}
                  metalness={0.7}
                />
              </mesh>
            );
          })}
        </>
      </Float>
    </group>
  );
}

export function PosnerViz({ paused }: { paused: boolean }) {
  const [atoms, setAtoms] = useState<ReturnType<typeof posnerAtoms>>([]);
  const [loaded, setLoaded] = useState(false);
  const posnerState = useMemo(() => createPosnerState(), []);

  useEffect(() => {
    try {
      setAtoms(posnerAtoms());
    } catch {
      setAtoms(
        Array.from({ length: 27 }, (_, i) => ({
          element: ['Ca', 'P', 'O'][i < 9 ? 0 : i < 15 ? 1 : 2] as
            | 'Ca'
            | 'P'
            | 'O',
          position: [
            (Math.random() - 0.5) * 3,
            (Math.random() - 0.5) * 3,
            (Math.random() - 0.5) * 3,
          ] as [number, number, number],
          radius: i < 9 ? 0.25 : i < 15 ? 0.2 : 0.15,
          color: [0x00f0ff, 0xfbbf24, 0xef4444][i < 9 ? 0 : i < 15 ? 1 : 2],
        })),
      );
    }
    setLoaded(true);
  }, []);

  if (!loaded) {
    return (
      <div className="viz-card">
        <div className="viz-label"><Latex text={'Posner Molecule $\\text{Ca}_9(\\text{PO}_4)_6$'} /></div>
        <p className="viz-loading">Loading…</p>
      </div>
    );
  }

  return (
    <div className="viz-card">
      <div className="viz-label"><Latex text={'Posner Molecule $\\text{Ca}_9(\\text{PO}_4)_6$'} /></div>
      <p className="viz-desc viz-desc-center">
        <Latex text={`$\\kappa = ${posnerState.coherence.toFixed(2)}$ $\\cdot$ $9\\text{Ca} + 6\\text{P} + 24\\text{O}$`} />
      </p>
      <Canvas camera={{ position: [0, 0, 4.5], fov: 50 }} className="viz-canvas">
        <Suspense>
          <SceneLighting />
          <OrbitControls makeDefault enableZoom enablePan={false} minDistance={2} maxDistance={8} />
          <PosnerScene paused={paused} atoms={atoms} />
        </Suspense>
      </Canvas>
      <p className="viz-honest-label">
        <Latex
          text={
            'Crystallographic structural model. Fisher hypothesis: ' +
            '$\\text{Ca}_9(\\text{PO}_4)_6$ may sustain quantum coherence in neural systems.'
          }
        />
      </p>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════
//  3. $K_4$ Planar Graph  —  Complete Graph, Minimum Energy
// ═══════════════════════════════════════════════════════════════════

function K4Scene({ paused }: { paused: boolean }) {
  const grp = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState<number | null>(null);

  const verts: [number, number, number][] = [
    [0, 1.3, 0],
    [-1.13, -0.65, 0.8],
    [1.13, -0.65, 0.8],
    [0, 0, -1.4],
  ];
  const labels = ['Apex', 'NP', 'OS', 'Willow'];
  const edges: [number, number][] = [
    [0, 1],
    [0, 2],
    [0, 3],
    [1, 2],
    [1, 3],
    [2, 3],
  ];

  useFrame((_, dt) => {
    if (!paused && grp.current) {
      grp.current.rotation.y += dt * 0.2;
    }
  });

  return (
    <group ref={grp as any}>
      {edges.map(([a, b], i) => {
        const hl = hovered === a || hovered === b;
        return (
          <Line
            key={`e-${i}`}
            points={[
              new THREE.Vector3(...verts[a]),
              new THREE.Vector3(...verts[b]),
            ]}
            color={hl ? C.amber : C.cyan}
            transparent
            opacity={hl ? 0.9 : 0.5}
            lineWidth={hl ? 3 : 1.5}
          />
        );
      })}
      {verts.map((v, i) => (
        <Float key={`v-${i}`} speed={2 + i} rotationIntensity={0} floatIntensity={0.1}>
          <mesh
            position={[...v] as [number, number, number]}
            onPointerOver={() => setHovered(i)}
            onPointerOut={() => setHovered(null)}
          >
            <sphereGeometry args={[0.15, 32, 32]} />
            <meshStandardMaterial
              color={hovered === i ? C.amber : C.cyan}
              emissive={hovered === i ? C.amber : C.cyan}
              emissiveIntensity={0.5}
              roughness={0.1}
              metalness={0.9}
            />
          </mesh>
          <Html position={[0.2, 0.2, 0]} center style={{ pointerEvents: 'none' }}>
            <span className="viz-label-node">{labels[i]}</span>
          </Html>
        </Float>
      ))}
    </group>
  );
}

export function K4Viz({ paused }: { paused: boolean }) {
  return (
    <div className="viz-card">
      <div className="viz-label"><Latex text={'$K_4$ Planar Graph'} /></div>
      <p className="viz-desc"><Latex text={'$K_4 \\cdot V=4 \\cdot E=6 \\cdot E = 3V-6$'} /></p>
      <Canvas camera={{ position: [0, 0, 4.5], fov: 50 }} className="viz-canvas">
        <Suspense>
          <SceneLighting />
          <OrbitControls makeDefault enableZoom enablePan={false} minDistance={2} maxDistance={8} />
          <K4Scene paused={paused} />
        </Suspense>
      </Canvas>
      <p className="viz-honest-label">
        <Latex
          text={'Complete graph on 4 vertices. Maxwell isostatic: $E = 3V - 6 = 6$. Minimum rigid 3D structure.'}
        />
      </p>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
//  4. Von Neumann Entropy  —  Landauer Limit Explorer
// ═══════════════════════════════════════════════════════════════════

function EntropyScene({
  paused,
  ballData,
}: {
  paused: boolean;
  ballData: {
    x: number;
    y: number;
    r: number;
    prob: number;
    color: string;
    label: string;
  }[];
}) {
  const grp = useRef<THREE.Group>(null);

  useFrame((_, dt) => {
    if (!paused && grp.current) {
      grp.current.rotation.z += dt * 0.1;
    }
  });

  return (
    <group ref={grp as any}>
      {ballData.map((b, i) => (
        <Float key={`b-${i}`} speed={3 + i * 0.5} rotationIntensity={0} floatIntensity={0.2}>
          <mesh position={[b.x, b.y, 0] as [number, number, number]}>
            <sphereGeometry args={[b.r, 48, 48]} />
            <meshStandardMaterial
              color={b.color}
              emissive={b.color}
              emissiveIntensity={0.4}
              roughness={0.15}
              metalness={0.8}
            />
          </mesh>
          <Html position={[0.15, 0, 0]} center style={{ pointerEvents: 'none' }}>
            <span style={{ color: b.color, fontSize: 11 }}><Latex text={b.label} /></span>
          </Html>
        </Float>
      ))}
    </group>
  );
}

export function EntropyViz({ paused }: { paused: boolean }) {
  const [r, setR] = useState(0.5);

  const data = useMemo(() => {
    try {
      const p = sicPovmProbabilities([
        r,
        (1 - r) / 3,
        (1 - r) / 3,
        (1 - r) / 3,
      ]);
      const ent = -p.reduce(
        (s, pi) => s + (pi > 0 ? pi * Math.log(pi) : 0),
        0,
      );
      return { probs: p, entropy: ent };
    } catch {
      return { probs: [0, 0, 0, 0], entropy: 0 };
    }
  }, [r]);

  const colors = [C.cyan, C.amber, C.rose, C.violet];

  const ballData = useMemo(
    () =>
      data.probs.map((prob, i) => {
        const a = (i / 4) * Math.PI * 2 - Math.PI / 2;
        return {
          x: Math.cos(a) * (0.5 + prob * 2),
          y: Math.sin(a) * (0.5 + prob * 2),
          r: 0.06 + prob * 0.2,
          prob,
          color: colors[i],
          label: `$p_{${i + 1}}=${prob.toFixed(3)}$`,
        };
      }),
    [data.probs],
  );

  return (
    <div className="viz-card">
      <div className="viz-label"><Latex text={'Von Neumann Entropy $\\cdot$ Landauer Limit'} /></div>
      <p className="viz-desc"><Latex text={`$S(\\rho) = ${data.entropy.toFixed(4)}$`} /></p>
      <Canvas camera={{ position: [0, 0, 5], fov: 45 }} className="viz-canvas">
        <Suspense>
          <SceneLighting />
          <OrbitControls makeDefault enableZoom enablePan={false} minDistance={2} maxDistance={8} />
          <EntropyScene paused={paused} ballData={ballData} />
        </Suspense>
      </Canvas>
      <input
        type="range"
        min="0.05"
        max="0.95"
        step="0.01"
        value={r}
        onChange={(e) => setR(parseFloat(e.target.value))}
        className="viz-range"
      />
      <p className="viz-honest-label">
        <Latex
          text={
            '$S(\\rho) = -\\sum_i p_i \\ln p_i$. ' +
            'Landauer: $E_{\\text{min}} = kT \\ln(2) \\, \\Delta S$. ' +
            'From SIC-POVM probabilities.'
          }
        />
      </p>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
//  5. Morphogenetic Field  —  Kuramoto Phase Oscillators
// ════════════════════════════════════════════════════════════════════

function MorphoScene({
  paused,
  field,
}: {
  paused: boolean;
  field: number[];
}) {
  const grp = useRef<THREE.Group>(null);

  useFrame((_, dt) => {
    if (!paused && grp.current) {
      grp.current.rotation.z += dt * 0.15;
    }
  });

  return (
    <group ref={grp as any}>
      {field.map((f, i) => {
        const a = (i / field.length) * Math.PI * 2;
        const r = 0.5 + f * 1.2;
        const x = Math.cos(a) * r;
        const y = Math.sin(a) * r;

        return (
          <mesh key={`osc-${i}`} position={[x, y, 0]}>
            <sphereGeometry args={[0.04 + f * 0.05, 16, 16]} />
            <meshStandardMaterial
              color={`hsl(${(i / field.length) * 220 + 160}, 70%, 60%)`}
              emissive={`hsl(${(i / field.length) * 220 + 160}, 70%, 60%)`}
              emissiveIntensity={0.5}
              roughness={0.1}
              metalness={0.5}
            />
          </mesh>
        );
      })}
      {field.map((f, i) => {
        const a = (i / field.length) * Math.PI * 2;
        const r = 0.5 + f * 1.2;
        return (
          <Line
            key={`sp-${i}`}
            points={[
              new THREE.Vector3(0, 0, 0),
              new THREE.Vector3(Math.cos(a) * r, Math.sin(a) * r, 0),
            ]}
            color={C.cyan}
            transparent
            opacity={0.2}
            lineWidth={0.5}
          />
        );
      })}
      <Html position={[-1.6, -1.5, 0]} center style={{ pointerEvents: 'none' }}>
        <span className="viz-html-label">
          <Latex text={'$M(X) = \\sum \\Phi^n \\cdot R_n(\\theta, B) \\cdot \\Psi_0$'} />
        </span>
      </Html>
    </group>
  );
}

export function MorphoViz({ paused }: { paused: boolean }) {
  const [field, setField] = useState<number[]>([]);

  useEffect(() => {
    try {
      setField(computeMorphogeneticField(0.5, 8, Math.PI / 4) ?? []);
    } catch {
      setField(Array(8).fill(0.5));
    }
  }, []);

  if (!field.length) {
    return (
      <div className="viz-card">
        <div className="viz-label"><Latex text={'Morphogenetic Field $\\cdot$ Kuramoto Phase'} /></div>
        <p className="viz-loading">Loading…</p>
      </div>
    );
  }

  return (
    <div className="viz-card">
      <div className="viz-label"><Latex text={'Morphogenetic Field $\\cdot$ Kuramoto Phase'} /></div>
      <Canvas camera={{ position: [0, 0, 5], fov: 45 }} className="viz-canvas">
        <Suspense>
          <SceneLighting />
          <OrbitControls makeDefault enableZoom enablePan={false} minDistance={2} maxDistance={8} />
          <MorphoScene paused={paused} field={field} />
        </Suspense>
      </Canvas>
      <p className="viz-honest-label">
        Clifford rotation + Kuramoto phase oscillators.
        <Latex
          text={'$M(X) = \\sum \\Phi^n \\cdot R_n(\\theta, B) \\cdot \\Psi_0$. Depth-bounded sum.'}
        />
      </p>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
//  6. Genesis Stack  —  Multi-Armed Bandit
// ═════════════════════════════════════════════════════════════════════

function GenesisScene({
  paused,
  pulls,
}: {
  paused: boolean;
  pulls: { arm: number; reward: number }[];
}) {
  const colors = [C.cyan, C.amber, C.rose];

  return (
    <group>
      {pulls.map((p, i) => (
        <mesh
          key={`p-${i}`}
          position={[
            -2 + (i / Math.max(29, pulls.length - 1)) * 4,
            -1.2 + p.reward * 2.4,
            p.arm * 0.2,
          ]}
        >
          <sphereGeometry args={[0.05, 8, 8]} />
          <meshStandardMaterial
            color={colors[p.arm]}
            emissive={colors[p.arm]}
            emissiveIntensity={0.4}
            roughness={0.2}
            metalness={0.7}
          />
        </mesh>
      ))}
      {[0, 1, 2].map((arm) => {
        const ap = pulls.filter((p) => p.arm === arm);
        const avg =
          ap.length > 0
            ? ap.reduce((s, p) => s + p.reward, 0) / ap.length
            : 0;

        return (
          <Html
            key={`s-${arm}`}
            position={[-2.6, 1.5 - arm * 0.35, 0]}
            style={{ pointerEvents: 'none' }}
          >
            <span style={{ color: colors[arm], fontSize: 'var(--p31-scale-xs)' }}>
              <Latex text={`Arm ${arm + 1}: $\\mu=${avg.toFixed(2)}$ $n=${ap.length}$`} />
            </span>
          </Html>
        );
      })}
    </group>
  );
}

export function GenesisViz({ paused }: { paused: boolean }) {
  const [pulls, setPulls] = useState<Array<{ arm: number; reward: number }>>(
    [],
  );
  const [running, setRunning] = useState(true);
  const simRef = useRef<ReturnType<typeof initBanditState> | null>(null);

  useEffect(() => {
    const arms: Variant[] = [
      { id: 'arm0', weight: 1 },
      { id: 'arm1', weight: 1 },
      { id: 'arm2', weight: 1 },
    ];
    simRef.current = initBanditState(arms, 1.0);
  }, []);

  useEffect(() => {
    if (!running || paused) return;

    const iv = setInterval(() => {
      if (!simRef.current) return;

      const arm = Math.floor(Math.random() * 3);
      const reward =
        arm === 0
          ? 0.6 + Math.random() * 0.2
          : arm === 1
            ? 0.3 + Math.random() * 0.4
            : 0.2 + Math.random() * 0.3;

      reinforceBandit(simRef.current, `arm${arm}`, reward);

      setPulls((p) => {
        const n = [...p, { arm, reward }];
        return n.length > 30 ? n.slice(-30) : n;
      });
    }, 400);

    return () => clearInterval(iv);
  }, [running, paused]);

  return (
    <div className="viz-card">
      <div className="viz-label viz-label-row">
        <span><Latex text={'Genesis Stack $\\cdot$ Bandit Arms'} /></span>
        <button
          type="button"
          onClick={() => setRunning(!running)}
          className="viz-btn"
        >
          {running ? '⏸ Pause' : '▶ Resume'}
        </button>
      </div>
      <Canvas camera={{ position: [0, 0, 5], fov: 45 }} className="viz-canvas">
        <Suspense>
          <SceneLighting />
          <OrbitControls makeDefault enableZoom enablePan={false} minDistance={2} maxDistance={8} />
          <GenesisScene paused={paused} pulls={pulls} />
        </Suspense>
      </Canvas>
      <p className="viz-honest-label">
        Thompson sampling over 3 arms. Pull history rendered as 3D scatter.
        <Latex text={'$\\sum \\mu$ converges to optimal arm.'} />
      </p>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════
//  7. Wye ↔ Delta Morph  —  Topological Phase Transition
// ════════════════════════════════════════════════════════════════════

function WyeDeltaScene({
  paused,
  morph,
  failed,
  positions,
  edges,
  setFailed,
}: {
  paused: boolean;
  morph: number;
  failed: number | null;
  positions: THREE.Vector3[];
  edges: [number, number][];
  setFailed: (n: number | null) => void;
}) {
  const grp = useRef<THREE.Group>(null);

  useFrame((_, dt) => {
    if (!paused && grp.current) {
      grp.current.rotation.y += dt * 0.2;
    }
  });

  return (
    <group ref={grp as any}>
      {edges.map(([a, b], i) => {
        const on = failed !== a && failed !== b;
        return (
          <Line
            key={`e-${i}`}
            points={[positions[a], positions[b]]}
            color={on ? C.cyan : C.rose}
            transparent
            opacity={on ? 0.5 : 0.1}
            lineWidth={2}
          />
        );
      })}
      {positions.map((p, i) => {
        if (morph > 0.6 && i === 0) return null;
        const isHub = i === 0;

        return (
          <Float key={`n-${i}`} speed={2 + i} rotationIntensity={0} floatIntensity={0.1}>
            <mesh position={p.toArray() as [number, number, number]} onClick={() => setFailed(failed === i ? null : i)}>
              <sphereGeometry args={[isHub ? 0.18 : 0.12, 32, 32]} />
              <meshStandardMaterial
                color={failed === i ? C.rose : isHub ? C.amber : C.violet}
                emissive={failed === i ? C.rose : isHub ? C.amber : C.violet}
                emissiveIntensity={0.5}
                roughness={0.1}
                metalness={0.8}
              />
            </mesh>
            {isHub && (
              <Html position={[0, 0.25, 0]} center style={{ pointerEvents: 'none' }}>
                <span className="viz-html-label viz-html-label-lg">
                  HUB
                </span>
              </Html>
            )}
          </Float>
        );
      })}
      <Html position={[-1.6, -1.5, 0]} center style={{ pointerEvents: 'none' }}>
        <span className={"viz-html-label" + (morph < 0.5 ? " viz-html-label-rose" : " viz-html-label-emerald")}>
          {morph < 0.5
            ? <Latex text={'Wye ($Y$) $\\cdot$ Fragile Hub'} />
            : <Latex text={'Delta ($\\Delta$) $\\cdot$ Resilient Mesh'} />}
        </span>
      </Html>
    </group>
  );
}

export function WyeDeltaMorph({ paused }: { paused: boolean }) {
  const [morph, setMorph] = useState(0);
  const [failed, setFailed] = useState<number | null>(null);

  const wye = useMemo(
    () =>
      [
        [0, 0, 0],
        [2, 0, 0],
        [-1, 1.732, 0],
        [-1, -1.732, 0],
      ] as const,
    [],
  );

  const delta = useMemo(
    () =>
      [
        [1.4, 0.8, 0],
        [-1.4, 0.8, 0],
        [0, -1.6, 0],
      ] as const,
    [],
  );

  const positions = useMemo(() => {
    return wye.map((p, i) => {
      const w = new THREE.Vector3(...p);
      if (i === 0) {
        return w
          .multiplyScalar(1 - morph * 0.8)
          .add(new THREE.Vector3(0, 0, -morph * 3));
      }
      return w.clone().lerp(new THREE.Vector3(...delta[i - 1]), morph);
    });
  }, [morph, wye, delta]);

  const edges: [number, number][] =
    morph < 0.5 ? [[0, 1], [0, 2], [0, 3]] : [[1, 2], [2, 3], [3, 1]];

  return (
    <div className="viz-card">
      <div className="viz-label viz-label-row">
        <span><Latex text={'Wye $\\leftrightarrow$ Delta Phase Transition'} /></span>
        <span className="viz-label-amber">
          <Latex text={`${(morph * 100).toFixed(0)}% $\\Delta$`} />
        </span>
      </div>
      <Canvas camera={{ position: [0, 0, 5.5], fov: 45 }} className="viz-canvas">
        <Suspense>
          <SceneLighting />
          <OrbitControls makeDefault enableZoom enablePan={false} minDistance={2} maxDistance={8} />
          <WyeDeltaScene
            paused={paused}
            morph={morph}
            failed={failed}
            positions={positions}
            edges={edges}
            setFailed={setFailed}
          />
        </Suspense>
      </Canvas>
      <input
        type="range"
        min="0"
        max="1"
        step="0.01"
        value={morph}
        onChange={(e) => setMorph(parseFloat(e.target.value))}
        className="viz-range"
      />
      <p className="viz-honest-label">
        Universal network intervention: remove the central hub.
        <Latex text={'Wye (single point of failure) $\\rightarrow$ Delta (distributed resilience).'} />
        Click a node to simulate failure.
      </p>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════
//  8. Ollivier-Ricci Curvature Explorer
// ════════════════════════════════════════════════════════════════════

type TopoKey = 'Star' | 'Ring' | 'K₄ Mesh' | 'Grid';

const TOPOS: Record<
  TopoKey,
  {
    nodes: [number, number, number][];
    edges: [number, number][];
    curvature: string;
    color: string;
  }
> = {
  Star: {
    nodes: [
      [0, 0, 0],
      [1.5, 0.5, 0],
      [-1.5, 0.5, 0],
      [0, -1.5, 0],
    ],
    edges: [
      [0, 1],
      [0, 2],
      [0, 3],
    ],
    curvature: '< 0',
    color: C.rose,
  },
  Ring: {
    nodes: [
      [1, 1, 0],
      [-1, 1, 0],
      [-1, -1, 0],
      [1, -1, 0],
    ],
    edges: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 0],
    ],
    curvature: '= 0',
    color: C.amber,
  },
  'K₄ Mesh': {
    nodes: [
      [0, 1.2, 0],
      [-1.2, -0.6, 0],
      [1.2, -0.6, 0],
      [0, 0, 2],
    ],
    edges: [
      [0, 1],
      [0, 2],
      [0, 3],
      [1, 2],
      [1, 3],
      [2, 3],
    ],
    curvature: '> 0',
    color: C.emerald,
  },
  Grid: {
    nodes: [
      [-1, 1, 0],
      [0, 1, 0],
      [1, 1, 0],
      [-1, -1, 0],
      [0, -1, 0],
      [1, -1, 0],
    ],
    edges: [
      [0, 1],
      [1, 2],
      [0, 3],
      [1, 4],
      [2, 5],
      [3, 4],
      [4, 5],
    ],
    curvature: 'mixed',
    color: C.violet,
  },
};

// blue → amber divergent scale for per-edge curvature (CVD-safe, dark-mode)
const K_BLUE = { r: 56, g: 189, b: 248 }; // #38BDF8
const K_AMBER = { r: 245, g: 158, b: 11 }; // #F59E0B
function kappaColor(k: number): string {
  const t = Math.min(1, Math.max(0, k + 1));
  const r = K_BLUE.r + (K_AMBER.r - K_BLUE.r) * t;
  const g = K_BLUE.g + (K_AMBER.g - K_BLUE.g) * t;
  const b = K_BLUE.b + (K_AMBER.b - K_BLUE.b) * t;
  return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
}

function RicciScene({
  paused,
  topoKey,
}: {
  paused: boolean;
  topoKey: TopoKey;
}) {
  const topo = TOPOS[topoKey];
  const grp = useRef<THREE.Group>(null);

  const deg = useMemo(() => {
    const x = new Array(topo.nodes.length).fill(0);
    topo.edges.forEach(([a, b]) => {
      x[a] += 1;
      x[b] += 1;
    });
    return x;
  }, [topo]);

  const kappas = useMemo(() => {
    return topo.edges.map(([a, b]) => {
      const mn = Math.min(deg[a], deg[b]);
      const mx = Math.max(deg[a], deg[b]);
      return mx > 0 ? mn / mx - 1 : 0;
    });
  }, [deg, topo.edges]);

  const avgK =
    kappas.length > 0
      ? kappas.reduce((a, b) => a + b, 0) / kappas.length
      : 0;

  useFrame((_, dt) => {
    if (!paused && grp.current) {
      grp.current.rotation.y += dt * 0.2;
    }
  });

  return (
    <group ref={grp as any}>
      {topo.edges.map(([a, b], i) => (
          <Line
            key={`e-${i}`}
          points={[
            new THREE.Vector3(...topo.nodes[a]),
            new THREE.Vector3(...topo.nodes[b]),
          ]}
          color={kappaColor(kappas[i])}
          transparent
          opacity={0.7}
          lineWidth={2.5}
        />
      ))}
      {topo.nodes.map((pos, i) => (
        <Float key={`n-${i}`} speed={2 + i} rotationIntensity={0} floatIntensity={0.1}>
          <mesh position={[...pos] as [number, number, number]}>
            <sphereGeometry args={[0.18, 32, 32]} />
            <meshStandardMaterial
              color={C.violet}
              emissive={C.violet}
              emissiveIntensity={0.4}
              roughness={0.2}
              metalness={0.7}
            />
          </mesh>
        </Float>
      ))}
      <Html position={[-1.6, -1.5, 0]} center style={{ pointerEvents: 'none' }}>
        <span className="viz-html-label viz-html-label-violet">
          <Latex text={`$\\kappa(x, y) ${topo.curvature}$`} />
        </span>
      </Html>
    </group>
  );
}

export function CurvatureExplorer({ paused }: { paused: boolean }) {
  const [activeTopo, setActiveTopo] = useState<TopoKey>('K₄ Mesh');

  return (
    <div className="viz-card">
      <div className="viz-label">Ollivier-Ricci Curvature</div>
      <Canvas camera={{ position: [0, 0, 5.5], fov: 45 }} className="viz-canvas">
        <Suspense>
          <SceneLighting />
          <OrbitControls makeDefault enableZoom enablePan={false} minDistance={2} maxDistance={8} />
          <RicciScene paused={paused} topoKey={activeTopo} />
        </Suspense>
      </Canvas>
<select
         value={activeTopo}
         onChange={(e) => setActiveTopo(e.target.value as TopoKey)}
         className="viz-select"
       >
        {Object.keys(TOPOS).map((key) => (
          <option key={key} value={key}>
            {key}
          </option>
        ))}
      </select>
      <p className="viz-honest-label">
        <Latex
          text={
            'Curvature $\\kappa$ measures how effectively neighborhoods overlap. ' +
            'Edges colored by $\\kappa$ (blue $=$ negative / bottleneck, amber $=$ flat). ' +
            'Positive curvature (resilient meshes) is not sampled by these topologies.'
          }
        />
      </p>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════
//  9. Maxwell Rigidity Explorer
// ═══════════════════════════════════════════════════════════════════

const RIGID: Record<string, [number, number, number][]> = {
  'Tetra (V=4)': [
    [0, 1, 0.8],
    [-1, -0.6, 0.8],
    [1, -0.6, 0.8],
    [0, 0, -1],
  ],
  'Square (V=4)': [
    [1, 1, 0],
    [-1, 1, 0],
    [-1, -1, 0],
    [1, -1, 0],
  ],
  'Penta (V=5)': [
    [0.95, 0, 0],
    [0.29, 0.9, 0],
    [-0.77, 0.56, 0],
    [-0.77, -0.56, 0],
    [0.29, -0.9, 0],
  ],
};
const ek = (a: number, b: number) => `${Math.min(a, b)}-${Math.max(a, b)}`;

function RigidityScene({
  paused,
  nodes,
  activeEdges,
  toggle,
}: {
  paused: boolean;
  nodes: [number, number, number][];
  activeEdges: Set<string>;
  toggle: (a: number, b: number) => void;
}) {
  const grp = useRef<THREE.Group>(null);
  const allEdges = useMemo(() => {
    const e: [number, number][] = [];
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        e.push([i, j]);
      }
    }
    return e;
  }, [nodes]);
  const E = activeEdges.size;
  const V = nodes.length;
  const mw = 3 * V - 6;
  const rig = E >= mw;

  useFrame((_, dt) => {
    if (!paused && grp.current) {
      grp.current.rotation.y += dt * 0.2;
    }
  });

  return (
    <group ref={grp as any}>
      {allEdges.map(([a, b]) => {
        if (!activeEdges.has(ek(a, b))) return null;
        return (
          <Line
            key={`e-${a}-${b}`}
            points={[
              [...nodes[a]] as [number, number, number],
              [...nodes[b]] as [number, number, number],
            ]}
            color={rig ? C.emerald : C.rose}
            transparent
            opacity={0.6}
            lineWidth={2}
            onClick={() => toggle(a, b)}
          />
        );
      })}
      {nodes.map((n, i) => (
        <Float key={`n-${i}`} speed={2 + i} rotationIntensity={0} floatIntensity={0.1}>
          <mesh position={[...n] as [number, number, number]}>
            <sphereGeometry args={[0.12, 32, 32]} />
            <meshStandardMaterial
              color={C.violet}
              emissive={C.violet}
              emissiveIntensity={0.5}
              roughness={0.1}
              metalness={0.8}
            />
          </mesh>
        </Float>
      ))}
      <Html position={[-1.6, -1.5, 0]} center style={{ pointerEvents: 'none' }}>
        <span className={"viz-html-label-lg" + (rig ? " viz-html-label-emerald" : " viz-html-label-rose")}>
          E={E} \\geq 3\\times{V}\\-6={mw} {rig ? '\\surd RIGID' : '\\\\times need ' + (mw - E)}
        </span>
      </Html>
    </group>
  );
}

export function RigidityExplorer({ paused }: { paused: boolean }) {
  const [preset, setPreset] = useState('Tetra (V=4)');
  const [edgeSet, setEdgeSet] = useState<Set<string>>(
    new Set(['0-1', '0-2', '0-3', '1-2', '1-3', '2-3']),
  );
  const nodes = RIGID[preset];
  const toggle = (a: number, b: number) =>
    setEdgeSet((s) => {
      const n = new Set(s);
      n.has(ek(a, b)) ? n.delete(ek(a, b)) : n.add(ek(a, b));
      return n;
    });
  const changePreset = (p: string) => {
    setPreset(p);
    const nn = RIGID[p];
    const min = new Set<string>();
    for (let i = 1; i < nn.length; i++) min.add(ek(0, i));
    setEdgeSet(min);
  };

  return (
    <div className="viz-card">
      <div className="viz-label">Maxwell Rigidity Criterion</div>
      <Canvas camera={{ position: [0, 0, 5], fov: 45 }} className="viz-canvas">
        <Suspense>
          <SceneLighting />
          <OrbitControls makeDefault enableZoom enablePan={false} minDistance={2} maxDistance={8} />
          <RigidityScene paused={paused} nodes={nodes} activeEdges={edgeSet} toggle={toggle} />
        </Suspense>
      </Canvas>
<select
         value={preset}
         onChange={(e) => changePreset(e.target.value)}
         className="viz-select"
       >
        {Object.keys(RIGID).map((n) => (
          <option key={n} value={n}>
            {n}
          </option>
        ))}
      </select>
      <p className="viz-honest-label">
        Click edges to toggle. The tetrahedron (V=4, E=6) is the unique minimum
        isostatic structure in 3D.
      </p>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════
// 10. SIC-POVM Quantum State Tomography
// ═════════════════════════════════════════════════════════════════════

const SIC: [number, number, number][] = [
  [0, 0, 1],
  [(2 * Math.sqrt(2)) / 3, 0, -1 / 3],
  [-Math.sqrt(2) / 3, Math.sqrt(6) / 3, -1 / 3],
  [-Math.sqrt(2) / 3, -Math.sqrt(6) / 3, -1 / 3],
];

function TomoScene({
  paused,
  theta,
  phi,
}: {
  paused: boolean;
  theta: number;
  phi: number;
}) {
  const grp = useRef<THREE.Group>(null);
  const target = useMemo(() => {
    const r = Math.sin(theta);
    return new THREE.Vector3(r * Math.cos(phi), r * Math.sin(phi), Math.cos(theta));
  }, [theta, phi]);
  const probs = useMemo(() => {
    return SIC.map((psi) =>
      (1 + target.dot(new THREE.Vector3(...psi))) / 2,
    );
  }, [target]);
  const rec = useMemo(() => {
    const rho = new THREE.Vector3();
    SIC.forEach((psi, i) =>
      rho.addScaledVector(new THREE.Vector3(...psi), probs[i])
    );
    return rho.normalize();
  }, [probs]);
  const fid = useMemo(() => (1 + target.dot(rec)) / 2, [target, rec]);

  useFrame((_, dt) => {
    if (!paused && grp.current) {
      grp.current.rotation.y += dt * 0.2;
    }
  });

  return (
    <group ref={grp as any}>
      <mesh rotation={[Math.PI / 2, 0, 0]}><ringGeometry args={[0.97, 1.03, 64]} /><meshBasicMaterial color={C.cyan} transparent opacity={0.12} side={THREE.DoubleSide} /></mesh>
      {SIC.map((psi, i) => (
        <Float key={`psi-${i}`} speed={2 + i} rotationIntensity={0} floatIntensity={0.1}>
          <mesh position={[...psi] as [number, number, number]}><sphereGeometry args={[0.06, 16, 16]} /><meshStandardMaterial color={C.violet} emissive={C.violet} emissiveIntensity={0.4} roughness={0.1} /></mesh></Float>
      ))}
      <Float speed={3} rotationIntensity={0} floatIntensity={0.1}><mesh position={target.toArray() as [number, number, number]}><sphereGeometry args={[0.12, 32, 32]} /><meshStandardMaterial color={C.amber} emissive={C.amber} emissiveIntensity={0.8} roughness={0.1} metalness={0.8} /></mesh></Float>
      <Float speed={3.5} rotationIntensity={0} floatIntensity={0.1}><mesh position={rec.toArray() as [number, number, number]}><sphereGeometry args={[0.09, 32, 32]} /><meshStandardMaterial color={C.emerald} emissive={C.emerald} emissiveIntensity={0.6} roughness={0.1} metalness={0.8} transparent opacity={0.8} /></mesh></Float>
      <Html position={[-1.6, -1.5, 0]} center style={{ pointerEvents: 'none' }}>
        <span className="viz-html-label viz-html-label-emerald">
          F = {fid.toFixed(4)}  amber→target  green→rec
        </span>
      </Html>
    </group>
  );
}

export function SicPovmTomography({ paused }: { paused: boolean }) {
  const [theta, setTheta] = useState(Math.PI / 4);
  const [phi, setPhi] = useState(Math.PI / 4);

  return (
    <div className="viz-card">
      <div className="viz-label">SIC-POVM Quantum State Tomography</div>
      <Canvas camera={{ position: [0, 0, 4], fov: 45 }} className="viz-canvas">
        <Suspense>
          <SceneLighting />
          <OrbitControls makeDefault enableZoom enablePan={false} minDistance={2} maxDistance={8} />
          <TomoScene paused={paused} theta={theta} phi={phi} />
        </Suspense>
      </Canvas>
      <div className="viz-controls-grid">
        <div>
          <label className="viz-param-label"><Latex text={`$\\theta=${theta.toFixed(2)}$`} /></label>
          <input
            type="range"
            min={0}
            max={Math.PI}
            step={0.05}
            value={theta}
            onChange={(e) => setTheta(parseFloat(e.target.value))}
            className="viz-range"
          />
        </div>
        <div>
          <label className="viz-param-label"><Latex text={`$\\varphi=${phi.toFixed(2)}$`} /></label>
          <input
            type="range"
            min={0}
            max={Math.PI * 2}
            step={0.05}
            value={phi}
            onChange={(e) => setPhi(parseFloat(e.target.value))}
            className="viz-range"
          />
        </div>
      </div>
      <p className="viz-honest-label">
        Tetrahedral SIC-POVM basis states enable reference-frame-independent state reconstruction. F → 1.
      </p>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════
// 11. Rate-Distortion Transducer  —  Shannon-Hartley
// ══════════════════════════════════════════════════════════════════════

function cap(bw: number, snr: number) {
  return bw * Math.log2(1 + snr);
}
function rd(c: number, d: number) {
  return Math.max(0, c * Math.max(0, 1 - d));
}
function RDScene({
  paused,
  bw,
  snr,
  dist,
}: {
  paused: boolean;
  bw: number;
  snr: number;
  dist: number;
}) {
  const grp = useRef<THREE.Group>(null);
  const capacity = useMemo(() => cap(bw, snr), [bw, snr]);
  const opR = useMemo(() => rd(capacity, dist), [capacity, dist]);
  const curve = useMemo(() => {
    const pts: [number, number][] = [];
    for (let i = 0; i < 50; i++) {
      const D = i / 49;
      pts.push([D * 3 - 1.5, rd(capacity, D) * 2 - 1]);
    }
    return pts;
  }, [capacity]);

  useFrame((_, dt) => {
    if (!paused && grp.current) {
      grp.current.rotation.y += dt * 0.1;
    }
  });

  return (
    <group ref={grp as any}>
      <mesh position={[-1.5, 0, 0]}><boxGeometry args={[3, 0.02, 0.02]} /><meshBasicMaterial color={C.cyan} transparent opacity={0.3} /></mesh>
      <mesh position={[0, 1.2, 0]}><boxGeometry args={[0.02, 2.4, 0.02]} /><meshBasicMaterial color={C.cyan} transparent opacity={0.3} /></mesh>
      {curve.map(([x, y], i) => {
        if (i === curve.length - 1) return null;
        const [nx, ny] = curve[i + 1];
        const dx = nx - x;
        const dy = ny - y;
        const len = Math.sqrt(dx * dx + dy * dy);
        const ang = Math.atan2(dy, dx);
        const t = i / curve.length;
        return (
          <mesh key={`s-${i}`} position={[x + dx / 2, y + dy / 2, 0]} rotation={[0, 0, ang]}>
            <boxGeometry args={[len + 0.02, 0.04, 0.01]} />
            <meshBasicMaterial color={'#' + new THREE.Color(C.violet).lerp(new THREE.Color(C.rose), t).getHexString()} />
          </mesh>
        );
      })}
      <Float speed={3} rotationIntensity={0} floatIntensity={0.15}><mesh position={[dist * 3 - 1.5, opR * 2 - 1, 0.02]}><sphereGeometry args={[0.09, 32, 32]} /><meshStandardMaterial color={C.amber} emissive={C.amber} emissiveIntensity={0.9} roughness={0.1} metalness={0.8} /></mesh></Float>
      <Html position={[-1.6, -1.5, 0]} center style={{ pointerEvents: 'none' }}>
        <span className="viz-html-label-lg viz-html-label-emerald">
          C={capacity.toFixed(1)} bits/s  R={opR.toFixed(1)} bits/s
        </span>
      </Html>
    </group>
  );
}

export function RateDistortionTransducer({ paused }: { paused: boolean }) {
  const [bw, setBw] = useState(10);
  const [snr, setSnr] = useState(10);
  const [dist, setDist] = useState(0.3);

  return (
    <div className="viz-card">
      <div className="viz-label">Rate-Distortion Transducer</div>
      <Canvas camera={{ position: [0, 0, 4], fov: 45 }} className="viz-canvas">
        <Suspense>
          <SceneLighting />
          <OrbitControls makeDefault enableZoom enablePan={false} minDistance={2} maxDistance={8} />
          <RDScene paused={paused} bw={bw} snr={snr} dist={dist} />
        </Suspense>
      </Canvas>
      <div className="viz-sliders-row">
        <div className="viz-slider-col">
          <label className="viz-param-label">Bw={bw.toFixed(1)}</label>
          <input
            type="range"
            min={0.5}
            max={20}
            step={0.5}
            value={bw}
            onChange={(e) => setBw(parseFloat(e.target.value))}
            className="viz-range"
          />
        </div>
        <div className="viz-slider-col">
          <label className="viz-param-label">S/N={snr.toFixed(1)}</label>
          <input
            type="range"
            min={0.1}
            max={30}
            step={0.5}
            value={snr}
            onChange={(e) => setSnr(parseFloat(e.target.value))}
            className="viz-range"
          />
        </div>
        <div className="viz-slider-col">
          <label className="viz-param-label">D={(dist * 100).toFixed(0)}%</label>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={dist}
            onChange={(e) => setDist(parseFloat(e.target.value))}
            className="viz-range"
          />
        </div>
      </div>
      <p className="viz-honest-label">
        Shannon-Hartley: C = B·log₂(1+S/N). Rate-distortion: minimal rate R to achieve distortion ≤ D. Monotropic attention.
      </p>
    </div>
  );
}
