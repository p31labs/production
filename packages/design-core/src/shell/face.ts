/**
 * @p31ca/design-core — shell/face.ts
 *
 * The Face contract: the "one shell, many faces" model made concrete.
 *
 * The shell is the design portal's exact arrangement — a single canonical
 * PortalTopbar shape (brand → theme dropdown → centered search → mode badge →
 * trailing action + spoon dial → fenced identity). A FACE is a content
 * declaration against that fixed shape. A face can set CONTENT only — it can
 * never set position, layout, or arrangement. The theme engine is the only
 * "you've moved" signal; the frame never changes.
 *
 * This is the formal version of the "switcharoo": the forge is the design
 * shell with forge strings. Same shape, same slots, same visual weight.
 * Different content where the face has a reason — never because "this portal
 * is different."
 */

import type { ThemeId } from '../theming/theme-store';
import type { IdentityFill } from './identity';

/** Mode badge variants — the context marker (SPARK / MAKER / WORKSHOP). */
export type FaceMode = 'spark' | 'maker' | 'workshop';

/** The primary action button in the topbar's trailing cluster. */
export type FaceAction =
  | { kind: 'primary'; label: string; onActivate: () => void }
  | { kind: 'ghost'; label: string; onActivate: () => void }
  | { kind: 'none' };

/** What a face declares for the shared topbar — content cells only. */
export interface TopbarFace {
  /** The wordmark — e.g. "P31 Forge", "P31 Design System". */
  wordmark: string;
  /** The centered search placeholder (⌘K trigger). */
  searchPlaceholder: string;
  /** The mode badge label — the context marker. */
  mode: FaceMode;
  /** The primary/ghost action (or none). */
  action: FaceAction;
  /** The identity fill (avatar / sign-in / identity chip / account menu). */
  identity: IdentityFill;
  /** Theme applied on first load if the user has never picked. */
  themeDefault: ThemeId;
  /** Called when the centered search/⌘K is activated (opens command palette). */
  onOpenPalette?: () => void;
}

/** Validate a face — the shell refuses a face that tries to move the frame.
 *  The shell owns arrangement; a face owns content. Unknown fields are
 *  additive-only; layout-affecting overrides are violations. */
export const FACE_ALLOWED_FIELDS = [
  'wordmark', 'searchPlaceholder', 'mode', 'action', 'identity',
  'themeDefault', 'onOpenPalette',
] as const;

export function validateFace(face: TopbarFace): string[] {
  const violations: string[] = [];
  for (const key of Object.keys(face)) {
    if (!(FACE_ALLOWED_FIELDS as readonly string[]).includes(key)) {
      violations.push(`unknown face field '${key}' — the shell owns the arrangement`);
    }
  }
  if (face.mode !== 'spark' && face.mode !== 'maker' && face.mode !== 'workshop') {
    violations.push(`invalid mode '${String(face.mode)}' — must be spark | maker | workshop`);
  }
  return violations;
}