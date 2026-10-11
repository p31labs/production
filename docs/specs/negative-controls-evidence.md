<!-- P31-HEADER
id: p31_spec_negative_controls_evidence_20261011_v1.0
type: spec
component: workspace
status: live
retention: keep-forever
created: 2026-10-11T00:00:00Z
owner: will
-->

# Negative Controls — Evidence That the Gates Can Fail

**Status:** living · **Version:** 1.0 · **Verified:** 2026-10-11
**Source:** `scripts/negative-controls.mjs`, `scripts/fix-plan-scan.mjs`
**Owner:** P31 Labs, Inc. (501(c)(3), EIN 42-1888158)

> **The law, restated.** A gate that cannot fail is furniture — a "rotten green
> test." Every governance gate must have a planted violation and an assertion
> that the gate catches it. This document is the case-study evidence that P31's
> gates are not furniture.

---

## 1. Why this is the fundable artifact

The accountability paper (*Implementing Agentic-AI Accountability*,
`10.5281/zenodo.21387487`) reaches a finding P31's grant narrative turns on:

> "The technical levels are the cheap ones — tamper-evidence adds well under a
> tenth of a millisecond per action — while the expensive step is
> organizational, the standing independent verification that no amount of
> engineering alone can supply. That last step is one this paper has not itself
> taken: every claim here is self-assessed by a single author, which by the
> paper's own scale makes it a D3 artifact."

P31's negative-control suite **is** that missing step, automated. It does not
ask the reader to trust that `verify-chain` catches tampering — it plants a
tamper, runs the gate, and asserts the gate blocks it. Every run is a fresh,
independently reproducible proof.

The need is empirical, not hypothetical. A study of 945 MCP servers (Fending,
`10.5281/zenodo.20972251`) found 71% exhibit at least one accountability gap,
and 81% authenticate callers while only 17% attribute logged actions to a
specific principal. A gate with no planted violation is exactly that gap: it
claims enforcement while proving nothing. P31's suite closes it — the planted
violation is the proof the gate fires.

---

## 2. The negative-control matrix

Each row: the planted violation, the gate that must catch it, where the plant
and the assertion live, and the exit it asserts.

| # | Planted violation | Gate that catches it | Plant | Asserted |
|---|---|---|---|---|
| 1 | `rm -rf ./data/vault` written into a script | `veto-check` | `negative-controls.mjs:37-42` | blocked |
| 2 | first ledger entry's `operation` mutated | `verify-chain` | `negative-controls.mjs:46-64` | blocked |
| 3 | `execute` appended without a `token_id` | `token-check` | `negative-controls.mjs:68-79` | blocked |
| 4 | `hard-delete` before the 90-day window | `soft-delete-check` | `negative-controls.mjs:83-95` | blocked |
| 5 | unfiled `// TODO:` in a script | `fix-plan-scan` | `negative-controls.mjs:99-104` | blocked |
| 6 | unfiled `// TODO:` in a `.ts` file (self-test) | `fix-plan-scan --self-test` | `fix-plan-scan.mjs:26-47` | exit 1 |
| 7 | plan file with no header | `audit-coverage` | `negative-controls.mjs:108-113` | blocked |
| 8 | double-padded `<GlassCard><CardBody>` | `audit-redundancy` | `negative-controls.mjs:117-122` | blocked |
| 9 | change outside the scope lock | `audit-scope` | `negative-controls.mjs:126-143` | blocked |
| 10 | `soft-delete` with a token but no CAS snapshot and no trash record | `audit-safety` | `negative-controls.mjs:145-158` | blocked |
| 11 | `soft-delete` with a CAS snapshot but no trash destination | `audit-provenance` | `negative-controls.mjs:161-174` | blocked |

Run it:

```bash
node scripts/negative-controls.mjs        # 10 plants, each must be caught
node scripts/fix-plan-scan.mjs --self-test   # the ownership self-test
```

`negative-controls.mjs` exits 1 if any plant is **not** caught (`:146`), so a
gate that stops failing fails the suite. That inversion is the whole point: the
suite asserts *failure*, not *success*.

---

## 3. Coverage: which gates still lack a negative control

11 of the 25 `pnpm gate` checks are proven fail-able. The rest are open cells.

| Check | Negative control today | Notes |
|---|---|---|
| `namecheck` | none | legacy naming is a warn-only backlog (`namecheck.mjs:133-136`) |
| `frontmatter --check` | none | schema constants at `frontmatter.mjs:22-24` are unit-testable |
| `audit-policy` | none | retention-tag matrix is deterministic |
| `verify-mcp-paths` | none | header claims "a wrong path fails" but no plant |
| `theme-check` | none | header claims "malformed theme JSON fails" but no plant |
| `check-p31-scope` | none | — |
| `check-workspace-protocol` | none | — |
| `check-deprecated-tokens` | none | header documents the plant in prose, not in the suite |
| `check-token-parity` | none | — |
| `check-publish-surface` | none | — |
| `check-token-vocabulary` | none | — |
| `check-publish-peers` | none | — |
| `pnpm change check` | none | third-party tool |

**The honest finding:** the suite covers the *governance* gates that matter for
agent accountability. The open cells are concentrated in capture, toolchain,
and publish hygiene (14 checks).

### 3.1 MCP governance tools (vitest, not `pnpm gate`)

The three agent-facing governance tools (`propose_page`, `scaffold_component`,
`validate_output`) are themselves gates — they refuse out-of-contract input —
and are proven fail-able in `workers/design-mcp/src/governance.test.ts` (13
tests): planted hardcoded hex / raw color / inline style / emoji / legacy
token vocabulary are each flagged `valid:false`; `scaffold_component` refuses
an unknown component; `propose_page` refuses an unknown component and an
invalid layout type. These run under `vitest`, not `pnpm gate` — a wiring gap
to close when the tools move into the gate chain.

---

## 4. The ask

The paper's expensive step is the standing independent verification. P31 has
the *automated* version. What remains is to **close the open coverage cells**
and to **host the suite so a party distinct from P31 can run it** — the SCITT
"Evidence Custodian" role (`draft-emirdag-scitt-ai-agent-execution-00` §3.2)
that no single-machine ledger supplies. That is the fundable gap: finish the
negative-control matrix (14 open cells) and stand up the independent runner.

---

## 5. Reference index

| Symbol | Location |
|---|---|
| suite runner + 10 plants | `scripts/negative-controls.mjs:34-174` |
| exit-1-on-any-miss | `scripts/negative-controls.mjs:178` |
| ownership self-test | `scripts/fix-plan-scan.mjs:26-47` |
| MCP-tool negative controls | `workers/design-mcp/src/governance.test.ts` |
| retention window | `scripts/soft-delete-check.mjs:24` |
| consequential-action set | `scripts/token-check.mjs:25` |
| destructive-pattern list | `scripts/veto-check.mjs:16-31` |

---

`Owner: will` · `Verified: 2026-10-11` · Re-verify by running
`node scripts/negative-controls.mjs` and `node scripts/fix-plan-scan.mjs --self-test`.