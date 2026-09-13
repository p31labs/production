import type { ContractIssue } from './pipeline';
import { tileRegions, type RegionTile } from './visual';

export type DiffChangeType = 'color' | 'text' | 'position' | 'size' | 'other' | 'none';
export type DiffVerdict = 'regression-likely' | 'intentional-likely' | 'noise-likely' | 'ambiguous' | 'clean';

export interface DiffRegion {
  rect?: { x: number; y: number; width: number; height: number };
  changeType: DiffChangeType;
  description: string;
  confidence: number;
}

export interface VisualDiffResult {
  changed: boolean;
  regions: DiffRegion[];
  verdict: DiffVerdict;
  mode: 'dom' | 'pixel' | 'first-run';
  baselineHash?: string;
  currentHash: string;
  baseline?: string;
}

export function normalizeDom(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const walk = (el: Element, out: string[]): void => {
    const children = Array.from(el.children);
    const tag = el.tagName.toLowerCase();
    const attrs = Array.from(el.attributes)
      .filter((a) => !/^(blur-id|data-reactid)$/.test(a.name))
      .map((a) => `${a.name}="${a.value.trim()}"`)
      .sort();
    out.push(`<${tag}${attrs.length ? ' ' + attrs.join(' ') : ''}>`);
    const text = (el.childNodes.length === 1 && el.firstChild?.nodeType === Node.TEXT_NODE)
      ? el.textContent || ''
      : '';
    if (text.trim()) out.push(text.trim());
    for (const child of children) walk(child, out);
    out.push(`</${tag}>`);
  };
  const out: string[] = [];
  for (const child of Array.from(doc.body ? doc.body.children : [])) walk(child, out);
  return out.join('');
}

export function hashString(str: string): string {
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h) ^ str.charCodeAt(i);
  return (h >>> 0).toString(36);
}

export interface AnalyzeDiffInput {
  before: string;
  after: string;
  mode?: 'dom' | 'pixel';
  baseline?: string;
  includeRect?: boolean;
}

export function analyzeDomDiff(input: AnalyzeDiffInput): VisualDiffResult {
  const { before, after, mode = 'dom', baseline } = input;
  const beforeHash = hashString(normalizeDom(before));
  const afterHash = hashString(normalizeDom(after));

  if (beforeHash === afterHash) {
    return {
      changed: false,
      regions: [],
      verdict: 'noise-likely',
      mode,
      baselineHash: beforeHash,
      currentHash: afterHash,
      baseline,
    };
  }

  const beforeRegions = tileRegions(before);
  const afterRegions = tileRegions(after);
  const keyedBefore = keyedByPath(beforeRegions);
  const keyedAfter = keyedByPath(afterRegions);

  const regions: DiffRegion[] = [];

  const classify = (key: string, beforeTile: RegionTile | undefined, afterTile: RegionTile | undefined): DiffRegion => {
    const textChanged = beforeTile !== undefined && afterTile !== undefined
      ? (beforeTile.text || '').trim() !== (afterTile.text || '').trim()
      : false;
    const attrsChanged = beforeTile !== undefined && afterTile !== undefined
      ? JSON.stringify(beforeTile.attrs) !== JSON.stringify(afterTile.attrs)
      : false;

  let changeType: DiffChangeType;
  let description: string;

    if (beforeTile === undefined) {
      changeType = 'position';
      description = `New region added: ${key}`;
    } else if (afterTile === undefined) {
      changeType = 'position';
      description = `Region removed: ${key}`;
    } else if (textChanged && attrsChanged) {
      changeType = 'text';
      description = `Text and styling changed in ${key}`;
    } else if (textChanged) {
      changeType = 'text';
      description = `Text changed in ${key}`;
    } else if (attrsChanged) {
      const styleChange = detectStyleChange(beforeTile, afterTile);
      changeType = styleChange;
      description = `${styleName(styleChange)} changed in ${key}`;
    } else {
      changeType = 'none';
      description = `Structure changed in ${key} (no visible diff in this tile)`;
    }

    const rect = input.includeRect
      ? { x: 0, y: 0, width: 0, height: 0 }
      : undefined;
    return {
      rect,
      changeType,
      description,
      confidence: changeType === 'none' ? 0.3 : 0.85,
    };
  };

  for (const key of Object.keys(keyedAfter)) {
    const region = classify(key, keyedBefore[key], keyedAfter[key]);
    if (region.changeType !== 'none') regions.push(region);
  }

  for (const key of Object.keys(keyedBefore)) {
    if (!(key in keyedAfter)) {
      const region = classify(key, keyedBefore[key], undefined);
      if (region.changeType !== 'none') regions.push(region);
    }
  }

  const verdict = deriveVerdict(regions, beforeHash === afterHash);

  return {
    changed: regions.length > 0,
    regions,
    verdict,
    mode,
    baselineHash: beforeHash,
    currentHash: afterHash,
    baseline,
  };
}

