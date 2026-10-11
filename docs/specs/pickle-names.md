<!-- P31-HEADER
id: p31_spec_pickle_names_20261011_v1.0
type: spec
component: workspace
status: live
retention: keep-forever
created: 2026-10-11T00:00:00Z
owner: will
-->

# Pickle-Names — Specification

**Status:** living · **Version:** 1.0 · **Verified:** 2026-10-11
**Package:** `@p31ca/sovereign-primitives` → subpath `pickle-names`
**Source:** `packages/sovereign-primitives/src/pickle-names/`
**Owner:** P31 Labs, Inc. (501(c)(3), EIN 42-1888158)

> **Privacy is construction, not policy.** A pickle name is math. There is no
> human name to leak, subpoena, or sell.

---

## 1. What it is

A **pickle name** is a deterministic, privacy-preserving identity label. It is a
short, stable, human-readable pseudonym — `Prefix·Suffix` — derived from a seed.
The street never shows a human name; the ledger, the mesh, and the portal address
people by pickle label only (e.g. `Gherkin·quilt`).

The system is the extracted, governed form of the QPJ "Quantum Pickle Jar" naming
system. Its vocabularies are **byte-identical to the QPJ source**, so every
pickle name already in circulation is preserved.

## 2. Why it matters

- **Zero human identifiers in the data plane.** A person is represented by a label
  that carries no legal name, no email, no phone number. There is nothing to leak.
- **Determinism as a contract.** The same seed yields the same name *forever*, so
  a governance/audit trail can record "Gherkin did X" across sessions and remain
  stable and re-derivable.
- **Collision-free in batch.** Generating a family of identities cannot silently
  hand two passengers the same label.
- **Composable with mandated credential formats.** A pickle label can serve as the
  subject identifier of a selective-disclosure credential without carrying a human
  name (see §7).

## 3. Derivation (seed → name)

Implemented in `pickle-names/index.ts`.

1. **Seed → hash.** `generatePickleName(input, opts?)` (`index.ts:79`) hashes the
   input string with `hashStr` (`index.ts:52`, the classic `h = h*31 + charCode`
   polynomial over UTF-16 code units).
2. **Hash → PRNG.** The hash seeds `mulberry32` (`index.ts:42`), a 32-bit
   generator. No entropy is drawn from the clock, the network, or the process.
3. **Draw.** Two draws select a prefix from `PICKLE_PREFIXES` and a suffix from
   `PICKLE_SUFFIXES`; the label is joined with **U+00B7 MIDDLE DOT**:
   `` `${prefix}·${suffix}` ``.
4. **Exclusion.** If the drawn label is in the caller's `exclude` set, it is
   redrawn, up to 200 attempts. Then a numeric fallback is tried, also
   exclusion-respecting, before a last-resort `Pickle·<time>` (see §6).

> Note: `cyrb128` (`index.ts:12`) is exported for compatibility but is **not** on
> the name-derivation path. The name path is `hashStr → mulberry32`.

**Conformance vector.** `generatePickleName('some-seed') === 'Vine·warm'`, asserted
in `pickle-names.test.ts:8`. Any implementation claiming compatibility MUST
reproduce this vector.

## 4. Closed vocabulary

The label space is **closed**: names are drawn only from the published sets, so a
name can always be recognised as a pickle name and can never accidentally equal a
real word from an open dictionary.

- `PICKLE_PREFIXES` — 24 entries (`index.ts:65`)
- `PICKLE_SUFFIXES` — 24 entries (`index.ts:72`)

The vocabulary is frozen; entries include deliberate duplicates (e.g. `Dill` and
`Sour` appear twice, `bright` twice). These duplicates are part of the byte-identical
QPJ contract and MUST NOT be "cleaned up" by a compatible implementation.

## 5. Family passports

`pickle-names/passports.ts` defines the canonical **family passports** — the
seeded identities the QPJ portal renders every surface through.

| id | pickled name | role | caregiver | emoji |
|---|---|---|---|---|
| `dillpickle` | Dillpickle | child | no | 🧸 |
| `breadbutter` | Bread & Butter | teen | no | 🛰️ |
| `cornichon` | Cornichon | senior | no | 🌿 |
| `gherkin` | Gherkin | caregiver | **yes** | 🌸 |
| `halfsour` | Half-Sour | adult | no | 🚀 |

`getPassport(id)` (`passports.ts:90`) resolves an id, falling back to `dillpickle`
for an unknown id. Roles map to default portal modes (`ROLE_DEFAULT_MODE`,
`passports.ts:94`): child/senior → `spark`, teen → `maker`, adult/caregiver →
`workshop`. Mode access is rank-ordered (`canAccess`, `passports.ts:116`), so a
`workshop` holder can reach `spark` but not the reverse.

## 6. Invariants

The guarantees are checkable, not merely stated.

**`pickleInvariants()`** (`index.ts:121`) → `{ ok, failures[] }`:

1. **Determinism** — the same seed yields the same name.
2. **Vocabulary-closed** — 50 sampled names each split into prefix/suffix that are
   present in the published sets.
3. **Batch collision-free** — `generatePickleNames('batch', 40)` has 40 unique
   names.

**Batch generation** (`generatePickleNames`, `index.ts:101`) seeds each member with
`` `${seed}-${i}` `` and threads a growing `existing` exclusion set, so a family of
`count` identities is guaranteed unique within the batch.

