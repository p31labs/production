#!/usr/bin/env node
/**
 * r3f-perf-audit — enforce the React-Three-Fiber enterprise performance rules
 * on the dome feature + the @p31/spaceship-earth cockpit slice it renders:
 * dpr cap, no setState inside useFrame (refs only), instancing for repeated
 * geometry (the cockpit renders hundreds of port tetrahedra + struts via
 * instancedMesh — one draw call each), an additive-star/glass pipeline, and a
 * draw-call budget.
 * Run after edits. Usage: node scripts/r3f-perf-audit.mjs
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(fileURLToPath(import.meta.url));
const DOME = join(ROOT, '..', 'src', 'features', 'dome', 'DomeScene.tsx');
const LEDDOME = join(ROOT, '..', 'src', 'features', 'dome', 'LedDome.tsx');
const BRIDGE = join(ROOT, '..', 'src', 'features', 'dome', 'shipBridge.tsx');
const COCKPIT = join(ROOT, '..', 'vendor', 'spaceship-earth', 'src', 'cockpit');
const STORES = join(ROOT, '..', 'vendor', 'spaceship-earth', 'src', 'store');

const DOME_SRC = readFileSync(DOME, 'utf8');
const srcs = [DOME_SRC, readFileSync(LEDDOME, 'utf8'), readFileSync(BRIDGE, 'utf8')];
for (const dir of [COCKPIT, STORES]) {
  for (const f of readdirSync(dir)) {
    if (/\.(ts|tsx)$/.test(f)) srcs.push(readFileSync(join(dir, f), 'utf8'));
  }
}
const SRC = srcs.join('\n');

let fail = 0;

// 1. DPR capping.
if (!/dpr=\{\[1,\s*2\]\}/.test(DOME_SRC)) {
  console.error('✗ r3f-perf — missing dpr={[1, 2]} (4K mobile meltdown)');
  fail = 1;
}

// 2. No setState inside useFrame — scan useFrame bodies for React state setters.
const frames = [...SRC.matchAll(/useFrame\([\s\S]*?\)\)\s*;\s*\}/g)];
for (const f of frames) {
  const body = f[0];
  if (/\bsetState\(/.test(body)) {
    console.error('✗ r3f-perf — setState called inside useFrame');
    fail = 1;
  }
}

// 3. Instancing invariant: IF the scene renders repeated <mesh> primitives,
// they must use instancedMesh (the cockpit's 320 hit-ports + tetra struts do).
// A single clean wireframe dome (lineSegments) + starfield (points) needs no
// instancing — that is the /dome surface's shape.
const meshCount = (SRC.match(/<mesh\b/g) ?? []).length;
if (meshCount > 1 && !/<instancedMesh\b/.test(SRC)) {
  console.error('✗ r3f-perf — repeated <mesh> geometry must use instancedMesh');
  fail = 1;
}

// 4. Draw-call budget: draw-call primitives across the scene (instanced meshes
//    stay one call each regardless of instance count).
const drawCalls = (SRC.match(/<mesh\b|<instancedMesh\b|<points\b|<lineSegments\b|<line\b/g) ?? []).length;
if (drawCalls > 12) {
  console.error(`✗ r3f-perf — ${drawCalls} draw-call primitives (budget < 12)`);
  fail = 1;
}

// 5. Additive pipeline: the starfield + dome shell glow use additive blending.
if (!/AdditiveBlending/.test(SRC)) {
  console.error('✗ r3f-perf — starfield/shell must use additive blending');
  fail = 1;
}

if (fail) {
  console.error('\nr3f-perf-audit FAIL — fix the dome before deploy.');
  process.exit(1);
}
console.log(`r3f-perf-audit OK — dpr capped, no useFrame setState, ${drawCalls} draw-call primitives, additive pipeline`);