function keyedByPath(regions: RegionTile[]): Record<string, RegionTile | undefined> {
  const counts = new Map<string, number>();
  const map: Record<string, RegionTile> = {};
  for (const r of regions) {
    const path = r.path || r.tag;
    const idx = counts.get(path) || 0;
    counts.set(path, idx + 1);
    map[`${path}#${idx}`] = r;
  }
  return map;
}

function detectStyleChange(beforeTile: RegionTile, afterTile: RegionTile): DiffChangeType {
  const beforeClass = beforeTile.attrs.class || '';
  const afterClass = afterTile.attrs.class || '';
  if (beforeClass !== afterClass) {
    if (/size|width|height|dimension|spacing|gap|padding|font/.test(afterClass)) return 'size';
    if (/position|left|right|top|bottom|margin|float|flex|grid/.test(afterClass)) return 'position';
    if (/color|background|accent|tint|theme|glass/.test(afterClass)) return 'color';
    return 'other';
  }
  const beforeStyle = beforeTile.attrs.style || '';
  const afterStyle = afterTile.attrs.style || '';
  if (beforeStyle !== afterStyle) {
    if (/color|background|border|box-shadow|accent|fill|stroke/i.test(afterStyle)) return 'color';
    if (/width|height|font-size|padding|gap|border-radius|transform:scale/i.test(afterStyle)) return 'size';
    if (/position|left|right|top|bottom|margin|transform|translate/g.test(afterStyle)) return 'position';
    return 'other';
  }
  return 'other';
}

function styleName(changeType: DiffChangeType): string {
  switch (changeType) {
    case 'color': return 'Color';
    case 'size': return 'Size';
    case 'position': return 'Position';
    default: return 'Style';
  }
}

function deriveVerdict(regions: DiffRegion[], domUnchanged: boolean): DiffVerdict {
  if (domUnchanged) return 'noise-likely';
  if (regions.length === 0) return 'clean';

  const positional = regions.filter((r) => r.changeType === 'position');
  const textual = regions.filter((r) => r.changeType === 'text');

  if (positional.length > 0 && positional.length > regions.length * 0.5) return 'regression-likely';
  if (textual.length === regions.length) return 'intentional-likely';
  if (positional.some((r) => /removed|New region/.test(r.description))) return 'regression-likely';

  return 'ambiguous';
}

export function captureAndDiff(
  html: string,
  baseline?: string,
  opts: { mode?: 'dom' | 'pixel'; includeRect?: boolean } = {},
): VisualDiffResult {
  if (!baseline) {
    return {
      changed: true,
      regions: [],
      verdict: 'intentional-likely',
      mode: 'first-run',
      currentHash: hashString(normalizeDom(html)),
      baseline,
    };
  }
  return analyzeDomDiff({
    before: baseline,
    after: html,
    mode: opts.mode ?? 'dom',
    baseline,
    includeRect: opts.includeRect,
  });
}

export function regionTilesFor(html: string): RegionTile[] {
  return tileRegions(html);
}

export function visualDiffVerdictToIssue(result: VisualDiffResult): ContractIssue | null {
  if (result.verdict === 'clean' || result.verdict === 'noise-likely' || result.verdict === 'intentional-likely') return null;
  const regionSummary = result.regions.slice(0, 4).map((r) => r.changeType).join(', ');
  const severity = result.verdict === 'regression-likely' ? 'error' : 'warning';
  return {
    code: `visual-diff:${result.verdict}`,
    severity,
    priority: result.verdict === 'regression-likely' ? 1 : 2,
    contract: 'visual-diff',
    message: `DOM/pixel diff flags ${result.regions.length} changed region${result.regions.length === 1 ? '' : 's'}${regionSummary ? ` (${regionSummary})` : ''} — ${result.verdict.replace(/-/g, ' ')} — verify the change is intended before shipping.`,
    found: result.regions.slice(0, 3).map((r) => r.description).join(' | '),
    suggestion: 'If this is a planned change, mark it intentional; if not, restore the baseline or repair.',
  };
}