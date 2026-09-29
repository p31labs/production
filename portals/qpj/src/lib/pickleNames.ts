/**
 * Re-export from @p31ca/sovereign-primitives/pickle-names.
 *
 * Single source of truth: the pickle naming system lives in the governed
 * @p31ca package. This file is kept as a thin alias so existing importers
 * (`from './pickleNames'`) keep working without change.
 */
export {
  cyrb128,
  generatePickleName,
  generatePickleNames,
  pickleInvariants,
  PICKLE_PREFIXES,
  PICKLE_SUFFIXES,
} from '@p31ca/sovereign-primitives/pickle-names';
export type { PickleNameOptions } from '@p31ca/sovereign-primitives/pickle-names';