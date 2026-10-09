#!/usr/bin/env node
/**
 * scripts/theme-check.mjs — the theme gate (N4).
 *
 * Validates the P31 Quantum skin against the OpenCode theme schema:
 *   - must be strict JSON
 *   - must have a name
 *   - must define the 8 base hues, each with 9 steps (100–900)
 *   - must define dark + light modes with background/foreground
 *
 * Negative control: a malformed theme JSON fails.
 *
 * Usage: node scripts/theme-check.mjs [themePath]
 */
import { readFileSync, existsSync } from 'node:fs';

const CANDIDATES = process.argv.slice(2).length
  ? process.argv.slice(2)
  : [
      '/home/p31/.config/opencode/themes/p31-quantum.json',
      '/home/p31/production/.opencode/themes/p31-quantum.json',
    ];

const REQUIRED_HUES = ['gray', 'red', 'orange', 'yellow', 'green', 'cyan', 'blue', 'purple'];
const STEPS = [100, 200, 300, 400, 500, 600, 700, 800, 900];

let failures = 0;

for (const file of CANDIDATES) {
  if (!existsSync(file)) {
    console.error(`theme-check FAIL — not found: ${file}`);
    failures++;
    continue;
  }
  let theme;
  try {
    theme = JSON.parse(readFileSync(file, 'utf8'));
  } catch (e) {
    console.error(`theme-check FAIL — ${file} is not valid JSON: ${e.message}`);
    failures++;
    continue;
  }

  const problems = [];
  if (!theme.name) problems.push('missing "name"');
  if (!theme.base?.hues) problems.push('missing "base.hues"');

  for (const hue of REQUIRED_HUES) {
    const steps = theme.base?.hues?.[hue];
    if (!steps) { problems.push(`missing hue "${hue}"`); continue; }
    for (const step of STEPS) {
      if (!steps[String(step)]) problems.push(`hue "${hue}" missing step ${step}`);
    }
  }
  for (const mode of ['dark', 'light']) {
    const m = theme[mode];
    if (!m) { problems.push(`missing "${mode}" mode`); continue; }
    if (!m.background) problems.push(`"${mode}" missing background`);
    if (!m.foreground) problems.push(`"${mode}" missing foreground`);
  }

  if (problems.length) {
    console.error(`theme-check FAIL — ${file}:\n  ${problems.join('\n  ')}`);
    failures++;
  } else {
    console.log(`theme-check pass — ${theme.name} (${file})`);
  }
}

if (failures) {
  console.error(`\ntheme-check FAIL — ${failures} theme file(s) invalid`);
  process.exit(1);
}
console.log(`\ntheme-check pass — ${CANDIDATES.length} theme file(s) valid`);