# fix: governed-lens Cloudflare Access wiring pending (portal B-3)

<!-- P31-HEADER
id: p31_fix_plan_mcp_marketplace_governed_lens_access_20261011_v1.0
type: fix-plan
component: portals/mcp-marketplace
status: open
retention: keep-forever
created: 2026-10-11T00:00:00Z
owner: will
-->

## Symptom

The marketplace hub runs parallel lenses (runbook §14 option a): the public
lens is fully live, but the governed lens (approval state, private servers,
analytics stub, publish access) has no real authentication boundary. The
portal's `LensSwitch` (src/components/LensSwitch.tsx) gates on a locally-set
principal (`X-Principal` from localStorage, see src/lib/auth.ts) — a dev
placeholder, not an enterprise boundary.

## Root cause

Cloudflare Access on `mcp.p31ca.org` (the SSO provider the auth scaffold
assumes, `VITE_SSO_PROVIDER=cloudflare-access`) is not yet wired. Access
injects the authenticated email into the JWT presented to the origin; the
portal + registry need to consume that JWT to resolve the real principal and
role instead of trusting a localStorage value.

## What the portal ships today (honest gate behavior)

- Lens switch UI is live; governed lens is reachable by anyone.
- Without a principal, the governed lens renders neutral states and shows a
  lock affordance pointing at this fix-plan.
- Approval badges / private-servers panel / analytics stub degrade to "not
  shipped yet" when the registry lacks the fields (see companion fix-plan
  `mcp-marketplace-governed-registry-fields.md`).

## Fix

1. Enable Cloudflare Access in front of the Pages project
   (`p31-portal-mcp-marketplace`) and the registry worker, with the email
   allow-list.
2. Portal: read the `CF_Authorization` JWT (via a Pages Function or an
   /me passthrough), send `Cf-Access-Jwt-Assertion` to the registry, drop the
   localStorage principal override in production builds.
3. Registry: verify the JWT (`Cf-Access-Jwt-Assertion` header against the
   Access certs), map email → role, keep `POST /servers/:id/approve` and
   `/servers/pending` admin-gated.
4. Governed lens UI: replace the lock affordance with a sign-in link once
   Access serves the session.

## Negative control

Without Access wiring: switching to the governed lens shows "identity: none"
and the neutral stubs — no fake approvals, no silent fallback to the public
view. With Access wiring complete: governed lens requires a valid JWT; an
unauthenticated request cannot flip `lens=governed` past the neutral states.