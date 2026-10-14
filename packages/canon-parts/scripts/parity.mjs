#!/usr/bin/env node
/**
 * @p31ca/canon-parts — scripts/parity.mjs  (fix-plan p31ca-phase2 §2.4)
 *
 * Same-HTML parity matrix: renders a representative prop matrix through BOTH
 * wrapper worlds and asserts IDENTICAL HTML strings.
 *
 *   React side: the real @p31ca/canon-react components (react-dom/server
 *               renderToStaticMarkup, react 19.3.0).
 *   Astro side: the real @p31ca/canon-astro .astro components, loaded through
 *               Vite (astro's getViteConfig) and rendered via
 *               astro/container renderToString (astro 6.4.8), slots passed
 *               as pre-rendered HTML strings (the container's slot API).
 *
 * RC1: any cell mismatch ⇒ fix the wrapper pair — never a test carve-out.
 * Both worlds render from the ONE @p31ca/canon-parts markup core; this gate
 * proves each world's prop/slot plumbing lands the same tree in the same
 * serialization.
 *
 * Matrix content conventions (documented, not carve-outs):
 *   - TEXT props (title/label/hint/…) are strings on both sides; both worlds
 *     escape text identically (React's escape rules), any characters allowed.
 *   - SLOT content is a markup-tree DESCRIPTION here ({tag,attrs,children}):
 *     React side → real React elements; Astro side → renderHtml() string.
 *     Content descs and slot strings must be HTML-safe (no raw & < > in text
 *     nodes — same constraint as writing HTML by hand).
 */
import { createServer } from 'vite';
import { getViteConfig } from 'astro/config';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement as h } from 'react';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { renderHtml } from '../src/markup.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const partsRoot = join(here, '..');
const astroRoot = join(partsRoot, '..', 'canon-astro');
const reactPkg = '@p31ca/canon-react';

/* ── content description helpers ──────────────────────────────────────── */

const el = (tag, attrs = [], children = []) => ({ tag, attrs, children });

/** desc → React element (matrix content constructor). */
function toReact(n) {
  if (n == null || typeof n === 'string' || typeof n === 'number') return n;
  const props = {};
  for (const [k, v] of n.attrs) {
    if (v == null) continue;
    props[k === 'class' ? 'className' : k] = v;
  }
  return h(n.tag, props, ...(n.children ?? []).map(toReact));
}

/* ── matrix ───────────────────────────────────────────────────────────── */
/* cell = {
 *   name, component,
 *   props: {…}                    — text props, same on both worlds
 *   content: { slotName: desc|string } — slot content; 'default' → React children
 * }
 * React slot-name → prop mapping: default→children; everything else maps to
 * the same-named ReactNode prop (topbar, sidebar, a, b, actions, controls,
 * empty, summary, focus, action).
 */

const btnDesc = (label, variant = 'primary') =>
  el('button', [['type', 'button'], ['class', 'p31-btn'], ['data-variant', variant], ['data-size', 'md']], [label]);

