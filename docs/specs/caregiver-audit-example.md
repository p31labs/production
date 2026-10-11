<!-- P31-HEADER
id: p31_spec_caregiver_audit_example_20261011_v1.0
type: spec
component: workspace
status: live
retention: keep-forever
created: 2026-10-11T00:00:00Z
owner: will
-->

# Caregiver-Legible Audit Example

**Status:** living · **Version:** 1.0 · **Verified:** 2026-10-11
**Owner:** P31 Labs, Inc. (501(c)(3), EIN 42-1888158)

> **The law, restated.** The governor is not a security researcher. If a
> non-technical caregiver cannot understand what the agent did, the governance
> has failed. This file is the proof that the same record can be three things
> at once: raw, auditor-grade, and caregiver-legible.

---

## 1. The same record, three ways

The example is a care action an AI proposes on behalf of a household: "move a
medication-reminder file to the trash as part of a care-plan update." The
record below is a real ledger shape (the genesis entry format from
`docs/specs/provenance-ledger.md` §2).

### 1.1 Raw (what `verify-chain.mjs` reads)

```json
{"seq":1,"action":"approve","proposal_id":"care-plan-update","token_id":"bd91f2ec-e3d9-4a85-91cf-2b4a37248b65","paths":["./data/care/medication-reminder.json"],"operation":"soft-delete","at":"2026-10-11T09:51:00.000Z","prev_digest":"0000000000000000000000000000000000000000000000000000000000000000","digest":"edfdae86aae2b53134679d80f214c1d256bac863bf466ab822b4fd05edff1714"}
```

### 1.2 Auditor view (structured, technical)

| Field | Value | Question it answers |
|---|---|---|
| `seq` | 1 | first record in the chain |
| `action` | `approve` | a human approved, not the agent acting alone |
| `operation` | `soft-delete` | nothing was destroyed — a move to trash |
| `paths` | `./data/care/medication-reminder.json` | exactly one file was touched |
| `token_id` | `bd91f2ec-…` | a signed approval token exists for this |
| `at` | 2026-10-11T09:51Z | recorded at the time, not reconstructed |
| `prev_digest` | 64 zeros | genesis — nothing came before |
| `digest` | `edfdae86…` | recomputes to itself; record is intact |

### 1.3 Caregiver view (plain language)

> **On October 11 at 9:51 AM**, the AI proposed a change to the care plan: move
> the medication-reminder record to the trash. **No one has destroyed
> anything** — "trash" here means it can still be brought back. A person (not
> the AI) signed off on this with an approval. The record of this decision is
> **intact** — it has not been changed since it was written.

The caregiver view is generated from the same fields the auditor reads: `action`
→ "a person approved", `operation: soft-delete` → "can still be brought back",
`token_id` present → "someone signed off", `digest` verifies → "intact".

---

## 2. Why three views matter

| View | Reader | Requirement answered |
|---|---|---|
| Raw JSONL | `verify-chain.mjs` | Reproducibility — the verifier reads the machine form |
| Auditor table | regulator, counsel, funder | Disclosure + Independence — every field has a question it answers |
| Plain language | the caregiver | the whole point — the person whose care is mediated can read it |

The mapping is mechanical, not editorial: a fixed dictionary maps the closed
vocabulary of actions (`approve`, `soft-delete`, `hard-delete`, `restore`) to
plain sentences. That dictionary is the "legible to a caregiver" guarantee,
and it is what no other governance stack in the 2026 landscape review ships.

---

## 3. The closed action vocabulary → plain sentences

| `action` | Caregiver sentence |
|---|---|
| `approve` | "A person approved this." |
| `soft-delete` | "Moved to trash. It can still be brought back." |
| `hard-delete` | "Permanently removed — after the waiting period and a second approval." |
| `restore` | "Put back where it was." |
| `merge` | "Combined two things into one." |

The vocabulary is closed (`lib/ledger.mjs:4-6` names the kinds), so the
dictionary is exhaustive. An unknown action must fail closed: render
"Unknown action — ask a human," not a guess.

---

`Owner: will` · `Verified: 2026-10-11` · The genesis example uses the real
ledger format from `.workspace/ledger.jsonl:1` and
`docs/specs/provenance-ledger.md` §2.