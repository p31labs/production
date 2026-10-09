#!/usr/bin/env node
/**
 * slop-judge — anti-genericness score for a UI screenshot, SELF-HOSTED.
 *
 * Sovereign alternative to slop-eval-cli: same rubric shape (layout novelty,
 * visual-identity distinctiveness, component-pattern novelty, 0-10 each) but
 * the judge runs on the P31 Workers AI router, not an external Anthropic key.
 *
 * The score is a heuristic LLM-judge signal, not a certification — the same
 * caveat slop-eval states. Calibrate against the canon (design portal) first:
 *   node slop-judge.mjs --screenshot baselines/design-home.png --reference
 *
 * Usage:
 *   node slop-judge.mjs --screenshot ./preview.png [--fail-below 7] [--json]
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createHash } from 'node:crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CACHE_DIR = path.join(__dirname, '.slop-cache');
if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });

/** Content-hash cache: identical screenshot → identical score. This is the
 *  slop-eval mechanism ("an unchanged PR can't flap a CI gate from LLM
 *  run-to-run variance"). Measured variance on the same image was 0→3→1.33→2.33;
 *  the cache makes a re-run return the same number. */
function cachedScore(screenshotPath) {
  const hash = createHash('sha256').update(fs.readFileSync(screenshotPath)).digest('hex');
  const cachePath = path.join(CACHE_DIR, `${hash}.json`);
  if (fs.existsSync(cachePath)) {
    try { return JSON.parse(fs.readFileSync(cachePath, 'utf8')); } catch { return null; }
  }
  return null;
}
function cacheScore(screenshotPath, result) {
  const hash = createHash('sha256').update(fs.readFileSync(screenshotPath)).digest('hex');
  fs.writeFileSync(path.join(CACHE_DIR, `${hash}.json`), JSON.stringify(result));
}
const RUBRIC = {
  layout_novelty: {
    label: 'Layout novelty (0-10)',
    guidance: 'Is the page layout distinctive, or a cookie-cutter centered-column + gradient-hero + card-grid template? Penalize generic dashboard/saas layouts. Reward intentional asymmetry, editorial structure, real hierarchy.',
  },
  visual_identity_distinctiveness: {
    label: 'Visual-identity distinctiveness (0-10)',
    guidance: 'Does the design carry a recognizable identity — a point of view in color, type, texture? Or does it look like an un-themed template? Penalize default Tailwind/AI defaults. Reward a coherent, owned visual language.',
  },
  component_pattern_novelty: {
    label: 'Component-pattern novelty (0-10)',
    guidance: 'Are the components (cards, nav, buttons) bespoke to this system, or stock AI boilerplate? Penalize glassmorphism-everywhere, gradient pills, emoji-as-icon. Reward purposeful, system-consistent patterns.',
  },
};

function extractBalancedJson(text) {
  const start = text.indexOf('{');
  if (start < 0) return null;
  let depth = 0, inStr = false, esc = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (esc) { esc = false; continue; }
    if (inStr) {
      if (ch === '\\') esc = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') inStr = true;
    else if (ch === '{') depth++;
    else if (ch === '}') { depth--; if (depth === 0) { const cand = text.slice(start, i + 1); try { return JSON.parse(cand); } catch { return null; } } }
  }
  return null;
}

function parseArgs() {
  const a = process.argv.slice(2);
  const get = (flag) => { const i = a.indexOf(flag); return i >= 0 ? a[i + 1] : undefined; };
  return {
    screenshot: get('--screenshot'),
    failBelow: Number(get('--fail-below') ?? '0'),
    json: a.includes('--json'),
    reference: a.includes('--reference'),
    model: get('--model'),
    median: Number(get('--median') ?? '3'), // runs on cache miss; median wins
    noCache: a.includes('--no-cache'),
  };
}

const SYSTEM = `You are a strict UI quality judge. You score a UI screenshot against three rubric dimensions.

RUBRIC:
${Object.entries(RUBRIC).map(([k, v]) => `- ${k}: ${v.label} — ${v.guidance}`).join('\n')}

You are NOT here to be encouraging. You are here to find every flaw, every shortcut, every sign of mediocrity. A passing score must mean the UI is genuinely good — not "good for an AI."

Rules:
- Score each dimension 0-10 with MANDATORY cited evidence from the screenshot (specific: colors, type, spacing, components visible).
- Do NOT say "overall good effort" or "solid foundation" — these are cope.
- Do NOT give points for effort.
- Penalize heavily for AI-slop aesthetics: default gradient palettes, glassmorphism excess, centered-column boilerplate, emoji icons, generic card grids.
- Respond with STRICT JSON only:
{"layout_novelty": 0-10, "visual_identity_distinctiveness": 0-10, "component_pattern_novelty": 0-10, "evidence": {"layout_novelty": "...", "visual_identity_distinctiveness": "...", "component_pattern_novelty": "..."}, "verdict": "pass"|"fail", "critique": "2-3 sentences"}`;

