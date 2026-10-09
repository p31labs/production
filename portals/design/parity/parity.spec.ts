import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Runtime parity gate — the browser half of the contract verification ladder.
 *
 * For every @p31ca/canon contract, this mounts the design-core component in a
 * real browser (via /parity.html) and asserts, from the contract:
 *
 *   1. state predicate — the default interactionState's observable holds
 *      (getComputedStyle, NOT toHaveCSS — the latter cannot read custom props)
 *   2. token resolution — every tokenContract entry's CSS var resolves non-empty
 *      (semantic path → flat palette var via canon's SEMANTIC_MAP)
 *   3. a11y — zero critical/serious axe violations
 *
 * The agent does not choose what to test; the contract does. Flipping a
 * contract to `verified` requires this suite to pass for it.
 */

const CANON = '/home/p31/production/packages/canon';

async function loadContracts() {
  const { SEMANTIC_MAP } = await import(join(CANON, 'src', 'theming', 'theme-store.ts'));
  const dir = join(CANON, 'src', 'contracts');
  const contracts = [];
  for (const f of readdirSync(dir)) {
    if (!f.endsWith('.contract.ts')) continue;
    const mod = await import(join(dir, f));
    for (const k of Object.keys(mod)) {
      if (k.endsWith('Contract')) contracts.push(mod[k]);
    }
  }
  return { contracts, SEMANTIC_MAP };
}

/** Resolve a semantic path (`p31.color.accent.green.default`) to the flat
 *  palette var the runtime actually consumes (`--p31-accent-green`). */
function flatVarFor(token: string, SEMANTIC_MAP: Record<string, { palette?: string; literal?: string }>): string {
  const path = token.replace(/^p31\./, '');
  const slot = SEMANTIC_MAP[path];
  if (slot?.palette) return `--p31-${slot.palette}`;
  return `--p31-${path.split('.').join('-')}`;
}

function matches(matcher: string, observed: string, expected?: string): boolean {
  const o = observed.trim();
  switch (matcher) {
    case 'not-empty': return o !== '';
    case 'equals': return o === (expected ?? '');
    case 'not-equals': return o !== (expected ?? '');
    case 'truthy': return o !== '' && o !== 'none' && o !== '0' && o !== 'false' && o !== 'initial';
    case 'contains': return o.includes(expected ?? '');
    default: return true;
  }
}

const { contracts, SEMANTIC_MAP } = await loadContracts();

// Existence obligation: a suite that verifies zero components must fail, not
// pass. (A vacuous "32/32" that silently skips every assertion is the failure
// mode this guard exists to kill.)
test('suite floor — at least one component is runtime-verified', () => {
  expect(contracts.filter((c) => c.status === 'verified').length).toBeGreaterThan(0);
});

for (const c of contracts) {
  const spec = c.interactionStates?.default;
  if (!spec?.fixture) {
    // An effect-only component (renders null) has no renderable state. It must
    // be `unverifiable`, never `verified` — the assertion below is the gate
    // that fails if it is mis-marked. (A body-less test here would be a Rotten
    // Green Test: passing while asserting nothing.)
    test(`${c.name} — NO VERIFIABLE STATE`, () => {
      expect(c.status, `a component with no renderable state cannot be 'verified'`).not.toBe('verified');
    });
    continue;
  }

  // Functions can't cross the URL boundary; drop them (the default render
  // doesn't need callbacks — it only needs the component to mount).
  const props = Object.fromEntries(
    Object.entries(spec.fixture).filter(([, v]) => typeof v !== 'function'),
  );
  const qs = `component=${encodeURIComponent(c.name)}&props=${encodeURIComponent(JSON.stringify(props))}`;

  test(`${c.name} — contract parity`, async ({ page }) => {
    await page.goto(`/parity.html?${qs}`);

    // 1. state predicate
    const el = page.locator('#root > *').first();
    await el.waitFor({ state: 'attached' });
    const observed = await el.evaluate((node, prop) => {
      const s = window.getComputedStyle(node);
      return s.getPropertyValue(prop);
    }, spec.property);
    expect(
      matches(spec.matcher, observed, spec.expected),
      `state "${spec.property}" matcher "${spec.matcher}" expected "${spec.expected ?? ''}" observed "${observed}"`,
    ).toBe(true);

    // 2. token resolution — semantic path → flat palette var must be EMITTED
    //    (non-empty on the element). KNOWN LIMIT: custom properties are
    //    inherited from :root, so this proves the token is emitted, NOT that
    //    the component consumes it. Consumption is a source-level check, not
    //    yet runtime-enforced — named here so `verified` is not over-read.
    for (const tok of c.tokenContract) {
      const varName = flatVarFor(tok, SEMANTIC_MAP);
      const v = await el.evaluate((node, vn) => window.getComputedStyle(node).getPropertyValue(vn), varName);
      expect(v.trim(), `token ${tok} → ${varName} unresolved`).not.toBe('');
    }

    // 3. a11y — zero critical/serious
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    const blocking = results.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious');
    expect(
      blocking,
      JSON.stringify(blocking.map((v) => ({ id: v.id, impact: v.impact }))),
    ).toEqual([]);
  });
}