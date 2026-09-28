#!/usr/bin/env node
/**
 * Image-level distinctness check (P2 / Wave 0 patch item 2).
 *
 * Asserts that the capacity-dial images differ at the FILE level — not just
 * the DOM. Guards against silent baseline collapse: if a future regeneration
 * renders s0 and s3 identically (broken CalmOverlay), this fails.
 *
 * Checks: for each route × theme, sha256(s0) != sha256(s3) != sha256(s5)
 * (s3 == s5 is CORRECT — motion-scale is duration-only, documented in the
 * manifest; the crisis boundary s0 must differ from both).
 *
 * Negative control: copy s0 over s3 → this must exit non-zero.
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';

const here = resolve(import.meta.dirname);
const BASELINE = resolve(here, '__screenshots__', 'acceptance-freeze.spec.ts');

const ROUTES = ['catalog', 'marketplace', 'brands'];
const THEMES = ['ocean', 'volt'];

const sha = (p) => createHash('sha256').update(readFileSync(p)).digest('hex');

let fail = 0;
for (const route of ROUTES) {
  for (const theme of THEMES) {
    const s0 = resolve(BASELINE, `${route}-${theme}-s0.png`);
    const s3 = resolve(BASELINE, `${route}-${theme}-s3.png`);
    const s5 = resolve(BASELINE, `${route}-${theme}-s5.png`);
    if (!existsSync(s0) || !existsSync(s3) || !existsSync(s5)) {
      console.error(`✗ DISTINCTNESS: missing baseline image for ${route}-${theme}`);
      fail = 1;
      continue;
    }
    const h0 = sha(s0), h3 = sha(s3), h5 = sha(s5);
    if (h0 === h3) {
      console.error(`✗ DISTINCTNESS: ${route}-${theme} s0 == s3 (crisis boundary collapsed — broken CalmOverlay?)`);
      fail = 1;
    } else if (h0 === h5) {
      console.error(`✗ DISTINCTNESS: ${route}-${theme} s0 == s5 (crisis boundary collapsed)`);
      fail = 1;
    } else {
      // s3 == s5 is CORRECT (duration-only motion). Log as info, not failure.
      console.log(`  ${route}-${theme}: s0 ≠ s3/s5 ${h3 === h5 ? '(s3==s5 correct: duration-only motion)' : ''}`);
    }
  }
}

if (fail) {
  console.error('\n✗ IMAGE DISTINCTNESS: crisis boundary not distinct. Regenerate rejected.');
  process.exit(1);
}
console.log('\n✅ IMAGE DISTINCTNESS: s0 crisis boundary distinct from s3/s5 on all 6 route-theme pairs.');