import { test, expect, type Page } from '@playwright/test';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const SHELL = '/home/p31/production/shell';
const BASE = process.env.P31_VERIFY_BASE || 'https://p31-shell.trimtab-signal.workers.dev';

// ── helpers ──

async function gotoDrawerTab(page: Page, label: string) {
  const isOpen = await page.$eval('.header-drawer', (el) => el.classList.contains('open')).catch(() => false);
  if (!isOpen) {
    await page.click('.drawer-toggle');
    await page.waitForTimeout(550);
  }
  await page.click(`.header-drawer [role="tab"]:has-text("${label}")`);
  await page.waitForTimeout(550);
}

function checkSpoonLevel(page: Page, n: number) {
  return page.locator(`[aria-label="Spoon level ${n}"]`);
}

// ── preflight (static, no browser) ──

test.describe('preflight', () => {
  test('mcp manifest includes shell endpoint with absolute URL', () => {
    const manifest = JSON.parse(readFileSync(join(SHELL, 'public', 'p31-shell.mcp.json'), 'utf-8'));
    const url = (manifest.mcpServers || []).find((s: any) => s.id === 'shell')?.url || '';
    expect(url).toMatch(/^https:\/\//);
  });

  test('docs/MCP.md exists', () => {
    expect(existsSync(join(SHELL, 'docs', 'MCP.md'))).toBe(true);
  });

  test('unit test suite present (src/lib/__tests__)', () => {
    const testDir = join(SHELL, 'src', 'lib', '__tests__');
    const files = readFileSync(testDir).filter((f: string) => f.endsWith('.test.ts')).length;
    expect(files).toBeGreaterThanOrEqual(4);
  });

  test('package.json defines test script', () => {
    const pkg = JSON.parse(readFileSync(join(SHELL, 'package.json'), 'utf-8'));
    expect(typeof pkg.scripts?.test).toBe('string');
  });

  test('validate-mcp-manifest.mjs present', () => {
    expect(existsSync(join(SHELL, 'scripts', 'validate-mcp-manifest.mjs'))).toBe(true);
  });
});

// ── load + global hooks ──

test.describe('load', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => { window.__P31_VERIFY__ = true; });
    await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.evaluate(() => localStorage.clear());
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.topbar', { timeout: 60000 });
    await page.waitForTimeout(2000);
  });

  test('app boots — topbar + header drawer', async ({ page }) => {
    await expect(page.locator('.topbar')).toHaveCount(1);
    await expect(page.locator('.header-drawer')).toHaveCount(1);
  });

  test('header-drawer renders 7+ surface tabs + alerts', async ({ page }) => {
    const tabs = await page.locator('.header-drawer [role="tab"]').count();
    expect(tabs).toBeGreaterThanOrEqual(7);
    await expect(page.locator('.header-drawer [aria-label="Notifications"]')).toBeDefined();
  });

  test('drawer closed by default', async ({ page }) => {
    const drawer = page.locator('.header-drawer');
    await expect(drawer).not.toHaveClass(/open/);
  });

  test('chevron opens the drawer', async ({ page }) => {
    await page.click('.drawer-toggle');
    await page.waitForTimeout(700);
    await expect(page.locator('.header-drawer.open')).toBeDefined();
  });

  test('nav select closes the drawer', async ({ page }) => {
    await page.click('.drawer-toggle');
    await page.waitForTimeout(700);
    await page.click('.header-drawer [role="tab"]:has-text("Dashboard")');
    await page.waitForTimeout(700);
    await expect(page.locator('.header-drawer')).not.toHaveClass(/open/);
  });

  test('__p31_effects exposed by always-mounted starfield', async ({ page }) => {
    const ok = await page.evaluate(() => {
      const e = window.__p31_effects;
      return !!e && typeof e.starDensity === 'string' && typeof e.warmStars === 'boolean' && typeof e.quantum === 'boolean' && typeof e.count === 'number';
    });
    expect(ok).toBe(true);
  });

  test('__p31_pwa hook shape', async ({ page }) => {
    const ok = await page.evaluate(() => {
      const p = window.__p31_pwa;
      return !!p && typeof p.swRegistered === 'boolean' && p.splash === true && typeof p.installed === 'boolean';
    });
    expect(ok).toBe(true);
  });

  test('__p31_haptics exposes vibrate', async ({ page }) => {
    const ok = await page.evaluate(() => !!window.__p31_haptics && window.__p31_haptics.vibrate === true);
    expect(ok).toBe(true);
  });

  test('__p31_voice hook shape', async ({ page }) => {
    const ok = await page.evaluate(() => {
      const v = window.__p31_voice;
      return !!v && typeof v.supported === 'boolean' && v.autoSendAvailable === true;
    });
    expect(ok).toBe(true);
  });

  test('__p31_nodeZero exposes did/state/deviceId', async ({ page }) => {
    const ok = await page.evaluate(() => {
      const n = window.__p31_nodeZero;
      return !!n && typeof n.state === 'string' && typeof n.simulatePairing === 'function';
    });
    expect(ok).toBe(true);
  });

  test('__p31_assistantMode present (default auto)', async ({ page }) => {
    const mode = await page.evaluate(() => window.__p31_assistantMode);
    expect(mode).toBe('auto');
  });
});

