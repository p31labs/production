#!/usr/bin/env node
/**
 * sync-p31ca-ambient — derive the vendored @p31/p31ca-ambient package (the
 * p31ca.org ambient experience: MolecularHeart background + LedController)
 * from the canonical apps/p31ca source + the @p31/controls knob slice. The
 * design portal consumes the EXACT deployed components; this script re-copies
 * so they never drift (single source of truth).
 *
 * Usage: node scripts/sync-p31ca-ambient.mjs
 * Then:  pnpm install
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DESIGN_ROOT = path.resolve(__dirname, '..');
const P31CA = '/home/p31/P31-local-workspace/apps/p31ca/src';
const CONTROLS = '/home/p31/P31-local-workspace/packages/controls/src';
const VENDOR = path.join(DESIGN_ROOT, 'vendor', 'p31ca-ambient');

const copies = [
  [P31CA, 'components/background/MolecularHeart.tsx', 'src/components/background/MolecularHeart.tsx'],
  [P31CA, 'components/background/Starfield.tsx', 'src/components/background/Starfield.tsx'],
  [P31CA, 'components/LedController.tsx', 'src/components/LedController.tsx'],
  [P31CA, 'stores/ledStore.ts', 'src/stores/ledStore.ts'],
  [P31CA, 'stores/effectsStore.ts', 'src/stores/effectsStore.ts'],
  [P31CA, 'stores/sceneStore.ts', 'src/stores/sceneStore.ts'],
  [P31CA, 'lib/geodesic.ts', 'src/lib/geodesic.ts'],
  [P31CA, 'lib/color.ts', 'src/lib/color.ts'],
  [P31CA, 'lib/scenePresets.ts', 'src/lib/scenePresets.ts'],
  [P31CA, 'lib/themeEnvironments.ts', 'src/lib/themeEnvironments.ts'],
  [P31CA, 'lib/lumiIntent.ts', 'src/lib/lumiIntent.ts'],
  [P31CA, 'lib/starfield.ts', 'src/lib/starfield.ts'],
  [P31CA, 'styles/molecular-dome.css', 'css/molecular-dome.css'],
  [P31CA, 'styles/p31-style.css', 'css/p31-style.css'],
  // @p31/controls slice — the real Knob + math (p31ca's own are shims).
  [CONTROLS, 'Knob.tsx', 'src/components/controller/Knob.tsx'],
  [CONTROLS, 'knobMath.ts', 'src/components/controller/knobMath.ts'],
  [CONTROLS, 'types.ts', 'src/components/controller/types.ts'],
  [CONTROLS, 'controls.css', 'css/controls.css'],
];

// 1) wipe + copy
fs.rmSync(VENDOR, { recursive: true, force: true });
for (const [srcRoot, src, dst] of copies) {
  const from = path.join(srcRoot, src);
  const to = path.join(VENDOR, dst);
  if (!fs.existsSync(from)) throw new Error(`missing canonical file: ${from}`);
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(from, to);
}

// 2) surgical transforms — keep the vendored slice typechecking under the
//    design portal's strict tsc (the p31ca app never runs tsc; Vite strips
//    types, so its loose patterns are tolerated there but not here).
function patch(file, find, replace) {
  const p = path.join(VENDOR, file);
  let s = fs.readFileSync(p, 'utf8');
  if (!s.includes(find)) throw new Error(`patch not found in ${file}: ${find.slice(0, 50)}`);
  s = s.replace(find, replace);
  fs.writeFileSync(p, s);
}

// a) LedController imports the shell-chrome theme store → shim it locally
//    (the design portal must not depend on @p31/shell-chrome).
patch(
  'src/components/LedController.tsx',
  "import { useThemeStore } from '@p31/shell-chrome/stores'",
  "import { useThemeStore } from '../stores/themeStore'",
);

// b) the real @p31/controls Knob has a named export only; LedController
//    imports it as default (the p31ca shim re-exported it as default).
{
  const kp = path.join(VENDOR, 'src/components/controller/Knob.tsx');
  const k = fs.readFileSync(kp, 'utf8');
  if (!k.includes('export default Knob;')) fs.appendFileSync(kp, '\nexport default Knob;\n');
}

// c) MolecularHeart type fixes: static THREE import (the dynamic `const THREE
//    = await import('three')` is a value, not a namespace, so `THREE.Vector3`
//    in type positions fails), and `async function init()` → arrow so the
//    `canvas` const narrowing propagates into the closure.
{
  const mp = path.join(VENDOR, 'src/components/background/MolecularHeart.tsx');
  let m = fs.readFileSync(mp, 'utf8');
  if (!m.includes("import * as THREE from 'three'")) {
    m = m.replace(
      "import { cssToHex } from '../../lib/color'",
      "import { cssToHex } from '../../lib/color'\nimport * as THREE from 'three'",
    );
  }
  m = m.replace('      const THREE = await import(\'three\')\n', '');
  m = m.replace('async function init() {', 'const init = async () => {');
  // e) Design portal: center the dome in the CONTENT viewport (the 240px glass
  //    sidebar offsets the content area from the full-viewport canvas). Shift
  //    the camera LEFT so the dome sits centered in the area right of the
  //    sidebar; offset is 0 when the sidebar is hidden (mobile).
  m = m.replace(
    '      scene.add(group)',
    `      scene.add(group)
      // Design portal viewport centering: dome centered in the content area,
      // not the full screen. Reads .sidebar width; 0 offset when hidden.
      const recenter = () => {
        const nav = document.querySelector('.sidebar')
        const navW = nav ? nav.getBoundingClientRect().width : 0
        const cw = canvas.clientWidth || window.innerWidth
        const ch = canvas.clientHeight || window.innerHeight
        camera.aspect = cw / ch
        camera.position.x = 0
        if (navW > 0) {
          // Off-center projection via view offset: the world origin renders at
          // (cw/2 + navW/2, ch/2) — content-area center. The camera stays
          // on-axis, so the LED frame + plasma blob stay concentric (no
          // off-axis perspective drift, unlike camera.position.x).
          camera.setViewOffset(cw + navW, ch, 0, 0, cw, ch)
        } else {
          camera.clearViewOffset()
        }
      }
      recenter()
      // Retry until the sidebar is laid out (the ambient's lazy chunk can win
      // the race against the app shell's CSS). setTimeout rather than rAF so
      // the wait doesn't force a layout read every frame. Observes the sidebar
      // directly (ResizeObserver on documentElement won't fire on child adds).
      const ensureCentered = () => {
        if (cancelled) return
        recenter()
        const nav = document.querySelector('.sidebar')
        if (nav && nav.getBoundingClientRect().width > 0) {
          if (typeof ResizeObserver !== 'undefined') {
            ro = new ResizeObserver(recenter)
            ro.observe(nav)
          }
          return
        }
        if (recenterTries++ < 20) {
          recenterTimer = window.setTimeout(ensureCentered, 50)
        }
      }
      ensureCentered()
      // Design portal orbit: drag to rotate the dome (enabled when the /dome
      // surface is active). Document-level so it works through the app shell;
      // ignores the controller + genuine controls (NOT [data-mcp-tool] — the
      // /dome surface root itself carries data-mcp-tool).
      let orbitDrag: { id: number; x: number; y: number; y0: number; x0: number } | null = null
      const isOrbitTarget = (t: any) => t && t.closest && t.closest('.devpanel, button, a, input, select, textarea, [role="button"]')
      const domeSurfaceActive = () => !!document.querySelector('.surface-panel.dome-surface.active')
      const onOrbitDown = (e: PointerEvent) => {
        if (isOrbitTarget(e.target)) return
        if (!domeSurfaceActive()) return
        orbitDrag = { id: e.pointerId, x: e.clientX, y: e.clientY, y0: inner.rotation.y, x0: inner.rotation.x }
        e.preventDefault()
      }
      const onOrbitMove = (e: PointerEvent) => {
        if (!orbitDrag || e.pointerId !== orbitDrag.id) return
        inner.rotation.y = orbitDrag.y0 + (e.clientX - orbitDrag.x) * 0.004
        inner.rotation.x = Math.max(-1.2, Math.min(1.2, orbitDrag.x0 + (e.clientY - orbitDrag.y) * 0.003))
        e.preventDefault()
      }
      const onOrbitEnd = (e: PointerEvent) => { if (orbitDrag && e.pointerId === orbitDrag.id) orbitDrag = null }
      window.addEventListener('pointerdown', onOrbitDown)
      window.addEventListener('pointermove', onOrbitMove)
      window.addEventListener('pointerup', onOrbitEnd)
      window.addEventListener('pointercancel', onOrbitEnd)`,
  );
  m = m.replace(
    'renderer.setSize(nw, nh, false)',
    'renderer.setSize(nw, nh, false)\n        recenter()',
  );
  // f) onResize no longer manages aspect/updateProjectionMatrix manually —
  //    recenter() sets the aspect + view offset (setViewOffset/clearViewOffset
  //    both call updateProjectionMatrix internally).
  m = m.replace(
    `        camera.aspect = nw / nh
        camera.updateProjectionMatrix()
        renderer.setSize(nw, nh, false)`,
    '        renderer.setSize(nw, nh, false)',
  );
  // f) Remove the static SVG molecular-heart layer — the portal wants only the
  //    dome, blob (WebGL heart), and starfield. (The SVG was also the
  //    WebGL-unavailable fallback; that graceful degradation is intentionally
  //    dropped.)
  m = m.replace(/\{\/\* Static SVG molecular heart[\s\S]*?<\/svg>\s*/u, '');
  fs.writeFileSync(mp, m);
}

