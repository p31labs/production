/**
 * shell/skin-contract.ts — the frozen Skin interface (one design, many backends).
 *
 * The shell is the Service Definition; the backend (Workers AI, D1, the room
 * Durable Object) is the Service Provider; each face is a Consumer. A SKIN is
 * the presentation layer over that seam — one design that morphs to whichever
 * backend and persona is plugged in, without the shell or canon changing.
 *
 * The three-role contract (the Agent-Native adapter pattern, 2026):
 *   - Service Definition — the shell's invariant chrome + THIS interface. It
 *     owns geometry, slot order, the theme engine, and the identity fence.
 *   - Service Provider — the concrete backend. Swapped in/out behind the seam;
 *     never forked into the shell.
 *   - Consumer — a skin. Declares persona + chrome hints; receives the shell's
 *     adapters via context. A skin never imports a service directly.
 *
 * Ownership line (same discipline as face.ts): a skin may declare identity and
 * presentation HINTS; it may NEVER declare geometry or token values — the shell
 * owns geometry, canon owns appearance. validateSkin enforces it.
 */
import type { Role } from './authz';

/** The chrome a skin may hint at — presentation, never geometry. */
export interface SkinChrome {
  /** Wordmark the header renders for this skin. */
  wordmark: string;
  /** Preferred theme (a canon theme id) — a request, not an override. */
  themeDefault?: string;
  /** Ambient canvas hint — the shell maps this to a canon ambient node. */
  ambient?: 'calm' | 'starfield' | 'none';
}

/** The personas a skin may serve — the Cognitive Passport exportProfile subset
 *  that has a distinct presentation, not a distinct product. */
export type SkinPersona =
  | 'family'
  | 'clinical'
  | 'public'
  | 'workplace'
  | 'educator'
  | 'grant-reviewer';

const SKIN_PERSONAS: ReadonlySet<SkinPersona> = new Set([
  'family', 'clinical', 'public', 'workplace', 'educator', 'grant-reviewer',
]);

/** A skin — the presentation layer over the Service Definition seam. */
export interface Skin {
  id: string;
  name: string;
  /** The persona this skin serves. */
  persona: SkinPersona;
  /** Minimum role to wear this skin. Absent = viewer floor (open). */
  roleFloor?: Role;
  chrome: SkinChrome;
}

/** Fields a skin may declare — the closed vocabulary. */
export const SKIN_ALLOWED_FIELDS = [
  'id', 'name', 'persona', 'roleFloor', 'chrome',
] as const;

/** Layout/token overrides a skin must NEVER declare (shell + canon own them).
 *  Full keys match exactly; dashed entries are prefixes (a `--p31-*` token,
 *  a `--space-*` spacing var). */
const SKIN_GEOMETRY_OVERRIDES = [
  'topbarHeight', 'topbar-height', 'sidebarWidth', 'sidebar-width',
  '--space-', '--radius-', '--p31-',
];

/** Validate that a skin respects the ownership line. Returns the list of
 *  violations (empty = compliant). Mirrors validateFaceOwnership so the same
 *  rule shape governs faces and skins alike. */
export function validateSkin(s: Partial<Skin>): string[] {
  const violations: string[] = [];
  if (!s || typeof s !== 'object') return ['skin is not an object'];
  if (typeof s.id !== 'string' || !s.id) violations.push('id is required (string)');
  if (typeof s.name !== 'string' || !s.name) violations.push('name is required (string)');
  if (typeof s.persona !== 'string' || !SKIN_PERSONAS.has(s.persona)) {
    violations.push(`persona must be one of ${[...SKIN_PERSONAS].join(' | ')}`);
  }
  if (s.roleFloor !== undefined && s.roleFloor !== 'viewer' && s.roleFloor !== 'operator' && s.roleFloor !== 'admin') {
    violations.push("roleFloor must be 'viewer' | 'operator' | 'admin'");
  }
  for (const key of Object.keys(s)) {
    if (!SKIN_ALLOWED_FIELDS.includes(key as (typeof SKIN_ALLOWED_FIELDS)[number])) {
      violations.push(`unknown field: ${key}`);
    }
    if (SKIN_GEOMETRY_OVERRIDES.some((geo) => key === geo || key.startsWith(geo))) {
      violations.push(`geometry override not allowed: ${key}`);
    }
  }
  if (s.chrome !== undefined) {
    if (typeof s.chrome !== 'object' || s.chrome === null) violations.push('chrome must be an object');
    else if (typeof s.chrome.wordmark !== 'string' || !s.chrome.wordmark) {
      violations.push('chrome.wordmark is required (string)');
    }
  }
  return violations;
}

/** A skin with all required fields filled (for the registry). */
export function normalizeSkin(s: Partial<Skin>): Skin {
  const violations = validateSkin(s);
  if (violations.length > 0) {
    throw new Error(`invalid skin: ${violations.join('; ')}`);
  }
  return {
    id: s.id!,
    name: s.name!,
    persona: s.persona!,
    roleFloor: s.roleFloor,
    chrome: {
      wordmark: s.chrome!.wordmark,
      themeDefault: s.chrome!.themeDefault,
      ambient: s.chrome!.ambient,
    },
  };
}