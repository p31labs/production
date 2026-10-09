# Operation: Forum Auth — minting & verifying capability tokens

**Applies to**: `workers/forum-api` (AIC-JWT auth) + `workers/scripts/mint-forum-token.mjs`.

## How auth works

Every write to the forum (`POST /threads`, `/life`, `/posts`, `/accept`, `/micropub`)
requires an AIC-JWT capability token in `Authorization: Bearer`. The token is
**self-contained**: it embeds its own composite public keys, so the verifier
needs no key registry — it checks possession of the private key bound to
`claims.pk`, the audience, and the expiry.

Verification (in `forum-api/src/index.ts` `principal()`):

```ts
verifySelfContainedCapabilityToken(token, { expectAud: env.FORUM_AUD })
```

`FORUM_AUD` defaults to `forum.p31ca.org` (wrangler.toml `[vars]`).

## Minting a token

```bash
cd workers
node scripts/mint-forum-token.mjs <did> forum read write
```

The token prints to stdout; the DID + expiry to stderr. Use the SAME `<did>`
for every call a given identity makes — the self-contained token embeds the
DID, so a stable DID means a stable author. Passing no DID generates a fresh
one each run (fine for a one-off, wrong for a real identity).

## ⚠️ The unit contract (past bug — do not regress)

`exp` and `iat` in the claims MUST be **milliseconds**, matching the package's
`parseCapabilityToken`, which compares against `opts.now ?? Date.now()` (ms):

- package tests: `iat = Date.now()`, `exp = iat + 60_000` (ms)
- WRONG: `exp = Date.now()/1000 + 900` (seconds) → `Date.now() > exp` is
  always true by ~1000× → every token rejected.

If you mint a token and `principal()` returns null, check the units first.

## Verify a minted token (deployed)

```bash
# 1. token must be accepted by the real verifier
node -e "..."   # or: run the round-trip test in the auth check below

# 2. wrong audience must be rejected
verifySelfContainedCapabilityToken(token, { expectAud: 'wrong' }) === null
```

## Key-persistence note (design)

The mint helper generates an ephemeral keypair per run. For a real identity,
the DID must persist across mints. The intended flow: the workspace portal's
IdentitySurface holds the user's private key (seed-phrase or IndexedDB
derived), mints short-lived tokens, and sends the same `sub` DID every time.
The self-contained design means the verifier doesn't need the key — only the
DID stability matters for authorship.