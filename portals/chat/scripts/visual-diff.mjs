#!/usr/bin/env node
// Pixel-level visual loop for the P31 chat sandbox (the "prove it" machine).
//
// Reference architecture: deterministic DOM-first, VLM only for ambiguous
// changed regions, snapshots written to disk (never into context).
//
//   node scripts/visual-diff.mjs --html <path> [--baseline-dir <dir>] [--json] [--no-vlm] [--round <n>]
//
// Flow:
//   1. Render <html> at 960x500 with Playwright chromium (cached browsers).
//   2. Snapshot DOM structure to disk *and* screenshot to disk.
//   3. If no baseline for this artifact: write current as the baseline and
//      return `{ changed:true, mode:"first-run", verdict:"intentional-likely" }`.
//   4. Otherwise DOM-diff first. DOM unchanged -> `{ changed:false,
//      verdict:"noise-likely" }` (kills all rendering-noise false positives).
//   5. DOM changed -> fuse DOM + pixel regions; escalate only changed regions
//      to the VLM (--vlm) or mark them pending (--no-vlm default, zero tokens).
//   6. Emit a compact typed result on stdout (the token-budgeted handoff).
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, basename } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORTAL_ROOT = join(__dirname, "..");

function parseArgs(argv) {
  const flags = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--json") flags.json = true;
    else if (arg === "--no-vlm") flags.vlm = false;
    else if (arg === "--vlm") flags.vlm = true;
    else if (arg === "--html") flags.html = argv[++i];
    else if (arg === "--baseline-dir") flags.baselineDir = argv[++i];
    else if (arg === "--round") flags.round = argv[++i];
    else if (arg === "--help" || arg === "-h") flags.help = true;
  }
  return flags;
}

async function render(htmlPath, outDir) {
  const { chromium } = await import("playwright");
  const { snapshotDom } = await import("vlm-diff/dist/snapshot/capture.js");
  const url = new URL(`file://${htmlPath}`).href;
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 960, height: 500 } });
    await page.goto(url, { waitUntil: "load" });
    await page.waitForTimeout(120);
    const dom = await snapshotDom(page);
    const domPath = join(outDir, "current-dom.json");
    const pngPath = join(outDir, "current.png");
    await writeFile(domPath, dom);
    await page.screenshot({ path: pngPath });
    return { domPath, pngPath, dom };
  } finally {
    await browser.close();
  }
}

