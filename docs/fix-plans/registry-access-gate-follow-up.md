# fix: registry governed lens + approval gate still use shared secrets — Cloudflare Access is the follow-up

<!-- P31-HEADER
id: p31_fix_plan_registry_access_gate_20261011_v1.0
type: fix-plan
component: workers/mcp-registry
status: open
retention: keep-forever
created: 2026-10-11T00:00:00Z
owner: will
-->

## Symptom

Lane E (runbook `docs/plans/mcp-marketplace-hub-runbook.md` §4 E) landed the
approval gate (`POST /servers/:id/approve`) and the governed analytics surface
(`GET /analytics/tools`) behind **shared-secret env vars** (`ADMIN_SECRET`,
`INTERNAL_USAGE_KEY`) — exactly as the runbook scoped for the parallel wave
("shared admin secret; Access later"). Shared secrets are a stepping stone, not
the governance posture:

- No per-principal identity — the SIEM audit records `admin-secret` (or a
  self-asserted `X-Principal` header) instead of a verified IdP identity.
- No revocation granularity — one leaked secret compromises both surfaces.
- The runbook's parallel-paths positioning (public lens vs. authenticated
  **governed lens**) requires a real identity source for the auth flag the
  portal (Lane B) consumes.

## Plan (follow-up)

1. Wire Cloudflare Access on the registry zone for the governed surfaces:
   - `POST /servers/:id/approve`, `POST /servers/:id/review`,
     `GET /analytics/tools`, `GET /logs`, `GET /errors`, `GET /anomalies`,
     `GET /servers/pending`.
   - Registry already implements the verifier
     (`verifyAccessJwt`, `CF_ACCESS_CERT_URL` + `CF_ACCESS_AUD` envs,
     RBAC group→role mapping in `src/index.ts`) — flip the gate from
     `adminSecretOk` to `requireRole(..., ['admin'])` once Access is live.
2. Set `CF_ACCESS_CERT_URL` / `CF_ACCESS_AUD` vars in `wrangler.toml` and keep
   `ADMIN_SECRET` as a bootstrapping fallback (log + SIEM-flag its use).
3. Portal (Lane B) adds the governed lens: pass the Access JWT / principal to
   the registry and render `approval` state only under the auth flag. Public
   lens keeps showing `status`/`verify` only — the registry intentionally
   returns `approval` in `/servers` payloads; the LENS decides what to show,
   so the portal public lens MUST strip it (contract for the parallel agent).

## Verification

- No test can rely on `admin-secret` identity once flipped; governance-e tests
  must exercise the Access JWT path (`verifyAccessJwt` is already unit-tested).
- SIEM audit entries carry the verified email principal, not `admin-secret`.