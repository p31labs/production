/**
 * IdentityChip — compatibility alias (plan W2).
 *
 * The identity chip moved to PortalIdentity.tsx (the canon already exports
 * an IdentityChip composition; a same-named portal component would be a
 * fork). This path stays so no file path disappears from the tree.
 */
export { PortalIdentity } from './PortalIdentity'
export { PortalIdentity as default } from './PortalIdentity'