// d) p31-style.css pulls in the whole canon theme via @import — the design
//    portal owns theming via design-core; strip the canon import (the rest of
//    the file is standalone utilities: scrollbar, selection, gradient-text).
{
  const cp = path.join(VENDOR, 'css', 'p31-style.css');
  let c = fs.readFileSync(cp, 'utf8');
  c = c.replace("@import '@p31ca/canon/css/all.css';\n", '');
  fs.writeFileSync(cp, c);
}

// e) ledStore quiet defaults — the design portal boots ambient + quiet:
//    breathe mode, dim ring (15), slow (30), dim blob (45). Bump the persist
//    key v1 → v2 so existing users get the quiet first load (the old key is
//    discarded once; their tweaks then persist under v2).
{
  const lp = path.join(VENDOR, 'src', 'stores', 'ledStore.ts');
  let l = fs.readFileSync(lp, 'utf8');
  l = l.replace("  mode: 'rainbow' as LedMode,", "  mode: 'breath' as LedMode,");
  l = l.replace("  speed: 45,", "  speed: 30,");
  l = l.replace("  brightness: 30,", "  brightness: 15,");
  l = l.replace("  blobBrightness: 60,", "  blobBrightness: 45,");
  l = l.replace("name: 'p31:led:v1'", "name: 'p31:led:v2'");
  fs.writeFileSync(lp, l);
}

