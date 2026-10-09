#!/usr/bin/env node
/**
 * visual-assert — the vision layer of agent+human verification.
 *
 * The "second signal" after the structural gate (layout-invariants.mjs) passes.
 * Captures a screenshot of a URL and asks the self-hosted Workers AI vision
 * model a natural-language assertion. Returns PASS/FAIL with the model's
 * evidence — "does it LOOK right" — the aesthetic/spacing/overlap judgment
 * that DOM geometry cannot express.
 *
 * Sovereign: uses @cf/meta/llama-3.2-11b-vision-instruct via Workers AI (the
 * same model slop-judge.mjs already proves working). No external provider.
 *
 * Usage:
 *   node visual-assert.mjs <url> --expect "<assertion>" [--json]
 *   node visual-assert.mjs https://design.p31ca.org \
 *     --expect "Is the topbar fully visible and spanning the full viewport width?"
 */
import { chromium } from 'playwright-core';
import { readFileSync } from 'node:fs';

const VIEWPORT = { width: 1440, height: 900 };
const VISION_MODEL = '@cf/meta/llama-3.2-11b-vision-instruct';

function parseArgs() {
  const a = process.argv.slice(2);
  const url = a.find((x) => x.startsWith('http'));
  const get = (f) => { const i = a.indexOf(f); return i >= 0 ? a[i + 1] : undefined; };
  return {
    url,
    expect: get('--expect') ?? 'Is the topbar fully visible and spanning the full viewport width? Are all interactive elements within bounds?',
    json: a.includes('--json'),
    model: get('--model') ?? VISION_MODEL,
    crop: get('--crop') ?? '.topbar',
    strict: a.includes('--strict'),
  };
}

async function main() {
  const args = parseArgs();
  if (!args.url) { console.error('Usage: node visual-assert.mjs <url> --expect "<assertion>" [--json]'); process.exit(2); }
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const token = process.env.CF_API_TOKEN;
  if (!accountId || !token) { console.error('CLOUDFLARE_ACCOUNT_ID / CF_API_TOKEN unset'); process.exit(2); }

  // Capture.
  const browser = await chromium.launch();
  let screenshotB64;
  try {
    const page = await browser.newPage({ viewport: VIEWPORT });
    await page.goto(args.url, { waitUntil: 'networkidle', timeout: 25000 });
    await page.waitForTimeout(1200);
    // Crop to the topbar region by default so the vision model judges the
    // chrome, not the ambient background (which causes false "clipped"
    // hallucinations on complex canvases — the DiffSpot caveat).
    const cropSel = args.crop ?? '.topbar';
    const el = page.locator(cropSel).first();
    if ((await el.count()) > 0) {
      const box = await el.boundingBox();
      if (box) {
        const clip = { x: Math.max(0, Math.round(box.x - 4)), y: Math.max(0, Math.round(box.y - 4)), width: Math.round(box.width + 8), height: Math.round(box.height + 8) };
        screenshotB64 = (await page.screenshot({ clip })).toString('base64');
      } else {
        screenshotB64 = (await page.screenshot()).toString('base64');
      }
    } else {
      screenshotB64 = (await page.screenshot()).toString('base64');
    }
  } finally { await browser.close(); }

  const dataUrl = `data:image/png;base64,${screenshotB64}`;
  const SYSTEM = `You are a strict UI layout judge. You look at a UI screenshot and answer a natural-language assertion. You are NOT here to be encouraging — you find every flaw. Answer STRICT JSON only:
{"pass": true|false, "evidence": "specific observation of what you see", "issues": ["named layout defects"]}`;

  const resp = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${args.model}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: [
        { role: 'system', content: SYSTEM },
        { role: 'user', content: [
          { type: 'image_url', image_url: { url: dataUrl } },
          { type: 'text', text: `Assertion: ${args.expect}\nRespond with STRICT JSON only.` },
        ] },
      ],
    }),
    signal: AbortSignal.timeout(120000),
  });
  if (!resp.ok) {
    const body = await resp.text().catch(() => '');
    console.error(`Workers AI vision ${resp.status}: ${body.slice(0, 200)}`);
    process.exit(2);
  }
  const json = await resp.json();
  const raw = json.result?.response ?? json.result ?? '';
  const out = String(typeof raw === 'string' ? raw : (raw?.content ?? JSON.stringify(raw) ?? ''));

  // Parse the model's verdict. It often ignores "STRICT JSON" and returns
  // markdown ("**Pass:** False\n\n**Evidence:** …"). Parse robustly:
  //   1) strict JSON
  //   2) balanced-brace JSON
  //   3) markdown pass/evidence extraction
  let parsed = null;
  try { parsed = JSON.parse(out); } catch {}
  if (!parsed) {
    const m = out.match(/\{[\s\S]*\}/);
    if (m) { try { parsed = JSON.parse(m[0]); } catch {} }
  }
  if (!parsed) {
    const passMatch = out.match(/Pass:?\s*(true|false|TRUE|FALSE|✅|✗|Yes|No|YES|NO)/i);
    const evidenceMatch = out.match(/Evidence:?\s*(.+?)(?:\n|Issues:|$)/is);
    if (passMatch) {
      const p = passMatch[1].toLowerCase();
      const pass = p === 'true' || p === 'yes' || p === '✅' || p === 'pass';
      parsed = { pass, evidence: evidenceMatch ? evidenceMatch[1].trim().slice(0, 200) : 'no evidence', issues: [] };
    }
  }
  if (!parsed || typeof parsed.pass !== 'boolean') {
    console.error(`could not parse vision verdict: ${String(out).slice(0, 300)}`);
    process.exit(2);
  }

  const result = { url: args.url, expect: args.expect, model: args.model, pass: parsed.pass, evidence: parsed.evidence, issues: parsed.issues ?? [] };
  if (args.json) console.log(JSON.stringify(result, null, 2));
  else {
    console.log(`visual-assert — ${parsed.pass ? '✅' : '✗'} ${args.url}`);
    console.log(`  evidence: ${parsed.evidence}`);
    for (const i of parsed.issues ?? []) console.log(`  ✗ ${i}`);
    // Advisory by default: the vision model is a DIAGNOSTIC, not the gate.
    // It catches gross layout breaks (the 960px topbar) but hallucinates
    // "clipped" on correctly-rendered chrome (DiffSpot caveat). The structural
    // gate (layout-invariants.mjs) is authoritative. --strict makes this exit
    // non-zero on a FAIL so a caller can use it as a hard gate if desired.
    console.log(`  (${args.strict ? 'strict' : 'advisory'} — structural gate is authoritative)`);
  }
  process.exit(args.strict ? (parsed.pass ? 0 : 1) : 0);
}

await main();