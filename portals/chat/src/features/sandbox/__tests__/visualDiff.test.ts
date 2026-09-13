import { describe, it, expect } from 'vitest';
import {
  normalizeDom,
  hashString,
  captureAndDiff,
  analyzeDomDiff,
  visualDiffVerdictToIssue,
} from '../visualDiff';
import { repairLoop, selectNextIssue, issueResolvedAfterRepair, type ContractIssue } from '../pipeline';

describe('normalizeDom', () => {
  it('is stable across attribute order and insignificant whitespace', () => {
    const a = `<div><button class="btn" aria-label="Go"> Go </button></div>`;
    const b = `<div>\n<button  aria-label="Go" class="btn">Go</button>\n</div>`;
    expect(normalizeDom(a)).toBe(normalizeDom(b));
  });

  it('differs when text content changes', () => {
    const a = `<div><p>Hello</p></div>`;
    const b = `<div><p>Hi there</p></div>`;
    expect(normalizeDom(a)).not.toBe(normalizeDom(b));
  });

  it('is stable across repeated parses', () => {
    const html = `<main><section class="glass"><h1>Title</h1></section></main>`;
    expect(normalizeDom(html)).toBe(normalizeDom(html));
  });
});

describe('hashString', () => {
  it('returns a stable hash for equal input', () => {
    const h1 = hashString(normalizeDom('<div>a</div>'));
    const h2 = hashString(normalizeDom('<div>a</div>'));
    expect(h1).toBe(h2);
  });

  it('varies on content change', () => {
    expect(hashString(normalizeDom('<div>a</div>'))).not.toBe(hashString(normalizeDom('<div>b</div>')));
  });
});

describe('captureAndDiff', () => {
  it('returns intentional-likely on first render without a baseline', () => {
    const result = captureAndDiff('<div>fresh</div>');
    expect(result.changed).toBe(true);
    expect(result.verdict).toBe('intentional-likely');
    expect(result.mode).toBe('first-run');
  });

  it('returns noise-likely when DOM is semantically unchanged', () => {
    const before = `<div><p>Hello</p></div>`;
    const after = `<div><p>Hello</p></div>`;
    const result = captureAndDiff(after, before);
    expect(result.changed).toBe(false);
    expect(result.verdict).toBe('noise-likely');
    expect(result.regions).toHaveLength(0);
  });

  it('flags a text change as intentional-likely', () => {
    const before = `<main><h1>Alpha</h1></main>`;
    const after = `<main><h1>Beta</h1></main>`;
    const result = captureAndDiff(after, before);
    expect(result.changed).toBe(true);
    expect(result.verdict).toBe('intentional-likely');
    expect(result.regions.some((r) => r.changeType === 'text')).toBe(true);
  });

  it('flags structural additions as regression-likely', () => {
    const before = `<div><button aria-label="A">A</button></div>`;
    const after = `<div><button aria-label="A">A</button><button aria-label="B">B</button></div>`;
    const result = captureAndDiff(after, before);
    expect(result.changed).toBe(true);
    expect(result.verdict).toBe('regression-likely');
    expect(result.regions.some((r) => r.changeType === 'position')).toBe(true);
  });

  it('exposes hashes and baseline metadata', () => {
    const before = `<div>a</div>`;
    const after = `<div>b</div>`;
    const result = captureAndDiff(after, before);
    expect(result.currentHash).toBeTruthy();
    expect(result.baselineHash).toBeTruthy();
    expect(result.baseline).toBe(before);
  });
});

describe('analyzeDomDiff mode passthrough', () => {
  it('honors pixel mode label', () => {
    const result = analyzeDomDiff({
      before: '<div>a</div>',
      after: '<div>a</div>',
      mode: 'pixel',
    });
    expect(result.mode).toBe('pixel');
    expect(result.verdict).toBe('noise-likely');
  });
});

describe('visualDiffVerdictToIssue', () => {
  it('returns null for clean / noise / intentional verdicts', () => {
    expect(visualDiffVerdictToIssue({ verdict: 'clean', changed: false, regions: [] } as never)).toBeNull();
    expect(visualDiffVerdictToIssue({ verdict: 'noise-likely', changed: false, regions: [] } as never)).toBeNull();
    expect(visualDiffVerdictToIssue({ verdict: 'intentional-likely', changed: true, regions: [] } as never)).toBeNull();
  });

  it('returns an error for regression-likely', () => {
    const issue = visualDiffVerdictToIssue({
      verdict: 'regression-likely',
      changed: true,
      regions: [{ changeType: 'position', description: 'New region added: x', confidence: 0.85 }],
    } as never);
    expect(issue).not.toBeNull();
    expect(issue!.severity).toBe('error');
    expect(issue!.priority).toBe(1);
  });

  it('returns a warning for ambiguous', () => {
    const issue = visualDiffVerdictToIssue({
      verdict: 'ambiguous',
      changed: true,
      regions: [{ changeType: 'color', description: 'Color changed', confidence: 0.85 }],
    } as never);
    expect(issue).not.toBeNull();
    expect(issue!.severity).toBe('warning');
    expect(issue!.code).toContain('ambiguous');
  });
});

