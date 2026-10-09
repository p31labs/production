#!/usr/bin/env node
/**
 * vision-review.mjs — run the P31 vision specialist team against the chat
 * portal's Playwright baselines. POSTs each regenerated snapshot to the
 * deployed /vision endpoint (or --endpoint) with four specialist rubrics:
 *   layout parity (sidebar proportion, brand, hierarchy)
 *   sensory safety (starfield, contrast, reduced states — neurodivergent lens)
 *   identity surface (user chip legibility, pre-mint state)
 *   motion (focus rings, pressed states, loading waits)
 *
 * Usage:
 *   node scripts/vision-review.mjs                    # uses /vision
 *   node scripts/vision-review.mjs --endpoint http://localhost:8787/vision
 *   node scripts/vision-review.mjs --snapshots e2e/visual.spec.ts-snapshots
 *   node scripts/vision-review.mjs --mode critique --image <png>
 *   node scripts/vision-review.mjs --model gemma-4-26b        # pick a model
 *   node scripts/vision-review.mjs --models gemma-4-26b,llama-3.2-11b  # side-by-side
 *   node scripts/vision-review.mjs --url https://localhost:5173  # + DOM measurement
 *   node scripts/vision-review.mjs --json
 *
 * --model validates against the live /models catalog (loud failure on a
 *   typo, not silent fallback). --models runs the same review through each
 *   model for comparison. --url launches a Playwright measurement pass
 *   (real contrast ratios + touch-target sizes) that the sensory specialist
 *   consumes as ground truth — the "measure vs see" gap closer.
 *
 * Exit 0 on pass / non-zero when a specialist returns verdict "fail" and
 * --fail-below is set. This is a review pass — it never changes snapshots.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_ENDPOINT = 'https://phos-ai-proxy.trimtab-signal.workers.dev/vision';
const DEFAULT_SNAPSHOTS = path.resolve(__dirname, '../e2e/visual.spec.ts-snapshots');

const SPECIALISTS = [
  {
    id: 'layout-parity',
    name: 'Vision Layout Parity',
    prompt: 'Review this chat portal UI screenshot against the DeepSeek/Claude sidebar pattern. Assess in the critique field: (1) sidebar proportion vs a dedicated left rail, (2) brand placement in the rail header, (3) primary action (New thread) prominence, (4) thread grouping rhythm, (5) footer composition (spoons + user chip), (6) whether the main column reads as the dominant surface, and whether anything still reads as a moved-down topbar rather than an intentional rail. Score the three rubric dimensions in the context of layout-parity (layout_novelty rewarded for an intentional rail; component_pattern_novelty for bespoke rail components).',
  },
  {
    id: 'sensory-safety',
    name: 'Vision Sensory Safety',
    prompt: 'Review this chat portal screenshot through a neurodivergent-first sensory lens. Assess in the critique field: (1) starfield visibility and whether it stays subordinate to text (target opacity ~0.35-0.5, low saturation), (2) whether any chat text loses contrast over the starfield, (3) whether the sidebar stays solid (stars behind the chat column only), (4) overall impression — calming or busy? Recommend a specific opacity/tint change if it fails. Score visual_identity_distinctiveness against a calm, low-saturation doctrine rather than generic design taste.',
  },
  {
    id: 'identity-surface',
    name: 'Vision Identity Surface',
    prompt: 'Review the sovereign identity user chip and sidebar footer in this screenshot. Assess in the critique field: (1) does the user chip read as a real identity surface (pickle name + emoji + short DID) or a placeholder?, (2) is the DID legible at tertiary contrast or does it disappear?, (3) does the SpoonDial placement crowd the chip?, (4) does the "Claim did:key" pre-mint state look inviting or broken?, (5) on mobile is the footer visible and usable?',
  },
  {
    id: 'motion-interaction',
    name: 'Vision Motion & Interaction',
    prompt: 'Review this chat portal screenshot for interaction affordances. Assess in the critique field: (1) are focus indicators visible (focus rings) on interactive controls?, (2) do pressed states / hover affordances read clearly?, (3) does the composer signal its send/stop/loading states?, (4) does the floating control bar look intentional (Linear/Notion pattern) rather than a leftover topbar fragment?, (5) are the four icon buttons consistent in hit area and visual weight?',
  },
];

function parseArgs(argv) {
  const a = argv.slice(2);
  const get = (f) => { const i = a.indexOf(f); return i >= 0 ? a[i + 1] : undefined; };
  return {
    endpoint: get('--endpoint') ?? DEFAULT_ENDPOINT,
    snapshots: get('--snapshots') ?? DEFAULT_SNAPSHOTS,
    image: get('--image'),
    mode: get('--mode') ?? 'critique',
    model: get('--model'),
    models: get('--models'),       // comma-separated: side-by-side comparison
    target: get('--target'),
    url: get('--url'),             // live page to measure before review
    json: a.includes('--json'),
    failBelow: Number(get('--fail-below') ?? '0'),
    noCache: a.includes('--no-cache'),
  };
}

/** Derive the /models URL from a /vision endpoint. */
function modelsUrl(endpoint) {
  return endpoint.replace(/\/vision$/, '/models');
}

