# fix: x402 LOVE gate mints a random blindsig instead of a real GNU Taler blind signature

<!-- P31-HEADER
id: p31_fix_plan_x402_love_blindsig_placeholder_20261009_v1.0
type: fix-plan
component: workers/mcp-x402-gateway
status: resolved
retention: keep-forever
created: 2026-10-09T00:00:00Z
owner: will
-->

## Symptom

`workers/mcp-x402-gateway/src/index.ts:174` carried an unfiled TODO:

```ts
// TODO: GNU Taler Clause Blind Schnorr issuance.
const blindSig = `blindsig-${crypto.randomUUID()}`;
c.header("X-LOVE-Signature", blindSig);
```

The LOVE-settled path bypassed the x402 gate by minting a **random UUID** as
the `X-LOVE-Signature` and forwarding it to the bridge. Nothing verified that
signature — it was a placeholder, not a real GNU Taler Clause Blind Schnorr
issuance.

## Evidence

The TODO was the only unfiled marker `fix-plan-scan.mjs` flagged (2026-10-09).
The signature was forwarded verbatim to `BRIDGE_URL` with no issuance or
verification step, and the bridge ignored the header entirely.

## Fix

Implemented option 1 — real Clause Blind Schnorr issuance, in the
**two-challenge** variant (per the GNU Taler CS thesis "Adding Schnorr's
blind signature in Taler"; the single-challenge variant is vulnerable to the
modified ROS attack). End-to-end:

- WASM: `workers/creation-accountant/taler-cbs/src/lib.rs` upgraded to the
  two-challenge scheme (per-withdrawal nonces R_0,R_1 bound to x + single-use
  t; client blinds with α_i,β_i; both challenges signed and verified:
  s'_i·G = R'_i + c'_i·X, c'_i = H(R'_i ‖ m)).
- Ledger (deployed): `workers/love-ledger` gains `/blind-pubkey`,
  `/blind-sign`, `/withdraw`, `/verify-settlement` + `cbs_nonce`/`cbs_coin`
  D1 tables (already present in the shared D1; additive idempotent
  migrations 006/007 recorded) + `BLIND_ISSUER_PRIVATE_KEY` secret
  (`scripts/gen-cbs-key.mjs` keygen). Deployed + live-verified.
- Gateway: `src/cbs-settlement.ts` + `src/taler-cbs/loader.ts` replace the
  UUID mint; HMAC + balance checks intact; paid tools carry
  `X-LOVE-Signature` + `X-LOVE-Settlement`, free tools carry none.
- Bridge: `bridge/src/cbs-verify.mjs` — local two-challenge verify against
  the ledger's X (5-min cache) + `POST /verify-settlement` nonce/coin
  consumption; 403 JSON on failure. Deployed via systemd restart.
- Spec: `docs/specs/love-settlement-cbs.md` (canonical message, math, wire
  formats, replay envelope).
- Smoke: `scripts/cbs-settlement-smoke.mjs` (ledger + bridge legs green;
  gateway leg requires `LOVE_AUTH_SECRET`).

## Resolution

**Resolved 2026-10-11** (settlement workstream). Live evidence:

- `GET https://love-ledger.p31ca.org/blind-pubkey` → 200
  `{X,R0,R1,t}`; `t` fresh per call (`cf-cache-status: BYPASS` after the
  no-store fix).
- Full live smoke (`workers/creation-accountant/taler-cbs/test/cbs-smoke.mjs`)
  → PASS: blind → `/blind-sign` (t-replay 409) → `/withdraw` OK → replay
  rejected → `/verify-settlement` valid → replay `nonce-consumed` →
  tampered-msg `signature`.
- Bridge live: valid settlement dispatches (200), replay → 403
  `nonce-consumed`, tampered → 403, no-sig path unchanged (200).
- Tests: `cargo test` 5/5; `test/vector.mjs` + `test/integration.mjs` PASS;
  gateway `test/cbs-client.test.mjs` 7/7; bridge
  `__tests__/cbs-verify.test.mjs` 9/9 (+ existing 7/7).
- `npx tsc --noEmit` green in both workers.

**Outstanding (filed separately):** the gateway redeploy is blocked by the
Secrets Store binding scope on the available Cloudflare credentials (see
`docs/fix-plans/p31-fix-plan-gateway-deploy-secrets-store-scope.md`). Until
that deploy lands, the DEPLOYED gateway still runs the pre-CBS code; the
gateway source + its tsc-green state are complete and committed in-tree.