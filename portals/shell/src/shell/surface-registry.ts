/**
 * shell/surface-registry.ts — the per-surface integration seam.
 *
 * The shell has faces (studio, audit, monetization) and feature surfaces
 * (docs, sheets, slides, import). The emit layer produces artifacts (report,
 * website, app). This module maps each artifact kind to the surface that owns
 * revealing it — "integrated in the topic context, not a standalone hub"
 * (the per-surface integration pattern). Adding a new artifact kind is one
 * registry entry, not a new surface.
 *
 * A surface can also declare a minimum role. When the identity adapter reports
 * a role below the surface's floor, the shell renders the fallback — never a
 * half-authorized face.
 *
 * Deterministic and pure: same kind → same surface, every time.
 */
import type { Role } from './authz';

/** Role rank — higher rank includes lower. viewer < operator < admin. */
const ROLE_RANK: Readonly<Record<Role, number>> = Object.freeze({ viewer: 0, operator: 1, admin: 2 });

/** The artifact kinds the emit layer produces (game is deferred). */
export type ArtifactKind = 'report' | 'website' | 'app';

/** The home surface (face id) for each artifact kind. */
export const ARTIFACT_HOME: Readonly<Record<ArtifactKind, string>> = Object.freeze({
  report: 'audit',   // reports carry provenance — the audit face reveals them
  website: 'studio', // generated sites preview in the studio
  app: 'studio',     // generated apps preview in the studio
});

/** The minimum role required to open a surface. Absent = open to all roles. */
export const SURFACE_ROLE_FLOOR: Readonly<Record<string, Role>> = Object.freeze({
  audit: 'viewer',       // anyone may read provenance
  studio: 'operator',    // generating requires the operator rank
  monetization: 'viewer',// revenue is read-only for viewers
});

/** Resolve an artifact kind → its home surface, or null when unknown. */
export function homeSurfaceForArtifact(kind: ArtifactKind | string): string | null {
  return ARTIFACT_HOME[kind as ArtifactKind] ?? null;
}

/** May this role open this surface? True when the surface has no floor, or the
 *  role's rank meets or exceeds the floor. Fail-closed: unknown surface → false,
 *  listed surface with no role → false. */
export function canAccessSurface(role: Role | null | undefined, surface: string): boolean {
  if (!surface) return false;
  const floor = SURFACE_ROLE_FLOOR[surface];
  if (!floor) return true; // unlisted surface → open (caller owns the check)
  if (!role) return false; // listed floor + absent role → fail closed
  return ROLE_RANK[role] >= ROLE_RANK[floor];
}

/** List artifact kinds routable to a given surface (for the switcher). */
export function artifactsForSurface(surface: string): ArtifactKind[] {
  return (Object.keys(ARTIFACT_HOME) as ArtifactKind[]).filter((k) => ARTIFACT_HOME[k] === surface);
}

export default { ARTIFACT_HOME, SURFACE_ROLE_FLOOR, homeSurfaceForArtifact, canAccessSurface, artifactsForSurface };