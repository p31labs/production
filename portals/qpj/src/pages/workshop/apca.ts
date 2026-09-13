/**
 * APCA 0.98G-4g contrast — pure math, zero deps.
 * Extracted from packages/design-core/scripts/validate-apca.mjs (lines 29–118).
 * Reference: https://github.com/Myndex/SAPC-APCA
 */

const OKLCH_RE = /^oklch\(\s*([\d.]+%?)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+%?))?\s*\)$/i;
const HEX_RE = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

function parseComponent(raw: string, isPercent = false): number {
  const n = parseFloat(raw);
  return isPercent ? n / 100 : n;
}

function oklchToSrgb(L: number, C: number, hDeg: number): [number, number, number] {
  const h = (hDeg * Math.PI) / 180;
  const a = C * Math.cos(h);
  const b = C * Math.sin(h);

  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;

  const l = l_ ** 3;
  const m = m_ ** 3;
  const s = s_ ** 3;

  let r = +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  let g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  let bl = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;

  const toSrgb = (x: number) =>
    x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - 0.055;
  const clamp = (x: number) => Math.max(0, Math.min(1, x));

  r = clamp(toSrgb(r));
  g = clamp(toSrgb(g));
  bl = clamp(toSrgb(bl));
  return [r, g, bl];
}

function hexToSrgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const expanded =
    clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean;
  const n = parseInt(expanded, 16);
  return [((n >> 16) & 0xff) / 255, ((n >> 8) & 0xff) / 255, (n & 0xff) / 255];
}

function parseColor(input: string): [number, number, number] {
  const trimmed = input.trim();
  const hex = trimmed.match(HEX_RE);
  if (hex) return hexToSrgb(trimmed);
  const oklch = trimmed.match(OKLCH_RE);
  if (oklch) {
    const L = parseComponent(oklch[1], oklch[1].endsWith('%'));
    const C = parseFloat(oklch[2]);
    const h = parseFloat(oklch[3]);
    return oklchToSrgb(L, C, h);
  }
  throw new Error(`Unsupported color format: ${input}`);
}

/** sRGB → linear luminance (APCA's Y). */
function srgbToY([r, g, b]: [number, number, number]): number {
  const linear = (c: number) => Math.pow(c, 2.4);
  return 0.2126729 * linear(r) + 0.7151522 * linear(g) + 0.072175 * linear(b);
}

/**
 * APCA contrast. Sign indicates polarity:
 *   positive → dark text on light background
 *   negative → light text on dark background
 * Magnitude is |Lc|: 45 floor, 60 large text, 75 body, above 75 any text.
 */
export function calcApcaContrast(bg: string, fg: string): number {
  const Ybg = srgbToY(parseColor(bg));
  const Yfg = srgbToY(parseColor(fg));

  const blkThrs = 0.022;
  const blkClmp = 1.414;
  const deltaYmin = 0.0005;
  const scaleBoW = 1.14;
  const scaleWoB = 1.14;
  const loBoWoffset = 0.027;
  const loWoBoffset = 0.027;
  const loClip = 0.1;

  const clampBlack = (Y: number) =>
    Y < blkThrs ? Y + Math.pow(blkThrs - Y, blkClmp) : Y;

  const Ytxt = clampBlack(Yfg);
  const Ybgc = clampBlack(Ybg);

  if (Math.abs(Ybgc - Ytxt) < deltaYmin) return 0;

  let outputContrast: number;

  if (Ybgc > Ytxt) {
    // Dark text on light background
    const sapc = (Math.pow(Ybgc, 0.56) - Math.pow(Ytxt, 0.57)) * scaleBoW;
    outputContrast = sapc < loClip ? 0 : sapc - loBoWoffset;
  } else {
    // Light text on dark background
    const sapc = (Math.pow(Ybgc, 0.65) - Math.pow(Ytxt, 0.62)) * scaleWoB;
    outputContrast = sapc > -loClip ? 0 : sapc + loWoBoffset;
  }

  return outputContrast * 100;
}

export interface ApcaVerdict {
  lc: number;
  absLc: number;
  polarity: 'dark-on-light' | 'light-on-dark' | 'neutral';
  grade: 'fail' | 'large-text-only' | 'body-text' | 'any-text';
  note: string;
}

export function gradeApca(lc: number): ApcaVerdict {
  const absLc = Math.abs(lc);
  const polarity: ApcaVerdict['polarity'] =
    absLc < 0.5 ? 'neutral' : lc > 0 ? 'dark-on-light' : 'light-on-dark';

  let grade: ApcaVerdict['grade'];
  let note: string;

  if (absLc < 45) {
    grade = 'fail';
    note = 'Below minimum — do not use for text.';
  } else if (absLc < 60) {
    grade = 'large-text-only';
    note = 'Large text only (24px+ or 18.66px bold).';
  } else if (absLc < 75) {
    grade = 'body-text';
    note = 'Body text OK — not for small print.';
  } else {
    grade = 'any-text';
    note = 'Any size, including small print.';
  }

  return { lc, absLc, polarity, grade, note };
}