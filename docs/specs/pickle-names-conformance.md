<!-- P31-HEADER
id: p31_spec_pickle_names_conformance_20261011_v1.0
type: spec
component: workspace
status: live
retention: keep-forever
created: 2026-10-11T00:00:00Z
owner: will
-->

# Pickle-Names — CONFORMANCE

**Spec:** `docs/specs/pickle-names.md` (Version 1.0)
**Source of truth:** `packages/sovereign-primitives/src/pickle-names/`
**Runner:** `pnpm --filter @p31ca/sovereign-primitives test`
**Companion suite:** `pickle-names.test.ts` (11 tests)

> A claim of pickle-name compatibility is a claim against these vectors. Any
> implementation that cannot reproduce all of them MUST NOT label itself
> pickle-name compatible.

## Required test vectors

| # | Vector | Expected |
|---|--------|----------|
| 1 | `generatePickleName('some-seed')` | `'Vine·warm'` (U+00B7 MIDDLE DOT, no space) |
| 2 | `generatePickleName(seed)` twice, any seed | byte-identical both draws |
| 3 | `PICKLE_PREFIXES.length` | 24 |
| 4 | `PICKLE_SUFFIXES.length` | 24 |
| 5 | vocabulary vs QPJ source | byte-identical, **including deliberate duplicates** (`Dill`, `Sour` ×2; `bright` ×2) |
| 6 | `generatePickleNames('batch', 40)` | 40 unique names, no collisions |
| 7 | `pickleInvariants()` | `{ ok: true, failures: [] }` |
| 8 | passport ids | exactly `dillpickle`, `breadbutter`, `cornichon`, `gherkin`, `halfsour` |
| 9 | passport names | 5 unique pickle names |
| 10 | caregivers | exactly one — `gherkin` |
| 11 | `passportInvariants()` | `{ ok: true, failures: [] }` |
| 12 | `getPassport('unknown-id')` | falls back to `dillpickle` |

## Derivation contract

The name path is exactly `hashStr → mulberry32 → draw(prefix, suffix) → join(U+00B7)`.
`cyrb128` is exported for compatibility but is **not** on the derivation path.
No clock, network, or process entropy may enter the draw. The exclusion set is
redrawn up to 200 attempts, then a numeric fallback, then `Pickle·<time>`.

## Composition requirements (for credential use)

1. **RFC 9901 (SD-JWT VC).** When a pickle label populates the credential
   `sub`, it must ride in an SD-JWT VC (`typ:dc+sd-jwt`, salted disclosures);
   selectively disclosed claims must never require a legal name.
2. **Composite-signature context.** Credentials signed over pickle labels use
   P31's composite Ed25519 + ML-DSA-65 (`COMPOSITE_ALG`). The construction is a
   sibling to the profiles in `draft-ietf-lamps-pq-composite-sigs`
   (`id-MLDSA65-Ed25519-SHA512`) and `draft-ietf-jose-pq-composite-sigs` —
   cited for standards context, **not** as a conformance claim against those
   drafts.

## Explicit non-guarantees (compatibility does NOT imply)

- Secrecy: a pickle name is deterministic and enumerable; it is a labelling and
  privacy-hygiene mechanism, not encryption.
- Uniqueness in the open world: uniqueness holds within a batch and within the
  passport set, not across all of humanity.
- Unpredictability: if a name must resist guessing, the seed must be secret —
  caller responsibility.