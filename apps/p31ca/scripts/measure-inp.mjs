#!/usr/bin/env node
/**
 * measure-inp.mjs — p31ca INP lab-proxy measurement harness.
 *
 * Measurement only. No page/component changes, no build, no deploy.
 *
 * WHY A ZERO-DEP COLLECTOR
 * ------------------------
 * `web-vitals` is NOT present in apps/p31ca/node_modules (verified 2026-10-13:
 * no web-vitals package, no onINP export anywhere in the pnpm store for this
 * app). We do NOT install anything. Instead we register a browser-side
 * PerformanceObserver for `event` entries (durationThreshold: 16, buffered)
 * over the INP candidate event types — pointerdown, pointerup, click,
 * keydown, keyup — plus a `longtask` observer.
 *
 * HONESTY RAILS (read these before trusting any number)
 * -----------------------------------------------------
 * 1. This is a LAB PROXY, not INP. Real INP is a field metric (CrUX /
 *    web-vitals RUM): the page-load-global 98th percentile of interaction
 *    latency across real users and devices. This harness measures one
 *    headless Desktop Chrome, ~1x CPU, over scripted interactions.
 * 2. The p31ca homepage keeps WebGL islands (Starfield + MolecularHeart)
 *    animating continuously. In headless Chromium these render on the
 *    SOFTWARE rasterizer, which turns ambient animation into long tasks that
 *    are NOT present (or far smaller) on a field GPU. Event `duration`
 *    spans input → next paint, so an ambient software-render stall inflates
 *    every measured latency. The harness therefore also records an
 *    AMBIENT BASELINE window (no interaction) so the inflation floor is
 *    visible next to the interaction numbers.
 * 3. Per-interaction latency here is approximated as:
 *      - entries grouped by Chrome `interactionId` when present:
 *        latency = max(entry.duration) over the group, extended for
 *        pointerdown→pointerup by (up.startTime + up.duration − down.startTime)
 *      - heuristic pairing when interactionId is absent: keydown→keyup within
 *        300 ms and pointerdown→pointerup within 1000 ms are paired as one
 *        interaction with latency = max(a.duration, b.duration,
 *        b.startTime + b.duration − a.startTime).
 *    `entry.duration` for these discrete events already spans dispatch through
 *    the next paint in Chromium, which is the INP-relevant span. There is NO
 *    attribution weighting, no 98th-percentile-over-session, no next-paint
 *    estimation for pointerdown — this approximates, it does not replicate.
 * 4. Sub-16 ms events are invisible to `event` observers (Chromium only
 *    reports slow ones, by design). If a run observes nothing, we say so:
 *    "no-lab-events". Field data remains the authoritative INP source.
 * 5. Measurement windows are TIGHT around the interaction: setup and settle
 *    waits run OUTSIDE the window. A short 100 ms grace before window close
 *    lets the event-observer callback deliver the final entry (callbacks can
 *    lag behind on a contended main thread).
 *
 * Verdict thresholds (per-surface p75 across N runs):
 *   p75 ≤ 150 ms  → headroom-pass
 *   150 < p75 ≤ 200 ms → monitor
 *   p75 > 200 ms  → fix (candidate for scheduler.yield() treatment)
 */

import path from "node:path";
import { fileURLToPath } from "node:url";

export const HUB_URL = "https://p31ca.org/";
export const MARKETPLACE_URL = "https://p31-portal-mcp-marketplace.pages.dev";

/* ------------------------------------------------------------------ *
 * 1. The browser-side collector (injected via page.addInitScript)     *
 * ------------------------------------------------------------------ */
