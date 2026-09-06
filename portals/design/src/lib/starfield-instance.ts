import type { JitterbugStarfieldInstance } from '@p31/design-core/starfield/jitterbug';

/**
 * Shared mutable holder so ambient background + foreground controls can
 * talk to the same canonical jitterbug engine instance.
 */
export const starfieldInstance: { current: JitterbugStarfieldInstance | null } = { current: null };

export function drivePhase(p: number): void {
  starfieldInstance.current?.setPhase(p);
}

export function driveMorphSpeed(m: number): void {
  starfieldInstance.current?.setMorphSpeed(m);
}

export function resumeAutoplay(spoons: number): void {
  starfieldInstance.current?.setSpoons(spoons);
}
