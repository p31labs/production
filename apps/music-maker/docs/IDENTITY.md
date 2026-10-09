# The instrument's identity (honest)

The spatial music maker is **inspired by** the Posner molecule (Ca₉(PO₄)₆) —
the structure P31 Labs uses as its brand metaphor. Two things must never be
conflated:

## What is real
- **863 Hz is the actual Larmor precession frequency of phosphorus-31 in
  Earth's magnetic field.** γ/2π(³¹P) = 17.235 MHz/T; at ~50 µT that is
  ≈ 862 Hz. The instrument's base frequency is tuned to this.
- The other elemental timbres are the **real NMR gyromagnetic ratios to ³¹P**
  at the same field (`src/audio/frequencies.ts`): hydrogen 2132 Hz, carbon
  536, oxygen 289, phosphor 863, calcium 143, sodium 564. Published values,
  not invented constants.
- NMR → music sonification is a published technique (e.g. "Molecular Music",
  *J. Chem. Educ.* 2022; Atom Tone, ICAD 2016). A spectrometer genuinely
  produces audible frequencies; the instrument extends that.

## What is contested (and labelled so)
- The **Posner molecule as a quantum-memory structure** — the idea that the
  molecule's ³¹P nuclear spins could protect quantum coherence in the brain —
  is a **contested hypothesis, not established physics** (Fisher & Whaley
  2024 argue for it; refutations exist). See
  `packages/quantum-core/src/posner.ts` (its HONEST LABEL header) and
  `docs/QF1_CONTESTED_SCIENCE.md`.
- The vendored `src/lib/d20.ts` and `src/lib/morphogeneticField.ts` carry the
  same label. The φⁿ field drives a subtle shader resonance; the d20 picker
  varies the chord mix. Both are *metaphor made literal*, never a claim.

**The tour card says this out loud**: the frequency is real, the story is
contested. The instrument teaches the difference rather than hiding it.