<!-- P31-HEADER
id: p31_feature_byok_20261006_v1.0
type: spec
component: shell
status: live
retention: keep-forever
created: 2026-10-06T00:00:00Z
owner: will
-->

# Feature: Bring Your Own Key (BYOK)

## The invariant

A workspace owner may bring their own model-provider key; the key is encrypted
at rest and resolved per call — the engine never stores the key in plaintext,
holds it only transiently in one process during one inference, and never returns
a raw key from an API or writes one to a log.

## The boundary

This feature does **not** own:

- **The turn** — Wave 7's two-phase turn owns the model call. BYOK supplies a
  key at inject time; it does not change the turn's shape.
- **The tier** — trust tiers (Wave 2 harness) own reputation. BYOK does not
  change a workspace's access model.
- **The ledger** — the hash-chained audit owns the event log. BYOK only adds
  two event types; it does not touch the chain.
- **Identity verification** — the `did` remains client-asserted (the
  `collaboration.md` gap). A credential proves possession of a key, not a
  verified identity.

Five rules this feature owns outright:

1. **The key is encrypted at rest and the fingerprint is not the key.** The DB
   row holds AES-256-GCM `ciphertext`, `iv`, and `fingerprint =
   sha256(key).slice(0, 12)`. The fingerprint identifies a credential without
   ever revealing it; the ledger events carry the fingerprint, never the key.
2. **Resolution is per call, not per session.** `resolveKey(did, provider)`
   lives in `credentials.ts` and is invoked from the turn
   (`functions/api/chat/stream.ts`) just before the model call. The key is
   in-scope for one process and one inference, then released. The engine holds
   no key cache.
3. **The metadata surface never returns a key.** `GET` returns the fingerprint,
   provider, and connected timestamp — never `ciphertext`. A raw key is never a
   response body and never a log line (`grep -r 'sk-' dist/` is empty).
4. **Disconnect revokes immediately.** `DELETE` marks the credential revoked;
   the next `resolveKey` returns no key and the turn falls back to the
   workspace default.
5. **Connect and disconnect are ledger events.** `credential.connected` and
   `credential.disconnected` carry the fingerprint, so the audit shows which
   credential was live when — without ever containing the key.

## The implementation

| File | What it provides |
|---|---|
| `functions/_lib/credentials.ts` | the store: AES-256-GCM-encrypted rows, `sha256(key).slice(0, 12)` fingerprint, per-call `resolveKey(did, provider)` |
| `functions/api/credentials/index.ts` | `POST` create, `GET` read metadata only, `DELETE` disconnect (revokes immediately) |
| `functions/api/chat/stream.ts` | *(modified)* calls `resolveKey(did, provider)` just before the model call |
| `migrations/0004_credentials.sql` | the `credentials` table (`ciphertext`, `iv`, `fingerprint` — no plaintext column) |
| `src/bus/events.ts` | *(modified)* `credential.connected`, `credential.disconnected` carry the fingerprint, never the key |

## The tests (negative controls in both directions)

| Test | Pass case | Fail case |
|---|---|---|
| encrypted at rest | the DB row holds only `ciphertext` + `iv` + `fingerprint` | the DB row holds the raw key |
| fingerprint not the key | `credential.connected` carries `sha256(key).slice(0, 12)` | the event carries the key |
| resolveKey per call | one call per inference, released after; no engine-side cache | the key is cached in the engine |
| metadata never leaks | `GET` returns fingerprint + provider + connected at, never `ciphertext` | `GET` returns the key |
| revoke immediately | `DELETE` makes the next call fall back to the workspace default | the key still resolves after disconnect |

## The gate

```bash
node scripts/gate.mjs --feature byok
grep -r 'sk-' dist/ || true
```

The structural assertions are a precondition. The behavioural assertions are the
gate: (a) a `POST` then a `GET` returns metadata but never the key; (b) a
disconnected key never resolves again; (c) `grep -r 'sk-' dist/` is empty.

## The escalation

When this feature breaks a key, the blast radius is that credential's `did` and
no wider. The owner is the only one who can add a replacement credential — with
a new fingerprint. A revoked key is not recoverable, and that is the point: the
credential is disposable, the identity is not.