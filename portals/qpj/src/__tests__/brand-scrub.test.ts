import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { BRAND } from '../lib/brand';
import { PASSENGERS } from '../lib/passports';

function listSrcFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== '__tests__') out.push(...listSrcFiles(p));
    } else if (/\.(ts|tsx)$/.test(entry.name)) {
      out.push(p);
    }
  }
  return out;
}

const stripComments = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

/** Surfaces that must name the brand by design (the pack picker). */
const BRAND_ALLOWLIST = new Set(['components/ThemeCharm.tsx']);

const REAL_NAMES = ['Kit', 'Riley', 'Chloe', 'Mum', 'Dad'];

describe('brand scrub', () => {
  it('defines the single source of brand copy', () => {
    expect(BRAND.name).toBe('Quantum Pickle Jar');
    expect(BRAND.short).toBe('QPJ');
    expect(BRAND.sub).toBe('Lantern');
  });

  it('leaves no hardcoded brand strings in src beyond the brand module', () => {
    const files = listSrcFiles('src').filter((f) => !f.endsWith('lib/brand.ts'));
    const offenders: string[] = [];
    for (const f of files) {
      const content = stripComments(readFileSync(f, 'utf8'));
      if (/Quantum Pickle Jar|Lantern|QPJ/.test(content)) {
        const rel = relative('src', f).replace(/\\/g, '/');
        if (!BRAND_ALLOWLIST.has(rel)) offenders.push(rel);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('leaves no family names on the street beyond the passport table', () => {
    const files = listSrcFiles('src').filter((f) => !f.endsWith('lib/passports.ts'));
    const offenders: string[] = [];
    for (const f of files) {
      const content = stripComments(readFileSync(f, 'utf8'));
      for (const name of REAL_NAMES) {
        const esc = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        if (new RegExp(`\\b${esc}\\b`).test(content)) {
          offenders.push(`${relative('src', f).replace(/\\/g, '/')} (${name})`);
          break;
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it('gives every passenger a unique pickle name', () => {
    for (const p of Object.values(PASSENGERS) as Array<{
      id: string;
      pickledName?: string;
    }>) {
      expect(typeof p.pickledName).toBe('string');
      expect(p.pickledName!.trim().length).toBeGreaterThan(0);
    }
    const ids = Object.keys(PASSENGERS);
    expect(new Set(ids).size).toBe(ids.length);
    const pickleSet = new Set(
      (Object.values(PASSENGERS) as Array<{ pickledName?: string }>)
        .map((p) => p.pickledName)
        .filter(Boolean),
    );
    expect(pickleSet.size).toBe(ids.length);
  });
});