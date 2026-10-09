/**
 * @p31ca/design-core — shell/identity.ts
 *
 * The canon identity-slot contract (research-backed, Nord/Cloudscape pattern).
 *
 * Identity is a first-class, auth-agnostic slot in the Topbar, fenced from the
 * trailing utility cluster. The shell renders the fill; the portal supplies it
 * based on its auth state. Three fills span the state model:
 *
 *   SignInLink   — unauthenticated: a button → the auth route.
 *   IdentityChip — identity asserted: the did:key claim chip (P31's sovereign
 *                  identity form). NOT a sign-in — a claim/assertion.
 *   AccountMenu  — signed-in: avatar trigger → dropdown.
 *
 * All three fills are implemented (SignInLink, IdentityChip in compositions/,
 * AccountMenu in compositions/AccountMenu.tsx). The shell renders whichever
 * fill the cartridge/portal supplies.
 */

/** The AccountMenu contract (Nord pattern). */
export interface AccountMenuSpec {
  /** Avatar trigger with aria-label (tooltip: "Signed in as {name}"). */
  trigger: { emoji?: string; name: string };
  /** Group 1 — profile/settings/account links. */
  primaryLinks: { label: string; onNavigate: () => void }[];
  /** Group 2 — keyboard commands / help (optional). */
  secondaryLinks?: { label: string; onNavigate: () => void }[];
  /** Sign out — always the last item (destructive). */
  onSignOut: () => void;
  /** Auth is portal-side: the shell holds no auth state. */
}

/** The identity fills the shell + portals consume. */
export type IdentityFill =
  | { kind: 'sign-in'; to: string; label?: string }
  | { kind: 'identity-chip'; emoji?: string; did?: string; verified?: boolean; onClaim?: () => void }
  | { kind: 'account-menu'; spec: AccountMenuSpec };