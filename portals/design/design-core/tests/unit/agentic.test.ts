import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { parseIntent, summarize } from '../../src/agentic/intent/parser';
import { runQaGates } from '../../src/agentic/qa/gates';
import { loadExampleSpecs } from '../../src/agentic/orchestrate';

const EXAMPLES = join(__dirname, '../../src/agentic/intent/examples');

describe('intent DSL', () => {
  it('parses the canon reference spec (button-affirm)', () => {
    const res = parseIntent(readFileSync(join(EXAMPLES, 'button-affirm.yml'), 'utf8'));
    expect(res.ok).toBe(true);
    const spec = res.spec!;
    expect(spec.component).toBe('AffirmButton');
    expect(spec.constraints.accessibility.wcag).toBe('AAA');
    expect(spec.constraints.loveSemantics[0].reward).toBe(5);
    expect(spec.variants.map((v) => v.name)).toEqual(['affirm', 'cancel', 'exploratory']);
  });

  it('rejects narrative-free specs (Gemini contract)', () => {
    const res = parseIntent('component: Cold\nnarrative: "too short"\n');
    expect(res.ok).toBe(false);
    expect(res.errors?.join()).toContain('narrative');
  });

  it('every bundled example parses + passes Opus gates', () => {
    for (const f of readdirSync(EXAMPLES).filter((x) => x.endsWith('.yml'))) {
      const res = parseIntent(readFileSync(join(EXAMPLES, f), 'utf8'));
      if (!res.ok) throw new Error(`${f}: ${res.errors?.join('; ')}`);
      const report = runQaGates(res.spec!);
      const rejects = report.checks.filter((c) => c.status === 'reject');
      expect(rejects, `${f} rejected: ${JSON.stringify(rejects)}`).toEqual([]);
    }
  });

  it('gate rejects sub-48px AAA touch targets', () => {
    const res = parseIntent(
      `component: T\nnarrative: "A long enough narrative explaining a genuine human need here."\nconstraints:\n  accessibility: { wcag: AAA, touchTarget: 40 }\n`
    );
    expect(res.ok).toBe(true);
    expect(runQaGates(res.spec!).approved).toBe(false);
  });

  it('summarize emits opus-readable lines', () => {
    const res = parseIntent(readFileSync(join(EXAMPLES, 'crisis-exit.yml'), 'utf8'));
    const lines = summarize(res.spec!);
    expect(lines.some((l) => l.startsWith('a11y:'))).toBe(true);
    expect(lines.join('\n')).toContain('love:');
  });
});

describe('orchestration', () => {
  it('registry loads with all examples valid', () => {
    const registry = loadExampleSpecs();
    expect(Object.keys(registry).length).toBeGreaterThanOrEqual(10);
    for (const [name, r] of Object.entries(registry)) expect(r.ok, name).toBe(true);
  });
});
