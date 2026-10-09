/**
 * slop-taxonomy.mjs — the shared slop vocabulary for the SIC-POVM gate.
 *
 * Adopted from the AHD (Artificial Human Design) 39-tell slop taxonomy —
 * the measured anti-slop vocabulary (61–78% slop reduction across models).
 * The taxonomy is the moat; the package is an implementation detail. Each
 * tell maps to one of the four SIC-POVM measurement axes so the specialist
 * prompts and the gate speak ONE vocabulary.
 *
 * Reference: @adastracomputing/ahd — SLOP_TAXONOMY.md (web/UI section).
 */
export const SLOP_TELLS = {
  'layout-parity': [
    'centred hero stack — pill badge, 48-72px headline, two CTAs',
    'three feature cards in a row — always three',
    'rounded-2xl on everything',
    'grid of identical cards with no hierarchy',
  ],
  'sensory-safety': [
    'purple-to-blue hero gradient',
    'glassmorphism panels used indiscriminately',
    'dark mode that is #0a0a0a with one neon accent',
    'the same drop shadow on every card',
    'high-chroma ambient layer behind text',
  ],
  'identity-surface': [
    'gradient text on the word "AI"',
    'faked testimonials with faked avatars',
    'Lucide icon in a rounded square as a generic logo',
    'no recognizable brand — interchangeable with any other AI product',
  ],
  'motion-interaction': [
    'generic hover states (scale + shadow) on everything',
    'no focus-visible indicator designed',
    'staggered fade-in used indiscriminately',
    'no loading/empty/error states — happy path only',
  ],
};

/** All tells flattened (for docs / prompt headers). */
export const ALL_TELLS = Object.values(SLOP_TELLS).flat();

/** The AHD-compatible reminder a specialist prompt should include. */
export function slopDirective(axis) {
  const tells = SLOP_TELLS[axis] ?? [];
  return `Reject AI-slop tells (AHD taxonomy): ${tells.join('; ')}.`;
}