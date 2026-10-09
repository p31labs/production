// contrast.ts — perceptual contrast engine (APCA, WCAG 3 direction).
// Audits theme token sets with apca-w3. Used for the dev audit script and the
// live "readability" chip in PassportPanel.
import { calcAPCA } from 'apca-w3';
import { parse, formatHex } from 'culori';

export interface ContrastRow {
  label: string;
  fg: string;
  bg: string;
  lc: number;
  threshold: number;
  pass: boolean;
}

// Theme tokens are authored in OKLCH; APCA's parser only understands sRGB,
// so convert to hex first (any unparseable color degrades to APCA-safe black/white).
function toHex(c: string): string {
  try {
    const p = parse(c);
    if (!p) return '#ffffff';
    const hex = formatHex(p);
    return hex ?? '#ffffff';
  } catch {
    return '#ffffff';
  }
}

// Fluent-text APCA targets: body 75, secondary 60, tertiary 45 (Lc).
function apcaLc(fg: string, bg: string): number {
  try {
    const v = calcAPCA(toHex(fg), toHex(bg));
    return typeof v === 'number' ? Math.abs(v) : 0;
  } catch {
    return 0;
  }
}

export function auditTokens(tokens: Record<string, string>): ContrastRow[] {
  const bg = tokens['--p31-bg'] ?? '#0a0e17';
  const surface = tokens['--p31-surface2'] ?? tokens['--p31-surface'] ?? bg;
  const defs: Array<[label: string, fg: string, bg: string, threshold: number]> = [
    ['Body text', '--p31-text', bg, 75],
    ['Secondary text', '--p31-text-secondary', bg, 60],
    ['Tertiary text', '--p31-text-tertiary', surface, 45],
    ['Accent on bg', '--p31-accent', bg, 45],
  ];
  return defs.map(([label, fgKey, bgKey, threshold]) => {
    const fg = tokens[fgKey] ?? '#ffffff';
    const lc = apcaLc(fg, bgKey === '--p31-surface2' ? surface : bg);
    return { label, fg, bg, lc, threshold, pass: lc >= threshold };
  });
}

export function minLc(tokens: Record<string, string>): number {
  const rows = auditTokens(tokens);
  return rows.length ? Math.min(...rows.map((r) => r.lc)) : 0;
}

export function readAppliedTokens(): Record<string, string> {
  const style = getComputedStyle(document.documentElement);
  const keys = ['--p31-bg', '--p31-surface', '--p31-surface2', '--p31-text', '--p31-text-secondary', '--p31-text-tertiary', '--p31-accent'];
  const out: Record<string, string> = {};
  for (const k of keys) {
    const v = style.getPropertyValue(k).trim();
    if (v) out[k] = v;
  }
  return out;
}
