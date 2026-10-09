/**
 * The music maker — d20 weighted selection (vendored).
 *
 * ⚠️ HONEST LABEL: from `@p31ca/quantum-core/src/d20.ts` (contested-science
 * metaphor made literal — no scientific claims). Vendored here because the
 * source module pulls `@p31ca/design-core/math`, which is not in this app's
 * dependency tree. Behavior is verbatim.
 *
 * A spoon-aware weighted variant selector (softmax + temperature scaled by
 * spoon level). Used to pick the elemental-chord variation on a trigger —
 * low spoons → higher temperature → gentler, less precise sounds.
 */

export interface Variant {
  id: string;
  weight: number;
  metadata?: Record<string, unknown>;
}

export interface SelectionContext {
  spoons: number;
}

export interface SelectionResult<T extends Variant> {
  variant: T;
  confidence: number;
  updatedVariants: T[];
}

function temperatureForSpoons(spoons: number): number {
  if (spoons <= 1) return 2.0;
  if (spoons === 2) return 1.5;
  if (spoons === 3) return 1.0;
  if (spoons === 4) return 0.7;
  return 0.5;
}

function softmax(weights: number[], temperature: number): number[] {
  const t = Math.max(0.01, temperature);
  const maxW = Math.max(...weights);
  const exps = weights.map((w) => Math.exp((w - maxW) / t));
  const sum = exps.reduce((a, b) => a + b, 0);
  return exps.map((e) => (sum > 0 ? e / sum : 1 / exps.length));
}

export function d20Select<T extends Variant>(
  variants: T[],
  ctx: SelectionContext,
  seed = Date.now(),
): SelectionResult<T> {
  if (variants.length === 0) throw new Error('d20Select: no variants provided');
  if (variants.length === 1) {
    return { variant: variants[0], confidence: 1, updatedVariants: [...variants] };
  }
  const temp = temperatureForSpoons(ctx.spoons);
  const probs = softmax(variants.map((v) => v.weight), temp);
  const rand = (seed * 9301 + 49297) % 233280;
  const r = (rand / 233280) * probs.reduce((a, b) => a + b, 0);
  let cumulative = 0;
  let selectedIdx = 0;
  for (let i = 0; i < probs.length; i++) {
    cumulative += probs[i];
    if (r <= cumulative) {
      selectedIdx = i;
      break;
    }
  }
  const selected = variants[selectedIdx];
  return {
    variant: selected,
    confidence: probs[selectedIdx],
    updatedVariants: variants.map((v, i) => ({
      ...v,
      weight: i === selectedIdx ? v.weight * 1.05 : v.weight * 0.98,
    })),
  };
}

export function eightBall<T extends Variant>(variants: T[], spoons: number, seed = Date.now()): SelectionResult<T> {
  return d20Select(variants, { spoons }, seed);
}