const makeIssue = (code: string, severity: 'error' | 'warning', priority: 1 | 2 | 3): ContractIssue => ({
  code,
  severity,
  priority,
  contract: 'test',
  message: `issue ${code}`,
  found: '',
  suggestion: 'fix',
});

describe('selectNextIssue', () => {
  it('returns null with no issues or all resolved', () => {
    expect(selectNextIssue([], new Set())).toBeNull();
    expect(selectNextIssue([makeIssue('a', 'error', 1)], new Set(['a']))).toBeNull();
  });

  it('picks the highest-priority unresolved issue', () => {
    const issues = [
      makeIssue('low', 'warning', 3),
      makeIssue('high', 'error', 1),
      makeIssue('mid', 'error', 2),
    ];
    expect(selectNextIssue(issues, new Set())!.code).toBe('high');
    expect(selectNextIssue(issues, new Set(['high']))!.code).toBe('mid');
  });

  it('favors errors within a priority', () => {
    const issues = [
      makeIssue('warn', 'warning', 1),
      makeIssue('err', 'error', 1),
    ];
    expect(selectNextIssue(issues, new Set())!.code).toBe('err');
  });
});

describe('issueResolvedAfterRepair', () => {
  it('returns true when the offending pattern is gone', () => {
    expect(issueResolvedAfterRepair('<div class="ok"></div>', 'hardcoded-hex')).toBe(true);
    expect(issueResolvedAfterRepair('<button style="background:#fff"></button>', 'hardcoded-hex')).toBe(false);
  });
});

describe('repairLoop', () => {
  it('resolves each targeted issue one at a time', async () => {
    const input = {
      html: `<button style="background:#ff0000"><svg/></button>`,
      issues: [
        makeIssue('hardcoded-hex', 'error', 1),
        makeIssue('icon-button-unlabelled', 'error', 2),
      ],
      maxRounds: 3,
      generateRepair: async (prompt: string, currentHtml: string) => {
        if (prompt.includes('hardcoded-hex')) {
          return currentHtml.replace(/style="[^"]*"/, 'class="ok"');
        }
        if (prompt.includes('icon-button-unlabelled')) {
          return currentHtml.replace('<svg/>', '<svg aria-hidden="true"/>').replace('<button', '<button aria-label="Go"');
        }
        return currentHtml;
      },
    };
    const out = await repairLoop(input);
    expect(out.rounds).toHaveLength(2);
    expect(out.resolvedCodes.sort()).toEqual(['hardcoded-hex', 'icon-button-unlabelled']);
    expect(out.unresolved).toHaveLength(0);
    expect(validateNoHardcodedHex(out.html)).toBe(true);
  });

  it('stops early when a repair leaves the target unresolved', async () => {
    const input = {
      html: `<div style="color:#fff">x</div>`,
      issues: [makeIssue('hardcoded-hex', 'error', 1)],
      maxRounds: 2,
      generateRepair: async () => {
        throw new Error('generator failed');
      },
    };
    const out = await repairLoop(input);
    expect(out.resolvedCodes).toHaveLength(0);
    expect(out.unresolved.map((i) => i.code)).toContain('hardcoded-hex');
    expect(out.rounds[0].resolved).toBe(false);
  });

  it('respects maxRounds and does not over-iterate', async () => {
    let calls = 0;
    const html = `<style>.g1{backdrop-filter:blur(30px);}.g2{backdrop-filter:blur(30px);}.g3{backdrop-filter:blur(30px);}.g4{backdrop-filter:blur(30px);}.g5{backdrop-filter:blur(30px);}.g6{backdrop-filter:blur(30px);}.g7{backdrop-filter:blur(30px);}</style>`;
    const input = {
      html,
      issues: [makeIssue('blur-overflow', 'error', 2)],
      maxRounds: 4,
      generateRepair: async () => {
        calls++;
        return html;
      },
    };
    const out = await repairLoop(input);
    expect(calls).toBeLessThanOrEqual(4);
    expect(out.resolvedCodes).toHaveLength(0);
    expect(out.unresolved.length).toBeGreaterThan(0);
  });

  it('tracks per-issue attempt history in prompts', async () => {
    const prompts: string[] = [];
    const html = `<style>.g1{backdrop-filter:blur(30px);}.g2{backdrop-filter:blur(30px);}.g3{backdrop-filter:blur(30px);}.g4{backdrop-filter:blur(30px);}.g5{backdrop-filter:blur(30px);}.g6{backdrop-filter:blur(30px);}.g7{backdrop-filter:blur(30px);}</style>`;
    const input = {
      html,
      issues: [makeIssue('blur-overflow', 'error', 2)],
      maxRounds: 4,
      generateRepair: async (prompt: string) => {
        prompts.push(prompt);
        return html;
      },
    };
    await repairLoop(input);
    expect(prompts.length).toBeGreaterThan(1);
    expect(prompts[1]).toContain('repair attempt #2');
    expect(prompts[1]).toContain('Do NOT repeat the same blind fix');
  });
});

function validateNoHardcodedHex(html: string): boolean {
  return !/#[0-9a-fA-F]{3,8}\b/.test(html);
}