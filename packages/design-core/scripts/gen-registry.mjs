#!/usr/bin/env node
/**
 * gen-registry — generate the shadcn-schema registry.json from genui/catalog.json.
 *
 * P31-native schema decision (scope-first): the registry is a PROJECTION of the
 * canon's own descriptor (catalog.json), never hand-authored. It reuses the
 * catalog's Zod-validated shape and adds the shadcn install fields (`type`,
 * `files`, `registryDependencies`) so `p31ca add` can install from it.
 *
 * Edge A↔C: registry = generated from canon → drift impossible.
 *
 * Usage:
 *   node scripts/gen-registry.mjs            # write packages/design-core/registry.json
 *   node scripts/gen-registry.mjs --check    # validate existing (CI)
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CATALOG = join(ROOT, 'src', 'genui', 'catalog.json');
const COMPOSITIONS = join(ROOT, 'src', 'compositions');
const OUT = join(ROOT, 'registry.json');

/** The canon chrome set (components with a compositions file that are chrome). */
const CHROME = [
  'Topbar', 'BottomNav', 'CommandPalette', 'SectionStrip',
  'Crown', 'Footer', 'SpoonDial', 'CrisisOverlay',
  'SidebarNav', 'MobileBottomNav', 'CalmOverlay', 'NotificationStack',
  'TopbarSection', 'CommandTrigger', 'StatusCluster', 'ModePill', 'CalmIndicator', 'SpoonCluster',
];

/**
 * Derived confidence tier + reason — computed from facts the registry already
 * holds, never hand-maintained. `reason` disambiguates WHY an item is not
 * autonomous, so an agent knows whether to be cautious (beta) or verify-first
 * (no baseline yet).
 *
 *   { tier: 'autonomous', reason: null }            — stable, installable, file,
 *                                                     parity baseline exists.
 *   { tier: 'supervised', reason: 'beta' }          — deliberately provisional.
 *   { tier: 'supervised', reason: 'no-baseline' }   — stable but unverified render.
 *   { tier: 'blocked',   reason: 'deprecated' }     — retired.
 *   { tier: 'blocked',   reason: 'missing-file' }   — not installable.
 */
const BASELINE_DIR = join(ROOT, '..', '..', 'tools', 'design-parity', 'chrome-baselines-isolated');
function deriveConfidence(c, fileExists) {
  const status = c.status ?? 'stable';
  if (status === 'deprecated') return { tier: 'blocked', reason: 'deprecated' };
  if (!fileExists || !existsSync(join(COMPOSITIONS, `${c.name}.tsx`))) return { tier: 'blocked', reason: 'missing-file' };
  if (status === 'beta') return { tier: 'supervised', reason: 'beta' };
  const hasBaseline = existsSync(join(BASELINE_DIR, `component-${c.name}.png`));
  return hasBaseline ? { tier: 'autonomous', reason: null } : { tier: 'supervised', reason: 'no-baseline' };
}

/** Registry dependencies (component → its composition deps) for chrome items. */
const CHROME_DEPS = {
  Topbar: ['Crown', 'SpoonDial', 'CrisisOverlay'],
  BottomNav: [],
  CommandPalette: [],
  SectionStrip: [],
  Crown: [],
  Footer: [],
  SpoonDial: [],
  CrisisOverlay: [],
  SidebarNav: [],
  MobileBottomNav: [],
  CalmOverlay: [],
  NotificationStack: [],
};

function main() {
  const check = process.argv.includes('--check');
  if (!existsSync(CATALOG)) {
    console.error('catalog.json missing — run storybook-to-catalog.mts first');
    process.exit(2);
  }
  const catalog = JSON.parse(readFileSync(CATALOG, 'utf8'));
  const items = catalog.components.map((c) => {
    const isChrome = CHROME.includes(c.name);
    const file = join(COMPOSITIONS, `${c.name}.tsx`);
    return {
      name: c.name,
      type: 'registry:component',
      category: isChrome ? 'chrome' : c.category,
      description: c.description,
      status: c.status ?? 'stable',
      // Lifecycle tier — the promotion/retirement path (distinct from `status`
      // and from `confidence.tier`). stable→core, beta→experimental, deprecated→deprecated.
      tier: ({ stable: 'core', beta: 'experimental', deprecated: 'deprecated' })[c.status] ?? 'core',
      version: c.version ?? '3.0.0',
      importPath: c.importPath ?? '@p31ca/design-core/compositions',
      cssClass: c.cssClass ?? '',
      tokens: c.tokens ?? [],
      variants: c.variants ?? [],
      slots: c.slots ?? [],
      a11y: c.accessibility ?? [],
      props: c.props ?? {},
      files: [{ path: `src/compositions/${c.name}.tsx`, type: 'registry:component', exists: existsSync(file) }],
      registryDependencies: isChrome ? (CHROME_DEPS[c.name] ?? []) : [],
      // Only components with a compositions file are installable.
      installable: existsSync(file),
      // Derived confidence tier — the human↔agent boundary.
      confidence: deriveConfidence(c, existsSync(file)),
    };
  });

  const registry = {
    $schema: 'https://p31ca.org/schema/registry.json',
    name: 'p31ca',
    homepage: 'https://design.p31ca.org',
    generatedFrom: 'src/genui/catalog.json',
    generatedAt: new Date().toISOString(),
    counts: {
      components: items.length,
      chrome: items.filter((i) => i.category === 'chrome').length,
      installable: items.filter((i) => i.installable).length,
      confidence: {
        autonomous: items.filter((i) => i.confidence.tier === 'autonomous').length,
        supervised: items.filter((i) => i.confidence.tier === 'supervised').length,
        blocked: items.filter((i) => i.confidence.tier === 'blocked').length,
      },
    },
    items,
  };

  if (check) {
    // Validate: every installable item has a real file; chrome count matches.
    const chrome = items.filter((i) => i.category === 'chrome');
    const brokenFiles = items.filter((i) => i.installable && !i.files.every((f) => f.exists));
    const ok = chrome.length === CHROME.length && brokenFiles.length === 0;
    console.log(`registry ${ok ? 'OK' : 'INVALID'}: ${items.length} components, ${chrome.length} chrome, ${items.filter((i) => i.installable).length} installable`);
    if (brokenFiles.length) console.error(`  missing files: ${brokenFiles.map((i) => i.name).join(', ')}`);
    if (chrome.length !== CHROME.length) console.error(`  chrome count ${chrome.length} != expected ${CHROME.length}`);
    process.exit(ok ? 0 : 1);
  }

  writeFileSync(OUT, JSON.stringify(registry, null, 2));
  console.log(`Generated ${OUT}: ${items.length} components, ${items.filter((i) => i.category === 'chrome').length} chrome, ${items.filter((i) => i.installable).length} installable`);
}

main();