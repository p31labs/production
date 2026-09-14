import { chromium } from 'playwright';
import { APCAcontrast, sRGBtoY } from 'apca-w3';

// e2e/contrast.mjs — WCAG 2.x + APCA contrast verification with parent-chain bg resolution.
// Usage: node e2e/contrast.mjs [--route #/entry] [--selectors .btn,.btn-sm]
//   Without --selectors: runs self-test (.btn on #/entry must equal 1.68:1 WCAG).
//
// For each selector: resolves effective background by walking the parent chain
// (transparent elements inherit the nearest opaque ancestor's background; falls
// back to rgb(255,255,255) — the browser default — if none found). Computes the
// WCAG ratio as (L_higher+0.05)/(L_lower+0.05) where L is relative luminance from
// sRGB (or OKLCH converted via OKLab). Prints ratio + AA pass/fail at 4.5:1.
// Also computes APCA Lc via apca-w3 (W3C APCA, by Myndex): directional contrast
// from -108 to +106 (positive = dark text on light bg; negative = light on dark).
// APCA thresholds: |Lc| ≥ 60 body, |Lc| ≥ 45 large, |Lc| ≥ 75 small text.
//
// Known gaps (results unreliable if any apply, see docs/24):
//   - background-image (gradients, images)
//   - CSS gradients on background
//   - mix-blend-mode
//   - ancestor opacity (partial transparency not handled)
// If in doubt, re-verify manually.

const AA_THRESHOLD = 4.5;
const LARGE_TEXT_THRESHOLD = 3.0;
const APCA_BODY = 60;
const APCA_LARGE = 45;
const APCA_SMALL = 75;

function parseColor(s) {
  const rgb = s.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (rgb) return [+rgb[1], +rgb[2], +rgb[3]];
  const oklch = s.match(/oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)/);
  if (oklch) {
    const L = +oklch[1], C = +oklch[2], H = (+oklch[3] * Math.PI) / 180;
    return oklabToRgb(L, C * Math.cos(H), C * Math.sin(H));
  }
  const oklab = s.match(/oklab\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)/);
  if (oklab) return oklabToRgb(+oklab[1], +oklab[2], +oklab[3]);
  return null;
}

function oklabToRgb(L, a, b) {
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;
  const l = l_ ** 3, m = m_ ** 3, s = s_ ** 3;
  let R = +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  let G = -1.2684380046 * l + 2.6097574011 * m - 0.341319593 * s;
  let B = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;
  return [
    Math.round(Math.max(0, Math.min(1, R)) * 255),
    Math.round(Math.max(0, Math.min(1, G)) * 255),
    Math.round(Math.max(0, Math.min(1, B)) * 255),
  ];
}

function relLum(rgb) {
  return rgb
    .map((c) => {
      const s = c / 255;
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    })
    .reduce((acc, v, i) => acc + [0.2126, 0.7152, 0.0722][i] * v, 0);
}

// Real APCA via apca-w3 (W3C APCA, by Myndex). Returns directional Lc
// (-108 to +106) or null if colors can't be parsed.
function apcaLc(fg, bg) {
  const fp = parseColor(fg), bp = parseColor(bg);
  if (!fp || !bp) return null;
  return APCAcontrast(sRGBtoY(fp), sRGBtoY(bp));
}