export const INP_COLLECTOR = String.raw`
(() => {
  if (window.__p31Inp) return;
  var CANDIDATES = { pointerdown: 1, pointerup: 1, click: 1, keydown: 1, keyup: 1 };
  var entries = [];
  var longtasks = [];
  var win = null;
  var results = [];

  function onEvents(list) {
    var l = list.getEntries();
    for (var i = 0; i < l.length; i++) {
      var e = l[i];
      if (!CANDIDATES[e.name]) continue;
      entries.push({
        type: e.name,
        startTime: e.startTime,
        duration: e.duration,
        processingStart: e.processingStart,
        processingEnd: e.processingEnd,
        interactionId: e.interactionId || 0,
        tag: (e.target && e.target.tagName) || ""
      });
    }
  }
  try { new PerformanceObserver(onEvents).observe({ type: "event", durationThreshold: 16, buffered: true }); } catch (err) {}
  try {
    new PerformanceObserver(function (list) {
      var l = list.getEntries();
      for (var i = 0; i < l.length; i++) longtasks.push({ startTime: l[i].startTime, duration: l[i].duration });
    }).observe({ type: "longtask", buffered: true });
  } catch (err) {}

  function latenciesFor(slice) {
    var byId = new Map();
    var noId = [];
    for (var i = 0; i < slice.length; i++) {
      var e = slice[i];
      if (e.interactionId) {
        if (!byId.has(e.interactionId)) byId.set(e.interactionId, []);
        byId.get(e.interactionId).push(e);
      } else noId.push(e);
    }
    var out = [];
    byId.forEach(function (group) {
      group.sort(function (a, b) { return a.startTime - b.startTime; });
      var latency = 0;
      var down = null, up = null;
      for (var g = 0; g < group.length; g++) {
        if (group[g].duration > latency) latency = group[g].duration;
        if (group[g].type === "pointerdown") down = group[g];
        if (group[g].type === "pointerup") up = group[g];
      }
      if (down && up) latency = Math.max(latency, up.startTime + up.duration - down.startTime);
      out.push(latency);
    });
    var used = {};
    for (var a = 0; a < noId.length; a++) {
      if (used[a]) continue;
      var first = noId[a];
      var best = -1;
      for (var b = a + 1; b < noId.length; b++) {
        if (used[b]) continue;
        var second = noId[b];
        var paired = (first.type === "keydown" && second.type === "keyup") ||
                     (first.type === "pointerdown" && second.type === "pointerup");
        if (!paired) continue;
        var gap = second.startTime - first.startTime;
        var maxGap = first.type === "keydown" ? 300 : 1000;
        if (gap > 0 && gap <= maxGap) { best = b; break; }
      }
      if (best >= 0) {
        var mate = noId[best];
        used[a] = 1; used[best] = 1;
        out.push(Math.max(first.duration, mate.duration, mate.startTime + mate.duration - first.startTime));
      } else {
        out.push(first.duration);
      }
    }
    return out;
  }

  function p75(arr) {
    if (!arr.length) return 0;
    var s = arr.slice().sort(function (x, y) { return x - y; });
    return s[Math.ceil(s.length * 0.75) - 1];
  }

  window.__p31Inp = {
    begin: function (label) {
      win = { label: label, t0: performance.now(), i0: entries.length };
    },
    end: function () {
      if (!win) return null;
      var t1 = performance.now();
      var slice = [];
      for (var i = win.i0; i < entries.length; i++) {
        var e = entries[i];
        if (e.startTime >= win.t0 && e.startTime <= t1) slice.push(e);
      }
      var lats = latenciesFor(slice);
      var longs = [];
      for (var j = 0; j < longtasks.length; j++) {
        if (longtasks[j].startTime >= win.t0 && longtasks[j].startTime <= t1) longs.push(longtasks[j]);
      }
      var min = 0, max = 0, mean = 0, ltMax = 0;
      if (lats.length) {
        min = lats[0]; max = lats[0];
        var sum = 0;
        for (var k = 0; k < lats.length; k++) {
          if (lats[k] < min) min = lats[k];
          if (lats[k] > max) max = lats[k];
          sum += lats[k];
        }
        mean = Math.round((sum / lats.length) * 100) / 100;
      }
      for (var m = 0; m < longs.length; m++) {
        if (longs[m].duration > ltMax) ltMax = longs[m].duration;
      }
      var res = {
        label: win.label,
        rawEvents: slice.length,
        latencies: lats,
        n: lats.length,
        min: Math.round(min * 100) / 100,
        max: Math.round(max * 100) / 100,
        mean: mean,
        p75: Math.round(p75(lats) * 100) / 100,
        longtaskCount: longs.length,
        longtaskMax: Math.round(ltMax * 100) / 100
      };
      results.push(res);
      win = null;
      return res;
    },
    results: function () { return results.slice(); },
    reset: function () { entries.length = 0; longtasks.length = 0; results.length = 0; win = null; }
  };
})();
`;

/* ------------------------------------------------------------------ *
 * 2. Aggregation + thresholds                                         *
 * ------------------------------------------------------------------ */
export function p75Of(values) {
  if (!values.length) return 0;
  const s = [...values].sort((a, b) => a - b);
  return s[Math.ceil(s.length * 0.75) - 1];
}

