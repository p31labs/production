// CosmosFX — optional cosmetic layers over the P31 dome.
//  - aurora: slow-shifting additive gradient band behind the dome
//  - comets: sparse short streaks on a far sphere, fast orbital drift
// Both freeze under calm, reduceMotion, or spoons ≤ 1 (zero motion). Resolved
// state is exposed for the verify gate via window.__p31_fxLayers when
// __P31_VERIFY__ is set.
import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

function makeAuroraTexture(): THREE.Texture {
  const c = document.createElement('canvas');
  c.width = 4;
  c.height = 256;
  const ctx = c.getContext('2d')!;
  const g = ctx.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, 'rgba(74, 222, 128, 0)');
  g.addColorStop(0.5, 'rgba(74, 222, 128, 0.5)');
  g.addColorStop(0.65, 'rgba(124, 58, 237, 0.35)');
  g.addColorStop(1, 'rgba(16, 185, 129, 0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 4, 256);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  return tex;
}

function Aurora({ frozen }: { frozen: boolean }) {
  const ref = useRef<THREE.Mesh>(null);
  const texture = useMemo(makeAuroraTexture, []);
  useEffect(() => () => texture.dispose(), [texture]);
  useFrame((_, delta) => {
    if (frozen || !ref.current) return;
    ref.current.rotation.z += delta * 0.01;
    texture.offset.x += delta * 0.008;
  });
  return (
    <mesh ref={ref} position={[0, 1, -6]} rotation={[-0.9, 0, 0]}>
      <planeGeometry args={[22, 8]} />
      <meshBasicMaterial
        map={texture as any}
        transparent
        opacity={0.22}
        side={THREE.DoubleSide}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        fog={false}
      />
    </mesh>
  );
}

function Comets({ frozen, count = 14 }: { frozen: boolean; count?: number }) {
  const ref = useRef<THREE.LineSegments>(null);
  const geometry = useMemo(() => {
    const n = count;
    const pos = new Float32Array(n * 2 * 3);
    for (let i = 0; i < n; i++) {
      const r = 7 + Math.random() * 2;
      const th = Math.random() * Math.PI * 2;
      const ph = Math.acos(2 * Math.random() - 1);
      const dir = new THREE.Vector3().setFromSpherical(new THREE.Spherical(r, ph, th));
      const tail = new THREE.Vector3().setFromSpherical(new THREE.Spherical(r + 1.1, ph + 0.05, th + 0.08));
      pos[i * 6] = dir.x; pos[i * 6 + 1] = dir.y; pos[i * 6 + 2] = dir.z;
      pos[i * 6 + 3] = tail.x; pos[i * 6 + 4] = tail.y; pos[i * 6 + 5] = tail.z;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    return g;
  }, [count]);
  useFrame((_, delta) => {
    if (frozen || !ref.current) return;
    ref.current.rotation.y += delta * 0.16;
    ref.current.rotation.x += delta * 0.03;
  });
  return (
    <lineSegments ref={ref} geometry={geometry as any}>
      <lineBasicMaterial color="#e8d5a0" transparent opacity={0.7} blending={THREE.AdditiveBlending} depthWrite={false} />
    </lineSegments>
  );
}

export default function CosmosFX({ aurora, comets, calm = false, reduceMotion = false, spoons = 5 }: { aurora: boolean; comets: boolean; calm?: boolean; reduceMotion?: boolean; spoons?: number }) {
  const frozen = calm || reduceMotion || spoons <= 1;
  useEffect(() => {
    if (import.meta.env.MODE !== 'production' || (typeof window !== 'undefined' && (window as any).__P31_VERIFY__)) {
      (window as any).__p31_fxLayers = { aurora, comets, frozen };
    }
  }, [aurora, comets, frozen]);
  return (
    <>
      {aurora && <Aurora frozen={frozen} />}
      {comets && <Comets frozen={frozen} />}
    </>
  );
}
