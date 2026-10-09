/**
 * The music maker — morphogenetic field (vendored).
 *
 * ⚠️ HONEST LABEL: from `@p31ca/quantum-core/src/morphogeneticField.ts`
 * (contested hypothesis — "Tetrahedral Hyperdimensional Algebra" — NOT
 * established physics; an architectural metaphor made literal). Vendored here
 * because the source pulls `@p31ca/design-core/math`. The golden ratio PHI is
 * computed locally.
 *
 * M(X) = Σₙ Φⁿ · Rₙ(θ, B) · Ψ₀(X) — a recursive golden-ratio-scaled field.
 * Used as a SECOND input to the sphere's vertex shader alongside the audio
 * energy: the sphere breathes with the sound and resonates on the φⁿ ladder.
 */

const PHI = (1 + Math.sqrt(5)) / 2;

export function morphogeneticLayer(seed: number, n: number, theta: number, B: number): number {
  const phiN = Math.pow(PHI, n);
  const cosT = Math.cos(theta * B);
  const sinT = Math.sin(theta * B);
  const rotated = seed * cosT - (1 - seed) * sinT;
  return phiN * rotated;
}

export function computeMorphogeneticField(
  seed = 0.5,
  depth = 12,
  theta = Math.PI / 4,
  B = 1.9,
): number[] {
  const layers: number[] = [];
  for (let n = 0; n < depth; n++) {
    layers.push(morphogeneticLayer(seed, n, theta, B));
  }
  return layers;
}

export function morphogeneticFieldValue(
  seed = 0.5,
  depth = 12,
  theta = Math.PI / 4,
  B = 1.9,
): number {
  const layers = computeMorphogeneticField(seed, depth, theta, B);
  return layers.reduce((s, v) => s + v, 0);
}