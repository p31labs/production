#!/usr/bin/env node
/**
 * style-alignment-inventory.mjs — H4-collapse lane: sweep inventory.
 *
 * The hub (apps/p31ca) carries page-by-page Tailwind utility classes that the
 * next lane sweeps into per-page `@layer legacy` styles. This script is the
 * inventory half of that tooling: it walks apps/p31ca/src/pages and
 * apps/p31ca/src/components, extracts every class/className attribute value,
 * and classifies tokens against a curated Tailwind utility root list (leading
 * variant prefixes like `md:` / `hover:` and `[...]` arbitrary values are
 * stripped before the root match).
 *
 * It NEVER edits page or component files. Its only write is the manifest:
 *   scripts/style-alignment-exclude.json
 *
 * `exclude[]` is the swept-file allowlist. The seed is empty — every
 * inventoried file is a candidate. The sweep lane appends each completed file
 * to exclude[] as it lands; this script preserves exclude[] across runs and
 * re-emits the inventory + remaining-candidate counts.
 *
 * Usage:
 *   node scripts/style-alignment-inventory.mjs             # write manifest + one summary line
 *   node scripts/style-alignment-inventory.mjs --verbose   # summary + top-10 files and classes
 *   node scripts/style-alignment-inventory.mjs --stdout    # JSON to stdout, no file write
 *   node scripts/style-alignment-inventory.mjs --roots=a,b # override scan roots (comma-separated)
 *
 * Determinism: sorted file/class ordering, no timestamps, no network, zero
 * dependencies (plain node).
 */
import { readFileSync, readdirSync, writeFileSync, existsSync, lstatSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const DEFAULT_ROOTS = [
  'apps/p31ca/src/pages',
  'apps/p31ca/src/components',
];
const EXTENSIONS = ['.astro', '.tsx', '.jsx', '.ts', '.js'];
const MANIFEST_PATH = join(ROOT, 'scripts', 'style-alignment-exclude.json');

// Curated Tailwind utility roots. Prefix roots end in `-` (match any longer
// token starting with the root); exact roots match the token itself or any
// `root-...` / `root[...]` continuation.
const UTILITY_ROOTS = [
  // display / layout
  'container', 'block', 'inline', 'flex', 'grid', 'contents', 'table',
  'flow-root', 'list-item', 'hidden', 'aspect-', 'columns-',
  // position
  'static', 'fixed', 'absolute', 'relative', 'sticky', 'inset-', 'start-',
  'end-', 'top-', 'right-', 'bottom-', 'left-', 'z-', 'float-', 'clear-',
  'isolate', 'isolation', 'overflow-', 'overscroll-', 'visible', 'invisible',
  'collapse',
  // flex / grid
  'flex-', 'basis-', 'grow', 'shrink', 'order-', 'grid-cols-', 'grid-rows-',
  'grid-flow-', 'auto-cols-', 'auto-rows-', 'col-', 'row-', 'auto-flow-',
  'gap-', 'justify-', 'content-', 'items-', 'self-', 'place-',
  // spacing
  'p-', 'px-', 'py-', 'pt-', 'pr-', 'pb-', 'pl-', 'ps-', 'pe-', 'm-', 'mx-',
  'my-', 'mt-', 'mr-', 'mb-', 'ml-', 'ms-', 'me-', 'space-x-', 'space-y-',
  // sizing
  'w-', 'min-w-', 'max-w-', 'h-', 'min-h-', 'max-h-', 'size-',
  // typography
  'font-', 'text-', 'tracking-', 'leading-', 'list-', 'placeholder-',
  'underline', 'overline', 'line-through', 'no-underline', 'uppercase',
  'lowercase', 'capitalize', 'normal-case', 'italic', 'not-italic',
  'antialiased', 'subpixel-antialiased', 'truncate', 'text-ellipsis',
  'text-clip', 'align-', 'whitespace-', 'break-', 'hyphens-', 'decoration-',
  'indent-', 'vertical-align-', 'prose',
  // backgrounds / borders / effects
  'bg-', 'from-', 'via-', 'to-', 'border', 'divide-', 'outline', 'ring',
  'ring-offset', 'rounded-', 'shadow-', 'opacity-', 'mix-blend-',
  'bg-blend-',
  // filters
  'blur-', 'brightness-', 'contrast-', 'drop-shadow-', 'grayscale-',
  'hue-rotate-', 'invert-', 'saturate-', 'sepia-', 'backdrop-',
  // tables
  'border-collapse', 'border-separate', 'table-auto', 'table-fixed',
  'caption-', 'border-spacing-',
  // transitions / animation
  'animate-', 'transition', 'duration-', 'ease-', 'delay-',
  // transforms
  'scale-', 'rotate-', 'translate-', 'skew-', 'origin-', 'perspective-',
  'transform',
  // interactivity
  'cursor-', 'select-', 'resize-', 'scroll-', 'snap-', 'touch-',
  'pointer-events-', 'appearance-',
  // svg / media / misc
  'fill-', 'stroke-', 'object-', 'accent-', 'caret-', 'will-change-',
  'forced-color-adjust-', 'content-', 'empty-', 'group', 'peer',
  // accessibility
  'sr-only', 'not-sr-only',
];

// One leading `word:` / `[...]` arbitrary variant per pass; up to 4 deep.
const VARIANT_RE = /^([\w-]+|\[[^\]\n]+\]):/;

