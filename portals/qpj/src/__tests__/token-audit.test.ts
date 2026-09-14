import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { createRequire } from 'node:module';

const LOADED_DC_CSS = [
  'base.css',
  'tokens.css',
  'layout.css',
  'recipes.css',
  'motion.css',
  'typography.css',
  'chrome.css',
  'container.css',
];

function dcCssDir(): string {
  const req = createRequire(import.meta.url);
  const tokens = req.resolve('@p31/design-core/css/tokens.css');
  return dirname(tokens);
}

function listSrcCss(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...listSrcCss(p));
    } else if (entry.name.endsWith('.css')) {
      out.push(p);
    }
  }
  return out;
}

const stripComments = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '');

function readForAudit(): { reads: string[]; defs: Set<string> } {
  const sources = [
    ...LOADED_DC_CSS.map((f) => join(dcCssDir(), f)),
    ...listSrcCss('src'),
  ];
  const reads: string[] = [];
  const defs = new Set<string>();
  for (const f of sources) {
    const css = stripComments(readFileSync(f, 'utf8'));
    for (const m of css.matchAll(/var\(--p31-[a-z0-9-]+[,)]/g)) {
      reads.push(m[0].slice(4, -1));
    }
    for (const m of css.matchAll(/--p31-[a-z0-9-]+:/g)) {
      defs.add(m[0].slice(0, -1));
    }
  }
  return { reads, defs };
}

describe('design-core token audit', () => {
  it('renders no undefined tokens: every var(--p31-*) read resolves to a definition', () => {
    const { reads, defs } = readForAudit();
    const undefinedReads = reads.filter((t) => !defs.has(t));
    expect(undefinedReads).toEqual([]);
  });

  it('shows the resolved token layering is intentional (no dupes in the family sheet)', () => {
    const { defs } = readForAudit();
    expect(defs.has('--p31-accent')).toBe(true);
    expect(defs.has('--p31-ease-kuramoto')).toBe(true);
    expect(defs.has('--p31-accent-gold')).toBe(true);
  });
});

function listSrcTsx(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...listSrcTsx(p));
    } else if (entry.name.endsWith('.tsx')) {
      out.push(p);
    }
  }
  return out;
}

describe('design-system surface guards', () => {
  it('no raw button--* classes in TSX (design-core Button is canonical)', () => {
    const offenders = listSrcTsx('src').filter((f) =>
      /className="[^"]*button--(primary|secondary|ghost)/.test(readFileSync(f, 'utf8')),
    );
    expect(offenders).toEqual([]);
  });

  it('inline style={{ var(--p31-*) }} reads resolve to definitions', () => {
    const reads: string[] = [];
    for (const f of listSrcTsx('src')) {
      const src = readFileSync(f, 'utf8');
      for (const m of src.matchAll(/style=\{\{[\s\S]*?\}\}/g)) {
        for (const t of m[0].matchAll(/var\(--p31-[a-z0-9-]+/g)) {
          reads.push(t[0].slice(4, -1));
        }
      }
    }
    const { defs } = readForAudit();
    expect(reads.filter((r) => !defs.has(r))).toEqual([]);
  });
});