const matrix = [
  // ── Shell ──────────────────────────────────────────────────────────────
  { name: 'Shell/default', component: 'Shell', props: {}, content: { topbar: el('div', [['data-p31', 'topbar-demo']], ['Top']), default: 'Main region' } },
  { name: 'Shell/custom', component: 'Shell', props: { mainId: 'app-main', skipLabel: 'Skip to app' }, content: { sidebar: el('aside', [], ['Nav']), default: 'Body' } },
  { name: 'Shell/minimal', component: 'Shell', props: {}, content: { default: 'Only main' } },

  // ── Page / PagePanel ───────────────────────────────────────────────────
  { name: 'Page/flow', component: 'Page', props: {}, content: { default: 'Doc' } },
  { name: 'Page/fill', component: 'Page', props: { mode: 'fill' }, content: { default: 'App' } },
  { name: 'Page/panel-scroll', component: 'Page', props: { mode: 'panel-scroll' }, content: { default: 'Split page' } },
  { name: 'Page/fit', component: 'Page', props: { mode: 'fit' }, content: { default: 'Fit' } },
  { name: 'PagePanel/basic', component: 'PagePanel', props: {}, content: { default: 'Panel' } },

  // ── PageHeader / PageHeaderV2 ──────────────────────────────────────────
  { name: 'PageHeader/basic', component: 'PageHeader', props: { title: 'Inbox & <More>', subtitle: '3 unread' }, content: { actions: btnDesc('New') } },
  { name: 'PageHeader/minimal', component: 'PageHeader', props: { title: 'Inbox' }, content: {} },
  { name: 'PageHeaderV2/alias', component: 'PageHeaderV2', props: { title: 'Inbox V2', subtitle: 's' }, content: { actions: btnDesc('Go', 'secondary') } },

  // ── Stack / Grid ───────────────────────────────────────────────────────
  { name: 'Stack/column-default', component: 'Stack', props: {}, content: { default: 'A' } },
  { name: 'Stack/row-tuned', component: 'Stack', props: { dir: 'row', gap: 'xs', align: 'center', justify: 'between' }, content: { default: 'B' } },
  { name: 'Stack/column-lg', component: 'Stack', props: { dir: 'column', gap: 'lg' }, content: { default: 'C' } },
  { name: 'Grid/md', component: 'Grid', props: {}, content: { default: 'Card' } },
  { name: 'Grid/sm', component: 'Grid', props: { min: 'sm' }, content: { default: 'Card' } },
  { name: 'Grid/lg', component: 'Grid', props: { min: 'lg' }, content: { default: 'Card' } },

  // ── Split ──────────────────────────────────────────────────────────────
  { name: 'Split/default', component: 'Split', props: {}, content: { a: 'Summary', b: 'Canvas' } },
  { name: 'Split/labelled', component: 'Split', props: { ariaLabelA: 'Tree', ariaLabelB: 'Editor', defaultRatio: 0.6 }, content: { a: 'A', b: 'B' } },
  { name: 'Split/collapsed', component: 'Split', props: { collapsed: true }, content: { a: 'A', b: 'B' } },
  { name: 'Split/collapsible', component: 'Split', props: { collapsible: true }, content: { a: 'A', b: 'B' } },

  // ── Field / Input / Textarea / Select ──────────────────────────────────
  { name: 'Field/label-hint', component: 'Field', props: { label: 'Handle', hint: 'Must be unique', id: 'f1' }, content: { default: el('input', [['type', 'text'], ['name', 'handle']]) } },
  { name: 'Field/error-hideLabel', component: 'Field', props: { label: 'Hidden', hideLabel: true, error: 'Required', width: 'form', id: 'f2' }, content: { default: el('input', [['type', 'text']]) } },
  { name: 'Input/basic', component: 'Input', props: { label: 'Search', placeholder: 'Find…', type: 'text', name: 'q', id: 'q1', hint: 'Enter a term' }, content: {} },
  { name: 'Input/error', component: 'Input', props: { label: 'Email', error: 'Invalid address', type: 'email', id: 'e1', required: true }, content: {} },
  { name: 'Input/default-id', component: 'Input', props: { label: 'Plain' }, content: {} },
  { name: 'Textarea/hint', component: 'Textarea', props: { label: 'Notes', hint: 'Optional', rows: 5, id: 't1' }, content: {} },
  { name: 'Select/options', component: 'Select', props: { label: 'Tier', options: [{ value: 'a', label: 'Alpha' }, { value: 'b', label: 'Beta' }], id: 's1', hint: 'Pick one' }, content: {} },

  // ── Tabs / Menu ────────────────────────────────────────────────────────
  { name: 'Tabs/active', component: 'Tabs', props: { items: [{ id: 'a', label: 'One' }, { id: 'b', label: 'Two' }, { id: 'c', label: 'Three' }], activeId: 'b', ariaLabel: 'Sections' }, content: {} },
  { name: 'Tabs/none-active', component: 'Tabs', props: { items: [{ id: 'a', label: 'One' }, { id: 'b', label: 'Two' }] }, content: {} },
  { name: 'Menu/with-icon', component: 'Menu', props: { items: [{ id: 'a', label: 'Open', icon: '★' }, { id: 'b', label: 'Close' }], ariaLabel: 'Actions' }, content: {} },
  { name: 'Menu/plain', component: 'Menu', props: { items: [{ id: 'a', label: 'One' }] }, content: {} },

  // ── Dialog / Sheet ─────────────────────────────────────────────────────
  { name: 'Dialog/open', component: 'Dialog', props: { open: true, title: 'Confirm', onClose: noop }, content: { default: 'Are you sure?' } },
  { name: 'Dialog/closed', component: 'Dialog', props: { open: false, title: 'Confirm', onClose: noop }, content: {} },
  { name: 'Dialog/labelledBy', component: 'Dialog', props: { open: true, title: 'Custom', labelledBy: 'my-title', onClose: noop }, content: { default: 'Body' } },
  { name: 'Sheet/start', component: 'Sheet', props: { open: true, title: 'Filters', side: 'start', onClose: noop }, content: { default: 'Facets' } },
  { name: 'Sheet/closed', component: 'Sheet', props: { open: false, title: 'Filters', onClose: noop }, content: {} },

  // ── States / Skeleton ──────────────────────────────────────────────────
  { name: 'EmptyState/action', component: 'EmptyState', props: { title: 'Nothing here', description: 'Add one' }, content: { action: btnDesc('Add') } },
  { name: 'ErrorState/basic', component: 'ErrorState', props: { title: 'Failed', description: 'Try again' }, content: {} },
  { name: 'Skeleton/default', component: 'Skeleton', props: {}, content: {} },
  { name: 'Skeleton/block', component: 'Skeleton', props: { lines: 5, block: true }, content: {} },
  { name: 'SkeletonBar/bar', component: 'SkeletonBar', props: {}, content: {} },
  { name: 'SkeletonBar/block', component: 'SkeletonBar', props: { shape: 'block' }, content: {} },

  // ── Patterns ───────────────────────────────────────────────────────────
  { name: 'ListingShell/grid', component: 'ListingShell', props: {}, content: { controls: el('input', [['type', 'search'], ['placeholder', 'Filter']]), default: el('div', [['class', 'p31-card']], ['Card A']) } },
  { name: 'ListingShell/empty', component: 'ListingShell', props: { emptyTitle: 'No results' }, content: { default: null } },
  { name: 'ListingShell/custom-empty', component: 'ListingShell', props: {}, content: { empty: el('div', [['data-p31', 'empty-state']], ['Custom empty']) } },
  { name: 'DetailShell/basic', component: 'DetailShell', props: {}, content: { summary: 'Meta', focus: 'Editor', actions: btnDesc('Save', 'secondary') } },
  { name: 'Wizard/first', component: 'Wizard', props: { steps: [{ id: 's1', title: 'Basics' }, { id: 's2', title: 'Review' }, { id: 's3', title: 'Publish' }], activeIndex: 0, onBack: noop, onNext: noop, onFinish: noop }, content: { default: 'Q1' } },
  { name: 'Wizard/last', component: 'Wizard', props: { steps: [{ id: 's1', title: 'Basics' }, { id: 's2', title: 'Review' }], activeIndex: 1, onBack: noop, onNext: noop, onFinish: noop }, content: { default: 'Q2' } },
];

