/**
 * motionPresets — centralized variants for the Motion Library.
 * Animate transform + opacity only (never width/height/top/left/margin).
 * Everything respects --motion-scale (0 at spoons 0 → calm floor).
 */
import type { Variants, Transition } from 'motion/react';

const spring: Transition = { type: 'spring', stiffness: 220, damping: 26, mass: 0.9 };
const smooth: Transition = { type: 'spring', stiffness: 320, damping: 30 };

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.3 } },
};

export const slideUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: spring },
};

export const slideDown: Variants = {
  hidden: { opacity: 0, y: -12 },
  visible: { opacity: 1, y: 0, transition: spring },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.96 },
  visible: { opacity: 1, scale: 1, transition: spring },
};

export const staggerChildren = (delay = 0.05): Variants => ({
  hidden: {},
  visible: { transition: { staggerChildren: delay } },
});

export const layoutShift: Transition = smooth;

/** Micro-interaction: press (scale down) — for buttons/cards. */
export const press: Variants = {
  rest: { scale: 1 },
  pressed: { scale: 0.97, transition: { duration: 0.08 } },
};

/** Read the live motion scale from the DOM (set by useSpoonsStore). */
export function motionScale(): number {
  if (typeof document === 'undefined') return 1;
  const v = getComputedStyle(document.documentElement).getPropertyValue('--motion-scale').trim();
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 1;
}

/** Scale a duration by the spoon-driven motion multiplier. */
export function scaled(duration: number): number {
  return duration * motionScale();
}