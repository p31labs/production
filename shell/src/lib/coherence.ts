import { morphogeneticFieldValue } from '@p31ca/quantum-core';

// Coherence rises with spoons; shared by QuantumFX (constellation dimming)
// and SpaceshipEarth (Larmor audio coupling) so both read the same value.
// The morphogenetic field is monotonic in seed (Clifford rotation coefficient
// cos(θB)+sin(θB) ≈ 1.068 > 0), so we normalize between the field value at
// seed 0.05 (spoons≈0) and seed 1.0 (full energy): maps 0..5 → ~0..1.
export function coherenceForSpoons(spoons: number): number {
  const field = (seed: number) => morphogeneticFieldValue(seed, 12, Math.PI / 4, 1.9);
  const lo = field(0.05);
  const hi = field(1.0);
  const raw = field(Math.max(0.05, spoons / 5));
  return Math.max(0, Math.min(1, (raw - lo) / (hi - lo)));
}
