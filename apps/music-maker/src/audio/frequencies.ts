/**
 * The music maker — elemental frequencies.
 *
 * The instrument's base frequency is REAL physics: phosphorus-31 has a
 * gyromagnetic ratio γ/2π = 17.235 MHz/T. In Earth's magnetic field (~50 µT)
 * its Larmor precession frequency is ν = γ·B ≈ 862 Hz — the brand rounds to
 * 863. That IS what this instrument is tuned to.
 *
 * The other elements are the REAL NMR gyromagnetic ratios to ³¹P at the same
 * field (published values, MHz/T):
 *   ¹H  42.577   → 863 × 2.470 = 2132 Hz
 *   ¹³C 10.705   → 863 × 0.621 =  536 Hz
 *   ¹⁷O  5.772*  → 863 × 0.335 =  289 Hz
 *   ³¹P 17.235   → 863 × 1.000 =  863 Hz
 *   ⁴³Ca 2.865   → 863 × 0.166 =  143 Hz
 *   ²³Na 11.262  → 863 × 0.653 =  564 Hz
 *   (* ¹⁷O's ratio is negative — the phase flips, not the pitch; we use the
 *     magnitude, the same way a pitch is a frequency, not a direction.)
 *
 * ⚠️ HONEST LABEL: the FREQUENCIES are real NMR numbers. The Posner-molecule
 * coherence story that inspired the instrument is a CONTESTED hypothesis, not
 * established physics (see `packages/quantum-core/src/posner.ts` and
 * `docs/QF1_CONTESTED_SCIENCE.md`). The instrument is *inspired by* the
 * science, not a claim about it.
 */

/** ³¹P Larmor precession frequency in Earth's field (~50 µT), rounded. */
export const LARMOR_HZ = 863;

const GAMMA_MHZ_PER_T: Record<Atom, number> = {
  hydrogen: 42.577,
  carbon: 10.705,
  oxygen: 5.772,
  phosphor: 17.235,
  calcium: 2.865,
  sodium: 11.262,
};

export type Atom = 'hydrogen' | 'carbon' | 'oxygen' | 'phosphor' | 'calcium' | 'sodium';

export const FREQ: Record<Atom, number> = {
  hydrogen: Math.round(LARMOR_HZ * (GAMMA_MHZ_PER_T.hydrogen / GAMMA_MHZ_PER_T.phosphor)),
  carbon: Math.round(LARMOR_HZ * (GAMMA_MHZ_PER_T.carbon / GAMMA_MHZ_PER_T.phosphor)),
  oxygen: Math.round(LARMOR_HZ * (GAMMA_MHZ_PER_T.oxygen / GAMMA_MHZ_PER_T.phosphor)),
  phosphor: Math.round(LARMOR_HZ * (GAMMA_MHZ_PER_T.phosphor / GAMMA_MHZ_PER_T.phosphor)),
  calcium: Math.round(LARMOR_HZ * (GAMMA_MHZ_PER_T.calcium / GAMMA_MHZ_PER_T.phosphor)),
  sodium: Math.round(LARMOR_HZ * (GAMMA_MHZ_PER_T.sodium / GAMMA_MHZ_PER_T.phosphor)),
};

/** Sub-bass drone divisors of the Larmor frequency (the machine hum's voice).
 *  863/8 ≈ 108, /6 ≈ 144, /5 ≈ 173, /4 ≈ 216 Hz. */
export const LARMOR_DIVISORS = [8, 6, 5, 4] as const;

export function vertexFrequencyHz(i: number): number {
  const d = LARMOR_DIVISORS[Math.max(0, Math.min(LARMOR_DIVISORS.length - 1, i))];
  return LARMOR_HZ / d;
}