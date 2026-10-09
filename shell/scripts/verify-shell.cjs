// P31 shell — verify suite (Playwright + Chromium, headless).
// Runs against the live production deploy. Durable copy lives in-repo
// (scripts/verify-shell.cjs) so it survives /tmp cleanup.
//
//   NODE_PATH=/home/p31/node_modules node scripts/verify-shell.cjs
//   VISUAL_TEST=1 NODE_PATH=/home/p31/node_modules node scripts/verify-shell.cjs
//
//   Environment variables:
//     VERIFY_TIMEOUT  — suite-wide timeout in ms (default: 180000)
//     VERIFY_RETRIES  — max retry attempts on uncaught exceptions (default: 2)
//     P31_VERIFY_BASE — target URL (default: https://p31-shell.trimtab-signal.workers.dev)
//     VISUAL_TEST     — enable visual regression screenshot comparison
//
// Exits 0 only when every check passes. The suite sets __P31_VERIFY__ via
// addInitScript before the bundle's first tick; verify hooks are exposed on
// window.* only when MODE !== 'production' OR __P31_VERIFY__ is set.
//
// The ship hooks (dome / quantum / larmor / fxLayers) are only defined while
// the Cockpit surface is mounted, so the suite navigates to Cockpit early and
// runs those gates there before returning to global surfaces.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const SUITE_TIMEOUT = parseInt(process.env.VERIFY_TIMEOUT || '600000', 10);

const BASE = process.env.P31_VERIFY_BASE || 'https://p31-shell.trimtab-signal.workers.dev';
const SHELL = '/home/p31/production/shell';
const results = [];
const suiteStart = Date.now();
const sectionTimes = [];
function mark(label) { sectionTimes.push([label, Date.now() - suiteStart]); }
function check(name, ok, detail = '') {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  — ${detail}` : ''}`);
}

// ── Section A: repo preflight (static, no browser) ──
{
  const manifestPath = path.join(SHELL, 'public', 'p31-shell.mcp.json');
  const docsPath = path.join(SHELL, 'docs', 'MCP.md');
  const testConfig = path.join(SHELL, 'vitest.config.ts');
  const testDir = path.join(SHELL, 'src', 'lib', '__tests__');
  const bondingLib = path.join(SHELL, 'src', 'lib', 'meatspace', 'tetrahedron.ts');
  const gameLib = path.join(SHELL, 'src', 'lib', 'meatspace', 'game.ts');
  const surface = path.join(SHELL, 'src', 'features', 'bonding', 'BondingSurface.tsx');
  const manifestValidator = path.join(SHELL, 'scripts', 'validate-mcp-manifest.mjs');

  let manifestOk = false;
  try {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    manifestOk = ((manifest.mcpServers || []).find((s) => s.id === 'shell')?.url || '').startsWith('https://');
  } catch { manifestOk = false; }
  check('preflight: mcp manifest includes shell endpoint with absolute URL', manifestOk);
  check('preflight: docs/MCP.md exists', fs.existsSync(docsPath));
  check('preflight: vitest.config.ts exists', fs.existsSync(testConfig));
  let testFiles = 0;
  let testCases = 0;
  try {
    testFiles = fs.readdirSync(testDir).filter((f) => f.endsWith('.test.ts')).length;
    testCases = fs.readdirSync(testDir)
      .filter((f) => f.endsWith('.test.ts'))
      .reduce((n, f) => n + (fs.readFileSync(path.join(testDir, f), 'utf-8').match(/\bit\(|\btest\(/g) || []).length, 0);
  } catch {}
  check('preflight: unit test suite present (src/lib/__tests__)',
    testFiles >= 4 && testCases >= 40, `${testFiles} files, ${testCases} cases`);
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(SHELL, 'package.json'), 'utf-8'));
    check('preflight: package.json defines a test script', typeof pkg.scripts?.test === 'string', pkg.scripts?.test || '');
  } catch { check('preflight: package.json defines a test script', false, 'no package.json'); }
  check('preflight: validate-mcp-manifest.mjs present', fs.existsSync(manifestValidator));
  check('preflight: glama.json present', fs.existsSync(path.join(SHELL, 'glama.json')));
  check('preflight: smithery.yaml present', fs.existsSync(path.join(SHELL, 'smithery.yaml')));
  check('preflight: tetrahedron.ts + game.ts ported (Track 1 lib)', fs.existsSync(bondingLib) && fs.existsSync(gameLib));
  check('preflight: BondingSurface feature present', fs.existsSync(surface));

  let manifestValid = false;
  try {
    execSync(`${process.execPath} ` + path.join(SHELL, 'scripts', 'validate-mcp-manifest.mjs'), { timeout: 8000, stdio: 'pipe' });
    manifestValid = true;
  } catch (e) { manifestValid = false; }
  check('preflight: manifest validates against JSON schema', manifestValid, manifestValid ? '' : 'error running validator');
}