async function main() {
  const flags = parseArgs(process.argv.slice(2));
  if (flags.help || !flags.html) {
    console.log(`usage: node scripts/visual-diff.mjs --html <path> [--baseline-dir <dir>] [--yes]`);
    console.log(`       --json          machine-readable single-line JSON output`);
    console.log(`       --no-vlm        detection only: never escalate to a VLM (default)`);
    console.log(`       --vlm           escalate changed regions to the configured VLM`);
    console.log(`       --round <n>     repair/pipeline round being proven (metadata only)`);
    return 1;
  }

  const htmlPath = flags.html;
  const baselineDir = join(PORTAL_ROOT, flags.baselineDir || "visual-diff");
  const artifactId = basename(htmlPath, ".html");
  const workDir = join(baselineDir, "work");
  const baselineFile = join(baselineDir, `${artifactId}.baseline.json`);
  const resultPath = join(baselineDir, "result.json");
  await mkdir(workDir, { recursive: true });
  await mkdir(baselineDir, { recursive: true });
  const html = readFileSync(htmlPath, "utf8");
  const domHashNow = hashOf(html);

  // Has this exact content been proven before?
  let baseline = null;
  try {
    baseline = JSON.parse(readFileSync(baselineFile, "utf8"));
  } catch {
    baseline = null;
  }

  let result;
  if (baseline && baseline.domHash === domHashNow) {
    result = {
      changed: false,
      mode: "dom",
      verdict: "noise-likely",
      artifactId,
      regions: [],
      message: "DOM unchanged since proven baseline — rendering-only drift would be noise.",
      baselineHash: baseline.domHash,
      currentHash: domHashNow,
      round: flags.round || null,
      _baseline: baselineFile,
    };
    await writeFile(resultPath, JSON.stringify(result, null, 2));
    console.log(flags.json ? JSON.stringify(result) : pretty(result));
    return 0;
  }

  const { domPath, pngPath } = await render(htmlPath, workDir);

  if (!baseline) {
    const written = {
      artifactId,
      domHash: domHashNow,
      dom: readFileSync(domPath, "utf8"),
      pngBase64: readFileSync(pngPath).toString("base64"),
      provenAt: new Date().toISOString(),
    };
    await writeFile(baselineFile, JSON.stringify(written));
    result = {
      changed: true,
      mode: "first-run",
      verdict: "intentional-likely",
      artifactId,
      regions: [],
      message: "First proven render for this artifact — recorded as baseline. Re-run to diff.",
      baselineHash: domHashNow,
      currentHash: domHashNow,
      round: flags.round || null,
      _baseline: baselineFile,
    };
  } else {
    const { diffPair } = await import("vlm-diff/dist/core/diff.js");
    const beforePng = Buffer.from(baseline.pngBase64, "base64");
    const afterPng = readFileSync(pngPath);
    const domBefore = baseline.dom;
    const domAfter = readFileSync(domPath, "utf8");
    const verdict = await diffPair(beforePng, afterPng, domBefore, domAfter, {
      maxRegions: 8,
      provider: flags.vlm ? process.env.VLM_PROVIDER : undefined,
    });
    const regions = verdict.regions.map((r) => ({
      rect: { x: r.x, y: r.y, width: r.w, height: r.h },
      changeType: r.changeType || "other",
      description: r.description || r.reason || "",
      confidence: r.confidence ?? (flags.vlm ? 0.9 : 0),
      rootCause: r.rootCause ?? false,
    }));
    const summary = verdictChangeType(regions);
    result = {
      changed: verdict.changed,
      mode: "pixel",
      verdict: verdict.changed ? (summary === "text" ? "intentional-likely" : summary === "color" ? "ambiguous" : "regression-likely") : "noise-likely",
      artifactId,
      regions,
      inputTokens: verdict.inputTokens,
      outputTokens: verdict.outputTokens,
      pendingVlmEscalations: verdict.pendingEscalations,
      message: regions.length === 0
        ? "No significant regions changed (deterministic DOM+perceptual pass)."
        : `${regions.length} changed region(s) found against the proven baseline.`,
      baselineHash: baseline.domHash,
      currentHash: domHashNow,
      round: flags.round || null,
      _baseline: baselineFile,
    };
  }

  await writeFile(resultPath, JSON.stringify(result, null, 2));
  console.log(flags.json ? JSON.stringify(result) : pretty(result));
  return 0;
}

function verdictChangeType(regions) {
  const counts = {};
  for (const r of regions) counts[r.changeType] = (counts[r.changeType] || 0) + 1;
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  return entries[0]?.[0] || "other";
}

function pretty(obj) {
  return [
    `visual-diff ${obj.artifactId} (${obj.round ? `round ${obj.round} · ` : ""}${obj.mode})`,
    `  changed : ${obj.changed}`,
    `  verdict : ${obj.verdict}`,
    `  regions : ${obj.regions.length}`,
    `  tokens  : in ${obj.inputTokens ?? 0} / out ${obj.outputTokens ?? 0} (pending VLM: ${obj.pendingVlmEscalations ?? 0})`,
    obj.message ? `  message : ${obj.message}` : "",
  ].filter(Boolean).join("\n");
}

function hashOf(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h) ^ str.charCodeAt(i);
  return (h >>> 0).toString(36);
}

main()
  .then((code) => process.exit(code))
  .catch((err) => {
    console.error(`visual-diff error: ${err?.stack || err}`);
    process.exit(2);
  });