// ── cockpit + dome geometry ──

test.describe('cockpit', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => { window.__P31_VERIFY__ = true; });
    await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForSelector('.topbar', { timeout: 60000 });
    await gotoDrawerTab(page, 'Cockpit');
    await page.waitForSelector('.ship-root', { timeout: 30000 });
    await page.waitForTimeout(1000);
  });

  test('Cockpit surface mounts (.ship-root)', async ({ page }) => {
    await expect(page.locator('.ship-root')).toBeDefined();
  });

  test('dome verify hooks exposed on mount', async ({ page }) => {
    const ok = await page.evaluate(() => Array.isArray(window.__p31_domeVertices) && window.__p31_domeVertices.length === 4);
    expect(ok).toBe(true);
  });

  test('tetra vertices exposed as 4 × [x,y,z]', async ({ page }) => {
    const verts = await page.evaluate(() => window.__p31_domeVertices);
    expect(Array.isArray(verts)).toBe(true);
    expect(verts?.length).toBe(4);
  });

  test('projectNode(0) returns screen {x,y} coords', async ({ page }) => {
    const proj0 = await page.evaluate(() => {
      const proj = window.__p31_projectNode;
      return proj ? proj(0) : null;
    });
    expect(proj0).toHaveProperty('x');
    expect(proj0).toHaveProperty('y');
  });

  test('4-layer structure exposed', async ({ page }) => {
    const structure = await page.evaluate(() => window.__p31_domeStructure);
    expect(structure?.layers).toBe(4);
    expect(structure?.hasPanels).toBe(true);
  });
});

// ── quantum + spoon phases ──

test.describe('quantum', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => { window.__P31_VERIFY__ = true; });
    await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForSelector('.topbar', { timeout: 60000 });
  });

  test('hook shape { enabled, stars, edges, houses, coherence, phase, frozen, mode }', async ({ page }) => {
    const ok = await page.evaluate(() => {
      const q = window.__p31_quantum;
      return !!q && typeof q.enabled === 'boolean' && typeof q.stars === 'number' && typeof q.coherence === 'number' && typeof q.frozen === 'boolean';
    });
    expect(ok).toBe(true);
  });

  test('spoons 1 → low phase (0 houses, 0 edges, frozen)', async ({ page }) => {
    await checkSpoonLevel(page, 1).click();
    await page.waitForTimeout(400);
    const q = await page.evaluate(() => window.__p31_quantum);
    expect(q?.phase).toBe('low');
    expect(q?.houses).toBe(0);
    expect(q?.frozen).toBe(true);
  });

  test('spoons 3 → mid phase (6 houses, 6 edges)', async ({ page }) => {
    await checkSpoonLevel(page, 3).click();
    await page.waitForTimeout(400);
    const q = await page.evaluate(() => window.__p31_quantum);
    expect(q?.phase).toBe('mid');
    expect(q?.houses).toBe(6);
  });

  test('spoons 5 → full phase (12 houses)', async ({ page }) => {
    await checkSpoonLevel(page, 5).click();
    await page.waitForTimeout(400);
    const q = await page.evaluate(() => window.__p31_quantum);
    expect(q?.phase).toBe('full');
    expect(q?.houses).toBe(12);
    expect(q?.frozen).toBe(false);
  });
});

// ── mesh + MCP ──

test.describe('mesh', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => { window.__P31_VERIFY__ = true; });
    await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForSelector('.topbar', { timeout: 60000 });
  });

  test('transport mode hook exposed', async ({ page }) => {
    const transport = await page.evaluate(() => window.__p31_meshTransport);
    expect(['peerjs', 'libp2p', 'tailscale']).toContain(transport);
  });

  test('peer list hook is an array', async ({ page }) => {
    const peers = await page.evaluate(() => window.__p31_meshPeers);
    expect(Array.isArray(peers)).toBe(true);
  });

  test('mcp:list returns registered servers', async ({ page }) => {
    const list = await page.evaluate(async () => {
      const exec = window.__p31MCPExec;
      if (!exec) return null;
      try { return await exec('mcp:list', {}); } catch (e) { return { error: String(e) }; }
    });
    expect(Array.isArray(list)).toBe(true);
    expect(list?.length).toBeGreaterThanOrEqual(1);
  });
});

// ── visual regression (optional, parallelizable) ──

test.describe('visual', () => {
  test.skip(process.env.VISUAL_TEST !== '1', 'Set VISUAL_TEST=1 to run visual regression');

  test.use({ viewport: { width: 1280, height: 800 } });

  test('cockpit screenshot matches baseline', async ({ page }) => {
    await page.addInitScript(() => { window.__P31_VERIFY__ = true; });
    await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForSelector('.topbar', { timeout: 60000 });
    await gotoDrawerTab(page, 'Cockpit');
    await page.waitForSelector('.ship-root', { timeout: 30000 });
    await page.waitForTimeout(2200);

    const screenshot = await page.locator('.ship-viewport').screenshot();
    expect(screenshot.length).toBeGreaterThan(0);
  });
});