function effectiveBg(page, el) {
  return el.evaluate((e) => {
    let cur = e;
    while (cur && cur !== document.documentElement) {
      const bg = getComputedStyle(cur).backgroundColor;
      if (bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') return bg;
      cur = cur.parentElement;
    }
    return 'rgb(255,255,255)';
  });
}

function ratio(fg, bg) {
  const fp = parseColor(fg);
  const bp = parseColor(bg);
  if (!fp || !bp) return null;
  const L1 = relLum(fp);
  const L2 = relLum(bp);
  return (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
}

async function run(page, route, selectors) {
  await page.goto(`http://localhost:5193${route}`);
  await page.waitForLoadState('networkidle');
  const results = [];
  for (const sel of selectors) {
    const el = await page.$(sel);
    if (!el) { results.push(`${sel}: NOT FOUND`); continue; }
    const info = await el.evaluate((e) => {
      const cs = getComputedStyle(e);
      return {
        sel: e.tagName + '.' + (e.className || '').toString().split(' ')[0],
        text: e.textContent?.slice(0, 30),
        color: cs.color,
        fontSize: cs.fontSize,
        fontWeight: cs.fontWeight,
        bg: cs.backgroundColor,
      };
    });
    const effBg = await effectiveBg(page, el);
    const r = ratio(info.color, effBg);
    const lc = apcaLc(info.color, effBg);
    const sizeNum = parseFloat(info.fontSize);
    const isBold = parseInt(info.fontWeight) >= 600;
    // WCAG large text: ≥24px normal OR ≥18.66px bold (14pt = 18.66px)
    const isLargeText = sizeNum >= 24 || (sizeNum >= 18.66 && isBold);
    const isSmallText = !isLargeText && sizeNum < 16;
    const passesAA = r !== null && r >= AA_THRESHOLD;
    const passesAAIfLarge = r !== null && r >= LARGE_TEXT_THRESHOLD;
    const verdict = passesAA
      ? 'AA ✅'
      : isLargeText
        ? 'AA+ (large text) ✅'
        : passesAAIfLarge
          ? 'AA large-only ⚠️ (normal text fails)'
          : 'AA ❌';
    // APCA Lc thresholds: |Lc|≥60 body, |Lc|≥45 large, |Lc|≥75 small
    const absLc = lc !== null ? Math.abs(lc) : 0;
    const apcaThreshold = isSmallText ? APCA_SMALL : isLargeText ? APCA_LARGE : APCA_BODY;
    const passesLc = lc !== null && absLc >= apcaThreshold;
    const polarity = lc !== null ? (lc > 0 ? 'dark-on-light' : lc < 0 ? 'light-on-dark' : 'neutral') : '?';
    const apcaVerdict = passesLc ? 'APCA ✅' : `APCA ❌ (need |Lc|≥${apcaThreshold}, got ${lc !== null ? lc.toFixed(1) : 'N/A'})`;
    results.push(
      `${info.sel} "${info.text}" | ${info.fontSize}/${info.fontWeight} | fg=${info.color} effBg=${effBg} | WCAG=${r !== null ? r.toFixed(2) + ':1' : 'N/A'} APCA Lc=${lc !== null ? lc.toFixed(1) : 'N/A'} (${polarity}) | ${verdict} ${apcaVerdict}`
    );
  }
  return results;
}

async function selfTest(page) {
  const r = await run(page, '#/entry', ['.btn']);
  const line = r[0];
  const match = line.match(/([\d.]+):1/);
  if (!match) throw new Error(`self-test: could not parse ratio from: ${line}`);
  const v = parseFloat(match[1]);
  if (Math.abs(v - 1.68) > 0.02) throw new Error(`self-test: expected 1.68:1, got ${v}:1 — formula incorrect`);
  return line;
}

(async () => {
  const args = process.argv.slice(2);
  const routeIdx = args.indexOf('--route');
  const route = routeIdx >= 0 ? args[routeIdx + 1] : '#/site';
  const selIdx = args.indexOf('--selectors');
  const browser = await chromium.launch();
  const ctx = await browser.newContext();
  const page = await ctx.newPage();

  if (selIdx < 0) {
    // Self-test mode: verify .btn on #/entry
    const line = await selfTest(page);
    console.log(`self-test: ${line}`);
    console.log('self-test: PASS (formula verified, .btn = 1.68:1)');
  } else {
    const selectors = args[selIdx + 1].split(',');
    const results = await run(page, route, selectors);
    for (const line of results) console.log(line);
    console.log(`Thresholds: WCAG ${AA_THRESHOLD}:1 (AA), ${LARGE_TEXT_THRESHOLD}:1 (AA large) | APCA |Lc|≥${APCA_BODY} body, ${APCA_LARGE} large, ${APCA_SMALL} small`);
  }
  await browser.close();
})();