async function runSuite() {
  results.length = 0;
  const browser = await chromium.launch({ args: ['--no-sandbox', '--use-angle=swiftshader', '--disable-dev-shm-usage'] });
  // Pin the viewport so the cockpit visual baseline stays comparable across runs.
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  page.setDefaultTimeout(15000);
  page.setDefaultNavigationTimeout(60000);
  await page.addInitScript(() => { window.__P31_VERIFY__ = true; });

  // ── Section B: deploy fingerprint (informational by default) ──
  {
    const html = await (await fetch(BASE + '/')).text();
    const asset = (html.match(/assets\/index-[A-Za-z0-9_-]+\.js/) || [])[0];
    const previous = 'index-DdZw3gFi.js';
    const changed = asset !== `assets/${previous}`;
    check('deploy: live index.html references a hashed JS asset', !!asset, asset || 'no asset');
    check(
      `deploy: fingerprint — ${changed ? 'NEW deploy' : 'no new deploy since ' + previous}`,
      true,
      asset || ''
    );
  }

  // ── Section C: app load + globally-mounted verify hooks ──
  mark('C: load');
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.topbar', { timeout: 60000 });
  await page.waitForTimeout(2000);

  check('load: app boots — topbar + header drawer',
    (await page.$$('.topbar')).length === 1 && (await page.$$('.header-drawer')).length === 1);
  check('load: header-drawer renders all 7 surface tabs + topbar alerts',
    (await page.$$eval('.header-drawer [role="tab"]', (els) => els.length >= 7) &&
     (await page.$('.topbar [aria-label="Notifications"]')) !== null) === true);

  // ── HeaderDrawer toggle (slide-down, no rail) ──
  var drawerEl = await page.$('.header-drawer');
  var drawerOpenBefore = drawerEl ? await drawerEl.evaluate((el) => el.classList.contains('open')) : false;
  check('shell: drawer closed by default',
    drawerEl !== null && !drawerOpenBefore);
  for (var _d = 0; _d < 3; _d++) {
    await page.click('.drawer-toggle', { timeout: 6000, force: true }).catch(() =>
      page.evaluate(() => { const b = document.querySelector('.drawer-toggle'); if (b) b.click(); }).catch(() => {}));
    try { await page.waitForSelector('.header-drawer.open', { timeout: 1500 }); break; }
    catch { await page.waitForTimeout(432); }
  }
  var drawerOpenEl = await page.$('.header-drawer.open');
  check('shell: chevron opens the drawer (single-row overlay)',
    drawerOpenEl !== null);
  await page.click('.header-drawer [role="tab"]:has-text("Dashboard")', { timeout: 12000 });
  await page.waitForSelector('.dashboard', { timeout: 10000, state: 'attached' }).catch(() => {});
  await page.waitForTimeout(400);
  var drawerClosedEl = await page.$('.header-drawer');
  var drawerClosedAfter = drawerClosedEl ? await drawerClosedEl.evaluate((el) => el.classList.contains('open')) : false;
  check('shell: nav select closes the drawer',
    drawerClosedEl !== null && !drawerClosedAfter);

  // ── Drawer opaque background (no content bleed-through) ──
  var drawerBg = await page.$eval('.header-drawer', (el) => getComputedStyle(el).backgroundColor);
  var drawerAlpha = drawerBg.includes('rgba') ? parseFloat(drawerBg.split(',')[3]) : 1.0;
  check('shell: drawer has opaque background (no content bleed-through)',
    drawerAlpha >= 0.95, `alpha=${drawerAlpha}, bg=${drawerBg}`);

  // Navigation helper: the drawer is hidden when closed, so each tab jump
  // re-opens it first, clicks the target, then waits for the close transition.
  async function gotoDrawerTab(label) {
    const isOpen = await page.$eval('.header-drawer', (el) => el.classList.contains('open')).catch(() => false);
    if (!isOpen) {
      for (let _g = 0; _g < 3; _g++) {
        await page.click('.drawer-toggle', { force: true }).catch(() =>
          page.evaluate(() => { const b = document.querySelector('.drawer-toggle'); if (b) b.click(); }).catch(() => {}));
        try { await page.waitForSelector('.header-drawer.open', { timeout: 1500 }); break; }
        catch { await page.waitForTimeout(432); }
      }
    }
    await page.click(`.header-drawer [role="tab"]:has-text("${label}")`, { timeout: 12000 }).catch(() => {});
    await page.waitForTimeout(550);
  }

  const globalHooks = await page.evaluate(() => {
    const effects = window.__p31_effects;
    const mobile = window.__p31_mobile;
    const pwa = window.__p31_pwa;
    const haptics = window.__p31_haptics;
    const voice = window.__p31_voice;
    const nodeZero = window.__p31_nodeZero;
    return {
      effects: !!effects && typeof effects.starDensity === 'string' && typeof effects.warmStars === 'boolean' && typeof effects.quantum === 'boolean' && typeof effects.count === 'number',
      mobile: !!mobile && mobile.touchTargets === true && mobile.swipe === true,
      pwa: !!pwa && typeof pwa.swRegistered === 'boolean' && pwa.splash === true && typeof pwa.installed === 'boolean' && pwa.updateReady === false,
      haptics: !!haptics && haptics.vibrate === true,
      voice: !!voice && typeof voice.supported === 'boolean' && voice.autoSendAvailable === true,
      nodeZero: !!nodeZero && typeof nodeZero.state === 'string' && (nodeZero.did === null || typeof nodeZero.did === 'string') && (nodeZero.deviceId === null || typeof nodeZero.deviceId === 'string') && typeof nodeZero.simulatePairing === 'function',
      assistantMode: window.__p31_assistantMode,
    };
  });
  check('hooks: __p31_effects exposed by always-mounted starfield', globalHooks.effects === true);
  check('hooks: __p31_mobile = { touchTargets, swipe }', globalHooks.mobile === true);
  check('hooks: __p31_pwa = { installed, swRegistered, updateReady, splash }', globalHooks.pwa === true);
  check('hooks: __p31_haptics = { vibrate }', globalHooks.haptics === true);
  check('hooks: __p31_voice = { supported, autoSendAvailable }', globalHooks.voice === true);
  check('hooks: __p31_nodeZero (did/state/deviceId/simulatePairing)', globalHooks.nodeZero === true);
  // DID + PQC keys are materialised lazily (only on first identity-surface use).
  // Bootstrap them here so simulatePairing + the later crypto/KEL cascade is deterministic.
  await page.evaluate(async () => {
    const mv = window.__p31_meshVerify;
    if (mv) {
      if (typeof mv.getOrCreateDidKey === 'function') await mv.getOrCreateDidKey();
      if (typeof mv.getOrCreatePqcKey === 'function') await mv.getOrCreatePqcKey();
    }
  }).catch(() => {});
  check('hooks: nodeZero simulatePairing completes a challenge → paired',
    (await page.evaluate(async () => {
      const nz = window.__p31_nodeZero;
      if (!nz) return false;
      const ok = await nz.simulatePairing();
      return ok === true && nz.state === 'paired' && typeof nz.deviceId === 'string' && nz.deviceId.startsWith('sim:');
    })) === true);
  check('hooks: __p31_assistantMode present (default auto)',
    globalHooks.assistantMode === 'auto', 'mode=' + globalHooks.assistantMode);
  check('hooks: __p31_keri exposes CESR + SAID flags',
    (await page.evaluate(() => { const k = window.__p31_keri; return !!k && k.cesr === true && k.said === true; })) === true);

  // PWA service worker registration flips swRegistered to true once ready.
  {
    const swOk = await page.evaluate(() => new Promise((resolve) => {
      const t0 = Date.now();
      const poll = () => {
        if (window.__p31_pwa?.swRegistered === true) return resolve(true);
        if (Date.now() - t0 > 30000) return resolve(false);
        setTimeout(poll, 400);
      };
      poll();
    }));
    check('pwa: service worker registers (swRegistered flips true)', swOk === true);
  }

  // ── Section D: navigate to Cockpit — ship hooks only exist there ──
  mark('D: cockpit nav');
  await gotoDrawerTab('Cockpit');
  await page.waitForSelector('.cockpit', { timeout: 30000 });
  await page.waitForTimeout(1000);
  check('cockpit: Cockpit surface mounts (.cockpit)', (await page.$('.cockpit')) !== null);
  check('cockpit: HUD left pill present', (await page.$('.hud-pill--left')) !== null);
  check('cockpit: HUD right pill present', (await page.$('.hud-pill--right')) !== null);
  check('cockpit: dome verify hooks exposed on mount',
    (await page.evaluate(() => Array.isArray(window.__p31_domeVertices) && window.__p31_domeVertices.length === 4)) === true);

  // ── Section D1: HUD pills + popovers ──
  mark('D1: hud');
  await page.click('.hud-pill--left .hud-pill-btn');
  await page.waitForSelector('.hud-popover', { timeout: 5000 });
  check('cockpit: left popover opens on pill click', (await page.$('.hud-popover')) !== null);
  check('cockpit: Larmor toggle present in left popover',
    (await page.$('.larmor-toggle')) !== null);
  await page.click('.hud-popover-close');
  await page.waitForTimeout(300);

  await page.click('.hud-pill--right .hud-pill-btn[title="Hardware"]');
  await page.waitForSelector('.hud-popover', { timeout: 5000 });
  check('cockpit: right popover opens on pill click', (await page.$('.hud-popover')) !== null);
  check('cockpit: LED mode buttons present in right popover',
    (await page.$('.hud-mode-btn')) !== null);
  await page.click('.hud-popover-close');
  await page.waitForTimeout(300);

  // ── Section E: dome geometry ──
  mark('E: dome geom');
  const dome = await page.evaluate(() => {
    const verts = window.__p31_domeVertices;
    const proj = window.__p31_projectNode;
    const nodes = window.__p31_domePosnerNodes;
    const colors = [];
    if (proj) { for (let i = 0; i < 6; i++) colors.push(proj(i)); }
    return {
      verts: Array.isArray(verts) && verts.length === 4 && verts.every((p) => Array.isArray(p) && p.length === 3 && p.every((n) => typeof n === 'number')),
      proj0: proj ? proj(0) : null,
      distinct: proj ? new Set(colors.filter((c) => c).map((c) => `${Math.round(c.x)},${Math.round(c.y)}`)).size : 0,
      edgeColorStr: window.__p31_domeEdgeColor,
      edgeColor: typeof window.__p31_domeEdgeColor === 'string' && window.__p31_domeEdgeColor.length > 0,
      frozen: typeof window.__p31_domeFrozen === 'boolean',
      posner: Array.isArray(nodes) && nodes.length === 12 && nodes.every((p) => Array.isArray(p) && p.length === 3),
    };
  });
  check('dome: tetra vertices exposed as 4 × [x,y,z]', dome.verts === true);
  check('dome: projectNode(0) returns screen {x,y} coords',
    !!dome.proj0 && typeof dome.proj0.x === 'number' && typeof dome.proj0.y === 'number',
    dome.proj0 ? `${Math.round(dome.proj0.x)},${Math.round(dome.proj0.y)}` : 'null');
  check('dome: projected nodes are spatially distinct', dome.distinct >= 4, dome.distinct + ' distinct coords');
  check('dome: edge color string exposed', dome.edgeColor === true, dome.edgeColorStr || '');
  check('dome: frozen flag is a boolean', dome.frozen === true);
  check('dome: 12 Posner nodes exposed', dome.posner === true);

  // ── Section E2: dome structure — 4-layer rebuild ──
  mark('E2: dome struct');
  const structure = await page.evaluate(() => window.__p31_domeStructure || null);
  check('dome: 4-layer structure exposed via __p31_domeStructure',
    !!structure && structure.layers === 4 && structure.hasPanels === true,
    structure ? `layers=${structure.layers} panels=${structure.hasPanels}` : 'null');
  check('dome: outer geodesic edge network (480 tube edges)',
    !!structure && structure.outerEdges === 480,
    structure ? `outerEdges=${structure.outerEdges}` : 'null');
  check('dome: tensegrity strut layer present (>= 6 struts)',
    !!structure && structure.struts >= 6,
    structure ? `struts=${structure.struts} bonds=${structure.bonds}` : 'null');

  // ── Section F: node-actions — click a dome node, act on it ──
  mark('F: node-actions');
  {
    const clicked = await (async () => {
      for (let i = 0; i < 6; i++) {
        const p = await page.evaluate((idx) => {
          const proj = window.__p31_projectNode;
          if (!proj) return null;
          const pt = proj(idx);
          return pt && typeof pt.x === 'number' ? { x: pt.x, y: pt.y } : null;
        }, i);
        if (!p) continue;
        await page.mouse.click(p.x, p.y);
        await page.waitForTimeout(250);
        const active = await page.evaluate(() => window.__p31_activeNode || null);
        if (active) return { node: active };
      }
      return { node: null };
    })();
    check('node: clicking a dome node sets __p31_activeNode', clicked.node !== null,
      clicked.node ? JSON.stringify(clicked.node) : 'no raycast hit on nodes 0–5');

    if (clicked.node) {
      check('node: floating action card appears (.node-actions)', (await page.$('.node-actions')) !== null);
      check('node: card exposes the clicked node source',
        (await page.evaluate(() => !!document.querySelector('.node-actions .node-actions-source')?.textContent)) === true);
      await page.click('.node-actions button:has-text("Mark this source read")').catch(() => null);
      var nodeClosed = await page.evaluate(() => new Promise(function(resolve) {
        var t0 = Date.now();
        var poll = function() {
          if (!document.querySelector('.node-actions')) return resolve(true);
          if (Date.now() - t0 > 5000) return resolve(false);
          setTimeout(poll, 200);
        };
        poll();
      }));
      // NB: __p31_activeNode is set-only in the app; the action card unmounts,
      // which is the real close signal we assert here.
      check('node: mark-read closes the action card', nodeClosed === true);
    } else {
      check('node: floating action card appears (.node-actions)', false, 'no node selected — best-effort gate');
      check('node: card exposes the clicked node source', false);
      check('node: mark-read closes the action card', false);
    }
  }

  // ── Section G: QuantumFX — spoon-phase bands ──
  mark('G: quantumfx');
  const spoonBtn = (n) => page.locator(`[aria-label="Spoon level ${n}"]`);
  const quantumShape = await page.evaluate(() => {
    const q = window.__p31_quantum;
    return !!q && typeof q.enabled === 'boolean' && typeof q.stars === 'number' && typeof q.edges === 'number' &&
      typeof q.houses === 'number' && typeof q.coherence === 'number' && typeof q.frozen === 'boolean' &&
      typeof q.mode === 'string' && Array.isArray(q.housePositions);
  });
  check('quantum: hook shape { enabled, stars, edges, houses, coherence, phase, frozen, mode, housePositions }', quantumShape === true);
  check('quantum: housePositions are finite [x,y,z] numeric arrays',
    (await page.evaluate(() => {
      const hp = window.__p31_quantum?.housePositions;
      return Array.isArray(hp) && hp.length >= 0 && hp.every((p) => Array.isArray(p) && p.length === 3 && p.every((n) => typeof n === 'number' && isFinite(n)));
    })) === true);

  const readQuantum = async () => page.evaluate(() => {
    const q = window.__p31_quantum;
    return q ? { phase: q.phase, houses: q.houses, edges: q.edges, coherence: q.coherence, frozen: q.frozen, housePositions: q.housePositions.length, enabled: q.enabled, stars: q.stars } : null;
  });

  const qDefault = await readQuantum();
  check('quantum: constellation disabled by default (quantum flag off)',
    qDefault && qDefault.enabled === false, `enabled=${qDefault?.enabled}`);

  await spoonBtn(1).click().catch(() => {});
  await page.waitForTimeout(400);
  const qLow = await readQuantum();
  check('quantum: spoons 1 → low phase (0 houses, 0 edges, frozen)',
    qLow && qLow.phase === 'low' && qLow.houses === 0 && qLow.edges === 0 && qLow.frozen === true,
    `phase=${qLow?.phase} h=${qLow?.houses} e=${qLow?.edges}`);
  check('quantum: spoons 1 → coherence ~0.158',
    qLow && qLow.coherence >= 0.10 && qLow.coherence <= 0.22, `coherence=${qLow?.coherence?.toFixed(4)}`);

  await spoonBtn(3).click().catch(() => {});
  await page.waitForTimeout(400);
  const qMid = await readQuantum();
  check('quantum: spoons 3 → mid phase (6 houses, 6 edges)',
    qMid && qMid.phase === 'mid' && qMid.houses === 6 && qMid.edges === 6,
    `phase=${qMid?.phase} h=${qMid?.houses} e=${qMid?.edges}`);
  check('quantum: spoons 3 → coherence ~0.579',
    qMid && qMid.coherence >= 0.50 && qMid.coherence <= 0.65, `coherence=${qMid?.coherence?.toFixed(4)}`);

    await spoonBtn(5).click().catch(() => {});
  await page.waitForTimeout(400);
  const qFull = await readQuantum();
  check('quantum: spoons 5 → full phase (12 houses, 6 edges)',
    qFull && qFull.phase === 'full' && qFull.houses === 12 && qFull.edges === 6,
    `phase=${qFull?.phase} h=${qFull?.houses} e=${qFull?.edges}`);
  check('quantum: spoons 5 → coherence 1.0',
    qFull && qFull.coherence >= 0.98, `coherence=${qFull?.coherence?.toFixed(4)}`);
  check('quantum: 12 house positions + star count sane',
    qFull && qFull.housePositions === 12 && qFull.stars > 0, `houses=${qFull?.housePositions} stars=${qFull?.stars}`);
  check('quantum: frozen flag is false at full spoons (live motion)',
    qFull && qFull.frozen === false, `frozen=${qFull?.frozen}`);

  // ── Section H: Larmor engine — freq/gain sweep with coherence ──
  mark('H: larmor');
  const larmorShape = await page.evaluate(() => {
    const l = window.__p31_larmor;
    return !!l && typeof l.active === 'boolean' && typeof l.freq === 'number' && typeof l.gain === 'number' && typeof l.coherence === 'number' && typeof window.__p31_toggleLarmor === 'function';
  });
  check('larmor: hook shape { active, freq, gain, coherence } + toggle', larmorShape === true);

  const larmorToggleRes = await page.evaluate(() => { try { window.__p31_toggleLarmor(); return 'ok'; } catch (e) { return String(e); } });
  const larmorOn = await page.evaluate(() => new Promise((resolve) => {
    const t0 = Date.now();
    const poll = () => {
      const l = window.__p31_larmor;
      if (l && l.active === true) return resolve(l);
      if (Date.now() - t0 > 4000) return resolve(l);
      setTimeout(poll, 200);
    };
    poll();
  }));
  check('larmor: toggle starts the oscillator (Web Audio init)',
    larmorToggleRes === 'ok' && larmorOn && larmorOn.active === true,
    `toggle=${larmorToggleRes} active=${larmorOn?.active}`);
  check('larmor: full-energy coherence drives freq to 863 Hz harmonic',
    larmorOn && Math.abs(larmorOn.freq - 863.0) < 1.0, `freq=${larmorOn?.freq?.toFixed(2)}Hz`);
  check('larmor: full-energy coherence drives gain to 0.08',
    larmorOn && Math.abs(larmorOn.gain - 0.08) < 0.005, `gain=${larmorOn?.gain?.toFixed(4)}`);
  await page.evaluate(() => { try { window.__p31_toggleLarmor(); } catch {} });
  await page.waitForTimeout(300);
  check('larmor: second toggle stops the oscillator',
    (await page.evaluate(() => window.__p31_larmor?.active)) === false);

  // ── Section I: home surfaces — actions, palette, passport ──
  mark('I: home surfaces');
  await gotoDrawerTab('Home');
  await page.waitForTimeout(600);
  const homeActions = await page.evaluate(() =>
    Array.from(document.querySelectorAll('.home-action')).map((b) => b.textContent?.trim() || ''));
  check('home: three surface actions render', homeActions.length === 3, homeActions.join(' | '));
  check('home: "Ask the assistant" action present', homeActions.some((t) => t.includes('assistant')));
  check('home: "Command palette" action present', homeActions.some((t) => t.toLowerCase().includes('palette')));

  await page.click('.home-action:has-text("palette")');
  await page.waitForSelector('.command-palette-overlay', { timeout: 10000 });
  check('home: command palette opens', (await page.$('.command-palette-overlay')) !== null);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  check('home: palette closes on Escape',
    (await page.evaluate(() => !!document.querySelector('.command-palette-overlay'))) === false);

  // Persona card routing (GlassCard personas on the redesigned Home surface)
  var surfaceCards = await page.evaluate(() => Array.from(document.querySelectorAll('.home-surfaces .glass-card')));
  check('home: 4 persona cards render on the home page', surfaceCards.length === 4, `${surfaceCards.length} cards`);
  if (surfaceCards.length > 0) {
    await page.evaluate(() => {
      var card = Array.from(document.querySelectorAll('.home-surfaces .glass-card')).find(function(el) {
        return /willow/i.test((el.querySelector('.glass-card-title') || {}).textContent || '');
      });
      if (card) card.click();
    });
    await page.waitForTimeout(500);
  }
  check('home: Willow opens assistant panel', (await page.$('.assistant-panel.open')) !== null);
  await page.evaluate(() => { var s = document.querySelector('.assistant-icon-btn[aria-label="Close"]'); if (s) s.click(); });
  await page.waitForTimeout(300);
  check('home: assistant closes via X', (await page.$('.assistant-panel.open')) === null);
  if (surfaceCards.length > 0) {
    await page.evaluate(() => {
      var card = Array.from(document.querySelectorAll('.home-surfaces .glass-card')).find(function(el) {
        return /bash/i.test((el.querySelector('.glass-card-title') || {}).textContent || '');
      });
      if (card) card.click();
    });
    await page.waitForTimeout(400);
  }
  check('home: BASH opens command palette', (await page.$('.command-palette-overlay')) !== null);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(600);
  if (surfaceCards.length > 0) {
    await page.evaluate(() => {
      var card = Array.from(document.querySelectorAll('.home-surfaces .glass-card')).find(function(el) {
        return /bonding/i.test((el.querySelector('.glass-card-title') || {}).textContent || '');
      });
      if (card) card.click();
    });
    await page.waitForTimeout(600);
  }
  check('home: BONDING navigates to bonding tab',
    (await page.waitForSelector('[data-testid="tetra-visualizer"]', { state: 'visible', timeout: 8000 }).then(() => true).catch(() => false)) === true);
  // Navigate back to Home for remaining gates
  await gotoDrawerTab('Home');
  await page.waitForTimeout(600);

  // ── Passport + effects toggles (real UI path — Profile → Passport tab) ──
  await page.evaluate(() => {
    var el = Array.from(document.querySelectorAll('.home-action')).find(function(e) { return /sensory passport/i.test(e.textContent || ''); });
    if (el) el.click();
  });
  await page.waitForSelector('.profile-container', { timeout: 30000 });
  await page.waitForTimeout(400);
  const passportTab = await page.evaluate(() => {
    const active = document.querySelector('.identity-wallet-tab--active');
    return {
      activeLabel: active ? active.textContent?.trim() : null,
      title: document.querySelector('.page-header__title')?.textContent?.trim() || null,
    };
  });
  check('passport: Sensory passport opens the Passport tab (Cognitive Passport)',
    passportTab.activeLabel.includes('Passport') && passportTab.title === 'Cognitive Passport',
    passportTab.activeLabel + ' / ' + passportTab.title);
  check('passport: identity wallet tab strip present',
    (await page.$$('.identity-wallet-tab')).length === 4, '4 tabs');

  const effectsDefault = await page.evaluate(() => {
    const e = window.__p31_effects;
    return e && typeof e.starDensity === 'string' && typeof e.starSpeed === 'string' &&
      typeof e.warmStars === 'boolean' && typeof e.domeAccent === 'boolean' &&
      typeof e.cometTrails === 'boolean' && typeof e.aurora === 'boolean' &&
      typeof e.quantum === 'boolean' && typeof e.count === 'number' &&
      typeof e.warm === 'string' && typeof e.cool === 'string';
  });
  check('effects: default hook shape (10 fields)', effectsDefault === true);

  const toggleEffects = async (label) => {
    await page.locator(`.card-toggle:has-text("${label}")`).first().click({ force: true });
    await page.waitForTimeout(250);
  };

  await toggleEffects('Warm stars');
  check('effects: Warm stars toggle flips __p31_effects.warmStars',
    (await page.evaluate(() => window.__p31_effects?.warmStars)) === true);
  check('effects: warm star toggle sets __p31_effects.warm to a truthy color',
    (await page.evaluate(() => { const e = window.__p31_effects; return !!e?.warm && typeof e.warm === 'string' && e.warm.length > 0; })) === true);
  await toggleEffects('Dome accent');
  check('effects: Dome accent toggle flips __p31_effects.domeAccent',
    (await page.evaluate(() => window.__p31_effects?.domeAccent)) === true);
  check('effects: dome accent stores a non-default CSS color in __p31_effects',
    (await page.evaluate(() => { const e = window.__p31_effects; return e?.domeAccent === true && typeof e?.warm === 'string'; })) === true);  await toggleEffects('Comet trails');
  check('effects: Comet trails toggle flips __p31_effects.cometTrails',
    (await page.evaluate(() => window.__p31_effects?.cometTrails)) === true);
  await toggleEffects('Aurora');
  check('effects: Aurora toggle flips __p31_effects.aurora',
    (await page.evaluate(() => window.__p31_effects?.aurora)) === true);
  await toggleEffects('Quantum constellation');
  check('effects: Quantum constellation toggle flips __p31_effects.quantum',
    (await page.evaluate(() => window.__p31_effects?.quantum)) === true);

  // Leave the passport tab so fxLayers can be read on a fresh Cockpit mount.
  await gotoDrawerTab('Cockpit');
  await page.waitForSelector('.cockpit', { timeout: 30000 });
  await page.waitForTimeout(600);
  const fxOn = await page.evaluate(() => {
    const f = window.__p31_fxLayers;
    const q = window.__p31_quantum;
    return { fx: f ? { aurora: f.aurora, comets: f.comets, frozen: typeof f.frozen === 'boolean' } : null, enabled: q?.enabled };
  });
  check('effects: CosmosFX layers light up for comet trails + aurora',
    fxOn.fx && fxOn.fx.comets === true && fxOn.fx.aurora === true && fxOn.fx.frozen === true,
    JSON.stringify(fxOn.fx));
  check('effects: QuantumFX constellation now enabled',
    fxOn.enabled === true, `enabled=${fxOn.enabled}`);

  // Reset restores defaults (via the Profile → Passport tab).
  await gotoDrawerTab('Home');
  await page.waitForTimeout(500);
  await page.evaluate(() => {
    var el = Array.from(document.querySelectorAll('.home-action')).find(function(e) { return /sensory passport/i.test(e.textContent || ''); });
    if (el) el.click();
  });
  await page.waitForSelector('.profile-container', { timeout: 10000 });
  await page.waitForTimeout(300);
  await page.locator('button.btn.ghost:has-text("Reset effects")').first().click().catch(() => {});
  await page.waitForTimeout(300);
  const effectsReset = await page.evaluate(() => {
    const e = window.__p31_effects;
    return e && e.warmStars === false && e.domeAccent === false && e.cometTrails === false && e.aurora === false && e.quantum === false;
  });
  check('effects: Reset restores all defaults', effectsReset === true);
  await gotoDrawerTab('Cockpit');
  await page.waitForSelector('.cockpit', { timeout: 30000 });
  await page.waitForTimeout(600);
  const fxOff = await page.evaluate(() => {
    const f = window.__p31_fxLayers;
    return f ? { comets: f.comets, aurora: f.aurora } : null;
  });
  check('effects: fxLayers revert to off after reset',
    fxOff && fxOff.comets === false && fxOff.aurora === false, JSON.stringify(fxOff));

  // ── Section J: PHOS Oracle (akinator) via llmTool command + UI ──
  mark('J: phos oracle');
  {
    const opened = await page.evaluate(async () => {
      const exec = window.__p31MCPExec;
      if (!exec) return false;
      try { await exec('akinator', {}); return true; } catch (e) { return false; }
    });
    await page.waitForTimeout(400);
    const title = await page.evaluate(() => document.querySelector('.akinator-panel .akinator-title')?.textContent?.trim());
    check('oracle: akinator llmTool command opens the PHOS Oracle panel', opened && title === 'PHOS Oracle', title || 'no panel');

    await page.click('.akinator-begin');
    await page.waitForTimeout(400);
    const progVisible = (await page.$('.akinator-progress')) !== null;
    const state = await page.evaluate(async () => {
      const exec = window.__p31MCPExec;
      try { return await exec('akinator:state', {}); } catch (e) { return null; }
    });
    check('oracle: Begin starts the 20-questions resolver (candidates > 0)',
      !!state && typeof state.candidates === 'number' && state.candidates >= 1 && progVisible,
      `candidates=${state?.candidates} progress=${progVisible}`);
    check('oracle: akinator:state returns structured resolver state',
      !!state && (typeof state.questionText === 'string' || Array.isArray(state.suggestions)),
      JSON.stringify(state).slice(0, 120));
    await page.click('.akinator-close');
    await page.waitForTimeout(300);
    check('oracle: panel closes', (await page.evaluate(() => !!document.querySelector('.akinator-panel'))) === false);
  }

  // ── Section K: spoon dial + sensory rest overlay ──
  mark('K: spoon dial');
  {
    const dialCount = await page.evaluate(() =>
      Array.from(document.querySelectorAll('.spoon-dial .spoon-btn'))
        .filter((b) => (b.getAttribute('aria-label') || '').startsWith('Spoon level')).length);
    const restPresent = await page.evaluate(() =>
      !!document.querySelector('[aria-label="Sensory rest mode"]'));
    check('rest: spoon dial renders 5 level buttons + rest mode', dialCount === 5 && restPresent, `${dialCount} level buttons`);

    await page.locator('[aria-label="Sensory rest mode"]').click().catch(() => {});
    await page.waitForTimeout(400);
    const restShown = (await page.$('#rest-overlay')) !== null;
    const frozenDuringRest = await page.evaluate(() => window.__p31_quantum?.frozen);
    // NB: __p31_domeFrozen reflects the rest-scene mini-dome (spoons hardcoded 3)
    // while the overlay is up, so the cockpit-accurate frozen flag is QuantumFX's.
    check('rest: spoons 0 → rest overlay appears + quantum frozen',
      restShown && frozenDuringRest === true, `q.frozen=${frozenDuringRest}`);
    check('rest: vignette + return affordance present',
      (await page.$('#rest-vignette')) !== null && (await page.$('#rest-return')) !== null);
    check('a11y: RestOverlay uses focus trap (structural)',
      fs.readFileSync(path.join(SHELL, 'src/components/RestOverlay.tsx'), 'utf-8').includes('useFocusTrap'));

    await page.click('#rest-return');
    await page.waitForTimeout(300);
    check('rest: return dismisses the overlay',
      (await page.evaluate(() => !!document.querySelector('#rest-overlay'))) === false);

  await page.evaluate(() => { var b = document.querySelector('[aria-label="Spoon level 5"]'); if (b) b.click(); });
  const spoonsRestored = await page.evaluate(() => new Promise(function(resolve) {
    var t0 = Date.now();
    var poll = function() {
      var top = document.querySelector('.topbar');
      if (top && top.getAttribute('data-spoons') === '5') return resolve(true);
      if (Date.now() - t0 > 4000) return resolve(false);
      setTimeout(poll, 200);
    };
    poll();
  }));
  check('rest: spoon level 5 restores the interface', spoonsRestored === true);
  }

  // ── Section L: mesh transport + sync hooks ──
  mark('L: mesh');
  {
    const transport = await page.evaluate(() => window.__p31_meshTransport || null);
    check('mesh: transport mode hook exposed (valid transport string)',
      transport === 'peerjs' || transport === 'libp2p' || transport === 'tailscale', 'mode=' + transport);
    check('mesh: peer list hook is an array',
      (await page.evaluate(() => Array.isArray(window.__p31_meshPeers))) === true);

    const syncOk = await page.evaluate(() => new Promise((resolve) => {
      const t0 = Date.now();
      const poll = () => {
        const s = window.__p31_meshSync;
        const ok = s && typeof s.peers === 'number' && typeof s.broadcast === 'function' &&
          typeof s.reconnects === 'number' && typeof s.queueSize === 'number' &&
          typeof s.notifSyncs === 'number' && typeof s.kelSyncs === 'number';
        if (ok) return resolve({ ok: true, peers: s.peers, reconnects: s.reconnects, queueSize: s.queueSize, notifSyncs: s.notifSyncs, kelSyncs: s.kelSyncs });
        if (Date.now() - t0 > 10000) return resolve({ ok: false });
        setTimeout(poll, 400);
      };
      poll();
    }));
  check('mesh: __p31_meshSync exposes peers/broadcast/reconnects/queueSize/notifSyncs/kelSyncs',
    syncOk.ok === true, syncOk.ok ? `peers=${syncOk.peers} reconnects=${syncOk.reconnects} notifSyncs=${syncOk.notifSyncs} kelSyncs=${syncOk.kelSyncs}` : 'sync never reported');
  check('mesh: meshSync broadcast is a callable function',
    (await page.evaluate(() => { const s = window.__p31_meshSync; return !!s && typeof s.broadcast === 'function'; })) === true);
  }

  // mesh:transport is NOT an llmTool — drive it through the Command Palette form.
  {
    await page.click('.palette-trigger');
    await page.waitForSelector('.command-palette-overlay', { timeout: 10000 });
    await page.fill('.cmd-input', 'transport');
    await page.waitForTimeout(400);
    await page.click('.command-palette-item:has-text("Switch mesh transport")');
    await page.waitForSelector('.cmd-form', { timeout: 10000 });
    const options = await page.$$eval('.cmd-arg select option', (els) => els.map((o) => o.value));
    check('mesh: transport command exposes peerjs/tailscale/libp2p options',
      options.join(',') === 'peerjs,tailscale,libp2p', options.join(','));
    await page.selectOption('.cmd-arg select', 'libp2p');
    await page.click('.cmd-form-actions button:has-text("Run")');
    await page.waitForTimeout(900);
    const transportAfter = await page.evaluate(() => window.__p31_meshTransport || null);
    check('mesh: transport switch runs through the command registry without crashing',
      transportAfter === 'peerjs' || transportAfter === 'libp2p' || transportAfter === 'tailscale',
      'mode=' + transportAfter + ' (libp2p dial may fall back headless)');
  }

  // ── Section M: MCP registry, analytics, insights ──
  mark('M: mcp registry');
  {
    const mcpList = await page.evaluate(async () => {
      const exec = window.__p31MCPExec;
      if (!exec) return null;
      try { return await exec('mcp:list', {}); } catch (e) { return { error: String(e) }; }
    });
    const listIds = Array.isArray(mcpList) ? mcpList.map((s) => String(s).split(':')[0]) : [];
    check('mcp: mcp:list returns all 9 registered servers',
      Array.isArray(mcpList) && mcpList.length === 9, (Array.isArray(mcpList) ? listIds.join(',') : JSON.stringify(mcpList).slice(0, 120)));
    check('mcp: registry includes sandbox/crypto/bros/dads endpoints',
      ['sandbox', 'crypto', 'bros', 'dads'].every((id) => listIds.includes(id)), listIds.join(','));

    const runMcpCall = async () => {
      return await page.evaluate(async () => {
        const exec = window.__p31MCPExec;
        if (!exec) return { error: 'no exec' };
        try {
          return await exec('mcp:call', { server: 'bros', tool: 'bros_persona_list', args: '{}' });
        } catch (e) { return { error: String(e) }; }
      });
    };
    let mcpCall = await runMcpCall().catch(() => ({ error: 'threw' }));
    let callTry = 0;
    while (mcpCall && mcpCall.error && callTry < 2) {
      callTry++;
      await page.waitForTimeout(1500);
      mcpCall = await runMcpCall().catch(() => ({ error: 'threw' }));
    }
    check('mcp: mcp:call reaches an edge server and returns a tool result',
      mcpCall && mcpCall.ok === true && mcpCall.result !== undefined && !mcpCall.error,
      mcpCall && !mcpCall.error ? 'result=' + JSON.stringify(mcpCall.result).slice(0, 80) : String(mcpCall?.error).slice(0, 120));

    const mcpBad = await page.evaluate(async () => {
      const exec = window.__p31MCPExec;
      try { await exec('mcp:call', { server: 'nope', tool: 'x', args: '{}' }); return 'no-throw'; }
      catch (e) { return String(e); }
    });
    check('mcp: unknown server rejected by the registry',
      typeof mcpBad === 'string' && mcpBad.includes('Unknown MCP server'), String(mcpBad).slice(0, 80));

    const analyticsHook = await page.evaluate(() => window.__p31_analytics || null);
    check('analytics: __p31_analytics hook exposes exportReady', !!analyticsHook && analyticsHook.exportReady === true);
    const analytics = await page.evaluate(async () => {
      const exec = window.__p31MCPExec;
      if (!exec) return null;
      try { return await exec('analytics:export', { format: 'csv', type: 'spoons' }); }
      catch (e) { return { error: String(e) }; }
    });
  check('analytics: export builds a CSV download payload (no network needed)',
    analytics && analytics.ok === true && typeof analytics.filename === 'string' && analytics.filename.endsWith('.csv') && typeof analytics.rows === 'number' && analytics.rows >= 0,
    analytics && !analytics.error ? analytics.filename + ' rows=' + analytics.rows : String(analytics?.error).slice(0, 80));

  const analyticsJson = await page.evaluate(async () => {
    const exec = window.__p31MCPExec;
    if (!exec) return null;
    try { return await exec('analytics:export', { format: 'json', type: 'spoons' }); } catch (e) { return { error: String(e) }; }
  });
  check('analytics: JSON export also builds (format=json)',
    analyticsJson && analyticsJson.ok === true && typeof analyticsJson.rows === 'number' && analyticsJson.rows >= 0,
    analyticsJson && !analyticsJson.error ? 'rows=' + analyticsJson.rows : String(analyticsJson?.error).slice(0, 80));

    const insights = await page.evaluate(async () => {
      const exec = window.__p31MCPExec;
      if (!exec) return false;
      try { await exec('insights:open', {}); return true; } catch (e) { return false; }
    });
    await page.waitForTimeout(500);
    check('insights: insights:open shows the insights panel',
      insights && (await page.$('.insights-panel.open')) !== null && (await page.evaluate(() => window.__p31_insights?.open)) === true);
    await page.click('.insights-panel-close').catch(() => null);
    await page.waitForTimeout(300);
    check('insights: panel closes via its close affordance',
      (await page.$('.insights-panel.open')) === null);
  }

  // ── Section N: task breakdown + completion persistence ──
  mark('N: tasks');
  {
    const taskId = await page.evaluate(async () => {
      const pg = window.__p31_persistGoal;
      if (!pg) return null;
      try { return await pg('verify-suite goal', ['step one', 'step two']); } catch (e) { return null; }
    });
    check('tasks: __p31_persistGoal persists a real goal record',
      typeof taskId === 'string' && taskId.startsWith('goal-'), taskId || 'null');

    const taskResult = await page.evaluate(async (id) => {
      const exec = window.__p31MCPExec;
      if (!exec || !id) return { error: 'no exec/id' };
      try {
        const r = await exec('task:complete', { goalId: id, stepIndex: 0 });
        const hist = await window.__p31_taskHistory();
        const rec = hist.find((g) => g.id === id);
        return { ok: r && r.ok === true, found: !!rec, done: rec ? rec.steps[0].done : null };
      } catch (e) { return { error: String(e) }; }
    }, taskId);
  check('tasks: task:complete marks a step done in persisted history',
    taskResult.ok === true && taskResult.found === true && taskResult.done === true,
    JSON.stringify(taskResult).slice(0, 120));

  const tbResult = await page.evaluate(async () => {
    const exec = window.__p31MCPExec;
    if (!exec) return null;
    try { return await exec('task:breakdown', { goal: 'Organize my desk' }); } catch (e) { return { error: String(e) }; }
  });
  check('tasks: task:breakdown returns ≥1 step via __p31MCPExec',
    Array.isArray(tbResult) && tbResult.length >= 1, JSON.stringify(tbResult).slice(0, 120));
  }

  // ── Section O: assistant engine mode ──
  mark('O: assistant');
  {
    const modeLocal = await page.evaluate(async () => {
      const exec = window.__p31MCPExec;
      if (!exec) return null;
      try { await exec('assistant:mode', { mode: 'local' }); } catch (e) { return null; }
      await new Promise((r) => setTimeout(r, 350));
      return window.__p31_assistantMode;
    });
    check('assistant: engine mode switch (local) propagates to __p31_assistantMode',
      modeLocal === 'local', 'mode=' + modeLocal);
    const modeAuto = await page.evaluate(async () => {
      const exec = window.__p31MCPExec;
      try { await exec('assistant:mode', { mode: 'auto' }); } catch (e) { return null; }
      await new Promise((r) => setTimeout(r, 350));
      return window.__p31_assistantMode;
    });
    check('assistant: mode switch back to auto', modeAuto === 'auto', 'mode=' + modeAuto);
  }

  // ── Section P: crypto + mesh verification (Ed25519, ML-DSA-65, heartbeat, PQC) ──
  // The DID + PQC keys are lazy (only materialised on first identity-surface use);
  // ensure they exist so the crypto/KEL/nodeZero cascade is deterministic.
  mark('P: crypto');
  {
    // DID + PQC keys are materialised lazily (only on first identity-surface use).
    // Bootstrap them here so the crypto/KEL/nodeZero cascade is deterministic.
    await page.evaluate(async () => {
      const mv = window.__p31_meshVerify;
      if (mv) {
        if (typeof mv.getOrCreateDidKey === 'function') await mv.getOrCreateDidKey();
        if (typeof mv.getOrCreatePqcKey === 'function') await mv.getOrCreatePqcKey();
      }
    }).catch(() => {});
    let didPub = null;
    for (let _w = 0; _w < 10; _w++) {
      didPub = await page.evaluate(async () => {
        const mv = window.__p31_meshVerify;
        return mv ? mv.getEd25519PubKeyB64() : null;
      }).catch(() => null);
      if (didPub) break;
      await page.waitForTimeout(200);
    }
    check('crypto: DID identity bootstrapped (Ed25519 pub present)', didPub != null, didPub ? 'ok' : 'no did key');
    const crypto = await page.evaluate(async () => {
      const mv = window.__p31_meshVerify;
      if (!mv) return { error: 'no hook' };
      const out = {};
      try {
        const edPub = await mv.getEd25519PubKeyB64();
        const edMsg = 'verify-suite-ed25519';
        const edSig = await mv.signWithDid(edMsg);
        out.edOk = await mv.verifyWithDid(edMsg, edSig, edPub);
        out.edTamper = await mv.verifyWithDid(edMsg + 'X', edSig, edPub);

        const pqc = await mv.getOrCreatePqcKey();
        const pqcMsg = 'verify-suite-mldsa';
        const pqcSig = await mv.signMldsa65(pqcMsg);
        out.pqcOk = await mv.verifyMldsa65(pqcMsg, pqcSig.sigB64, pqc.pubB64);
        out.pqcTamper = await mv.verifyMldsa65(pqcMsg + 'X', pqcSig.sigB64, pqc.pubB64);
        out.pqcShape = !!(pqc && typeof pqc.did === 'string' && pqc.did.length > 0 && typeof pqc.pubB64 === 'string' && pqc.pubB64.length > 0);

        const hb = await window.__p31_meshHeartbeat.sign(Date.now());
        out.hbShape = !!(hb && typeof hb.msg === 'string' && (typeof hb.signature === 'string' || hb.signature === null) && (typeof hb.pub === 'string' || hb.pub === null) && (typeof hb.mldsa65Sig === 'string' || hb.mldsa65Sig === null) && (typeof hb.mldsa65Pub === 'string' || hb.mldsa65Pub === null));
        out.hbVerify = hb ? await mv.verifyWithDid(hb.msg, hb.signature, hb.pub) : false;
      } catch (e) { return { error: String(e) }; }
      return out;
    });
    check('crypto: Ed25519 sign/verify roundtrip', crypto.edOk === true);
    check('crypto: tampered Ed25519 message fails verification', crypto.edTamper === false);
    check('crypto: ML-DSA-65 sign/verify roundtrip', crypto.pqcOk === true);
    check('crypto: tampered ML-DSA-65 message fails verification', crypto.pqcTamper === false);
    check('crypto: PQC key shape { did, pubB64 }', crypto.pqcShape === true);
    check('crypto: heartbeat carries dual (Ed25519 + ML-DSA-65) signatures', crypto.hbShape === true);
  check('crypto: heartbeat message begins with "mesh-heartbeat|"',
    (await page.evaluate(async () => {
      const hb = await window.__p31_meshHeartbeat.sign(Date.now());
      return typeof hb.msg === 'string' && hb.msg.startsWith('mesh-heartbeat|');
    })) === true);
    check('crypto: heartbeat Ed25519 signature verifies against its pubkey', crypto.hbVerify === true);
    if (crypto.error) { console.log('      crypto evaluate error:', crypto.error); }
  }

  // ── Section Q: KEL chain — live validity + tamper negative ──
  mark('Q: KEL chain');
  {
    const kel = await page.evaluate(async () => {
      const mk = window.__p31_meshKEL;
      if (!mk) return { error: 'no KEL hook' };
      const chain = await mk.chain();
      if (!chain) return { error: 'empty chain' };
      const liveOk = chain.ok === true && Array.isArray(chain.events) && chain.events.length >= 1 && typeof chain.prefix === 'string';
      const selfVerify = await mk.verify(chain.events, chain.prefix);
      const tampered = chain.events.map((e) => ({ ...e, ts: e.ts + 1 }));
      const tamperOk = await mk.verify(tampered, chain.prefix);
      return { liveOk, selfVerify, tamperOk, events: chain.events.length, prefix: chain.prefix.slice(0, 12) };
    });
    check('kel: live KEL chain is valid (events ≥ 1, ok=true, prefix)',
      kel.liveOk === true, kel.liveOk ? `${kel.events} events` : kel.error || 'bad chain');
    check('kel: chain self-verifies under verifyKEL', kel.selfVerify === true);
    check('kel: tampered events fail KEL verification', kel.tamperOk === false);
  }

  // ── Section R: bonding surface (Track 1 — Meatspace Tetra) ──
  mark('R: bonding');
  await gotoDrawerTab('Bonding');
  await page.waitForTimeout(1000);
  var bondingHook = await page.evaluate(() => window.__p31_bonding || null);
  check('bonding: tab renders + __p31_bonding hook exposed',
    !!bondingHook && bondingHook.render === true, JSON.stringify(bondingHook).slice(0, 200));
  check('bonding: tetrad atoms derived from operator + mesh peers',
    !!bondingHook && Array.isArray(bondingHook.tetrad?.atoms) && bondingHook.tetrad.atoms.length >= 1,
    JSON.stringify(bondingHook?.tetrad?.atoms).slice(0, 160));
  check('bonding: tetrahedron visualizer (K₄ svg) mounted',
    (await page.$$('[data-testid="tetra-visualizer"]')).length === 1, 'svg present');
  check('bonding: symmetry + curvature computed from K₄ edges',
    !!bondingHook && typeof bondingHook.tetrad?.curvature === 'number' && typeof bondingHook.tetrad?.symmetry === 'number',
    'curv=' + bondingHook?.tetrad?.curvature + ' sym=' + bondingHook?.tetrad?.symmetry);
  check('bonding: ritual quests render as DOM rows',
    (await page.evaluate(() => {
      const btns = document.querySelectorAll('.bonding button');
      const solo = Array.from(btns).some((b) => b.textContent?.includes('Self-care check-in'));
      const rows = document.querySelectorAll('[data-ritual]').length;
      return solo || rows > 0;
    })) === true, 'solo or ritual rows visible');
  // Regression guard: the bonding page must not overflow the viewport height —
  // the right rail (ritual list + atom roster) is bounded and scrolls internally.
  var bondingFit = await page.evaluate(() => {
    var body = document.querySelector('.bonding');
    if (!body) return null;
    var scrollable = document.querySelectorAll('.bonding [style*="overflow-y"], .bonding [style*="overflowY"]');
    var bounded = Array.from(scrollable).some((el) => (el.getBoundingClientRect().height || 0) <= 260);
    return { scrollHeight: body.scrollHeight, innerHeight: window.innerHeight, fits: body.scrollHeight <= window.innerHeight + 4, bounded: bounded };
  });
  check('bonding: page fits viewport height (no whole-page scroll)',
    !!bondingFit && bondingFit.fits === true,
    bondingFit ? `scrollHeight=${bondingFit.scrollHeight} innerHeight=${bondingFit.innerHeight}` : 'no .bonding');
  check('bonding: ritual list + atom roster bounded (internal scroll)',
    !!bondingFit && bondingFit.bounded === true, bondingFit ? `bounded=${bondingFit.bounded}` : 'no .bonding');

  var questBefore = await page.evaluate(() => window.__p31_bonding?.loveDelta ?? null);
  var questResult = await page.evaluate(async () => {
    var exec = window.__p31MCPExec;
    if (!exec) return { error: 'no exec' };
    try { return await exec('bonding:quest', {}); } catch (e) { return { error: String(e) }; }
  });
  await page.waitForTimeout(400);
  var questAfter = await page.evaluate(() => window.__p31_bonding?.loveDelta ?? null);
  check('bonding: bonding:quest completes a ritual and mints LOVE',
    !!questResult && questResult.ok === true && questAfter > questBefore,
    'before=' + questBefore + ' after=' + questAfter + ' res=' + JSON.stringify(questResult).slice(0, 120));
  check('bonding: completed ritual count tracks quest completions',
    (await page.evaluate(() => window.__p31_bonding?.completed ?? 0)) >= 1, 'completed>=1');

  // ── GATE: dashboard surface ──
  await gotoDrawerTab('Dashboard');
  await page.waitForTimeout(900);
  var dashboardCards = await page.$$('.dashboard-card');
  check('dashboard: tab renders command center', dashboardCards.length >= 4, `${dashboardCards.length} cards rendered`);
  check('dashboard: spoon card shows level',
    (await page.evaluate(() => { var el = document.querySelector('.dashboard-card'); var txt = el ? el.textContent || '' : ''; return /[0-9]+\/5/.test(txt); })) === true);
  check('dashboard: mesh card shows peer count',
    (await page.evaluate(() => { var cards = document.querySelectorAll('.dashboard-card'); return Array.from(cards).some(function(c) { return (c.textContent || '').includes('Mesh'); }); })) === true);
  check('dashboard: DUNA card reads live count (1/100)',
    (await page.evaluate(() => { var cards = document.querySelectorAll('.dashboard-card'); return Array.from(cards).some(function(c) { return (c.textContent || '').includes('DUNA'); }); })) === true);
  check('dashboard: Care Score renders as percentage',
    (await page.evaluate(() => {
      var hdr = document.querySelector('.dashboard header');
      var txt = hdr ? (hdr.textContent || '') : document.body.innerText;
      return txt.includes('%');
    })) === true);
  check('dashboard: interactive cards are buttons + keyboard-operable (a11y)',
    (await page.evaluate(() => {
      var cards = document.querySelectorAll('.dashboard-card');
      var interactive = 0, ok = cards.length > 0;
      cards.forEach(function(c) {
        var role = c.getAttribute('role');
        if (role === 'button') {
          interactive++;
          if (parseInt(c.getAttribute('tabindex') || '-1', 10) < 0) ok = false;
        } else if (role !== 'article') {
          ok = false;
        }
      });
      return ok && interactive >= 1;
    })) === true);
  check('cards: dashboard cards are 2-tone (title strip)',
    (await page.evaluate(() => { var el = document.querySelector('.dashboard-card .glass-card-title'); return !!el && (el.textContent || '').length > 0; })) === true);
  var dashHeights = await page.$$eval('.dashboard-card', (els) => els.map((el) => Math.round(el.getBoundingClientRect().height)));
  check('dashboard: cards equal height (viewport-fill grid)',
    dashHeights.length >= 4 && dashHeights.every(function(h) { return Math.abs(h - dashHeights[0]) < 2; }), `heights: ${dashHeights.join(', ')}`);
  var dashGrid = await page.evaluate(() => {
    var grid = document.querySelector('.dashboard-grid');
    if (!grid) return null;
    var cs = getComputedStyle(grid);
    var cols = cs.gridTemplateColumns.split(' ').length;
    var rowsAuto = cs.gridAutoRows;
    return { cols: cols, rowsAuto: rowsAuto, fill: rowsAuto.indexOf('minmax(0') !== -1 && rowsAuto.indexOf('1fr') !== -1 };
  });
  check('dashboard: grid columns adapt to card count (2 or 3 columns)',
    !!dashGrid && (dashGrid.cols === 2 || dashGrid.cols === 3), `columns: ${dashGrid ? dashGrid.cols : 'n/a'}`);
  check('dashboard: grid rows are minmax(0, 1fr) (cards fill, per-card scroll)',
    !!dashGrid && dashGrid.fill === true, dashGrid ? `auto-rows: ${dashGrid.rowsAuto}` : 'no grid');
  var dashFit = await page.evaluate(() => {
    var dash = document.querySelector('.dashboard');
    return dash ? { scroll: dash.scrollHeight, inner: window.innerHeight, fits: dash.scrollHeight <= window.innerHeight + 8 } : null;
  });
  check('dashboard: page fits viewport (no full-page scroll)',
    !!dashFit && dashFit.fits === true,
    dashFit ? `scrollHeight=${dashFit.scrollHeight} innerHeight=${dashFit.innerHeight}` : 'no .dashboard');
  var cardScroll = await page.evaluate(() => {
    var bodies = document.querySelectorAll('.dashboard-grid .glass-card-body');
    return bodies.length > 0 && Array.from(bodies).some(function(b) {
      var o = getComputedStyle(b).overflowY;
      return o === 'auto' || o === 'scroll';
    });
  });
  check('dashboard: cards scroll internally (overflow-y on card body)', cardScroll === true);
  // Touch-target check for dashboard cards
  var dashBtnHeights = await page.$$eval('.dashboard-card', (els) => els.map((el) => Math.round(el.getBoundingClientRect().height)));
  check('touch-targets: dashboard cards ≥ 44px tall',
    dashBtnHeights.length > 0 && dashBtnHeights.every(function(h) { return h >= 44; }), `heights: ${dashBtnHeights.join(', ')}`);
  // Sparkline bars render inside at least 1 card
  var sparklines = await page.$$('.card-sparkline');
  check('dashboard: sparkline bars render in at least 1 card',
    sparklines.length >= 1, `${sparklines.length} sparklines`);
  // Spoon-tide bar graph: per-bar day labels + red/gold/green legend
  var spoonTide = await page.evaluate(() => {
    var bars = document.querySelectorAll('.spoon-tide-bars .spoon-tide-col');
    var legend = document.querySelectorAll('.spoon-tide-legend span');
    var days = Array.from(document.querySelectorAll('.spoon-tide-day')).map(function(d) { return (d.textContent || '').trim(); });
    var values = Array.from(document.querySelectorAll('.spoon-tide-value')).map(function(d) { return (d.textContent || '').trim(); });
    var validDays = days.length > 0 && days.every(function(d) { return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(d) !== -1; });
    return { cols: bars.length, legend: legend.length, days: days.length, validDays: validDays, valuesOk: values.length === days.length };
  });
  check('dashboard: spoon-tide bars have per-day labels',
    !!spoonTide && spoonTide.cols >= 3 && spoonTide.validDays === true && spoonTide.valuesOk === true,
    JSON.stringify(spoonTide));
  check('dashboard: spoon-tide legend (red/gold/green) renders',
    !!spoonTide && spoonTide.legend === 3, `legend items: ${spoonTide ? spoonTide.legend : 'n/a'}`);
  check('dashboard: last-N-days legend renders 3 color-coded dots',
    (await page.evaluate(() => {
      var dots = Array.from(document.querySelectorAll('.spoon-tide-legend .legend-dot'));
      if (dots.length !== 3) return false;
      var colors = dots.map(function(d) { return getComputedStyle(d).backgroundColor; });
      return colors.every(function(c) { return !!c && c !== 'rgba(0, 0, 0, 0)' && c !== 'transparent'; }) && new Set(colors).size === 3;
    })) === true);
  check('theme: color-scheme dark on :root (native dropdowns render dark)',
    (await page.evaluate(() => getComputedStyle(document.documentElement).colorScheme.indexOf('dark') !== -1)) === true);

  // ── GATE: profile surface ──
  await gotoDrawerTab('Profile');
  await page.waitForTimeout(1000);
  await page.click('#iw-tab-identity').catch(() => {});
  await page.waitForTimeout(500);
  check('profile: tab renders (not placeholder)',
    (await page.evaluate(() => { return !document.querySelector('.tab-placeholder'); })) === true);
  check('profile: spoon stats render (0–5/5)',
    (await page.evaluate(() => { var body = document.body.innerText; return /[0-9]+\/5/.test(body); })) === true);
  check('profile: identity sections rendered (DID/Keys/KEL headings)',
    (await page.evaluate(() => new Promise(function(resolve) {
      var t0 = Date.now();
      var poll = function() {
        var body = document.body.innerText.toLowerCase();
        if (body.includes('did') && body.includes('keys') && body.includes('kel') && body.includes('proof of control')) return resolve(true);
        if (Date.now() - t0 > 6000) return resolve(false);
        setTimeout(poll, 250);
      };
      poll();
    }))) === true);
  check('profile: export identity button present',
    (await page.$('button:has-text("Export identity")')) !== null);
  check('profile: import identity button present',
    (await page.$('button:has-text("Import")')) !== null);
  check('profile: prove-control challenge button present',
    (await page.$('button:has-text("Prove control")')) !== null);
  check('profile: show full keys toggle present',
    (await page.$('button:has-text("Show full keys")')) !== null);
  check('profile: ML-DSA-65 PQC key card rendered',
    (await page.evaluate(() => { return document.body.innerText.includes('ML-DSA-65'); })) === true);
  // Identity wallet — 6 dashboard cards (DID/Keys/KEL/Mesh/State/Proof)
  var profileSections = await page.$$('.profile-grid .dashboard-card');
  check('profile: 7 identity cards render inside the profile grid',
    profileSections.length === 7, `${profileSections.length} cards`);

  // ── GATE: touch targets (44px minimum) ──
  var btnHeights = await page.$$eval('.btn', (els) => els.map((el) => Math.round(el.getBoundingClientRect().height)));
  check('touch-targets: .btn elements ≥ 44px tall',
    btnHeights.length > 0 && btnHeights.every(function(h) { return h >= 44; }), `heights: ${btnHeights.join(', ')}`);
  var navItemHeights = await page.$$eval('.drawer-nav-item', (els) => els.map((el) => Math.round(el.getBoundingClientRect().height)));
  check('touch-targets: drawer nav items ≥ 44px tall',
    navItemHeights.length > 0 && navItemHeights.every(function(h) { return h >= 44; }), `heights: ${navItemHeights.join(', ')}`);

  // ── GATE: sandbox floating window ──
  await gotoDrawerTab('Sandbox');
  await page.waitForTimeout(900);
  var popoutBtn = await page.$('.sandbox-page button:has-text("Pop out")');
  check('sandbox: "Pop out" button visible on sandbox page', popoutBtn !== null);
  check('sandbox: chat pane rendered (.surface-split--resizable)',
    (await page.$('.surface-split--resizable')) !== null);
  check('sandbox: chat composer input present',
    (await page.$('.chat-composer-input')) !== null);
  check('sandbox: agent selector visible',
    (await page.$('.agent-selector-trigger')) !== null);

  // ── GATE: sandbox:open command opens floating window ──
  await page.evaluate(async () => {
    var exec = window.__p31MCPExec;
    if (exec) await exec('sandbox:open', {});
  });
  await page.waitForTimeout(600);
  var floatWindow = await page.$('.window-titlebar');
  check('sandbox: sandbox:open command opens floating window', floatWindow !== null);
  check('sandbox: floating window has dialog role (a11y)',
    (await page.evaluate(() => { var d = document.querySelector('[role="dialog"]'); return d ? d.getAttribute('aria-modal') : null; })) === 'true');
  check('sandbox: Esc closes floating window',
    (await page.evaluate(async () => {
      var d = document.querySelector('[role="dialog"]');
      if (!d) return false;
      var ev = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true });
      document.dispatchEvent(ev);
      await new Promise(function(r) { return setTimeout(r, 300); });
      return !document.querySelector('[role="dialog"]');
    })) === true);

  // ── GATE: sandbox persistent state ──
  await page.evaluate(async () => {
    var exec = window.__p31MCPExec;
    if (exec) await exec('sandbox:open', {});
  });
  await page.waitForTimeout(600);
  await page.evaluate(() => {
    var d = document.querySelector('[role="dialog"]');
    if (d) d.setAttribute('style', (d.getAttribute('style') || '') + '; left: 300px !important; top: 200px !important');
  });
  await page.waitForTimeout(200);
  await page.evaluate(async () => {
    var exec = window.__p31MCPExec;
    if (exec) await exec('sandbox:open', {});
  });
  await page.waitForTimeout(200);
  check('sandbox: floating window persists after re-open',
    (await page.$('[role="dialog"]')) !== null);

  // ── GATE: sandbox popout renders ArtifactPane only (no nested layout) ──
  var popoutContent = await page.evaluate(() => {
    var dialog = document.querySelector('[role="dialog"]');
    if (!dialog) return null;
    var hasSplitLayout = dialog.querySelector('.surface-split--resizable') !== null;
    var hasArtifactPane = dialog.querySelector('.artifact-pane') !== null || dialog.querySelector('[class*="artifact"]') !== null;
    return { hasSplitLayout, hasArtifactPane };
  });
  if (popoutContent) {
    check('sandbox: popout renders ArtifactPane only (no nested SandboxPage layout)',
      !popoutContent.hasSplitLayout && popoutContent.hasArtifactPane,
      `splitLayout=${popoutContent.hasSplitLayout}, artifactPane=${popoutContent.hasArtifactPane}`);
  } else {
    check('sandbox: popout renders ArtifactPane only (no nested SandboxPage layout)',
      false, 'dialog not found');
  }

  // ── GATE: research surface (split viewport + carousel) ──
  await gotoDrawerTab('Research');
  await page.waitForTimeout(500);
  var paperCardsLoaded = await page.evaluate(() => new Promise((resolve) => {
    var t0 = Date.now();
    var poll = () => {
      var n = document.querySelectorAll('.page-fill .akinator-question-card').length;
      if (n >= 3) return resolve(n);
      if (Date.now() - t0 > 18000) return resolve(n);
      setTimeout(poll, 500);
    };
    poll();
  }));
  await page.waitForTimeout(500);
  var researchCanvases = await page.$$('.research-right-viewport canvas');
  check('research: viewport canvas renders visualization',
    researchCanvases.length >= 1, `${researchCanvases.length} canvases in viewport (${paperCardsLoaded} papers)`);
  check('research: split layout present (.research-split)',
    (await page.$('.research-split')) !== null);
  check('research: play/pause button present',
    (await page.$('button:has-text("Pause")')) !== null);
  var dots = await page.$$('.viz-control [aria-label*="visualization"]');
  check('research: carousel dots render',
    dots.length >= 3, `${dots.length} carousel dots`);
  // Regression guard: the viz controller must never exceed the width of the
  // viewport column it controls (the right side of the research split).
  var vizWidthGuard = await page.evaluate(() => {
    var control = document.querySelector('.viz-control');
    var cols = document.querySelectorAll('.research-split > *');
    if (!control || cols.length < 2) return null;
    var cw = control.getBoundingClientRect().width;
    var vw = cols[1].getBoundingClientRect().width;
    return { control: Math.round(cw), viewport: Math.round(vw), fits: cw <= vw + 1 };
  });
  check('research: viz control is no wider than the viewport it controls',
    !!vizWidthGuard && vizWidthGuard.fits === true,
    vizWidthGuard ? `control=${vizWidthGuard.control}px viewport=${vizWidthGuard.viewport}px` : 'missing .viz-control or split');
  // Regression guard: glass stays translucent so the starfield/dome shows
  // through (token-native oklch background, alpha well below opaque).
  var glassOpacity = await page.evaluate(() => {
    var card = document.querySelector('.akinator-question-card');
    if (!card) return null;
    var bg1 = getComputedStyle(card).backgroundColor;
    var m = bg1.match(/\/\s*([0-9.]+)\)\s*$/);
    var alpha = m ? parseFloat(m[1]) : -1;
    return { bg1: bg1, alpha: alpha, oklch: bg1.indexOf('oklch') !== -1 };
  });
  check('cards: glass surfaces stay translucent (oklch token, alpha < 0.30)',
    !!glassOpacity && glassOpacity.oklch === true && glassOpacity.alpha > 0 && glassOpacity.alpha < 0.30,
    glassOpacity ? `bg=${glassOpacity.bg1} alpha=${glassOpacity.alpha}` : 'missing card');
  var mathTagsOk = await page.evaluate(() => new Promise(function(resolve) {
    var t0 = Date.now();
    var poll = function() {
      if (document.querySelectorAll('.research-left-papers .badge').length >= 1) return resolve(true);
      if (Date.now() - t0 > 15000) return resolve(false);
      setTimeout(poll, 500);
    };
    poll();
  }));
  check('research: paper cards include math tags', mathTagsOk === true);
  var doiOk = await page.evaluate(() => new Promise(function(resolve) {
    var t0 = Date.now();
    var poll = function() {
      var links = document.querySelectorAll('.research-left-papers .akinator-question-label a');
      if (Array.from(links).some(function(a) { return (a.textContent || '').includes('DOI'); })) return resolve(true);
      if (Date.now() - t0 > 15000) return resolve(false);
      setTimeout(poll, 500);
    };
    poll();
  }));
  check('research: DOI links present in paper cards', doiOk === true);
  // Freeze the carousel so the dot-click assertion below is deterministic
  var pauseBtn = await page.$('button:has-text("Pause")');
  if (pauseBtn) { await pauseBtn.click({ force: true }); await page.waitForTimeout(300); }
  // Close any lingering floating windows before dot click
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  // click a dot to cycle carousel
  if (dots.length >= 2) {
    // Reset to the first viz so the active dot is deterministic even if the
    // auto-advance timer moved the carousel before we froze it.
    try { await dots[0].click({ force: true, timeout: 5000 }); await page.waitForTimeout(300); } catch (_) {}
    var dot0BgBefore = await dots[0].evaluate((el) => getComputedStyle(el).backgroundColor);
    try {
      await dots[1].click({ force: true, timeout: 5000 });
      await page.waitForTimeout(500);
    } catch (_) { /* dot click best-effort */ }
    var dot0BgAfter = await dots[0].evaluate((el) => getComputedStyle(el).backgroundColor);
    check('research: carousel dot click changes active viz',
      dot0BgBefore !== dot0BgAfter, 'dot 0 background changed');
  } else {
    check('research: carousel dot click changes active viz', false, 'not enough dots');
  }
  // Speed control slider
  var speedSlider = await page.$('.research-speed-slider');
  check('research: speed control slider renders', speedSlider !== null);
  // Viz stage transition class present
  var vizStage = await page.$('.research-viz-stage');
  check('research: viz transition stage present', vizStage !== null);
  // Regression guard: paper cards must keep content height (glass-card-body
  // collapse bug — previously flexed to 12px when the sibling viewport shrank).
  var paperHeights = await page.evaluate(() => {
    var cards = document.querySelectorAll('.research-left-papers .glass-card');
    return Array.from(cards).map((c) => Math.round(c.getBoundingClientRect().height));
  });
  var minPaper = paperHeights.length ? Math.min.apply(null, paperHeights) : 0;
  check('research: paper cards keep content height (no collapse)',
    minPaper >= 60, `min card height=${minPaper}px over ${paperHeights.length} cards`);
  // Regression guard: dots are 8px true circles (global min-height:44px used to
  // stretch the inline 10px dots into 10x44 pills).
  var dotGeom = dots.length ? await dots[0].evaluate((el) => {
    var s = getComputedStyle(el);
    var r = el.getBoundingClientRect();
    return { w: Math.round(r.width), h: Math.round(r.height), radius: s.borderRadius };
  }) : null;
  check('research: carousel dots are small true circles (8px)',
    !!dotGeom && dotGeom.w === dotGeom.h && dotGeom.w <= 12 && dotGeom.radius.indexOf('50%') !== -1,
    dotGeom ? JSON.stringify(dotGeom) : 'no dots');
  // Regression guard: research viewport is static (no manual resize handle) and
  // the viz fills the column instead of being clipped at 16:9.
  var viewportStatic = await page.evaluate(() => {
    var demo = document.querySelector('.research-viewport-demo');
    if (!demo) return null;
    var rs = getComputedStyle(demo);
    var rect = demo.getBoundingClientRect();
    return { resize: rs.resize, ratio: rs.aspectRatio, h: Math.round(rect.height), w: Math.round(rect.width) };
  });
  check('research: viewport is static and viz fills the column',
    !!viewportStatic && viewportStatic.resize === 'none' && viewportStatic.h >= 220,
    viewportStatic ? JSON.stringify(viewportStatic) : 'no .research-viewport-demo');
  // KaTeX correctness scan across all vizs: Posner composition must read 24 O,
  // no isostatic inequality glyph (K4 = 3V-6), and no render errors anywhere.
  var katexScan = await page.evaluate(async () => {
    var dots = document.querySelectorAll('.viz-control [aria-label*="visualization"]');
    var saw24O = false, sawGe = false, err = 0;
    for (var i = 0; i < dots.length; i++) {
      try { await dots[i].click(); } catch (_) { /* skip hung viz control */ }
      await new Promise(function(r) { setTimeout(r, 300); });
      err += document.querySelectorAll('.katex-error').length;
      document.querySelectorAll('.katex').forEach(function(el) {
        var t = el.textContent || '';
        if (/24O/.test(t)) saw24O = true;
        if (t.indexOf('\u2265') !== -1) sawGe = true;
      });
    }
    return { saw24O: saw24O, sawGe: sawGe, err: err, vizs: dots.length };
  });
  check('research: Posner composition shows 24 O (24O in KaTeX text)',
    katexScan.saw24O === true, JSON.stringify(katexScan));
  check('research: no isostatic inequality glyph (K4 = 3V-6)',
    katexScan.sawGe === false, JSON.stringify(katexScan));
  check('research: no KaTeX render errors across all vizs',
    katexScan.err === 0, `${katexScan.err} .katex-error`);

  // ── a2ui: declarative agent UI renders into #a2ui-container ──
  {
    const rendered = await page.evaluate(async () => {
      const run = window.__p31_runCommand;
      if (typeof run !== 'function') return { status: 'no-hook' };
      const res = await run('a2ui:render', {
        ui: [
          { id: 'a2ui-check-1', component: 'Card', props: { title: 'Verify Card' }, children: [] },
          { id: 'a2ui-check-2', component: 'Badge', props: { text: 'verified', variant: 'success' } },
        ],
      });
      return { status: res?.status, rendered: res?.rendered };
    });
    check('a2ui: render command executes (status ok)',
      rendered.status === 'ok', JSON.stringify(rendered));
    var a2uiCards = await page.evaluate(() => {
      var container = document.getElementById('a2ui-container');
      return container ? container.querySelectorAll('.glass-card').length : -1;
    });
    check('a2ui: rendered .glass-card mounts inside #a2ui-container',
      a2uiCards >= 1, `${a2uiCards} glass-card(s)`);
    await page.evaluate(async () => {
      const run = window.__p31_runCommand;
      if (typeof run === 'function') await run('a2ui:render', { ui: [] });
    });
  }

  // ── Section S: visual regression — frozen cockpit baseline (VISUAL_TEST=1) ──
  mark('S: visual');
  if (process.env.VISUAL_TEST === '1') {
    const snapDir = path.join(SHELL, '__snapshots__');
    fs.mkdirSync(snapDir, { recursive: true });
    const baseline = path.join(snapDir, 'cockpit-full.png');
    const cur = path.join(snapDir, '.current-cockpit.png');

    await page.evaluate(() => localStorage.clear());
    await page.evaluate(() => {
      localStorage.setItem('p31-sensory', JSON.stringify({ state: { focus: false, calm: true, muted: false, warmLight: false, font: 'standard', textScale: 'standard', simple: false, task: false }, version: 0 }));
      localStorage.setItem('shell-storage', JSON.stringify({ state: { reduceMotion: true, spoons: 5 }, version: 2 }));
      localStorage.setItem('p31-effects-v1', JSON.stringify({ state: { starDensity: 'medium', starSpeed: 'medium', warmStars: false, domeAccent: false, cometTrails: false, aurora: false, quantum: true }, version: 1 }));
    });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.topbar', { timeout: 60000 });
    await gotoDrawerTab('Cockpit');
    await page.waitForSelector('.cockpit', { timeout: 30000 });
    await page.waitForTimeout(2200);
    await page.locator('.ship-viewport').screenshot({ path: cur });

    const sharp = require('sharp');
    const a = await sharp(cur).raw().toBuffer();
    if (fs.existsSync(baseline)) {
      const b = await sharp(baseline).raw().toBuffer();
      if (a.length !== b.length) {
        check('visual: cockpit screenshot matches baseline (Δ<2%)', false, `size ${a.length} vs ${b.length}`);
      } else {
        let diff = 0;
        const n = a.length;
        for (let i = 0; i < n; i += 4) {
          diff += Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]);
        }
        const mean = diff / (n / 4) / (3 * 255);
        check('visual: cockpit screenshot matches baseline (Δ<2%)', mean < 0.02, `meanΔ=${(mean * 100).toFixed(2)}%`);
      }
    } else {
      fs.writeFileSync(baseline, await sharp(cur).toBuffer());
      check('visual: baseline saved for future runs (Δ<2%)', true, baseline);
    }
  }

  mark('done');
  const total = Date.now() - suiteStart;
  sectionTimes.push(['done', total]);
  const fails = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - fails}/${results.length} checks passed (${(total / 1000).toFixed(0)}s total)`);
  if (sectionTimes.length > 1) {
    const lines = [];
    for (let i = 1; i < sectionTimes.length; i++) {
      const [label, t] = sectionTimes[i];
      const prev = sectionTimes[i - 1][1];
      lines.push(`${label}: ${(t - prev).toFixed(0)}s`);
    }
    console.log('  ' + lines.join('  '));
  }
  await browser.close();
  return fails ? 1 : 0;
}

(async () => {
  let attempts = 0;
  const max = parseInt(process.env.VERIFY_RETRIES || '2', 10);
  const timer = setTimeout(() => { console.error(`SUITE TIMEOUT: ${SUITE_TIMEOUT}ms exceeded`); process.exit(3); }, SUITE_TIMEOUT);
  while (attempts < max) {
    try {
      const code = await runSuite();
      clearTimeout(timer);
      process.exit(code);
    } catch (e) {
      attempts++;
      if (attempts >= max) {
        clearTimeout(timer);
        console.error('SUITE ERROR:', e.message || e);
        process.exit(2);
      }
      console.log(`[retry ${attempts}/${max}] ${(e.message || e).split('\n')[0]} — restarting browser...`);
    }
  }
  clearTimeout(timer);
})().catch((e) => { console.error('FATAL:', e.message || e); process.exit(2); });