/**
 * Validate the model key(s) against the live /models catalog. Unknown keys
 * would otherwise silently fall back to the server default — a footgun.
 * Returns the resolved list of model keys (empty = server default).
 */
async function validateModels(args) {
  const keys = [];
  if (args.model) keys.push(args.model);
  if (args.models) keys.push(...args.models.split(',').map((s) => s.trim()).filter(Boolean));
  if (keys.length === 0) return [];

  let catalog;
  try {
    const res = await fetch(modelsUrl(args.endpoint), { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return keys; // catalog unavailable — let the server decide
    catalog = await res.json();
  } catch {
    return keys; // offline — skip validation, server falls back
  }

  const valid = new Set([
    ...(catalog.critique?.options ?? []).map((m) => m.key),
    ...(catalog.detect?.options ?? []).map((m) => m.key),
  ]);
  for (const k of keys) {
    if (!valid.has(k)) {
      console.error(`--model "${k}" is not in the catalog. Valid keys: ${[...valid].join(', ')}`);
      process.exit(2);
    }
  }
  return keys;
}

function snapshotFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter((f) => /\.png$/i.test(f))
    .map((f) => path.join(dir, f))
    .sort();
}

function b64(path_) {
  return fs.readFileSync(path_).toString('base64');
}

/**
 * Measure the live DOM before a review — the "measure vs see" gap closer.
 * Vision models can guess that text is faint; they cannot compute a contrast
 * ratio. This runs Playwright against a URL, walks visible text nodes, and
 * computes actual contrast + touch-target sizes, returning a compact report
 * that the sensory specialist's prompt can consume as ground truth.
 *
 * Returns a string to append to the prompt, or null when --url is unset or
 * Playwright is unavailable.
 */
async function measurePage(url) {
  if (!url) return null;
  let chromium;
  try {
    ({ chromium } = await import('playwright'));
  } catch {
    console.warn('--url set but playwright is not installed; skipping measurement pass');
    return null;
  }
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle', timeout: 20000 });
    await page.waitForTimeout(600); // let the starfield/reduced-motion settle

    // Perceptible-text contrast (WCAG 2.2 style, approximate).
    const measures = await page.evaluate(() => {
      const L = (rgb) => {
        const [r, g, b] = rgb.map((v) => {
          const c = v / 255;
          return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
        });
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
      };
      const rel = (a, b) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
      const parse = (color) => {
        const m = color.match(/rgba?\(([^)]+)\)/);
        if (!m) return null;
        const parts = m[1].split(',').map((s) => Number(s.trim()));
        return [parts[0], parts[1], parts[2]];
      };
      const bgOf = (el) => {
        let n = el;
        while (n && n.nodeType === 1) {
          const bg = getComputedStyle(n).backgroundColor;
          if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') return bg;
          n = n.parentElement;
        }
        return 'rgba(0,0,0,0)';
      };
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      const text = [];
      let node;
      const seen = new Set();
      while ((node = walker.nextNode())) {
        const el = node.parentElement;
        if (!el || el.closest('[aria-hidden="true"]') || !node.textContent.trim()) continue;
        const key = `${el.tagName}.${(el.className || '').split(' ').slice(0, 2).join('.')}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const fg = getComputedStyle(el).color;
        const bg = bgOf(el);
        const f = parse(fg), b = parse(bg);
        if (!f || !b) continue;
        const ratio = rel(L(f), L(b));
        const size = parseFloat(getComputedStyle(el).fontSize) || 14;
        const bold = getComputedStyle(el).fontWeight === 'bold' || Number(getComputedStyle(el).fontWeight) >= 700;
        // WCAG: AA large = 18px/14px-bold → 3.0; body → 4.5.
        const min = size >= 18 || (size >= 14 && bold) ? 3.0 : 4.5;
        text.push({ selector: key, ratio: ratio.toFixed(2), min, pass: ratio >= min });
      }
      // Touch-target audit on interactive elements (WCAG 2.5.8: 24x24).
      const touches = [];
      for (const el of Array.from(document.querySelectorAll('a,button,input,select,textarea,[role="button"],[role="option"],[role="tab"]'))) {
        const r = el.getBoundingClientRect();
        if (r.width === 0 && r.height === 0) continue;
        touches.push({ selector: (el.tagName.toLowerCase() + '.' + (el.className || '').split(' ').slice(0, 2).join('.')).slice(0, 48), w: Math.round(r.width), h: Math.round(r.height), pass: r.width >= 24 && r.height >= 24 });
      }
      return { text: text.slice(0, 12), touches: touches.slice(0, 8), totalText: text.length, totalTouch: touches.length };
    });

    const fails = measures.text.filter((m) => !m.pass);
    const touchFails = measures.touches.filter((m) => !m.pass);
    const lines = [
      `Live DOM measurements for ${url} (--url):`,
      `  text nodes checked: ${measures.totalText} — contrast failures: ${fails.length}`,
    ];
    for (const f of fails) lines.push(`  CONTRAST FAIL ${f.selector}: ${f.ratio}:1 (min ${f.min}:1)`);
    if (fails.length === 0) lines.push('  all sampled text passes 4.5:1 (or 3:1 for large/bold).');
    lines.push(`  touch targets checked: ${measures.totalTouch} — <24px failures: ${touchFails.length}`);
    for (const t of touchFails) lines.push(`  TOUCH FAIL ${t.selector}: ${t.w}x${t.h}px`);
    if (touchFails.length === 0) lines.push('  all sampled targets >= 24x24px.');
    return lines.join('\n');
  } finally {
    await browser.close();
  }
}

async function review(agent, args, measurement) {
  const body = { image: b64(args.image), mode: args.mode, prompt: agent.prompt };
  if (args.target) body.target = args.target;
  if (args.noCache) body.noCache = true;
  if (args.model) body.model = args.model;
  if (measurement) body.prompt = `${agent.prompt}\n\n${measurement}`;
  const res = await fetch(args.endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(120000),
  });
  if (!res.ok) {
    return { agent: agent.id, ok: false, error: `HTTP ${res.status}: ${(await res.text()).slice(0, 200)}` };
  }
  const data = await res.json();
  return { agent: agent.id, ok: true, ...data };
}

async function main() {
  const args = parseArgs(process.argv);
  const images = args.image ? [args.image] : snapshotFiles(args.snapshots);
  if (images.length === 0) {
    console.error(`no screenshots found in ${args.snapshots} — pass --image <png>`);
    process.exit(2);
  }

  const modelKeys = await validateModels(args); // loud failure on unknown --model
  const measurement = await measurePage(args.url); // "measure vs see" context
  if (measurement) console.log(measurement + '\n');

  const out = [];
  let failed = 0;
  for (const agent of SPECIALISTS) {
    for (const img of images) {
      const rel = path.basename(img);
      // Each entry is one (agent, image, model) run. Empty model list = server default.
      const runs = modelKeys.length ? modelKeys : [null];
      for (const modelKey of runs) {
        const r = await review(agent, { ...args, model: modelKey ?? args.model }, measurement);
        r.image = rel;
        if (modelKey) r.requestedModel = modelKey;
        out.push(r);
        const verdict = r.verdict ?? (r.ok ? 'ok' : 'error');
        if (r.ok && args.failBelow > 0 && r.mean != null && r.mean < args.failBelow) failed = 1;
        if (!r.ok) failed = 1;
        const line = `[${agent.id}] ${rel}: verdict=${verdict}${r.mean != null ? ` mean=${r.mean}/10` : ''}${r.modelLabel ? ` model=${r.modelLabel}` : ''}${modelKey ? ` (req=${modelKey})` : ''}${r.error ? ` error=${r.error}` : ''}`;
        console.log(line);
        if (r.ok && r.critique) {
          console.log(`          critique: ${String(r.critique).replace(/\s+/g, ' ').slice(0, 240)}`);
        }
      }
    }
  }

  if (args.json) {
    console.log('\n' + JSON.stringify(out, null, 2));
  }
  process.exit(failed);
}

// Auto-run only when invoked as a CLI.
const invokedDirectly = process.argv[1] && import.meta.url.endsWith(process.argv[1]);
if (invokedDirectly) main().catch((e) => { console.error(e); process.exit(2); });