function noop() {}

/* ── renderers ────────────────────────────────────────────────────────── */

async function renderAstro(componentFile, componentName, cell) {
  const props = { ...cell.props };
  // React-world prop names → Astro-world: className → class (the rest match).
  if ('className' in props) {
    props.class = props.className;
    delete props.className;
  }
  const slots = {};
  for (const [slotName, desc] of Object.entries(cell.content ?? {})) {
    const htmlStr =
      desc == null ? '' : typeof desc === 'string' ? desc : renderHtml(desc);
    slots[slotName] = htmlStr;
  }
  const container = await AstroContainer.create();
  return container.renderToString(componentFile, { props, slots });
}

function renderReact(reactExports, cell) {
  const Component = reactExports[cell.component];
  if (!Component) throw new Error(`canon-react has no export ${cell.component}`);
  const props = { ...cell.props };
  for (const [slotName, desc] of Object.entries(cell.content ?? {})) {
    const propName = slotName === 'default' ? 'children' : slotName;
    props[propName] = desc == null ? null : typeof desc === 'string' ? desc : toReact(desc);
  }
  return renderToStaticMarkup(h(Component, props));
}

/* ── main ─────────────────────────────────────────────────────────────── */

const viteConfigFn = getViteConfig(
  { root: astroRoot, server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' },
  { root: astroRoot },
);
const viteConfig = await viteConfigFn({ mode: 'development', command: 'serve' });
const server = await createServer(viteConfig);

const reactExports = await import(reactPkg);

const failures = [];
let cells = 0;
try {
  for (const cell of matrix) {
    cells++;
    const astroPath = join(astroRoot, 'src', 'components', `${cell.component}.astro`);
    const astroMod = await server.ssrLoadModule(pathToFileURL(astroPath).href);
    const astroHtml = await renderAstro(astroMod.default, cell.component, cell);
    const reactHtml = renderReact(reactExports, cell);
    if (astroHtml !== reactHtml) {
      failures.push({ cell: cell.name, astroHtml, reactHtml });
      console.error(`✗ ${cell.name}`);
      console.error(`  astro: ${JSON.stringify(astroHtml)}`);
      console.error(`  react: ${JSON.stringify(reactHtml)}`);
    } else {
      console.log(`✓ ${cell.name}`);
    }
  }
} finally {
  await server.close();
}

console.log(`\nparity: ${cells - failures.length}/${cells} cells byte-identical.`);
if (failures.length) {
  console.error(`\nPARITY FAILED — ${failures.length} cell(s) differ. Fix the wrapper pair (RC1).`);
  process.exit(1);
}