export function classify(p75Ms) {
  if (p75Ms <= 150) return "headroom-pass";
  if (p75Ms <= 200) return "monitor";
  return "fix";
}

export const THRESHOLDS = {
  headroomMaxMs: 150,
  monitorMaxMs: 200,
  note:
    "≤150 ms headroom-pass · 150–200 ms monitor · >200 ms fix. Lab proxy — see honesty rails.",
};

/* ------------------------------------------------------------------ *
 * 3. Collector plumbing (page-level)                                  *
 * ------------------------------------------------------------------ */
export async function injectCollector(page) {
  await page.addInitScript({ content: INP_COLLECTOR });
}

export async function beginWindow(page, label) {
  await page.evaluate((l) => window.__p31Inp.begin(l), label);
}

export async function endWindow(page) {
  return page.evaluate(() => window.__p31Inp.end());
}

/**
 * Runs `fn` inside a labeled measurement window; always closes the window.
 * `graceMs` (default 100) is waited AFTER `fn` and BEFORE end() so the event
 * observer's callback has time to deliver the final entry on a contended
 * main thread. Setup/settle waits deliberately live OUTSIDE this window.
 */
export async function collect(page, label, fn, graceMs = 100) {
  await beginWindow(page, label);
  let error = null;
  try {
    await fn();
  } catch (e) {
    error = String((e && e.message) || e).slice(0, 160);
  }
  try {
    await page.waitForTimeout(graceMs);
  } catch {
    /* page may be mid-navigation; end() will report it */
  }
  let result = null;
  try {
    result = await endWindow(page);
  } catch (e) {
    if (!error) error = "endWindow: " + String((e && e.message) || e).slice(0, 160);
  }
  return { result, error };
}

/** Ambient baseline — a window with NO interaction (software-render floor). */
export async function measureAmbient(page, label, ms = 2000) {
  await beginWindow(page, label);
  await page.waitForTimeout(ms);
  return endWindow(page);
}

/* ------------------------------------------------------------------ *
 * 4. Surface drivers (live-site interactions, selectors verified      *
 *    against the production build on 2026-10-13)                       *
 * ------------------------------------------------------------------ */
export async function gotoHub(page) {
  await page.goto(HUB_URL, { waitUntil: "domcontentloaded", timeout: 90_000 });
  await page.waitForTimeout(2000); // island hydration
}

/** CommandPalette — open via ⌘K (Ctrl+K); type 5 chars; Escape. */
export async function driveCommandPalette(page) {
  await page.keyboard.press("Control+K");
  await page.waitForSelector(".command-panel__input", { state: "visible", timeout: 10_000 });
  await page.waitForTimeout(100); // rAF focus after open
  await page.keyboard.type("paper", { delay: 40 }); // 5 chars
  await page.keyboard.press("Escape");
}

/** LedController setup — panel open (chip click). */
export async function setupLedPanel(page) {
  const isOpen = await page.locator(".devpanel").count();
  if (isOpen) return;
  const chip = page.locator('button[aria-label="Open control instrument"]');
  await chip.waitFor({ state: "visible", timeout: 15_000 });
  await chip.click();
  await page.waitForTimeout(400);
}

/** LedController — drag the BRI knob with mouse steps. */
export async function driveLedKnob(page) {
  const dial = page.locator('[role="slider"][aria-label="BRI"]');
  await dial.waitFor({ state: "visible", timeout: 10_000 });
  const box = await dial.boundingBox();
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  for (const dy of [3, 6, 4, 2]) {
    await page.mouse.move(cx, cy - dy, { steps: 2 });
    await page.waitForTimeout(16);
  }
  await page.mouse.up();
}

/** LedController — preset apply click (full store batch write + re-render). */
export async function driveLedPreset(page) {
  await page.locator(".devpanel__preset", { hasText: "Rainbow" }).click();
}

/** JourneyNav — toggle open (measured); close happens outside the window. */
export async function driveJourneyToggle(page) {
  await page.getByRole("button", { name: /Journey/ }).click();
  await page.locator("#journey-menu").waitFor({ state: "visible", timeout: 10_000 });
}

/** JourneyNav settle — Escape closes the menu (topbar handler). */
export async function settleJourneyClose(page) {
  await page.keyboard.press("Escape");
  await page.locator("#journey-menu").waitFor({ state: "hidden", timeout: 5_000 });
}

