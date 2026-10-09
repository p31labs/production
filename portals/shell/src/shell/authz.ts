/**
 * shell/authz.ts — the role-based authorization layer.
 *
 * The IdentityAdapter already declares a `role` (viewer | operator | admin);
 * this module makes it enforce something. Every action a face can perform
 * maps to a role in a permission matrix, and a single `can()` answers "may
 * this role do this action?".
 *
 * The risk line (the governance invariant): reversible actions auto-approve;
 * consequential actions gate. `isConsequential` exposes that line so the
 * approval gate (ApprovalGate) can pause on exactly the actions that need a
 * human, and nothing else.
 *
 * Deterministic, pure, and fail-closed: an unknown or absent role gets nothing.
 */

/** The three roles — must stay in sync with IdentityAdapter.role. */
export type Role = 'viewer' | 'operator' | 'admin';

/** The actions a face can perform, grouped by risk. */
export type Action =
  | 'view'        // read-only
  | 'export'      // read + emit an artifact (audit, report)
  | 'create'      // new work
  | 'edit'        // mutate existing work
  | 'deploy'      // publish to an external surface
  | 'approve'     // human-in-the-loop sign-off on a consequential action
  | 'delete'      // irreversible removal
  | 'manageFace'; // register/unregister a face in the shell

/** Consequential actions — the ones that must gate behind approval. The rest
 *  are reversible and auto-approve. This is the risk boundary, not the action
 *  count. */
export const CONSEQUENTIAL_ACTIONS: ReadonlySet<Action> = new Set<Action>(['deploy', 'approve', 'delete', 'manageFace']);

/** The permission matrix — role → allowed actions. Additive by role rank:
 *  operator ⊃ viewer, admin ⊃ operator. */
export const ROLE_PERMISSIONS: Readonly<Record<Role, ReadonlySet<Action>>> = Object.freeze({
  viewer: new Set<Action>(['view', 'export']),
  operator: new Set<Action>(['view', 'export', 'create', 'edit', 'deploy', 'approve']),
  admin: new Set<Action>(['view', 'export', 'create', 'edit', 'deploy', 'approve', 'delete', 'manageFace']),
});

/** May this role perform this action? Fail-closed: null/undefined role → false. */
export function can(role: Role | null | undefined, action: Action): boolean {
  if (!role) return false;
  return ROLE_PERMISSIONS[role]?.has(action) ?? false;
}

/** Is this action on the consequential (approval-gated) side of the risk line? */
export function isConsequential(action: Action): boolean {
  return CONSEQUENTIAL_ACTIONS.has(action);
}

/** The set of actions a role may perform (empty for an unknown/absent role). */
export function actionsFor(role: Role | null | undefined): Action[] {
  if (!role) return [];
  return [...(ROLE_PERMISSIONS[role] ?? new Set<Action>())];
}

/** Does this action require a human gate for this role?
 *   - `action` undefined → true (fail-closed: an unknown action always gates).
 *   - else → the action is consequential AND the role does not hold it.
 * An admin deploying, or any role viewing, needs no gate. */
export function gateRequired(role: Role | null | undefined, action: Action | undefined): boolean {
  if (!action) return true;
  return isConsequential(action) && !can(role, action);
}

export default { can, isConsequential, actionsFor, gateRequired, ROLE_PERMISSIONS, CONSEQUENTIAL_ACTIONS };