**`passportInvariants()`** (`passports.ts:130`) → `{ ok, failures[] }`:

1. Unique passport ids.
2. Unique pickle names.
3. **Exactly one caregiver** (currently `gherkin`).

**Explicit non-guarantees.** Deterministic labels are **not** secret: a party who
knows the seed can recompute the name, and the label space is small and enumerable.
Pickle names are a *labelling and privacy-hygiene* mechanism, not an encryption or
a cryptographic commitment. They are not UUIDs and do not encode a person's
attributes. If a name must be unpredictable to an adversary, it must be seeded from
a secret; that is a caller responsibility (see §7).

## 7. Composition

A pickle name is designed to compose with the credential formats P31 already
issues, without ever carrying a human name.

- **As a credential subject.** In an SD-JWT VC (selective disclosure for JWTs,
  **RFC 9901**), the pickle label can populate the subject identifier (`sub`)
  instead of a legal identifier. Selectively disclosed claims (e.g. an eligibility
  attribute) then ride alongside a label that names no one. The credential flow
  lives in `workers/ledger-bridge/src/sdjwt.ts` (`issueSDJWT` `:166`;
  `verifySDJWT` `:281`).
- **Under a post-quantum signature.** SD-JWT credentials are signed with P31's
  composite **Ed25519 + ML-DSA-65** `COMPOSITE_ALG` (`packages/sovereign-primitives/
  src/composite.ts:14`; `compositeSign` `:102`, `compositeVerify` `:115`). This is a
  sibling construction to the composite-signature profiles now standardising in
  `draft-ietf-lamps-pq-composite-sigs` (e.g. `id-MLDSA65-Ed25519-SHA512`) and
  `draft-ietf-jose-pq-composite-sigs` (adopted from the individual
  `draft-prabel-jose-pq-composite-sigs`; ML-DSA + ECDSA/EdDSA composites for
  JOSE/COSE). The composite drafts are cited here for standards context, not as
  a conformance claim.
- **Determinism → stable audit trail.** Because a pickle name is a pure function of
  its seed, a governance ledger keyed by pickle name is reconstructable and stable
  across sessions (edge to the governance/audit layer).

The privacy posture is therefore cryptographic end-to-end: the label carries no
identity (§1), the credential discloses only chosen claims (RFC 9901), and the
signature survives the quantum transition (FIPS 204).

## 8. Test evidence

`packages/sovereign-primitives/src/pickle-names/pickle-names.test.ts` — **11 tests**:

`describe('pickle-names — determinism + vocabulary')` (5):
1. is deterministic: same seed → same name (incl. vector `Vine·warm`).
2. produced a known stable name for the canonical passport seed.
3. vocabulary is byte-identical to QPJ source (24 prefixes, 24 suffixes).
4. batch generation is collision-free (40 unique).
5. passes the pickle invariants (determinism, vocabulary, collision).

`describe('pickle-names — canonical passports')` (6):
1. has exactly 5 passengers with unique ids and pickle names.
2. has exactly one caregiver (gherkin).
3. passes passport invariants.
4. unknown id falls back to `dillpickle`.
5. mode access respects the rank (`workshop` reaches `spark`, not vice-versa).
6. default mode follows role (`dillpickle`→spark, `breadbutter`→maker, `halfsour`→workshop).

Run: `pnpm --filter @p31ca/sovereign-primitives test` (or `vitest run` on the
package). A failing invariant is a build failure, not a review comment.

## 9. Production use

`portals/qpj` renders every surface through pickle identities. Its
`src/lib/passports.ts` is a thin re-export of `@p31ca/sovereign-primitives/
pickle-names` — a single source of truth; the portal holds no copy of the
vocabulary.

## 10. Reference index

| Symbol | Location |
|---|---|
| `cyrb128` | `pickle-names/index.ts:12` |
| `mulberry32` | `pickle-names/index.ts:42` |
| `hashStr` | `pickle-names/index.ts:52` |
| `PICKLE_PREFIXES` | `pickle-names/index.ts:65` |
| `PICKLE_SUFFIXES` | `pickle-names/index.ts:72` |
| `generatePickleName` | `pickle-names/index.ts:79` |
| `generatePickleNames` | `pickle-names/index.ts:101` |
| `pickleInvariants` | `pickle-names/index.ts:121` |
| `PASSENGERS` | `pickle-names/passports.ts:25` |
| `getPassport` | `pickle-names/passports.ts:90` |
| `passportInvariants` | `pickle-names/passports.ts:130` |
| SD-JWT issue / verify | `workers/ledger-bridge/src/sdjwt.ts:166 / :281` |
| composite sign / verify | `packages/sovereign-primitives/src/composite.ts:102 / :115` |

---

## 11. Versioning & change log

**Version 1.0** — 2026-10-11 (initial publication-ready draft).

| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-10-11 | Extracted QPJ naming system; frozen vocabulary; family passports; invariants; conformance vector `Vine·warm`; composition notes (RFC 9901 + composite-signature context). |

Compatible implementations MUST pin to a published version. Vocabulary edits,
derivation changes, or passport-table changes are breaking changes → new major
version. Prose-only clarification is a patch version.

---

`Owner: will` · `Verified: 2026-10-11` · Re-verify by running the package tests and
`node scripts/frontmatter.mjs --check docs/specs`.
