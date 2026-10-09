/**
 * @p31ca/design-core — shell/cartridge.ts
 *
 * The cartridge contract: the manifest model the p31-shell prototype proved
 * (docs/runbooks/p31-shell-build.md, Appendix). A cartridge is a manifest,
 * not code — it declares content + theme preference, and the shell renders it
 * through the same immutable frame.
 *
 * Ownership line (the invariant):
 *   The SHELL owns geometry, slot order, theme engine, identity fence
 *   position, error boundary, ambient canvas.
 *   The CARTRIDGE owns wordmark, search, action, identity fill, nav, routes,
 *   blocks, theme preference.
 *   Nothing crosses that line. validateCartridgeOwnership enforces it.
 *
 * Theme-travel rule: the user's picked theme travels across cartridges; a
 *   cartridge themeDefault applies ONLY on first load if the user has not
 *   picked yet. resolveShellTheme encodes that.
 */

import type { ThemeId } from '../theming/theme-store';
import type { IdentityFill } from './identity';

/** A canon block the cartridge's routes can declare (T4 renderers). */
export type CartridgeBlock =
  | { t: 'hero'; eyebrow?: string; title: string; lede?: string; actions?: { label: string; primary?: boolean }[] }
  | { t: 'metric'; items: { value: string; label: string }[] }
  | { t: 'evidence'; claim: string; value: string; source: string; verified: string }
  | { t: 'gov'; title: string; body: ({ type: 'para'; text: string } | { type: 'evidence'; claim: string; value: string; source: string; verified: string })[] };

/** A route's block list, or a renderer that throws (the broken-cartridge case
 *  the shell must contain inside #main). */
export type CartridgeRoute = CartridgeBlock[] | (() => CartridgeBlock | CartridgeBlock[]);

/** The cartridge manifest — one shape for T1/T2/T3/T4 (additive-only: unknown
 *  fields are ignored by the shell). Missing fields use shell defaults. */
export interface CartridgeManifest {
  id: string;
  name: string;
  version: string;
  tier: 'T1' | 'T2' | 'T3' | 'T4';
  /** Theme default — applied only on first load if the user never picked. */
  themeDefault?: ThemeId;
  /** Wordmark — HTML string (must be trusted/escaped by the host). */
  wordmark: string;
  /** Search placeholder. */
  search: string;
  /** Primary action label, or '' for none. */
  action: string;
  actionKind: 'primary' | 'ghost' | 'none';
  identity?: IdentityFill;
  nav: { path: string; label: string; emoji?: string }[];
  routes: Record<string, CartridgeRoute>;
  /** T1+ only (deferred): module-federation remote entry. */
  entryPoint?: string;
  /** T1+ only: SRI hash of the remote entry. */
  integrity?: string;
  /** T1+ only: declared host functions. */
  capabilities?: string[];
}

/** Fields a cartridge may declare. Anything else is a contract violation —
 *  the shell owns geometry and rejects layout-affecting overrides. */
export const CARTRIDGE_ALLOWED_FIELDS = [
  'id', 'name', 'version', 'tier', 'themeDefault', 'wordmark', 'search',
  'action', 'actionKind', 'identity', 'nav', 'routes',
  'entryPoint', 'integrity', 'capabilities',
] as const;

/** Layout tokens a cartridge must NEVER declare (the shell owns them). */
const GEOMETRY_OVERRIDES = [
  'topbarHeight', 'topbar-height', 'sidebarWidth', 'sidebar-width',
  '--space-', '--radius-', '--topbar-height', '--sidebar-width',
];

/** Validate that a manifest respects the ownership line. Returns the list of
 *  violations (empty = compliant). The gate + the composer both consult this —
 *  one rule, same as placementValid. */
export function validateCartridgeOwnership(m: CartridgeManifest): string[] {
  const violations: string[] = [];
  for (const key of Object.keys(m)) {
    if (!(CARTRIDGE_ALLOWED_FIELDS as readonly string[]).includes(key)) {
      violations.push(`unknown field '${key}' — shell ignores it (additive-only)`);
    }
    if (GEOMETRY_OVERRIDES.some((g) => key.includes(g))) {
      violations.push(`layout override '${key}' — geometry is shell-owned`);
    }
  }
  if (m.tier === 'T2' && !m.entryPoint) {
    violations.push('T2 cartridge requires entryPoint');
  }
  if (m.tier === 'T2' && m.integrity && !/^sha[0-9]+-/.test(m.integrity)) {
    violations.push('integrity must be an SRI hash (sha256-/sha384-/sha512-)');
  }
  return violations;
}

/** Theme-travel rule — the user's picked theme wins across cartridges; a
 *  cartridge's themeDefault applies only when the user has never picked. */
export function resolveShellTheme(opts: {
  userTheme: ThemeId | null;
  userPicked: boolean;
  cartridgeThemeDefault?: ThemeId;
}): ThemeId {
  if (opts.userTheme && opts.userPicked) return opts.userTheme;
  return opts.cartridgeThemeDefault ?? opts.userTheme ?? 'ocean';
}