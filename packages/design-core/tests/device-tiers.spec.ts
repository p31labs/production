/**
 * device-tiers.spec.ts — W4 (device tiers) gate tests.
 *
 * Covers the additive W4 surface:
 *   1. device-tier token presence in canon tokens.css + tokens.dtc.json
 *      (p31.device.*) with existing p31.* values unchanged (additivity)
 *   2. fluid clamp() formula sanity (3-arg clamp, rem min/max, vi ideal)
 *   3. embedded shell emitter: budget check + --self-test negative control
 *
 * Reads committed canon artifacts (../canon/dist/tokens.css,
 * ../canon/tokens/tokens.dtc.json) and spawns the zero-dep emitter. No React.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { gzipSync } from 'node:zlib';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const PKG = join(here, '..');
const CANON_CSS = join(PKG, '..', 'canon', 'dist', 'tokens.css');
const CANON_DTCG = join(PKG, '..', 'canon', 'tokens', 'tokens.dtc.json');
const EMITTER = join(PKG, 'scripts', 'emit-embedded-shell.mjs');
const EMBEDDED_CSS = join(PKG, 'dist', 'embedded', 'p31-embedded.css');

const canonCss = readFileSync(CANON_CSS, 'utf8');
const dtcg = JSON.parse(readFileSync(CANON_DTCG, 'utf8'));

describe('device tiers — p31.device.* token group', () => {
  it('emits device-tier spacing/type/radius tokens for every tier in tokens.css', () => {
    const expected = [
      '--p31-device-phone-spacing-md',
      '--p31-device-phone-type-base',
      '--p31-device-phone-radius-md',
      '--p31-device-chromebook-spacing-md',
      '--p31-device-chromebook-type-base',
      '--p31-device-chromebook-radius-md',
      '--p31-device-desktop-spacing-md',
      '--p31-device-desktop-type-base',
      '--p31-device-desktop-radius-md',
      '--p31-device-embedded-spacing-md',
      '--p31-device-embedded-type-base',
      '--p31-device-embedded-radius-md',
    ];
    for (const name of expected) {
      expect(canonCss).toMatch(new RegExp(`${name}\\s*:`));
    }
  });

  it('emits window-size-class thresholds and pointer hints', () => {
    for (const name of [
      '--p31-device-phone-max: 600px',
      '--p31-device-chromebook-min: 601px',
      '--p31-device-chromebook-max: 1280px',
      '--p31-device-desktop-min: 1281px',
      '--p31-device-embedded-max: 480px',
      '--p31-device-phone-pointer-coarse: 1',
      '--p31-device-phone-pointer-fine: 0',
      '--p31-device-chromebook-pointer-coarse: 1',
      '--p31-device-chromebook-pointer-fine: 1',
      '--p31-device-desktop-pointer-fine: 1',
    ]) {
      expect(canonCss).toContain(name);
    }
  });

  it('nests p31.device.* as structured DTCG nodes', () => {
    // $extensions.p31 (css/themesCss) rides on every semantic slot by design
    // (gen-tokens.mjs SD v5 emission) — assert the structured pair, not the
    // whole node.
    expect(dtcg.p31.device.phone.max).toMatchObject({ $value: { value: 600, unit: 'px' }, $type: 'dimension' });
    expect(dtcg.p31.device.embedded.type.base).toMatchObject({ $value: { value: 14, unit: 'px' }, $type: 'dimension' });
    expect(dtcg.p31.device.phone.pointer.coarse).toMatchObject({ $value: 1, $type: 'number' });
  });

  it('is additive — existing p31.* values are unchanged', () => {
    // Spot-check a set of pre-W4 values across BASE, GLOBAL_COMPAT, and
    // semantic slots. A change to any of these is a regression for live
    // portal consumers.
    for (const needle of [
      '--p31-base: 16px',
      '--p31-radius-sm: 8px',
      '--p31-touch-min: 48px',
      '--p31-space-tiny: 2px',
      '--p31-space-inline-sm: 8px',
      '--p31-space-inline-md: 16px',
      '--p31-topbar-height: var(--p31-header-height)', // D3 ratification (2026-10-13): deprecated alias, was 64px
      '--p31-color-action-primary: oklch(70% 0.15 200)',
      '--p31-status-error: oklch(65% 0.18 20)',
      '--p31-font-size-md: 16px',
    ]) {
      expect(canonCss).toContain(needle);
    }
  });
});

describe('fluid tokens — clamp() formula sanity', () => {
  const fluidLines = canonCss
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.startsWith('--p31-fluid-'));

  it('emits the fluid token pairs as CSS custom properties', () => {
    expect(fluidLines.length).toBeGreaterThanOrEqual(11);
    for (const name of [
      '--p31-fluid-text-base',
      '--p31-fluid-text-lg',
      '--p31-fluid-text-display',
      '--p31-fluid-space-sm',
      '--p31-fluid-space-md',
      '--p31-fluid-radius-md',
    ]) {
      expect(fluidLines.some((l) => l.startsWith(`${name}:`))).toBe(true);
    }
  });

  it('every fluid value is a clamp() with exactly 3 comma-separated args', () => {
    const clamp3 = /^clamp\([^()]+,[^()]+,[^()]+\)$/;
    for (const line of fluidLines) {
      const value = line.slice(line.indexOf(':') + 1).trim().replace(/;$/, '');
      expect(value).toMatch(clamp3);
    }
  });

  it('min/max args are rem-based (WCAG 1.4.4 resize-safe) and ideal uses vi', () => {
    for (const line of fluidLines) {
      const value = line.slice(line.indexOf(':') + 1).trim().replace(/;$/, '');
      const [, minArg, idealArg, maxArg] = value.match(/^clamp\(([^()]+),([^()]+),([^()]+)\)$/);
      expect(minArg.trim()).toContain('rem');
      expect(maxArg.trim()).toContain('rem');
      expect(idealArg.trim()).toContain('vi');
    }
  });

  it('min never exceeds max for the text pair', () => {
    const line = fluidLines.find((l) => l.startsWith('--p31-fluid-text-base:'));
    const value = line.slice(line.indexOf(':') + 1).trim().replace(/;$/, '');
    const [, minArg, , maxArg] = value.match(/^clamp\(([^()]+),([^()]+),([^()]+)\)$/);
    const minRem = parseFloat(minArg);
    const maxRem = parseFloat(maxArg);
    expect(minRem).toBeLessThan(maxRem);
  });
});

describe('embedded shell emitter — budget + negative control', () => {
  const node = process.execPath;

  it('emits a minimal subset under the byte budgets (--check exits 0)', () => {
    execFileSync(node, [EMITTER, '--check'], { stdio: 'pipe' });
    expect(existsSync(EMBEDDED_CSS)).toBe(true);
    const css = readFileSync(EMBEDDED_CSS, 'utf8');
    const raw = Buffer.byteLength(css, 'utf8');
    const gzip = gzipSync(css, { level: 9 }).length;
    expect(raw).toBeLessThan(20480);
    expect(gzip).toBeLessThan(8192);
    // 20–30 tokens, one font stack, one focus ring
    const tokenCount = (css.match(/--p31-[a-zA-Z0-9-]+\s*:/g) ?? []).length;
    expect(tokenCount).toBeGreaterThanOrEqual(20);
    expect(tokenCount).toBeLessThanOrEqual(30);
    expect(css).toMatch(/:focus-visible\s*\{/);
    expect(css).toContain('--p31-font-family-sans:');
    expect(css).toContain('--p31-surface-background:');
    expect(css).toContain('--p31-color-action-primary:');
    expect(css).toContain('--p31-radius-md:');
    expect(css).toContain('--p31-space-inline-sm:');
    expect(css).toContain('--p31-device-embedded-type-base:');
    // subset only — token VALUES carry no var() chains (the focus-ring rule
    // is the single allowed consumer of the emitted vars)
    const decls = [...css.matchAll(/^\s*(--p31-[a-zA-Z0-9-]+)\s*:\s*([^;]+);/gm)];
    expect(decls.length).toBeGreaterThanOrEqual(20);
    for (const [, , value] of decls) {
      expect(value.trim()).not.toMatch(/^var\(/);
    }
    expect(css).not.toContain('--p31-glass-');
    expect(css).not.toContain('--p31-neon');
  });

  it('writes the gzip sibling with LittleFS naming (same base name + .gz)', () => {
    execFileSync(node, [EMITTER], { stdio: 'pipe' });
    expect(existsSync(join(PKG, 'dist', 'embedded', 'p31-embedded.css.gz'))).toBe(true);
  });

  it('--self-test proves the budget check fails on an injected oversized token', () => {
    const out = execFileSync(node, [EMITTER, '--self-test'], { encoding: 'utf8', stdio: 'pipe' });
    expect(out).toContain('negative control proven');
  });
});