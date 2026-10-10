#!/usr/bin/env node
/**
 * check-token-vocabulary.mjs — the vocabulary gate.
 *
 * Fails if any live source file references the old `primitive.` / `semantic.`
 * / `component.` token paths. After the p31.* migration, the canonical token
 * vocabulary is p31.* (SEMANTIC_MAP keys); any lingering old-path reference is
 * a consumer that was not repointed.
 *
 * Excludes docs, the meta sidecar, the generator, and the frozen grant set.
 */
import { execSync } from 'node:child_process';

const DIRS = ['cli', 'workers', 'packages', 'apps'];
const pattern = String.raw`\b(primitive|semantic|component)\.(color|glass|surface|text|spacing|radius|typography|scale|blur|shadow|border|neon|starfield|quantum|font|action|accent|void|cloud|status|z_index|animation|touch|breakpoints|root)\b`;

const EXCLUDES = [
  '-g', '!cli/tokens/tokens-css-template.css',
  '-g', '!cli/tokens/component-css-template.css',
  '-g', '!cli/tokens/releases/**',
  '-g', '!cli/tokens/export-dtcg.mjs',
  '-g', '!**/dist/**',
  '-g', '!**/generated/**',
  '-g', '!**/mcp/**',
  '-g', '!**/*.test.ts',
  '-g', '!workers/edge-render/src/design-system.json',
  '-g', '!packages/design-core/scripts/gen-tokens.mts',
];

let out = '';
try {
  out = execSync(`rg -n --no-ignore -e '${pattern}' ${DIRS.join(' ')} ${EXCLUDES.join(' ')} 2>/dev/null`, { encoding: 'utf8' }).trim();
} catch (e) {
  if (e.status === 1) {
    console.log('✅ token-vocabulary: no old primitive./semantic./component. token paths.');
    process.exit(0);
  }
  throw e;
}
if (out) {
  console.error('✗ token-vocabulary: old token-path references remain:');
  console.error(out.split('\n').slice(0, 15).join('\n'));
  process.exit(1);
}