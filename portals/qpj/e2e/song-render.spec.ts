/**
 * QPJ — song iframe end-to-end (integration).
 *
 * Guards the two contracts of the street-song:
 *
 *   1. The FRAME CONTRACT: the instrument iframe keeps its sandbox
 *      ("allow-scripts allow-same-origin" — the collaboration boundary, never
 *      removed), loads EAGERLY (loading="lazy" pauses requestAnimationFrame in
 *      a hidden frame and is why the instrument's canvas used to stay blank),
 *      and the collaborative live line renders.
 *
 *   2. The RENDER CONTRACT: the instrument's canvases end up at real size and
 *      non-blank. The signal is exact — before the ResizeObserver fix the
 *      WebGL drawing buffer stayed 0×0 forever (nothing re-sized it after the
 *      just-mounted iframe laid out) and the 2D starfield canvas never built.
 *
 * This runs ONLY against a host that serves the real instrument at /song.html:
 *   SONG_E2E_URL=https://qpj.p31ca.org pnpm exec playwright test e2e/song-render.spec.ts --workers=1 --retries=2
 * The local vite dev server cannot host it — its SPA fallback serves QPJ's own
 * index.html into the sandboxed frame, a same-origin self-embed that crashes
 * the shared renderer process. Use the deployed origin or `wrangler pages dev`.
 * Against the deployed origin, run SINGLE-WORKER: parallel headless instances
 * each open their own PeerJS mesh + WebGL context in the same renderer family
 * and intermittently stall each other.
 */
import { test, expect } from '@playwright/test';

const base = process.env.SONG_E2E_URL ?? 'http://localhost:5193';

test.describe('street-song iframe', () => {
  test.skip(!process.env.SONG_E2E_URL, 'set SONG_E2E_URL to a host serving the real instrument');

  async function gotoSong(page: import('@playwright/test').Page) {
    await page.goto(`${base}/#/song`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('the street-song')).toBeVisible();
  }

  test('the song iframe keeps its sandbox, loads eagerly, and shows the live line', async ({ page }) => {
    await gotoSong(page);

    const frame = page.locator('iframe[title="the spatial music maker"]');
    await expect(frame).toBeVisible();

    // The sandbox is the collaboration boundary — never removed.
    await expect(frame).toHaveAttribute('sandbox', 'allow-scripts allow-same-origin');
    // Eager: loading="lazy" pauses requestAnimationFrame in hidden frames.
    expect(await frame.getAttribute('loading')).toBeNull();
    await expect(frame).toHaveAttribute('referrerpolicy', 'no-referrer');
    await expect(frame).toHaveAttribute('src', '/song.html');

    // The collaborative live line renders (fed by the bridge).
    await expect(page.locator('.song__live')).toBeVisible();
  });

  test('the instrument canvases render at real size and are not blank', async ({ page }) => {
    await gotoSong(page);

    const frameLocator = page.frameLocator('iframe[title="the spatial music maker"]');
    const shell = frameLocator.locator('.mm-shell');
    await expect(shell).toBeVisible({ timeout: 20_000 });

    const state = await frameLocator.locator('canvas.spatial-canvas').evaluate((scene) => {
      const el = scene as HTMLCanvasElement;
      const gl = el.getContext('webgl2') ?? el.getContext('webgl');
      const bg = document.querySelector<HTMLCanvasElement>('.starfield-bg canvas');
      return {
        sceneRect: [el.getBoundingClientRect().width, el.getBoundingClientRect().height],
        sceneBuffer: gl ? [gl.drawingBufferWidth, gl.drawingBufferHeight] : [0, 0],
        starfieldWidth: bg ? bg.width : 0,
      };
    });

    // The 0×0-forever regression: real layout size AND a real drawing buffer.
    expect(state.sceneRect[0]).toBeGreaterThan(0);
    expect(state.sceneRect[1]).toBeGreaterThan(0);
    expect(state.sceneBuffer[0]).toBeGreaterThan(0);
    expect(state.sceneBuffer[1]).toBeGreaterThan(0);
    // The 2D starfield rebuilt once the iframe laid out (was 0 before the fix).
    expect(state.starfieldWidth).toBeGreaterThan(0);

    // Non-blank: the 2D starfield canvas actually painted stars. Deterministic —
// it reads pixels from the frame's own same-origin 2D canvas (no compositor
// screenshot, which stalls headless Chromium on WebGL/font waits). Non-zero
// alpha anywhere means visible content, not a blank frame.
const painted = await frameLocator.locator('.starfield-bg canvas').evaluate((el) => {
  const c = el as HTMLCanvasElement;
  const ctx = c.getContext('2d');
  if (!ctx || c.width === 0 || c.height === 0) return 0;
  const d = ctx.getImageData(0, 0, c.width, c.height).data;
  let paintedPixels = 0;
  for (let i = 0; i < d.length; i += 4 * 8) {
    if (d[i + 3] > 0) paintedPixels += 1;
  }
  return paintedPixels;
});
expect(painted).toBeGreaterThan(0);
  });
});