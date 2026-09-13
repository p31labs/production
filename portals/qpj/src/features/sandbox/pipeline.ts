export interface ClarifyOption {
  label: string;
  value: string;
  hint?: string;
}

export interface ClarifyQuestion {
  key: string;
  question: string;
  options: ClarifyOption[];
}

export type PipelineStepKind = 'clarify' | 'generate' | 'verify' | 'visual-diff' | 'rubric' | 'repair' | 'deploy';

export type PipelineStepStatus = 'pending' | 'running' | 'done' | 'blocked' | 'error' | 'skipped';

export interface PipelineStep {
  id: string;
  kind: PipelineStepKind;
  name: string;
  status: PipelineStepStatus;
  detail?: string;
  issues?: ContractIssue[];
  startedAt: number;
  endedAt?: number;
}

export type Severity = 'error' | 'warning';

export interface ContractIssue {
  code: string;
  severity: Severity;
  priority: 1 | 2 | 3;
  contract: string;
  message: string;
  found: string;
  suggestion: string;
}

export function makeStep(kind: PipelineStepKind, name: string): PipelineStep {
  return { id: `step-${kind}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, kind, name, status: 'pending', startedAt: Date.now() };
}

function countMatches(html: string, re: RegExp): number {
  const matches = html.match(re);
  return matches ? matches.length : 0;
}

const EMOJI_SYMBOLS = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;
const EMOJI_VARIATION = /\u{FE0F}/u;

function hasEmoji(text: string): boolean {
  return EMOJI_SYMBOLS.test(text) || EMOJI_VARIATION.test(text);
}

function findButtonsWithEmoji(html: string): string[] {
  const out: string[] = [];
  const buttonRe = /<button\b[^>]*>([\s\S]*?)<\/button>/gi;
  let m: RegExpExecArray | null;
  while ((m = buttonRe.exec(html)) !== null) {
    if (hasEmoji(m[1])) out.push(m[0].slice(0, 80));
  }
  return out;
}

function findIconOnlyButtonsMissingLabel(html: string): string[] {
  const out: string[] = [];
  const buttonRe = /<button\b([^>]*)>([\s\S]*?)<\/button>/gi;
  let m: RegExpExecArray | null;
  while ((m = buttonRe.exec(html)) !== null) {
    const attrs = m[1] || '';
    const inner = m[2] || '';
    const hasSvg = /<svg\b/i.test(inner);
    const hasLabel = /aria-label\s*=|aria-labelledby\s*=/.test(attrs);
    const hasVisibleText = stripTags(inner).replace(/\s+/g, '').length > 0;
    if (hasSvg && !hasLabel && !hasVisibleText) out.push(m[0].slice(0, 80));
  }
  return out;
}

function stripTags(html: string): string {
  return html.replace(/<[^>]*>/g, '');
}

function findBackdropBlurAbove(html: string, overflowPx: number): Array<{ px: number; snippet: string }> {
  const out: Array<{ px: number; snippet: string }> = [];
  const blurRe = /(?:backdrop-filter|-webkit-backdrop-filter):\s*[^;}]*?blur\(\s*(\d+(?:\.\d+)?)px/g;
  let m: RegExpExecArray | null;
  while ((m = blurRe.exec(html)) !== null) {
    const px = Number(m[1]);
    if (px > overflowPx) out.push({ px, snippet: html.slice(Math.max(0, m.index - 40), m.index + m[0].length + 40) });
  }
  return out;
}

function findInlineStyles(html: string): string[] {
  const out: string[] = [];
  const styleRe = /\sstyle=(?:"([^"]*)"|'([^']*)')/g;
  let m: RegExpExecArray | null;
  while ((m = styleRe.exec(html)) !== null) {
    const value = m[1] || m[2] || '';
    if (value.trim()) out.push(value.trim().slice(0, 80));
  }
  return out;
}

export function validateHtml(html: string): ContractIssue[] {
  const issues: ContractIssue[] = [];
  const push = (issue: Omit<ContractIssue, 'found'>) => issues.push({ ...issue, found: '' });

  const hexes = countMatches(html, /#[0-9a-fA-F]{3,8}\b/g);
  if (hexes > 0) {
    push({
      code: 'hardcoded-hex',
      severity: 'error',
      priority: 1,
      contract: 'button',
      message: `Found ${hexes} hardcoded hex color${hexes > 1 ? 's' : ''}. P31 forbids hardcoded hex — resolve through tokens.`,
      suggestion: 'Replace hex literals with semantic tokens, e.g. var(--p31-bg), var(--p31-text), var(--p31-accent).',
    });
  }

  const rgbaCount = countMatches(html, /\brgba?\(/gi);
  if (rgbaCount > 0) {
    push({
      code: 'rgba-literal',
      severity: 'warning',
      priority: 1,
      contract: 'button',
      message: `Found ${rgbaCount} raw rgb()/rgba()/hsl() literal${rgbaCount > 1 ? 's' : ''}. Prefer oklch token pairs.`,
      suggestion: 'Express color via oklch() against the semantic token palette, or use oklch() with alpha like oklch(69% 0.14 45 / 0.6).',
    });
  }

  const inlineStyles = findInlineStyles(html);
  if (inlineStyles.length > 0) {
    push({
      code: 'inline-style',
      severity: 'error',
      priority: 1,
      contract: 'button',
      message: `${inlineStyles.length} inline style attribute${inlineStyles.length > 1 ? 's' : ''} detected — breaks theme/contract inheritance.`,
      suggestion: 'Move styling into a <style> block using tokens and semantic class names; use inline style only for dynamic values driven by state.',
    });
  }

  const emojiButtons = findButtonsWithEmoji(html);
  if (emojiButtons.length > 0) {
    push({
      code: 'emoji-as-icon',
      severity: 'warning',
      priority: 2,
      contract: 'chat-composer',
      message: `Emoji used as a status/action indicator inside ${emojiButtons.length} button${emojiButtons.length > 1 ? 's' : ''}.`,
      suggestion: 'Render icon indicators as SVG with aria-hidden, or keep emoji only in body copy — never as the sole visual for a control.',
    });
  }

  const blurOver = findBackdropBlurAbove(html, 20);
  if (blurOver.length > 0) {
    push({
      code: 'blur-overflow',
      severity: 'error',
      priority: 2,
      contract: 'glass-panel',
      message: `backdrop-filter blur > 20px found (${blurOver.map((b) => `${b.px}px`).join(', ')}).`,
      suggestion: 'Cap glass blur at 20px; use heavier surfaces for contrast instead of stronger blur. Reduce motion should disable backdrop-filter.',
    });
  }

  const glassCount = countMatches(html, /backdrop-filter/gi);
  if (glassCount > 5) {
    push({
      code: 'glass-overuse',
      severity: 'warning',
      priority: 2,
      contract: 'glass-panel',
      message: `${glassCount} glass surfaces — exceeds the 3-5 per-viewport spoon contract.`,
      suggestion: 'Dock glass to the top 3-5 surfaces (nav, dial, primary panel); promote the rest to solid surfaces.',
    });
  }

  const unlabelledInputs = countMatches(html, /<input\b(?![^>]*\b(?:aria-label|aria-labelledby|title)=)/gi);
  if (unlabelledInputs > 0) {
    push({
      code: 'input-unlabelled',
      severity: 'warning',
      priority: 3,
      contract: 'chat-composer',
      message: `${unlabelledInputs} <input> element${unlabelledInputs > 1 ? 's' : ''} without aria-label / aria-labelledby / title.`,
      suggestion: 'Give every input an accessible name: aria-label, a visible <label>, or aria-labelledby pointing to the label.',
    });
  }

  const iconButtons = findIconOnlyButtonsMissingLabel(html);
  if (iconButtons.length > 0) {
    push({
      code: 'icon-button-unlabelled',
      severity: 'error',
      priority: 2,
      contract: 'chat-composer',
      message: `${iconButtons.length} icon-only button${iconButtons.length > 1 ? 's' : ''} missing an accessible name.`,
      suggestion: 'Add aria-label to every icon-only button (wraps Tooltip usage and matches the min 44px touch target).',
    });
  }

  return issues.sort((a, b) => (a.priority - b.priority) || (a.severity === 'error' ? -1 : 1));
}

export interface RubricBucket {
  key: string;
  priority: 1 | 2 | 3;
  label: string;
}

export const RUBRIC_BUCKETS: RubricBucket[] = [
  { key: 'brand-glass', priority: 1, label: 'Brand & glass hierarchy' },
  { key: 'type-space', priority: 2, label: 'Typography / spacing scale' },
  { key: 'layout-focus', priority: 3, label: 'Layout & focus order' },
];

export interface RubricReport {
  prioritized: ContractIssue[];
  buckets: Array<{ bucket: RubricBucket; issues: ContractIssue[] }>;
}

export function runRubric(html: string): RubricReport {
  const issues = validateHtml(html);
  const buckets = RUBRIC_BUCKETS.map((bucket) => ({
    bucket,
    issues: issues.filter((i) => i.priority === bucket.priority),
  }));
  return { prioritized: issues, buckets };
}

export function buildRepairPrompt(issue: ContractIssue, priorAttempts: number): string {
  const scope = priorAttempts > 0 ? `This is repair attempt #${priorAttempts + 1}. Do NOT repeat the same blind fix — change the underlying approach.` : '';
  return [
    `Repair the generated UI to satisfy the P31 contract check "${issue.code}".`,
    `Contract: ${issue.contract}`,
    `Problem: ${issue.message}`,
    `Guidance: ${issue.suggestion}`,
    'Apply the minimal, targeted fix to the existing HTML. Keep everything else intact.',
    scope,
  ].filter(Boolean).join('\n');
}

export function selectNextIssue(
  issues: ContractIssue[],
  resolvedCodes: Set<string>,
): ContractIssue | null {
  const candidates = issues
    .filter((i) => !resolvedCodes.has(i.code))
    .sort((a, b) => (a.priority - b.priority) || (a.severity === 'error' ? -1 : 1));
  return candidates[0] ?? null;
}

export function issueResolvedAfterRepair(
  html: string,
  code: string,
): boolean {
  const remaining = validateHtml(html);
  return !remaining.some((i) => i.code === code && i.severity === 'error');
}

export interface RepairRound {
  round: number;
  issue: ContractIssue;
  prompt: string;
  before: string;
  after: string | null;
  resolved: boolean;
  verified: boolean;
}

export interface RepairLoopInput {
  html: string;
  issues: ContractIssue[];
  maxRounds?: number;
  generateRepair: (prompt: string, currentHtml: string) => Promise<string>;
}

export interface RepairLoopOutput {
  html: string;
  rounds: RepairRound[];
  resolvedCodes: string[];
  unresolved: ContractIssue[];
}

/**
 * RubSE-style repair: one targeted issue per round, capped, history-aware,
 * single-target prompts that discourage over-broad changes. Caller supplies
 * the repair generator (typically remoteGenerate) and receives the evolving
 * HTML plus a full round history for the proof gate.
 */
export async function repairLoop(input: RepairLoopInput): Promise<RepairLoopOutput> {
  const { html, issues, maxRounds = 3 } = input;
  let currentHtml = html;
  const resolvedCodes = new Set<string>();
  const rounds: RepairRound[] = [];
  const unresolved: ContractIssue[] = [];

  for (let round = 0; round < maxRounds; round++) {
    const target = selectNextIssue(issues, resolvedCodes);
    if (!target) break;

    const priorAttempts = rounds.filter((r) => r.issue.code === target.code).length;
    const prompt = buildRepairPrompt(target, priorAttempts);
    const before = currentHtml;

    let after: string | null;
    try {
      after = await input.generateRepair(prompt, currentHtml);
    } catch {
      after = null;
    }

    const resolved = after !== null && issueResolvedAfterRepair(after, target.code);
    const beforeErrorCount = validateHtml(before).filter((i) => i.severity === 'error').length;
    const afterErrorCount = after !== null ? validateHtml(after).filter((i) => i.severity === 'error').length : beforeErrorCount + 1;
    const verified = after !== null && after !== before && afterErrorCount <= beforeErrorCount;

    rounds.push({ round, issue: target, prompt, before, after, resolved, verified });

    if (resolved && after) {
      currentHtml = after;
      resolvedCodes.add(target.code);
    } else {
      unresolved.push(target);
    }

    if (resolvedCodes.size >= issues.length) break;
  }

  return {
    html: currentHtml,
    rounds,
    resolvedCodes: Array.from(resolvedCodes),
    unresolved,
  };
}