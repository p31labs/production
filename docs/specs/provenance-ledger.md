<!-- P31-HEADER
id: p31_spec_provenance_ledger_20261011_v1.0
type: spec
component: workspace
status: live
retention: keep-forever
created: 2026-10-11T00:00:00Z
owner: will
-->

# Provenance Ledger — Specification

**Status:** living · **Version:** 1.0 · **Verified:** 2026-10-11
**Package/Module:** `scripts/lib/ledger.mjs` (+ `scripts/verify-chain.mjs`)
**Owner:** P31 Labs, Inc. (501(c)(3), EIN 42-1888158)

> **The guarantee, in one line.** The ledger is append-only and hash-chained:
> every entry's digest covers its own canonical body *and* the digest of the
> entry before it. Any edit, deletion, insertion, or reordering is detected by
> `verify-chain.mjs`, which walks from genesis, recomputes every hash, and
> exits 1 naming the first broken sequence number.

---

## 1. What it is

The provenance ledger (`.workspace/ledger.jsonl`) is the append-only record of
every consequential agent action: `propose`, `approve`, `execute`, `restore`,
`merge`, `claim`, `lease` (`scripts/lib/ledger.mjs:4-6`). It is the P31 answer
to "how do we know the agent did what it said": the record is tamper-evident,
independently re-verifiable, and legible.

It does **not** attest that an action was *correct*, legal, or meritorious —
only that the action was recorded, ordered, and has not been altered since.

---

## 2. Entry schema

An entry is one JSON line. Its canonical form (for hashing) is the **RFC 8785
JSON Canonicalization Scheme (JCS)** — keys sorted, no insignificant
whitespace (`scripts/lib/ledger.mjs:22-28`).

| Field | Type | Meaning | Set by |
|---|---|---|---|
| `seq` | int | 1-based sequence number, `readEntries().length + 1` | `ledger.mjs:57` |
| `action` | str | the recorded action kind (`approve`, `soft-delete`, `hard-delete`, `restore`, …) | `ledger.mjs:61` |
| `at` | ISO-8601 str | append time, `new Date().toISOString()` unless caller-supplied | `ledger.mjs:59` |
| `prev_digest` | 64-hex str | digest of the previous entry; 64 zeros for the genesis | `ledger.mjs:58` |
| `digest` | 64-hex str | `SHA-256(JCS(body))` where body excludes `digest` | `ledger.mjs:67-68` |
| *caller fields* | any | `actor`, `path`, `dest`, `reason`, `token_id`, `cas_hash`, `proposal_id`, `operation`, `paths`, `scope` | caller |

A live example (genesis `approve`, `.workspace/ledger.jsonl:1`):

```json
{"seq":1,"action":"approve","proposal_id":"test-kenosis","token_id":"bd91f2ec-e3d9-4a85-91cf-2b4a37248b65","paths":["./data/keys"],"operation":"soft-delete","at":"2026-10-04T14:24:18.759Z","prev_digest":"0000000000000000000000000000000000000000000000000000000000000000","digest":"edfdae86aae2b53134679d80f214c1d256bac863bf466ab822b4fd05edff1714"}
```

> **Honest quirk:** the `append(action, fields)` signature's first argument is
> overridden when `fields` also contains an `action` key (`ledger.mjs:61` spreads
> `...fields` after `action`). `execute` writes therefore carry the *sub-action*
> (`soft-delete`, `hard-delete`) as their `action` value. The gate readers
> (`token-check.mjs:40`, `soft-delete-check.mjs:31`) read the sub-action. This is
> documented, not hidden.

---

## 3. Hash-chain construction

`append` (`scripts/lib/ledger.mjs:55-82`):

1. `seq = readEntries().length + 1`
2. `prev_digest = lastDigest()` — the previous entry's `digest`, or 64 zeros
   (`ledger.mjs:48-52`)
3. `body = { seq, action, ...fields, at, prev_digest }`
4. `digest = SHA-256(JCS(body))`
5. `entry = { ...body, digest }`, appended as one line.

