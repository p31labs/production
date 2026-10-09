# fix: BYOK is attribution-only — the turn never routes the resolved key to a provider

<!-- P31-HEADER
id: p31_fix_plan_byok_routing_gap_20261007_v1.0
type: fix-plan
component: shell
status: open
retention: keep-forever
created: 2026-10-07T00:00:00Z
owner: will
-->

## Symptom

`resolveKey` correctly returns the plaintext — verified at
`functions/_lib/credentials.ts:44,60` (`Promise<{ key: string; fingerprint:
string } | null>`). But `functions/api/chat/stream.ts` reads only
`cred?.fingerprint` for attribution and then runs the **keyless Workers AI
binding** (`env.AI`). The resolved `cred.key` is never passed to a provider, so
BYOK never actually *uses* a user's key — it only records which credential
*would* have paid. The feature is audit-only.

## Evidence

```ts
// functions/api/chat/stream.ts (spine of Wave 9b)
let fingerprint: string | undefined;
if (did) {
  const cred = await resolveKey(env, did, 'workers-ai');
  fingerprint = cred?.fingerprint;   // key is discarded
}
// ... later: env.AI!.run(CHAT_MODEL, ...) — the keyless Workers AI binding
```

## The fix

Provider routing: when a credential exists for the requested provider, run the
turn against that provider with `cred.key`; fall back to the Workers AI binding
when no credential exists. This is a routing seam, not a gate gap — the gate
correctly asserts `resolveKey` returns the plaintext; it cannot assert the
turn's *choice* of provider. The fix belongs to the provider-routing work
(which may be its own wave), and is named here so it is not silently built upon.

## Why it is not done yet

The turn currently runs a single Workers AI model (`CHAT_MODEL`); there is no
third-party provider path to route to. Routing the key requires a
provider-abstraction the shell does not have yet. Named (not papered over) as
Wave 11's Phase 0b; the span tree and pipeline are built on a ledger that
records the fingerprint regardless, so the audit is complete even while the
routing seam is open.