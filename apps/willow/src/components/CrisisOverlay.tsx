/**
 * @file CrisisOverlay.tsx — WILLOW crisis overlay.
 * Consumer wrapper over the canon CrisisOverlay composition: the canon owns
 * the web-component binding, data-spoons handling and the ready event; the
 * portal supplies its warm copy through the documented props.
 */

import { CrisisOverlay as CanonCrisisOverlay } from '@p31ca/design-core/compositions';

export function CrisisOverlay() {
  return (
    <CanonCrisisOverlay
      message="You’re safe. Breathe with the circle. Take your time."
      buttonLabel="I’m ready"
    />
  );
}