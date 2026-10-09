# fix: x402 LOVE gate mints a random blindsig instead of a real GNU Taler blind signature

<!-- P31-HEADER
id: p31_fix_plan_x402_love_blindsig_placeholder_20261009_v1.0
type: fix-plan
component: workers/mcp-x402-gateway
status: open
retention: keep-forever
created: 2026-10-09T00:00:00Z
owner: will
-->

## Symptom

`workers/mcp-x402-gateway/src/index.ts:174` carries an unfiled TODO:

```ts
// TODO: GNU Taler Clause Blind Schnorr issuance.
const blindSig = `blindsig-${crypto.randomUUID()}`;
c.header("X-LOVE-Signature", blindSig);
```

The LOVE-settled path bypasses the x402 gate by minting a **random UUID** as the
`X-LOVE-Signature` and forwarding it to the bridge. Nothing verifies that
signature — it is a placeholder, not a real GNU Taler Clause Blind Schnorr
issuance.

## Evidence

The TODO is the only unfiled marker `fix-plan-scan.mjs` still flags after the
reference-docs and GLSL-swizzle exemptions landed (2026-10-09). The signature
is forwarded verbatim to `BRIDGE_URL` with no issuance/verification step.

## Fix

Either:
1. **Implement** real Clause Blind Schnorr issuance — the LOVE ledger (or a
   Taler exchange) issues a blind signature over the settlement, and the bridge
   verifies it before forwarding.
2. **Remove** the misleading name if the random UUID is the intended
   "non-cryptographic correlation id" — rename `X-LOVE-Signature` to something
   honest (`X-LOVE-Trace-Id`) and delete the TODO.

## Impact

- Until resolved, the LOVE-settled path carries a signature that is not a
  signature — a security-adjacent placeholder. The x402 settlement integrity
  depends on whether the bridge actually trusts this header.
- Out of the npm-scope migration; surfaced by the ownership-contract gate
  (`fix-plan-scan.mjs`) as the last remaining violation.