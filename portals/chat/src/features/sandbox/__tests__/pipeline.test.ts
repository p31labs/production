import { describe, it, expect } from 'vitest';
import { validateHtml, runRubric, buildRepairPrompt, RUBRIC_BUCKETS, type ContractIssue } from '../pipeline';
import { detectAmbiguities, resolveClarify } from '../clarify';
import { tileRegions, verifyVisual } from '../visual';

describe('validateHtml', () => {
  it('flags hardcoded hex colors', () => {
    const html = `<button style="background:#ff0000">Go</button>`;
    const issues = validateHtml(html);
    expect(issues.some((i) => i.code === 'hardcoded-hex' && i.severity === 'error')).toBe(true);
  });

  it('flags raw rgba/rgb literals', () => {
    const html = `<style>.x{color:rgb(0,0,0)}</style>`;
    const issues = validateHtml(html);
    expect(issues.some((i) => i.code === 'rgba-literal')).toBe(true);
  });

  it('flags inline styles', () => {
    const html = `<div style="margin: 12px">panel</div>`;
    const issues = validateHtml(html);
    expect(issues.some((i) => i.code === 'inline-style' && i.severity === 'error')).toBe(true);
  });

  it('passes token-driven, semantic markup', () => {
    const html = `<div class="glass-panel"><button class="btn btn-primary">Continue</button></div>`;
    const critical = validateHtml(html).filter((i) => i.severity === 'error');
    expect(critical).toHaveLength(0);
  });

  it('flags blur overflow above 20px', () => {
    const html = `<style>.s{backdrop-filter: blur(28px);}</style>`;
    const issues = validateHtml(html);
    expect(issues.some((i) => i.code === 'blur-overflow')).toBe(true);
  });

  it('flags glass overuse above the spoon contract', () => {
    const surfaces = Array.from({ length: 7 }, (_, i) => `.g${i}{backdrop-filter: blur(8px);}`).join('');
    const html = `<style>${surfaces}</style>`;
    const issues = validateHtml(html);
    expect(issues.some((i) => i.code === 'glass-overuse')).toBe(true);
  });

  it('flags icon-only buttons missing aria-label', () => {
    const html = `<button><svg><circle r="4"/></svg></button>`;
    const issues = validateHtml(html);
    expect(issues.some((i) => i.code === 'icon-button-unlabelled')).toBe(true);
  });

  it('flags unlabelled inputs', () => {
    const html = `<input type="text">`;
    const issues = validateHtml(html);
    expect(issues.some((i) => i.code === 'input-unlabelled')).toBe(true);
  });

  it('sorts issues by priority, errors first within a priority', () => {
    const html = `
      <style>
        .a{color:#ff0000;backdrop-filter: blur(40px);}
        .b{color:rgb(1,2,3)}
      </style>
      <div style="padding: 8px">x</div>
    `;
    const issues = validateHtml(html);
    for (let idx = 1; idx < issues.length; idx++) {
      const prev = issues[idx - 1];
      const curr = issues[idx];
      if (prev.priority !== curr.priority) {
        expect(prev.priority).toBeLessThan(curr.priority);
      } else if (prev.severity !== curr.severity) {
        expect(prev.severity).toBe('error');
      }
    }
  });
});

describe('runRubric', () => {
  it('buckets issues by rubric priority', () => {
    const html = `<button style="color:#fff"><svg/></button><style>.b{backdrop-filter:blur(30px)}</style>`;
    const report = runRubric(html);
    expect(report.buckets).toHaveLength(RUBRIC_BUCKETS.length);
    expect(report.buckets[0].bucket.key).toBe('brand-glass');
    expect(report.buckets[0].issues.length).toBeGreaterThan(0);
    expect(report.prioritized.every((i) => i.priority >= 1 && i.priority <= 3)).toBe(true);
  });
});