async function main() {
  const args = parseArgs();
  if (!args.screenshot || !fs.existsSync(args.screenshot)) {
    console.error('Usage: node slop-judge.mjs --screenshot <png> [--fail-below 7] [--json] [--median N]');
    process.exit(2);
  }
  const visionModel = args.model ?? '@cf/meta/llama-3.2-11b-vision-instruct';

  // 1) Content-hash cache: identical screenshot → identical score (no flap).
  let result = null;
  if (!args.noCache) result = cachedScore(args.screenshot);
  if (!result) {
    // 2) Cache miss — run median-of-N (default 3) so an outlier LLM read
    //    (measured: 0/3/1.33/2.33 on identical input) cannot swing the mean.
    const n = Math.max(1, args.median);
    const attempts = [];
    for (let i = 0; i < n; i++) {
      try { attempts.push(await scoreOnce(args.screenshot, visionModel)); }
      catch { /* a failed attempt is not scored — median ignores it */ }
    }
    if (attempts.length === 0) {
      console.error('judge: all scoring attempts failed — refusing to score.');
      process.exit(2);
    }
    const byMean = attempts.slice().sort((a, b) => a.mean - b.mean);
    result = byMean[Math.floor(byMean.length / 2)]; // median
    result.runs = attempts.map((a) => a.mean);
    result.cached = false;
    if (!args.noCache) cacheScore(args.screenshot, result);
  } else {
    result.cached = true;
  }
  result.reference = args.reference;

  if (args.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(`slop-judge ${args.reference ? '(reference mode — calibrate)' : ''}${result.cached ? ' (cached)' : ` (median of ${result.runs?.length || 1})`}`);
    console.log(`  layout_novelty:               ${result.layout_novelty}/10`);
    console.log(`  visual_identity_distinct:     ${result.visual_identity_distinctiveness}/10`);
    console.log(`  component_pattern_novelty:    ${result.component_pattern_novelty}/10`);
    console.log(`  mean:                          ${result.mean}/10`);
    console.log(`  verdict:                       ${result.verdict}`);
    console.log(`  critique: ${result.critique}`);
  }

  if (args.failBelow > 0 && result.mean < args.failBelow) {
    process.exit(1);
  }
  process.exit(0);
}

/** Run the vision model once and return a scored result (one LLM read). */
async function scoreOnce(screenshotPath, visionModel) {
  const b64 = fs.readFileSync(screenshotPath).toString('base64');
  const dataUrl = `data:image/png;base64,${b64}`;
  const user = `Score this UI screenshot against the rubric. Be ruthlessly strict — penalize AI-slop aesthetics (default gradients, glassmorphism excess, centered boilerplate, emoji icons, generic card grids). Respond with STRICT JSON only.`;

  let out;
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const token = process.env.CF_API_TOKEN;
  if (!accountId || !token) throw new Error('CLOUDFLARE_ACCOUNT_ID / CF_API_TOKEN unset');
  const resp = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${visionModel}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: [
        { role: 'system', content: SYSTEM },
        { role: 'user', content: [{ type: 'image_url', image_url: { url: dataUrl } }, { type: 'text', text: user }] },
      ],
    }),
    signal: AbortSignal.timeout(120000),
  });
  if (!resp.ok) {
    const body = await resp.text().catch(() => '');
    throw new Error(`Workers AI vision ${resp.status}: ${body.slice(0, 200)}`);
  }
  const json = await resp.json();
  out = json.result?.response ?? json.result ?? JSON.stringify(json.result);

  let parsed;
  const text = typeof out === 'string' ? out : out?.content ?? JSON.stringify(out);
  try {
    parsed = JSON.parse(text);
  } catch (_) {
    parsed = extractBalancedJson(text);
    if (!parsed) {
      const g = (k) => {
        const m = text.match(new RegExp(`${k}["'\\s:]+(\\d+(?:\\.\\d+)?)`));
        return m ? Number(m[1]) : undefined;
      };
      const l = g('layout_novelty'), v = g('visual_identity_distinctiveness'), c = g('component_pattern_novelty');
      if (l !== undefined && v !== undefined && c !== undefined) parsed = { layout_novelty: l, visual_identity_distinctiveness: v, component_pattern_novelty: c, verdict: 'fail', critique: 'parsed from prose fallback' };
    }
    if (!parsed) throw new Error(`could not parse judge output: ${text.slice(0, 300)}`);
  }

  // Validate the three required scores; if any is missing, fail loudly rather
  // than fabricate a pass. A gate that cannot fail is furniture.
  const req = ['layout_novelty', 'visual_identity_distinctiveness', 'component_pattern_novelty'];
  for (const k of req) {
    if (typeof parsed[k] !== 'number') throw new Error(`judge output missing required field "${k}" — refusing to score.`);
  }

  const total = (parsed.layout_novelty + parsed.visual_identity_distinctiveness + parsed.component_pattern_novelty) / 3;
  return { ...parsed, mean: Number(total.toFixed(2)) };
}

// Auto-run ONLY when invoked as a CLI, never when imported (a gate that
// imports this module must not have its process killed by main()'s exit).
const invokedDirectly = process.argv[1] && (import.meta.url === new URL(`file://${process.argv[1]}`).href || import.meta.url.endsWith(process.argv[1]));
if (invokedDirectly) main().catch((e) => { console.error(e); process.exit(2); });