/**
 * Re-export from @p31ca/sovereign-primitives/pickle-names.
 *
 * Single source of truth: the canonical passports live in the governed
 * @p31ca package. Kept as a thin alias so existing importers keep working.
 */
export {
  PASSENGERS,
  PASSENGER_IDS,
  getPassport,
  ROLE_DEFAULT_MODE,
  MODE_RANK,
  MODE_LABELS,
  MODE_ORDER,
  canAccess,
  defaultModeFor,
  clampSpoons,
  passportInvariants,
} from '@p31ca/sovereign-primitives/pickle-names';
export type { Passport, PersonaRole, PortalMode, PassportId } from '@p31ca/sovereign-primitives/pickle-names';