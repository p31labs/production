<!-- P31-HEADER
id: p31_spec_love_settlement_cbs_20261011_v1.0
type: spec
component: workers/mcp-x402-gateway
status: live
retention: keep-forever
created: 2026-10-11T00:00:00Z
owner: will
-->

# LOVE Settlement — Two-Challenge Clause Blind Schnorr (CBS)

**Status:** living · **Version:** 1.0 · **Verified:** 2026-10-11
**Components:** `workers/love-ledger` (issuer/verifier), `workers/mcp-x402-gateway` (client),
`workers/mcp-x402-gateway/bridge` (verifying merchant), `workers/creation-accountant/taler-cbs` (WASM source)
**References:** GNU Taler CS thesis "Adding Schnorr's blind signature in Taler"
(Demarmels/Heuzeveldt, §2.2.4/§3.2), taler.net/papers/cs-thesis.pdf

> **The guarantee, in one line.** A LOVE-settled MCP call carries a real blind
> signature the ledger issued: the gateway blinds a canonical settlement
> message, the ledger signs both challenges, and the bridge — and the ledger
> itself — verify **both** challenge equations against the ledger's published
> key X before any dispatch. No random-UUID placeholder, no unverified header.

---

## 1. Why two challenges

The single-challenge blind-Schnorr variant is vulnerable to the (modified)
ROS attack (FPS19; Benhamouda et al.). The Clause Blind Schnorr construction
requires the issuer to publish **two** per-withdrawal ephemeral nonces
`(R_0, R_1)` derived from its denomination key and a **single-use** nonce `t`;
the client blinds and the issuer signs **both** challenges; verification
checks **both** equations. Reusing `t` would sign two challenge pairs under
the same nonces, leaking x via `s_1 − s_2 = (c_1 − c_2)·x` — so the ledger
enforces single-use `t` (D1 `cbs_nonce` PRIMARY-KEY claim before signing).

## 2. Math

Group: Ed25519 (`curve25519-dalek`), order L. `H` = SHA-512 reduced mod L.
Issuer secret `x`, public `X = x·G`. Per withdrawal: one-time `t` (32 random
bytes), nonces `n_i = clamp(SHA-512("cbs-n{i}" ‖ x ‖ t))`, points
`R_i = n_i·G`.

| step | formula |
|------|---------|
| blind   | `R'_i = R_i + α_i·G + β_i·X` |
| challenge | `c'_i = H(R'_i ‖ m) mod L` (kept) · `c_i = c'_i + β_i mod L` (to issuer) |
| sign    | `s_i = n_i + c_i·x` (both i) |
| unblind | `s'_i = s_i + α_i mod L` |
| verify  | `s'_i·G = R'_i + c'_i·X` **and** `c'_i = H(R'_i ‖ m)` for **both** i |

Client blinding factors `α_0, α_1, β_0, β_1` are derived (Taler-style domain
separation) from a per-call b-seed: `α_i = SHA-512("cbs-a{i}" ‖ bseed)[0..32]`,
`β_i = SHA-512("cbs-b{i}" ‖ bseed)[0..32]`, reduced mod L by the WASM.

## 3. Settlement message `m` (canonical JSON)

`m` is the UTF-8 bytes of canonical JSON, key order as written:

```json
{"version":"1","did":"did:...","tool":"<tool name>","amount":"0.05","t":"<b64 t>"}
```

- `did` — payer DID (must equal the `X-DID` header and the `did` field at
  `/verify-settlement`; ledger rejects mismatches, `reason: did-mismatch`).
- `amount` — decimal string; the ledger debits `love_accounts.did` by it.
- `t` — base64 of the one-time nonce this settlement consumes, binding the
  message to the signing session.

## 4. Wire formats

All curve elements are standard base64 of 32-byte compressed points/scalars.

- `GET /blind-pubkey` → `200 {"X","R0","R1","t"}` (b64; `t` fresh per call).
- `POST /blind-sign` `{"c0","c1","t"}` → `200 {"s0","s1"}`; nonce claimed
  **before** signing; reuse → `409 {"error":"Nonce already used"}`.