describe('buildRepairPrompt', () => {
  it('produces a targeted, single-focus repair prompt', () => {
    const issue: ContractIssue = { code: 'hardcoded-hex', severity: 'error', priority: 1, contract: 'button', message: 'bad', found: '', suggestion: 'use tokens' };
    const prompt = buildRepairPrompt(issue, 0);
    expect(prompt).toContain('hardcoded-hex');
    expect(prompt).toContain('use tokens');
    expect(prompt).toContain('minimal, targeted fix');
  });

  it('reminds on repeated attempts without re-looping', () => {
    const issue: ContractIssue = { code: 'glass-overuse', severity: 'warning', priority: 2, contract: 'glass-panel', message: 'x', found: '', suggestion: 'dock glass' };
    const prompt = buildRepairPrompt(issue, 2);
    expect(prompt).toContain('repair attempt #3');
    expect(prompt).toContain('Do NOT repeat the same blind fix');
  });
});

describe('detectAmbiguities', () => {
  it('returns no questions for an explicit, fully-specified prompt', () => {
    const prompt = 'Build a calm glass dashboard grid layout with primary action buttons and reduced motion';
    expect(detectAmbiguities(prompt)).toHaveLength(0);
  });

  it('asks about intent for vague input', () => {
    const qs = detectAmbiguities('something nice');
    expect(qs.some((q) => q.key === 'intent')).toBe(true);
  });

  it('asks about surface when none is named', () => {
    const qs = detectAmbiguities('build a dashboard');
    expect(qs.some((q) => q.key === 'surface')).toBe(true);
  });

  it('caps questions at three', () => {
    const qs = detectAmbiguities('make it better');
    expect(qs.length).toBeLessThanOrEqual(3);
  });
});

describe('resolveClarify', () => {
  it('injects chosen answers as clarified intent', () => {
    const { prompt, notes } = resolveClarify('build a ui', { surface: 'glass', layout: 'grid' });
    expect(notes).toEqual(['surface: glass', 'layout: grid']);
    expect(prompt).toContain('Clarified intent');
    expect(prompt).toContain('surface: glass');
  });

  it('returns the raw prompt untouched when nothing was chosen', () => {
    const { prompt, notes } = resolveClarify('build a ui', {});
    expect(prompt).toBe('build a ui');
    expect(notes).toEqual([]);
  });
});

describe('tileRegions', () => {
  it('tiles a doc into semantic regions with paths', () => {
    const html = `<div class="shell"><header><button aria-label="Menu">x</button></header><main><h1>Title</h1><input type="text"></main></div>`;
    const regions = tileRegions(html);
    const semantic = regions.map((r) => `${r.tag}:${r.semantic}`);
    expect(semantic).toContain('header:header');
    expect(semantic).toContain('button:control');
    expect(semantic).toContain('main:main');
    expect(semantic).toContain('input:control');
    expect(regions.some((r) => r.semantic === 'control' && !!r.attrs['aria-label'])).toBe(true);
    expect(regions.every((r) => r.path.length > 0)).toBe(true);
  });
});

describe('verifyVisual', () => {
  it('flags a control region with no accessible name', () => {
    const html = `<button><svg><circle r="4"/></svg></button>`;
    const issues = verifyVisual(html);
    expect(issues.some((i) => i.code === 'visual-control-unlabelled' && i.severity === 'error')).toBe(true);
  });

  it('flags images missing alt', () => {
    const html = `<div><img src="a.png"></div>`;
    const issues = verifyVisual(html);
    expect(issues.some((i) => i.code === 'visual-image-alt')).toBe(true);
  });

  it('flags heading order skips', () => {
    const html = `<main><h1>A</h1><h3>B</h3></main>`;
    const issues = verifyVisual(html);
    expect(issues.some((i) => i.code === 'visual-heading-skip')).toBe(true);
  });

  it('passes fully-accessible markup', () => {
    const html = `<nav aria-label="Main"><a href="/">Home</a><a href="/2">Two</a><a href="/3">Three</a></nav><main><h1>A</h1><h2>B</h2></main>`;
    const critical = verifyVisual(html).filter((i) => i.severity === 'error');
    expect(critical).toEqual([]);
  });
});