`digest` is computed **over the body without `digest`** (`verifyChain` strips it
at `ledger.mjs:96`), so the chain hash is self-consistent and any field change
— including `seq`, `at`, or `prev_digest` — changes the digest.

**Merkle checkpoint.** Every 100 entries, a checkpoint is written to
`.workspace/ledger-checkpoints.jsonl` carrying `seq`, `merkle_root` (= the
entry digest at the boundary), `at`, and `prev_checkpoint`
(`ledger.mjs:72-80`). This mirrors the checkpoint/Merkle-inclusion layer the
accountability paper's `incident-ledger` added in v1.1.0 (RFC 6962).

---

## 4. Verification procedure

`verifyChain` (`scripts/lib/ledger.mjs:91-101`), invoked by
`verify-chain.mjs:12-18`:

1. Read all entries.
2. For each entry, from seq 1:
   - assert `e.prev_digest === prev` (the running digest); on mismatch return
     `{ valid: false, firstBad: e.seq }`
   - recompute `SHA-256(JCS(body))` where `body` is the entry minus `digest`
   - assert the recomputed digest equals the stored `digest`
   - advance `prev = digest`
3. If every entry passes, return `{ valid: true }`.

`verify-chain.mjs` prints `FAIL — ledger tampered (first bad seq N)` and exits
**1** on any failure; `pass — N entries, chain intact` and exits 0 otherwise
(`verify-chain.mjs:15-19`).

The verifier needs only the ledger file — no runtime, no database, no trust in
the agent that wrote it. That is the Reproducibility and Independence
principles, satisfied.

---

## 5. Tamper-evidence guarantee

| Threat | Detected | Mechanism |
|---|---|---|
| Edit a field in an entry | yes | recomputed digest ≠ stored digest |
| Delete an entry | yes | the next entry's `prev_digest` no longer matches |
| Insert an entry | yes | the following entry's `prev_digest` was computed against the old predecessor |
| Reorder entries | yes | `prev_digest` chains to the wrong predecessor |
| Rewrite the whole chain consistently | **no** | the writer holds the ledger; a colluding/compromised writer can re-chain. This is the exact "standing independent verification" gap the SCITT Evidence-Custodian role fills |

`verify-chain.mjs:16` localizes the break to the **first bad sequence number**,
which is the honest version of "tamper-evident": it does not prevent tampering,
it makes tampering undeniable and names where it happened.

---

## 6. Conformance vector (runnable)

Any compatible implementation MUST reproduce these digests. Values computed
from `scripts/lib/ledger.mjs` (JCS + SHA-256) on 2026-10-11.

Genesis `approve` entry (`prev_digest` = 64 zeros):

```
JCS   = {"action":"approve","at":"2026-10-11T00:00:00.000Z","operation":"soft-delete","paths":["./data/keys"],"prev_digest":"0000000000000000000000000000000000000000000000000000000000000000","proposal_id":"proposal-genesis","seq":1,"token_id":"00000000-0000-4000-8000-000000000001"}
D1    = f5a27b88af0c3aa4afa1d04c1bae5a9a7c966d63e38c0d4b9bdd0a2543fc5f77
```

Second `execute` entry (`prev_digest` = D1):

```
JCS   = {"action":"soft-delete","actor":"did:agent:housekeeping:session-1","at":"2026-10-11T00:01:00.000Z","dest":"./.trash/2026-10-11T00-00-00/data/keys","path":"./data/keys","prev_digest":"f5a27b88af0c3aa4afa1d04c1bae5a9a7c966d63e38c0d4b9bdd0a2543fc5f77","reason":"rotation","seq":2,"token_id":"00000000-0000-4000-8000-000000000001"}
D2    = 9026ad3683cfd7f011ece7696a5ad958a1d3889a9f2533a9f0a2f9b87c85db0f
```

Tampered variant of the genesis (only `operation` changed to `"hard-delete"`):

```
D1'   = e337e3cb045893a1c463c337a137e0d638abce2b9867de3da0f7aa6584dc3838   (≠ D1)
```

`verifyChain` over `[tampered-genesis, e2]` returns
`{ valid: false, firstBad: 1 }` because `e2.prev_digest` (`D1`) no longer equals
the recomputed `D1'`.