/** True when the token's base (variants stripped) starts with a utility root. */
function isUtilityClass(rawToken) {
  let token = rawToken.trim().replace(/^['"]+|['"]+$/g, '');
  if (!token) return false;
  for (let i = 0; i < 4; i += 1) {
    const m = token.match(VARIANT_RE);
    if (!m) break;
    token = token.slice(m[0].length);
  }
  if (!token) return false;
  for (const root of UTILITY_ROOTS) {
    if (root.endsWith('-')) {
      if (token.length > root.length && token.startsWith(root)) return true;
    } else if (token === root || token.startsWith(`${root}-`) || token.startsWith(`${root}[`)) {
      return true;
    }
  }
  return false;
}

/** Count utilities in one class attribute value; returns occurrence map. */
function countTokens(value, map) {
  for (const raw of value.split(/\s+/)) {
    if (isUtilityClass(raw)) map.set(raw, (map.get(raw) ?? 0) + 1);
  }
}

/** Walk a directory for files with the accepted extensions. */
function walk(dir, out = []) {
  let entries = [];
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const entry of entries) {
    const p = join(dir, entry);
    let st;
    try {
      st = lstatSync(p);
    } catch {
      continue;
    }
    if (st.isSymbolicLink()) continue;
    if (st.isDirectory()) {
      if (entry === 'node_modules' || entry === 'dist' || entry === '.git') continue;
      walk(p, out);
    } else if (EXTENSIONS.some((ext) => entry.endsWith(ext))) {
      out.push(p);
    }
  }
  return out;
}

const args = process.argv.slice(2);
const verbose = args.includes('--verbose');
const toStdout = args.includes('--stdout');
const rootsArg = args.find((a) => a.startsWith('--roots='));
const roots = (rootsArg ? rootsArg.slice('--roots='.length) : DEFAULT_ROOTS.join(','))
  .split(',')
  .map((r) => resolve(ROOT, r.trim()))
  .filter(Boolean);

const missing = roots.filter((r) => !existsSync(r));
if (missing.length > 0) {
  console.warn(`style-alignment-inventory SKIP — scan roots missing: ${missing.join(', ')}`);
  process.exit(0);
}

const QUOTED_RE = /class(?:Name)?\s*=\s*"([^"]*)"/g;
const BRACED_RE = /class(?:Name)?\s*=\s*\{([^}]{0,300})\}/g;
const STRING_RE = /'([^']*)'|"([^"]*)"/g;

const fileStats = new Map(); // path -> { occurrences, classes: Map }
let classAttributes = 0;
let filesScanned = 0;

