/**
 * shell/flags.ts — the feature-flag layer.
 *
 * Flags are a SEPARATE layer from authorization. The invariant (GrowthBook ADR,
 * 2026-08-06): a flag may narrow what authorization allows, never widen it. A
 * flag cannot grant a viewer operator rights; a flag can only turn an allowed
 * action off.
 *
 * Fail-closed by default: an unset or unknown flag resolves to false — a missing
 * config is off, not on. The resolver is a pure function over a flag map; the
 * backend (Workers KV, GrowthBook, LaunchDarkly) is a provider swap, not a
 * rewrite — the OpenFeature evaluation shape.
 */
import { can, type Action, type Role } from './authz';

/** A flat flag map: name → boolean. Only an explicit `true` enables a flag. */
export type FlagMap = Readonly<Record<string, boolean>>;

/** Fail-closed evaluation. An unset, unknown, or non-true flag is false. */
export function evaluateFlag(name: string, flags: FlagMap): boolean {
  return flags[name] === true;
}

/** The narrow-only invariant as a function: `permission && flag`. A flag can
 *  only gate a permission DOWN — if the permission is already false, the flag
 *  cannot make it true. */
export function narrow(permission: boolean, flag: boolean): boolean {
  return permission && flag;
}

/** The two-layer combination: an authz decision narrowed by a flag.
 *   can(role, action) is the CEILING; the flag can only lower it. */
export function canWithFlag(role: Role | null | undefined, action: Action, flag: boolean): boolean {
  return narrow(can(role, action), flag);
}

/** A flag provider (the OpenFeature evaluation shape). Backends swap in; the
 *  call site never changes. */
export interface FlagProvider {
  readonly name: string;
  get(flag: string, context?: Record<string, unknown>): boolean;
}

/** The static provider — flags from a fixed map (tests, bootstrap, env). */
export function staticProvider(flags: FlagMap): FlagProvider {
  return {
    name: 'static',
    get: (flag) => evaluateFlag(flag, flags),
  };
}

export default { evaluateFlag, narrow, canWithFlag, staticProvider };