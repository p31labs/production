/**
 * versioning.test.mjs — negative controls for the semver contract.
 * The rule under test: when in doubt, it's major — never silently under-bump.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyChange, classifyChanges, nextVersion, deprecate, checkDeprecated, warnDeprecated } from './versioning.mjs';

test('classifyChange: breaking kinds are major', () => {
  for (const k of ['removed-component', 'removed-prop', 'renamed-prop', 'renamed-token', 'removed-token', 'changed-default']) {
    assert.equal(classifyChange(k), 'major', `${k} must be major`);
  }
});

test('classifyChange: additive kinds are minor', () => {
  for (const k of ['new-component', 'new-variant', 'new-token', 'new-prop', 'deprecated-api']) {
    assert.equal(classifyChange(k), 'minor', `${k} must be minor`);
  }
});

test('classifyChange: fixes are patch', () => {
  for (const k of ['css-fix', 'a11y-fix', 'bug-fix', 'docs']) {
    assert.equal(classifyChange(k), 'patch', `${k} must be patch`);
  }
});

test('classifyChange: unknown kind is MAJOR (when in doubt, it\'s major)', () => {
  assert.equal(classifyChange('something-new-and-uncertain'), 'major');
  assert.equal(classifyChange(undefined), 'major');
});

test('classifyChanges: the highest bucket wins', () => {
  assert.equal(classifyChanges(['docs', 'css-fix', 'new-component']), 'minor');
  assert.equal(classifyChanges(['docs', 'renamed-prop']), 'major');
  assert.equal(classifyChanges(['bug-fix']), 'patch');
  assert.equal(classifyChanges([]), 'patch');
});

test('nextVersion: bumps the right segment', () => {
  assert.equal(nextVersion('3.0.0', 'major'), '4.0.0');
  assert.equal(nextVersion('3.0.0', 'minor'), '3.1.0');
  assert.equal(nextVersion('3.0.0', 'patch'), '3.0.1');
  assert.equal(nextVersion('3.4.2', 'major'), '4.0.0');
});

test('deprecation registry: registers, checks, and is idempotent', () => {
  deprecate('LegacyBadge', { deprecatedIn: '3.1.0', replacement: 'Badge', removalIn: '4.0.0' });
  const first = checkDeprecated('LegacyBadge');
  assert.equal(first.deprecated, true);
  assert.equal(first.entry.replacement, 'Badge');
  assert.equal(first.entry.removalIn, '4.0.0');

  const dup = deprecate('LegacyBadge', { deprecatedIn: '3.2.0', replacement: 'Badge', removalIn: '5.0.0' });
  assert.equal(dup.deprecatedIn, '3.1.0', 're-registering must not overwrite');

  assert.equal(checkDeprecated('Card').deprecated, false);
});

test('warnDeprecated: warns for deprecated, silent for current', () => {
  const orig = console.warn;
  let warned = '';
  console.warn = (m) => { warned = String(m); };
  try {
    deprecate('Spinner', { deprecatedIn: '3.1.0', replacement: 'SpoonDial', removalIn: '4.0.0' });
    warnDeprecated('Spinner');
    assert.ok(warned.includes('Spinner'), 'warns with the name');
    assert.ok(warned.includes('SpoonDial'), 'names the replacement');
    assert.ok(warned.includes('4.0.0'), 'names the removal version');

    warned = '';
    warnDeprecated('Card');
    assert.equal(warned, '', 'silent for a non-deprecated name');
  } finally {
    console.warn = orig;
  }
});