**Runnable fixtures.** These three entries (plus a deliberately tampered
variant) are committed as runnable proof, not just prose:
`tests/fixtures/ledger-conformance.jsonl` (3 linked entries — walks
`{ valid: true }`) and `tests/fixtures/ledger-conformance-tampered.jsonl`
(entry 1's `operation` flipped to `hard-delete` with the old digest left in
place — walks `{ valid: false, firstBad: 1 }`).

Reproduce with:

```bash
node --input-type=module -e '
import { jcs, sha256Hex } from "./scripts/lib/ledger.mjs";
const Z = "0".repeat(64);
const e1 = { seq: 1, action: "approve", proposal_id: "proposal-genesis", token_id: "00000000-0000-4000-8000-000000000001", paths: ["./data/keys"], operation: "soft-delete", at: "2026-10-11T00:00:00.000Z", prev_digest: Z };
console.log(await sha256Hex(jcs(e1)));
'
```

---

## 7. Storage layout

| Path | Contents |
|---|---|
| `.workspace/ledger.jsonl` | the append-only chain (one JSON object per line) |
| `.workspace/ledger-checkpoints.jsonl` | Merkle-root checkpoints every 100 entries |
| `.workspace/tokens/<id>.token` | issued approval tokens (`approve.mjs:69-71`) |
| `.workspace/keys/` | the human principal's Ed25519 keypair (`lib/token.mjs:17`) |
| `.cas/objects/` + `.cas/refs/` | content-addressed store (`lib/cas.mjs:18-20`) |
| `.trash/<ts>/` | soft-deleted files awaiting the retention window (`lib/softdelete.mjs:16`) |

---

## 8. Composition with the rest of the stack

- **Approval tokens** (`lib/token.mjs`) are recorded *into* the ledger as
  `approve` entries (`token.mjs:96`); `token-check` then demands every
  consequential `execute` reference an issued token.
- **CAS** (`lib/cas.mjs`) is snapshotted before a soft-delete
  (`softdelete.mjs:32-38`), so the ledger entry can point at `cas_hash` and the
  object survives even after the ref is removed.
- **Soft-delete** (`lib/softdelete.mjs`) writes the `execute` entry; the
  retention window is enforced by `soft-delete-check.mjs:24` (90 days).
- **SCITT relationship** (`draft-emirdag-scitt-ai-agent-execution-00`): the
  draft chains `SHA-256(content_hash ‖ prev_chain_hash ‖ ts ‖ agent_id)`; P31
  chains `SHA-256(JCS(whole body))`. P31's is the simpler construction — same
  tamper-evidence property, no separate COSE envelope, and P31's approval
  tokens are **Ed25519 + ML-DSA-65** where the draft's mandatory algorithm is
  ES256 today (ML-DSA is named a future candidate, draft §5.9).

---

## 9. Reference index

| Symbol | Location |
|---|---|
| `jcs` (RFC 8785) | `scripts/lib/ledger.mjs:22-28` |
| `sha256Hex` | `scripts/lib/ledger.mjs:30-34` |
| `append` | `scripts/lib/ledger.mjs:55-82` |
| `verifyChain` | `scripts/lib/ledger.mjs:91-101` |
| `lastDigest` / genesis zero | `scripts/lib/ledger.mjs:48-52` |
| Merkle checkpoint | `scripts/lib/ledger.mjs:72-80` |
| CLI gate | `scripts/verify-chain.mjs:12-18` |
| token record into ledger | `scripts/lib/token.mjs:96` |
| CAS snapshot-before-delete | `scripts/lib/softdelete.mjs:32-38` |
| conformance fixtures (good / tampered) | `tests/fixtures/ledger-conformance.jsonl` / `tests/fixtures/ledger-conformance-tampered.jsonl` |

---

`Owner: will` · `Verified: 2026-10-11` · Conformance vectors recomputed from
`scripts/lib/ledger.mjs` on 2026-10-11. Re-verify by running
`node scripts/verify-chain.mjs` and the §6 reproducer.