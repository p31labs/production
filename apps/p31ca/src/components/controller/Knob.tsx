/**
 * p31ca — Knob re-export shim.
 *
 * The Knob primitive now lives in @p31ca/controls (extracted so music-maker's
 * ControlSurface and p31ca's LED panel share one implementation). This file
 * remains so existing p31ca importers don't change in the extraction commit.
 *
 * Migrate importers to `@p31ca/controls` directly when convenient; this shim
 * can be deleted once nothing imports from here.
 */
import { Knob } from '@p31ca/controls';
export type { KnobProps } from '@p31ca/controls';
export { Knob };
export default Knob;