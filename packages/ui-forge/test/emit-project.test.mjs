/**
 * emit-project.test.mjs — the emitter registry negative controls.
 *
 * Three checkpoints (AgentEval; "verify against a versioned baseline, not just
 * final output"):
 *   1. The file set   — which files every target emits (deterministic shape)
 *   2. The content    — App.tsx is byte-identical from the same tree
 *   3. The scaffold   — package.json declares the right deps per target
 *
 * Plus the negative control: an unknown artifact_type throws (a total
 * dispatch, not a silent fallback).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  emitProject, EMITTERS, ARTIFACT_TYPES,
  jsxProp, jsxNode, collectTypes,
} from '../src/emit-project.mjs';

const TREE = {
  type: 'GlassPanel',
  id: 'root',
  children: [
    { type: 'Card', id: 'c1', props: { title: 'Workflows' } },
    { type: 'MetricBadge', id: 'm1', props: { label: 'Count', value: 4 } },
  ],
};

// ── Checkpoint 1 — the file set ─────────────────────────────────────────────

test('registry: three targets, frozen', () => {
  assert.deepEqual([...ARTIFACT_TYPES].sort(), ['app', 'report', 'website']);
  assert.ok(Object.isFrozen(EMITTERS), 'the registry must not be mutated at runtime');
});

test('website target: emits the base file set', () => {
  const { files } = emitProject({ tree: TREE }, { artifactType: 'website', name: 'site' });
  for (const f of ['package.json', 'vite.config.ts', 'index.html', 'src/main.tsx', 'src/App.tsx', 'src/index.css']) {
    assert.ok(f in files, `missing ${f}`);
  }
});

test('app target: emits the router + store files', () => {
  const { files } = emitProject({ tree: TREE }, { artifactType: 'app', name: 'myapp' });
  for (const f of ['src/routes.tsx', 'src/store.ts', 'src/App.tsx']) {
    assert.ok(f in files, `missing ${f}`);
  }
  assert.match(files['src/routes.tsx'], /createBrowserRouter/);
  assert.match(files['src/store.ts'], /useAppStore/);
});

test('report target: emits report.md + README, self-contained', () => {
  const report = '# My Report\n\nBody with a P31-HANDOFF block.\n';
  const { files } = emitProject({ report }, { artifactType: 'report', name: 'r' });
  assert.ok('report.md' in files);
  assert.ok('README.md' in files);
  assert.equal(files['report.md'], report);
  assert.ok(!('handoff.json' in files), 'report emitter does not parse the block (no cross-package import)');
});

// ── Checkpoint 2 — content is byte-identical from the same tree ─────────────

test('App.tsx is byte-identical for the same tree (deterministic)', () => {
  const a = emitProject({ tree: TREE }, { artifactType: 'website' });
  const b = emitProject({ tree: TREE }, { artifactType: 'website' });
  assert.equal(a.files['src/App.tsx'], b.files['src/App.tsx']);
  assert.ok(a.files['src/App.tsx'].includes('<GlassPanel>'));
  assert.ok(a.files['src/App.tsx'].includes('<Card title="Workflows" />'));
});

// ── Checkpoint 3 — the scaffold declares the right deps per target ──────────

test('website scaffold: no router, no store', () => {
  const { files } = emitProject({ tree: TREE }, { artifactType: 'website', name: 's' });
  const pkg = JSON.parse(files['package.json']);
  assert.ok(pkg.dependencies.react, 'react present');
  assert.ok(!pkg.dependencies['react-router-dom'], 'website must NOT pull in the router');
  assert.ok(!pkg.dependencies.zustand, 'website must NOT pull in zustand');
});

test('app scaffold: router + store declared', () => {
  const { files } = emitProject({ tree: TREE }, { artifactType: 'app', name: 'a' });
  const pkg = JSON.parse(files['package.json']);
  assert.ok(pkg.dependencies['react-router-dom'], 'app declares react-router-dom');
  assert.ok(pkg.dependencies.zustand, 'app declares zustand');
});

test('designCorePath is configurable (no hardcoded repo path)', () => {
  const { files } = emitProject({ tree: TREE }, { artifactType: 'website', designCorePath: 'file:../local/design-core' });
  const pkg = JSON.parse(files['package.json']);
  assert.equal(pkg.dependencies['@p31ca/design-core'], 'file:../local/design-core');
});

// ── Negative control — an unknown target must throw ─────────────────────────

test('unknown artifact type: throws, never falls through', () => {
  assert.throws(
    () => emitProject({ tree: TREE }, { artifactType: 'game' }),
    /unknown artifact type "game"/,
  );
});

// ── Primitives ──────────────────────────────────────────────────────────────

test('jsxProp: strings quote, numbers bare, true bare, false/null drop', () => {
  assert.equal(jsxProp('title', 'W'), 'title="W"');
  assert.equal(jsxProp('width', 256), 'width={256}');
  assert.equal(jsxProp('fixed', true), 'fixed');
  assert.equal(jsxProp('fixed', false), null);
  assert.equal(jsxProp('gone', null), null);
});

test('collectTypes: dedupes', () => {
  assert.deepEqual(collectTypes(TREE).sort(), ['Card', 'GlassPanel', 'MetricBadge']);
});