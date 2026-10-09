#!/usr/bin/env node
/**
 * versioning.mjs — the design-core semantic-versioning contract.
 *
 * `design-core` is a public contract even though it ships as a private tarball:
 * the shell, the emitters, and every generated project consume it. This module
 * encodes the semver rules and the deprecation registry as DETERMINISTIC logic
 * — not prose — so a release decision is a function call, not a judgment call.
 *
 * The one rule that governs everything: when in doubt between minor and major,
 * it's major. The contract is sacred. A breaking change without a codemod
 * breaks every consumer.
 *
 * Run: node scripts/versioning.mjs classify <kind> [<kind>…]
 *      node scripts/versioning.mjs bump <current> <kind> [<kind>…]
 */

/** Change kinds → semver bucket. MAJOR is the fail-safe default. */
export const CHANGE_CLASS = Object.freeze({
  // MAJOR — breaking: removed/renamed API, renamed token, changed default.
  'removed-component': 'major',
  'removed-prop': 'major',
  'renamed-prop': 'major',
  'renamed-token': 'major',
  'removed-token': 'major',
  'changed-default': 'major',
  // MINOR — additive: new component, variant, token, prop.
  'new-component': 'minor',
  'new-variant': 'minor',
  'new-token': 'minor',
  'new-prop': 'minor',
  'deprecated-api': 'minor', // deprecation ships in a minor (removal is the next major)
  // PATCH — no contract change: fixes and docs.
  'css-fix': 'patch',
  'a11y-fix': 'patch',
  'bug-fix': 'patch',
  'docs': 'patch',
});

/** Classify one change kind → 'major' | 'minor' | 'patch'. Unknown kinds are
 *  MAJOR (when in doubt, it's major — never silently under-bump). */
export function classifyChange(kind) {
  return CHANGE_CLASS[kind] ?? 'major';
}

/** The overall bucket for a set of changes: the highest of the set. */
export function classifyChanges(kinds) {
  const rank = { patch: 0, minor: 1, major: 2 };
  let max = 'patch';
  for (const k of kinds ?? []) {
    const b = classifyChange(k);
    if (rank[b] > rank[max]) max = b;
  }
  return max;
}

/** Compute the next version from a current version + a change bucket. */
export function nextVersion(current, bucket) {
  const [maj, min, pat] = String(current).replace(/^v/, '').split('.').map((n) => parseInt(n, 10));
  if (bucket === 'major') return `${(maj ?? 0) + 1}.0.0`;
  if (bucket === 'minor') return `${maj ?? 0}.${(min ?? 0) + 1}.0`;
  return `${maj ?? 0}.${min ?? 0}.${(pat ?? 0) + 1}`;
}

/** The deprecation registry — every deprecated API, loud and attributed. A
 *  runtime consumer calls `warnDeprecated(name)` and gets a console.warn naming
 *  the replacement and the removal version. Removal happens in the next major.
 *  Append-only by design: deprecations accrue; the registry is never reset. */
export const DEPRECATIONS = [];

/** Register a deprecation (idempotent by name). Returns the registry entry. */
export function deprecate(name, { deprecatedIn, replacement, removalIn }) {
  const existing = DEPRECATIONS.find((d) => d.name === name);
  if (existing) return existing;
  const entry = { name, deprecatedIn, replacement, removalIn };
  DEPRECATIONS.push(entry);
  return entry;
}

/** Check whether a name is deprecated. Returns { deprecated, entry? }. */
export function checkDeprecated(name) {
  const entry = DEPRECATIONS.find((d) => d.name === name);
  return entry ? { deprecated: true, entry } : { deprecated: false };
}

/** Emit a loud, attributable deprecation warning. No-op when not deprecated. */
export function warnDeprecated(name) {
  const { deprecated, entry } = checkDeprecated(name);
  if (!deprecated) return;
  console.warn(
    `[design-core] ${name} is deprecated (since ${entry.deprecatedIn}). ` +
    `Use ${entry.replacement ?? 'the replacement'} instead. ` +
    `Removed in ${entry.removalIn ?? 'the next major'}.`,
  );
}

export default { classifyChange, classifyChanges, nextVersion, deprecate, checkDeprecated, warnDeprecated, DEPRECATIONS };