// g) Blob centering — the heart vertex shader's directional `lean` term
//    (displacement toward a rotating `eye` on the horizon) bulges the blob
//    asymmetrically, so its visual center drifts off the dome axis. Remove the
//    lean; keep the symmetric 3-octave noise wobble.
{
  const hp = path.join(VENDOR, 'src', 'components', 'background', 'MolecularHeart.tsx');
  let h = fs.readFileSync(hp, 'utf8');
  h = h.replace(
    `          vec3 eye = vec3(sin(t * 0.21 + 1.3), 0.35, cos(t * 0.21 + 1.3));
          float lean = dot(position, eye) * (0.03 + 0.05 * e);
`,
    '',
  );
  h = h.replace(
    'vec3 displaced = position + normal * (wob * amp + lean);',
    'vec3 displaced = position + normal * (wob * amp);',
  );
  fs.writeFileSync(hp, h);
}

// h) recenter retry state at the useEffect scope so the outer cleanup can
  //    clear the timer + disconnect the observer (the init() inner cleanup is
  //    discarded by void init()).
  {
    const hp = path.join(VENDOR, 'src', 'components', 'background', 'MolecularHeart.tsx');
    let h = fs.readFileSync(hp, 'utf8');
    h = h.replace(
      '    let cancelled = false',
      `    let cancelled = false
    let recenterTimer = 0
    let recenterTries = 0
    let ro: ResizeObserver | null = null`,
    );
    h = h.replace(
      `    return () => {
      cancelled = true
    }`,
      `    return () => {
      cancelled = true
      clearTimeout(recenterTimer)
      if (ro) ro.disconnect()
    }`,
    );
    fs.writeFileSync(hp, h);
  }

// 3) write the theme-store shim (LedController uses .theme + .setTheme only).
const themeStore = `/**
 * themeStore — p31ca LedController theme shim. The design portal owns theming
 * via @p31ca/design-core; this only satisfies the controller's theme/setTheme
 * surface so the vendored slice stays self-contained.
 */
import { create } from 'zustand';

interface ThemeState {
  theme: string;
  setTheme: (t: string) => void;
  cycleTheme: () => string;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: 'ocean',
  setTheme: (theme) => {
    set({ theme });
    if (typeof document !== 'undefined') document.documentElement.setAttribute('data-theme', theme);
  },
  cycleTheme: () => {
    const next = get().theme === 'ocean' ? 'volt' : 'ocean';
    set({ theme: next });
    return next;
  },
}));
`;
fs.mkdirSync(path.join(VENDOR, 'src', 'stores'), { recursive: true });
fs.writeFileSync(path.join(VENDOR, 'src', 'stores', 'themeStore.ts'), themeStore);

// 4) package.json — self-contained (react + zustand + three only).
const pkg = {
  name: '@p31/p31ca-ambient',
  version: '1.0.0',
  private: true,
  type: 'module',
  exports: {
    './background/MolecularHeart': './src/components/background/MolecularHeart.tsx',
    './background/Starfield': './src/components/background/Starfield.tsx',
    './LedController': './src/components/LedController.tsx',
    './stores/effectsStore': './src/stores/effectsStore.ts',
    './stores/ledStore': './src/stores/ledStore.ts',
    './stores/sceneStore': './src/stores/sceneStore.ts',
    './stores/*': './src/stores/*',
    './lib/starfield': './src/lib/starfield.ts',
    './lib/*': './src/lib/*',
    './css/molecular-dome.css': './css/molecular-dome.css',
    './css/p31-style.css': './css/p31-style.css',
    './css/controls.css': './css/controls.css',
  },
  peerDependencies: {
    react: '^19.0.0',
    'react-dom': '^19.0.0',
    three: '^0.186.0',
    zustand: '^5.0.0',
  },
};
fs.writeFileSync(path.join(VENDOR, 'package.json'), JSON.stringify(pkg, null, 2) + '\n');

// 5) sync stamp
fs.writeFileSync(path.join(VENDOR, 'sync.json'), JSON.stringify({
  syncedAt: new Date().toISOString(),
  canon: '/home/p31/P31-local-workspace/apps/p31ca/src',
  files: copies.map(([, , d]) => d).concat(['src/stores/themeStore.ts']),
}, null, 2) + '\n');

console.log(`sync-p31ca-ambient: ${copies.length + 1} files @ ${VENDOR}`);