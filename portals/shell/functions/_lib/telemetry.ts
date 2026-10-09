/**
 * _lib/telemetry.ts — the sampling decision.
 *
 * Errors are never sampled: tail sampling keeps 100% of error traces so the
 * long tail — the failures a debugging session is actually about — survives a
 * uniform success-sampling rate. Successes are sampled; the platform's
 * collector applies the tail-sampling policy.
 */
export interface SamplingDecision {
  /** Keep this trace? */
  keep: boolean;
  /** Sampling priority — errors are 1 (must keep), successes sampled. */
  priority: 1 | 2;
}

export function sample(hasError: boolean, successRate = 0.05): SamplingDecision {
  if (hasError) {
    return { keep: true, priority: 1 };
  }
  return { keep: Math.random() < successRate, priority: 2 };
}