for (const root of roots) {
  for (const filePath of walk(root).sort()) {
    filesScanned += 1;
    const source = readFileSync(filePath, 'utf8');
    const classes = new Map();
    for (const m of source.matchAll(QUOTED_RE)) {
      classAttributes += 1;
      countTokens(m[1], classes);
    }
    for (const m of source.matchAll(BRACED_RE)) {
      classAttributes += 1;
      const expr = m[1];
      for (const s of expr.matchAll(STRING_RE)) {
        countTokens(s[1] ?? s[2] ?? '', classes);
      }
    }
    if (classes.size > 0) fileStats.set(filePath, classes);
  }
}

const rel = (p) => p.slice(ROOT.length).replace(/^\//, '');

const files = [];
let utilityOccurrences = 0;
const globalClasses = new Map();
for (const [filePath, classes] of [...fileStats.entries()].sort(([a], [b]) => rel(a).localeCompare(rel(b)))) {
  let occurrences = 0;
  const list = [];
  for (const [cls, n] of [...classes.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    occurrences += n;
    list.push({ class: cls, occurrences: n });
    globalClasses.set(cls, (globalClasses.get(cls) ?? 0) + n);
  }
  utilityOccurrences += occurrences;
  files.push({
    path: rel(filePath),
    utilityOccurrences: occurrences,
    uniqueUtilities: list.length,
    classes: list,
  });
}

const topUtilityClasses = [...globalClasses.entries()]
  .sort(([a, an], [b, bn]) => bn - an || a.localeCompare(b))
  .slice(0, 20)
  .map(([cls, n]) => ({ class: cls, occurrences: n }));

// Preserve the sweep lane's exclude[] edits across re-runs; seed it empty.
const prior = existsSync(MANIFEST_PATH)
  ? JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'))
  : null;
const exclude = [...new Set(Array.isArray(prior?.exclude) ? prior.exclude : [])].sort();
const candidates = files.filter((f) => !exclude.includes(f.path)).length;

const manifest = {
  id: 'style-alignment-exclude',
  schemaVersion: 1,
  generatedBy: 'scripts/style-alignment-inventory.mjs',
  purpose: 'H4-collapse lane tracking: page-by-page Tailwind → @layer legacy sweep on apps/p31ca. exclude[] is the swept-file allowlist (empty seed: every inventoried file is a candidate). The sweep lane appends each completed file; re-run this script to refresh the remaining-candidate counts.',
  scan: {
    roots: roots.map(rel),
    extensions: EXTENSIONS,
    heuristic: 'class/className attribute values are tokenized on whitespace; a token is a Tailwind utility when its base (after stripping up to 4 leading variant prefixes and any [..] arbitrary-value suffix) starts with a curated utility root list.',
  },
  exclude,
  totals: {
    filesScanned,
    filesWithUtilities: files.length,
    classAttributes,
    utilityOccurrences,
    uniqueUtilityClasses: globalClasses.size,
    candidatesRemaining: candidates,
    excluded: exclude.length,
  },
  files,
  topUtilityClasses,
};

const json = `${JSON.stringify(manifest, null, 2)}\n`;

if (!toStdout) writeFileSync(MANIFEST_PATH, json);

const summary = [
  `style-alignment-inventory: ${filesScanned} files scanned, ${files.length} with utilities, `,
  `${utilityOccurrences} utility occurrences across ${globalClasses.size} unique classes; `,
  `candidates ${candidates} / excluded ${exclude.length} → ${toStdout ? 'stdout' : rel(MANIFEST_PATH)}`,
].join('');
// Keep stdout pure JSON under --stdout so the manifest is pipeable.
(toStdout ? process.stderr : process.stdout).write(`${summary}\n`);

if (verbose) {
  const topFiles = [...files].sort((a, b) => b.utilityOccurrences - a.utilityOccurrences || a.path.localeCompare(b.path)).slice(0, 10);
  const out = toStdout ? process.stderr : process.stdout;
  out.write('\ntop 10 files (utility occurrences):\n');
  for (const f of topFiles) out.write(`  ${String(f.utilityOccurrences).padStart(5)}  ${f.path}\n`);
  out.write('\ntop 10 utility classes:\n');
  for (const c of topUtilityClasses.slice(0, 10)) out.write(`  ${String(c.occurrences).padStart(5)}  ${c.class}\n`);
}

if (toStdout) console.log(json);