/**
 * JourneyNav — select an item. Chooses the "Marketplace" product entry
 * (target=_blank) so the main page does NOT navigate: the measurement window
 * stays in the same document and the popup is closed right after.
 */
export async function driveJourneySelect(page) {
  const popupPromise = page
    .context()
    .waitForEvent("page", { timeout: 4_000 })
    .catch(() => null);
  await page.locator("#journey-menu a", { hasText: "Marketplace" }).first().click();
  const popup = await popupPromise;
  if (popup) await popup.close().catch(() => {});
}

/** Topbar spoons setup — open the overflow menu (outside the window). */
export async function setupSpoonsMenu(page) {
  await page.locator('button[aria-label="More"]').click();
  await page.waitForTimeout(300); // overflow menu opens via yieldToMain
}

/** Topbar spoons — the level-change click itself (measured). */
export async function driveSpoons(page, level = 2) {
  await page
    .locator(`.posner-spoons [role="radio"][aria-label="Spoon ${level}"]`)
    .click();
}

/** Topbar spoons settle — close the overflow menu. */
export async function settleSpoonsClose(page) {
  await page.keyboard.press("Escape");
  await page.waitForTimeout(150);
}

/** Theme toggle — click the brand mark to cycle the whole-page token swap. */
export async function driveThemeCycle(page) {
  await page.locator("button.posner-brand").click();
}