- `POST /withdraw` `{did, amount, msg, r0, r1, s0, s1, c0, c1, t}` (all b64;
  `r_i/s_i/c_i` are the **unblinded** `R'_i/s'_i/c'_i`) → verifies both
  challenges, checks `love_accounts` balance, claims coin (`c0`), debits,
  consumes `t`, appends `love_chain` entry (`type: love_withdraw`) → `200
  {success, blind_signature:"c0.s0", transactionId}`.
- `POST /verify-settlement` `{did, msg, sig:{r0,r1,s0,s1,c0,c1,t}}` →
  verifies both challenges against X, parses `m`, checks `m.did == did`,
  claims coin + consumes nonce + debits → `200 {"valid":true,
  "transactionId"}`; failures → `{valid:false, reason}` with reason ∈
  `signature | did-mismatch | bad-amount | malformed-message | nonce-consumed
  | coin-consumed | insufficient-balance`. Replay is idempotently rejected
  (`nonce-consumed`/`coin-consumed`).
- Gateway → bridge headers: `X-LOVE-Signature` = b64 JSON
  `{"r0","r1","s0","s1","c0","c1","t"}`, `X-LOVE-Settlement` = b64(`m`).

## 5. Gateway client flow (L5 LOVE router)

1. HMAC check (`X-Love-Auth-MAC`/`X-Love-Timestamp`) — unchanged.
2. D1 balance check (`love_accounts`) — unchanged.
3. `GET {LOVE_LEDGER_URL}/blind-pubkey` → `{X,R0,R1,t}`.
4. Build `m` (canonical JSON §3); derive `α_i, β_i` from a fresh b-seed;
   blind via WASM → `(R'_i, c_i, c'_i)`.
5. `POST /blind-sign {c0,c1,t}` → `{s0,s1}`; unblind → `s'_i`.
6. Set `X-LOVE-Signature` = b64 `{r0,r1,s0,s1,c0,c1,t}`
   (`r_i = R'_i`, `s_i = s'_i`, `c_i = c'_i`), `X-LOVE-Settlement` = b64 `m`;
   forward to bridge. Any step failure → `502` (fail closed).

## 6. Bridge (merchant) verification

When `X-LOVE-Signature` is present on `POST /mcp`:

1. Local verify of **both** challenges against X (fetched from
   `/blind-pubkey`, cached ~5 min).
2. `POST /verify-settlement` on the ledger to consume the nonce + coin and
   debit the balance.
3. Dispatch only if both pass; otherwise `403` JSON
   `{error:"Invalid LOVE settlement", reason}`.

## 7. Key material

- `BLIND_ISSUER_PRIVATE_KEY` — base64 32-byte scalar (RFC-8032 clamped),
  `wrangler secret put` on love-ledger; generated by
  `workers/love-ledger/scripts/gen-cbs-key.mjs`. Public X is self-published
  by `/blind-pubkey`; no separate distribution needed.
- No secrets on the gateway (client side) or the bridge (verifier side).

## 8. Replay / abuse envelope

- `t` single-use (nonce-reuse would leak x) — enforced at `/blind-sign` by
  PRIMARY-KEY insert-before-sign.
- Coin (`c0`) single-use — PRIMARY-KEY claim is the first statement of the
  debit batch; a concurrent replay aborts before any debit.
- `m` is bound to `did` + `t`; a tampered amount or DID fails verification
  or the did-mismatch check.
- Live evidence: `workers/creation-accountant/taler-cbs/test/cbs-smoke.mjs`
  (replay + tamper negatives all reject; see fix-plan resolution).

## 9. Derivation deviation (pre-audit note)

The implementation derives issuer nonces as
`n_i = clamp(SHA-512("cbs-n{i}" ‖ x ‖ t))` and client blinding factors as
`SHA-512("cbs-a{i}" ‖ bseed)` — domain-separated SHA-512. The GNU Taler
thesis derives these via HKDF (`b_s := HKDF(256, c'_s ‖ R_0 ‖ R_1,
"b-seed")`; α/β from `b_s` with labels "a0"/"a1"/"b0"/"b1"). Both are
domain-separated PRFs; the scheme's security properties (one-more
unforgeability vs modified ROS, nonce-uniqueness) do not depend on HKDF.
This is a conformance deviation, not a security break — tracked by
`docs/fix-plans/cbs-derivation-hkdf-conformance.md` (HKDF migration before
the audit).