/** Marketplace playground — navigate + pick server (outside windows). */
export async function prepareMarketplace(page) {
  await page.goto(MARKETPLACE_URL, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.waitForTimeout(2000);
  await page.locator("button.surface-card", { hasText: "Try a tool" }).first().click({ timeout: 10_000 });
  await page.waitForTimeout(1000);
  // The server list is fetched dynamically and grows as the registry
  // responds. Wait until it is substantial before selecting, or the SPA can
  // re-render over the selection.
  await page
    .locator('select[aria-label="Pick a server"] option')
    .nth(9)
    .waitFor({ state: "attached", timeout: 20_000 })
    .catch(() => {});
  await page
    .locator('select[aria-label="Pick a server"]')
    .selectOption({ label: "P31 Marketplace" }, { timeout: 15_000 });
  // The run-form input materializes when the selected server's tool list
  // loads from the live registry. If the backend fetch fails from this lab
  // host, the surface is reported unavailable (honest), not retried.
  await page.locator('input[aria-label="What should the helper try?"]').waitFor({ state: "visible", timeout: 45_000 });
}

/**
 * Marketplace playground — type into the form and submit with Enter.
 * The SPA re-renders aggressively (the run-form input appears and vanishes
 * as its registry fetch settles), so click-actionability often cannot land.
 * Focus is therefore applied via DOM evaluate as a fallback; the typed keys
 * and the Enter submit remain real keyboard events with real timings.
 */
export async function driveMarketplaceSubmit(page) {
  const input = page.locator('input[aria-label="What should the helper try?"]');
  try {
    await input.click({ timeout: 5_000 });
  } catch {
    const focused = await page.evaluate(() => {
      const el = document.querySelector('input[aria-label="What should the helper try?"]');
      if (!el) return false;
      el.focus();
      return document.activeElement === el;
    });
    if (!focused) throw new Error("playground run-form input not in DOM");
  }
  await page.keyboard.type("list tools", { delay: 30 });
  await page.keyboard.press("Enter");
}

/* ------------------------------------------------------------------ *
 * 5. Surface definitions + report                                     *
 * ------------------------------------------------------------------ */
export const SURFACES = {
  commandPalette: {
    id: "hub:command-palette",
    label: "CommandPalette ⌘K open + type 5 chars",
    runs: 5,
    drive: driveCommandPalette,
  },
  ledKnob: {
    id: "hub:led-knob-drag",
    label: "LedController BRI knob mouse drag",
    runs: 5,
    setup: setupLedPanel,
    drive: driveLedKnob,
    settle: (page) => page.waitForTimeout(200),
  },
  ledPreset: {
    id: "hub:led-preset-apply",
    label: "LedController preset apply click",
    runs: 5,
    setup: setupLedPanel,
    drive: driveLedPreset,
    settle: (page) => page.waitForTimeout(350),
  },
  journeyToggle: {
    id: "hub:journey-toggle",
    label: "JourneyNav toggle open",
    runs: 5,
    drive: driveJourneyToggle,
    settle: settleJourneyClose,
  },
  journeySelect: {
    id: "hub:journey-select",
    label: "JourneyNav select item (popup)",
    runs: 5,
    setup: async (page) => {
      await driveJourneyToggle(page);
      await page.waitForTimeout(100);
    },
    drive: driveJourneySelect,
    // If the click ever navigated the main document instead of a popup,
    // recover to the hub for the next run.
    settle: async (page) => {
      await page.waitForTimeout(250);
      if (!page.url().startsWith(HUB_URL)) await gotoHub(page);
    },
  },
  spoons: {
    id: "hub:topbar-spoons",
    label: "Topbar spoons level change click",
    runs: 5,
    setup: setupSpoonsMenu,
    drive: (page, run) => driveSpoons(page, 2 + (run % 2)), // 2↔3 alternation
    settle: settleSpoonsClose,
  },
  theme: {
    id: "hub:theme-cycle",
    label: "Theme toggle cycle (token swap)",
    runs: 5,
    drive: driveThemeCycle,
    settle: (page) => page.waitForTimeout(500),
  },
  marketplaceSubmit: {
    id: "marketplace:playground-submit",
    label: "Marketplace playground form submit (Enter)",
    runs: 5,
    drive: driveMarketplaceSubmit,
    settle: (page) => page.waitForTimeout(1200),
  },
};

export async function measureSurface(page, surface) {
  const rows = [];
  for (let i = 0; i < surface.runs; i++) {
    let setupError = null;
    if (surface.setup) {
      try {
        await surface.setup(page, i);
      } catch (e) {
        setupError = "setup: " + String((e && e.message) || e).slice(0, 120);
      }
    }
    const { result, error } = setupError
      ? { result: null, error: setupError }
      : await collect(page, `${surface.id}#${i + 1}`, () => surface.drive(page, i));
    rows.push({ run: i + 1, result, error });
    if (surface.settle) {
      try {
        await surface.settle(page);
      } catch {
        /* settle is best-effort */
      }
    }
    await page.waitForTimeout(200);
  }
  const lats = rows.flatMap((r) => (r.result ? r.result.latencies : []));
  const p75 = Math.round(p75Of(lats) * 100) / 100;
  const max = lats.length ? Math.max(...lats) : 0;
  const longMax = rows.reduce((m, r) => Math.max(m, r.result ? r.result.longtaskMax : 0), 0);
  const errors = rows.filter((r) => r.error).length;
  const verdict = lats.length === 0 ? "no-lab-events" : classify(p75);
  return {
    surface: surface.id,
    label: surface.label,
    runs: surface.runs,
    n: lats.length,
    p75,
    max,
    longMax,
    errors,
    verdict,
    rows,
  };
}

/** Full harness: hub surfaces, then the marketplace portal (cross-origin).
 *  P31_INP_ONLY=journeySelect,marketplaceSubmit (comma list of surface keys)
 *  restricts the run to those surfaces — for targeted re-measurement without
 *  re-loading the whole suite against the live sites. */
export async function runAll(page, opts = {}) {
  const log = opts.log || ((line) => console.log(line));
  const report = {
    generatedAt: new Date().toISOString(),
    collector: "zero-dep (web-vitals not present in apps/p31ca/node_modules)",
    ambient: [],
    surfaces: [],
    errors: [],
  };

  const only = (process.env.P31_INP_ONLY || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const wanted = (key) => only.length === 0 || only.includes(key);

  if (wanted("commandPalette") || wanted("ledKnob") || wanted("ledPreset") || wanted("journeyToggle") || wanted("spoons") || wanted("theme")) {
    await gotoHub(page);
    try {
      report.ambient.push({ label: "hub-ambient-2s", ...(await measureAmbient(page, "hub-ambient-2s")) });
    } catch (e) {
      report.errors.push("hub ambient baseline failed: " + String((e && e.message) || e).slice(0, 160));
    }
  }

  for (const key of ["commandPalette", "ledKnob", "ledPreset", "journeyToggle", "spoons", "theme"]) {
    if (!wanted(key)) continue;
    const row = await measureSurface(page, SURFACES[key]);
    report.surfaces.push(row);
    log(`done ${row.surface} — runs=${row.runs} n=${row.n} p75=${row.p75}ms max=${row.max}ms longtaskMax=${row.longMax}ms ${row.verdict}`);
  }

  // Journey select (popup-based, no main-doc navigation).
  if (wanted("journeySelect")) {
    await gotoHub(page);
    report.surfaces.push(await measureSurface(page, SURFACES.journeySelect));
  }

  // Marketplace portal (separate origin, measurement only).
  if (wanted("marketplaceSubmit")) {
    try {
      await prepareMarketplace(page);
    } catch (e) {
      report.errors.push(`marketplace prepare failed: ${String((e && e.message) || e).slice(0, 200)}`);
      report.surfaces.push({
        surface: SURFACES.marketplaceSubmit.id,
        label: SURFACES.marketplaceSubmit.label,
        runs: 0, n: 0, p75: 0, max: 0, longMax: 0, errors: 1,
        verdict: "surface-unavailable",
        rows: [],
      });
      return report;
    }
    try {
      report.ambient.push({ label: "marketplace-ambient-2s", ...(await measureAmbient(page, "marketplace-ambient-2s")) });
    } catch (e) {
      report.errors.push("marketplace ambient baseline failed: " + String((e && e.message) || e).slice(0, 160));
    }
    report.surfaces.push(await measureSurface(page, SURFACES.marketplaceSubmit));
  }
  return report;
}

export function formatReport(report) {
  const lines = [];
  lines.push("=============== p31ca INP lab-proxy report ===============");
  lines.push(`generated: ${report.generatedAt}`);
  lines.push(`collector: ${report.collector}`);
  lines.push("thresholds: ≤150 headroom-pass · 150–200 monitor · >200 fix");
  lines.push("");
  lines.push("Ambient baselines (no interaction — software-render/contention floor):");
  for (const a of report.ambient) {
    lines.push(
      `  ${a.label.padEnd(26)} rawEvents=${a.rawEvents} longtasks=${a.longtaskCount} longtaskMax=${a.longtaskMax}ms`
    );
  }
  lines.push("");
  lines.push(
    "surface".padEnd(32) +
      "runs".padEnd(6) +
      "n".padEnd(5) +
      "p75".padEnd(9) +
      "max".padEnd(9) +
      "longMax".padEnd(9) +
      "verdict"
  );
  for (const s of report.surfaces) {
    const p75 = s.n ? s.p75 + "ms" : "—";
    const max = s.n ? s.max + "ms" : "—";
    lines.push(
      s.surface.padEnd(32) +
        String(s.runs).padEnd(6) +
        String(s.n).padEnd(5) +
        p75.padEnd(9) +
        max.padEnd(9) +
        (s.longMax ? s.longMax + "ms" : "0ms").padEnd(9) +
        (s.errors ? s.verdict + ` (${s.errors} run-errors)` : s.verdict)
    );
  }
  if (report.errors.length) {
    lines.push("");
    lines.push("errors:");
    for (const e of report.errors) lines.push("  - " + e);
  }
  lines.push("");
  lines.push("Honesty rails:");
  lines.push("  - Lab proxy: headless Desktop Chrome, ~1x CPU, scripted interactions,");
  lines.push("    shared host (load observed ≈9 on 7 cores during the run).");
  lines.push("  - The hub homepage animates WebGL islands (Starfield + MolecularHeart);");
  lines.push("    headless renders them on the SOFTWARE rasterizer, so ambient long");
  lines.push("    tasks inflate event durations (input → next paint) — see baselines.");
  lines.push("  - INP is a field metric (CrUX / web-vitals RUM). This harness is NOT INP;");
  lines.push("    it approximates per-interaction latency without attribution weighting.");
  lines.push("  - verdict=no-lab-events means every observed interaction was <16 ms —");
  lines.push("    Chromium does not report fast events, so the lab cannot see them.");
  lines.push("    Field data remains the authoritative INP source.");
  lines.push("============================================================");
  return lines.join("\n");
}

/* ------------------------------------------------------------------ *
 * 6. Standalone runner — `node scripts/measure-inp.mjs`               *
 *    (uses playwright-core, chromium from the local ms-playwright     *
 *    cache; override with P31_CHROME_PATH)                            *
 * ------------------------------------------------------------------ */
function isDirectRun() {
  return process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
}

if (isDirectRun()) {
  runStandalone().catch((e) => {
    console.error("measure-inp standalone failed:", String((e && e.stack) || e).slice(0, 2000));
    process.exit(1);
  });
}

async function runStandalone() {
  const { chromium } = await import("playwright-core");
  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.P31_CHROME_PATH || undefined,
  });
  try {
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await context.newPage();
    await injectCollector(page);
    const report = await runAll(page);
    console.log(formatReport(report));
  } finally {
    await browser.close();
  }
}