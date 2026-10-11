<!-- P31-HEADER
id: p31_grant_prompt_provenance_log_20261011_v1.0
type: research
component: workspace
status: live
retention: keep-forever
created: 2026-10-11T00:00:00Z
owner: will
-->

# Prompt Provenance Log — P31 Labs grant applications

**Owner:** William R. Johnson · P31 Labs, Inc.
**Governing policy:** NLnet GenAI policy **v1.1** (effective 2026-01-26) —
`nlnet.nl/foundation/policies/generativeAI/`.
**Required fields (v1.1, verbatim):** the model used · dates and times of
prompts · the prompts themselves · the unedited output.
**Scope note:** minor uses (spellcheck, formatting) require **no** log (v1.1
changelog). Substantive use (drafting, translation, summarisation, code
generation) requires disclosure + this log.

---

## 1. How this log is produced (gather + produce)

### 1.1 What the local agent store actually captures

| Store | Location | Captures | Missing for NLnet |
|---|---|---|---|
| opencode prompt history | `~/.local/state/opencode/prompt-history.jsonl` | user **inputs**; the display line shows `[Pasted ~N lines]` but the `pasted[]` field holds the **full pasted prompt text** (13 entries on disk) | timestamps, per-entry model, **unedited output** |
| opencode model list | `~/.local/state/opencode/model.json` | models used (`@cf/deepseek-ai/deepseek-v4-pro-0813`, `big-pickle`, `deepseek-v4-flash`, `longcat-2.5-preview-free`) | which model per prompt |
| Codex logs | `~/.codex/logs_2.sqlite` | session logs (SQLite) | schema not yet mapped to prompt→output |

**Consequence (honest, revised after the 2026-10-11 rebuild):** timestamps and
unedited `write`/`edit` outputs **are** recoverable from `opencode.db` (§2.1),
and full prompt texts from `prompt-history.jsonl`'s `pasted[]` field — but only
for sessions still present in those stores. Unedited conversational text for
edit-only work, and prompt texts for pre-tetrahedron sessions, are **not**
recoverable; those rows are marked `[prompt text not archived — human to
attest]`. Going forward the log is still **produced at drafting time** (§1.2);
retroactive recovery is a fallback, not the workflow.

### 1.2 Capture discipline (going forward)

- **Proposal text** → AI as assistant only; record one row per session in §2 with
  model, UTC timestamp, prompt, and a pointer to the unedited output.
- **Code** → follow the **GNU Taler model** that NLnet's feedback session
  endorsed: AI-assisted code lands in a **separate Git commit** with the **full
  prompt in the commit message**; human-authored code lands in normal commits
  with no disclosure footer. This is NLnet's preferred alternative to a
  standalone log for code.
- **Division of labor** → the agent scaffolds + extracts session records; the
  **human reviews, redacts (PII/tokens), and attests** the log is complete.

### 1.3 Tooling

| Tool | Status | What it does | Fit for P31 |
|---|---|---|---|
| **agentdiff** v0.1.28 | **INSTALLED** (2026-10-11) | git-native, **Ed25519-signed** line attribution per AI agent; opencode `tool.execute.before/after` hook + git pre/post-commit + pre-push | mirrors P31's Ed25519 + ML-DSA token layer |
| **holotype** v2.2.6 | **not locatable** — Zenodo API returns only taxonomic "holotype" records; the LLM-provenance record did not resolve | would archive agent-CLI transcripts into a hash-chained git archive | dropped; §2.1 shows opencode.db already persists unedited write outputs for file-producing work |
| **contextbom** (PyPI) | not installed | signed CBOM manifest per model call | optional, engineering workstream |
| manual (this file) | standing record | markdown session log | proposal drafting (human-authored, AI-assisted) |

**agentdiff wiring (done):** binary at `~/.local/bin/agentdiff`; opencode hook
`~/.config/opencode/plugins/agentdiff.ts` registered in `opencode.jsonc`; git
hooks in `/home/p31/production/.git/hooks/`; Ed25519 signing key
`~/.agentdiff/keys/` (key_id `0f3557a4b5b173da`). Capture fires on the next
AI-assisted edit + commit in `/home/p31/production`.

**Privacy flag (operator decision):** `capture_prompts = true` (default) records
a ~100-char prompt excerpt per trace and **pushes it to `refs/agentdiff/*` on
GitHub** — anyone with repo read access can see it. P31 prompts have historically
contained credentials (already redacted in the manual log above). To omit prompt
excerpts from code traces, run `agentdiff config set capture_prompts false`.

---

## 2. Sessions

### 2026-05-31 — NGI proposals (archive; superseded)

Model: Kilo (openrouter/owl-alpha). Covered the three NGI drafts
(K4-Mesh-Core, PHOS-Sovereign, LOVE-Ledger) plus pipeline/checklist. These were
submitted 2026-08-01 and pre-date the Restack call; carried forward for
completeness only.

### 2026-10-11 — grant package (Restack, Humanity AI, OTF, PQC audit)

All five working sessions of 2026-10-11 are logged below, rebuilt from local
artifacts (not from memory). Models actually used: **big-pickle** (opencode
provider; initial drafts, 12:25–12:45 UTC) and **deepseek-v4-pro-0813**
(cloudflare-workers-ai; edits + research, 12:56–19:36 UTC). Human-directed
throughout — the operator authored/verified technical claims, budget figures,
and funder dates against primary sources.

| # | Date+time (UTC) | Model | Session (title) | Prompt | Unedited output (pointer) |
|---|---|---|---|---|---|
| 1 | 2026-10-11 12:25–12:45 | big-pickle | P31 Labs funding strategy and grant deadlines | [prompt text not archived — human to attest] | first drafts of nine grant files incl. NLNET-RESTACK-APPLICATION.md, HUMANITY-AI-LOI.md, OTF-CONCEPT-NOTE.md, CASE-STUDY.md, ASSET-PORTFOLIO.md, GRANT-CALENDAR-2026-v4.md, PQC-FUNDER-BRIEF.md, SBIR-ELIGIBILITY-MEMO.md, DONATION-INFRA.md — part ids + sha256 in §2.1 |
| 2 | 2026-10-11 12:56–19:36 | deepseek-v4-pro-0813 | P31 Labs PQC grant packaging and audit scope | [prompt text not archived — human to attest] | kem.ts X-Wing port, six fix-plans, PQC-AUDIT-SCOPE.md, NIST-IR-8547-COMPLIANCE.md, CRYPTOGRAPHIC-INVENTORY.md edits |
| 3 | 2026-10-11 12:58–19:01 | deepseek-v4-pro-0813 | P31 identity & privacy payments deliverables plan | [prompt text not archived — human to attest] | EIDAS-2.0-WINDOW.md, pickle-names.md, donate page; Restack/OTF edits; email-field correction (willyj1587@gmail.com) 13:28 UTC |
| 4 | 2026-10-11 14:13–19:29 | deepseek-v4-pro-0813 | P31 governance engineer role and deliverables | **archived verbatim** — prompt-history.jsonl entry 7, `pasted[0]`: "You are THE GOVERNANCE ENGINEER, one vertex of the P31 Labs expert tetrahedron…" (2,752 chars; mapped to this session by title/timing — human to confirm) | HUMANITY-AI-AGENT-GOVERNANCE.md, governance specs, design-mcp governance handlers/tests |
| 5 | 2026-10-11 17:30–18:44 | deepseek-v4-pro-0813 | P31 Labs grant landscape deep research | **archived verbatim** — prompt-history.jsonl entries 10–11: research/plan instruction + humanityai.ai open-call text + NLnet GenAI policy v1.1 text (three pastes, ~91 KB total) | RESEARCH-2026-10-11.md, grant-pipeline-v3.json, edits to HUMANITY-AI-LOI.md, CASE-STUDY.md, NLNET-RESTACK-APPLICATION.md, calendar/portfolio |
| 6 | 2026-10-11 18:02–18:08 | deepseek-v4-pro-0813 | (same session as #5) | entry 11 context | this log file itself (v1.0) |
| 7 | 2026-10-11 19:37–present | deepseek-v4-pro-0813 | tetrahedron wave 2 — Agent D: Sloan verify + provenance + filings (parent prompt archived: entry 12 "run all agent tasks in parallel"; role prompt archived: entry 7 `pasted[1]` "You are THE GRANT STRATEGIST…") | this log rebuild (§2 + §2.1) — the provenance pass is itself logged |

**Attestation gap (human):** the six grant files show mtimes 19:19–19:34 UTC
(15:19–15:34 EDT) with **no matching entries in opencode.db or opencode.log** —
a final pass was made outside the agent trail (operator edit or unlogged
process). File contents diverged from the last agent write; the operator should
attest what changed in that pass.

### 2.1 Unedited outputs (recoverable from opencode.db `part` rows)

The `write` tool records the model's full output in `part.state.input.content`.
sha256[:16] of that unedited output vs. the current file:

| File (docs/grants/) | First AI draft — model, UTC | part id | sha256[:16] unedited output | current file sha256[:16] | Human-revised since draft? |
|---|---|---|---|---|---|
| NLNET-RESTACK-APPLICATION.md | big-pickle, 12:41:51 | prt_12afbdae50012YQxKEc2uHk8tY | e8aca1941be86a96 | b211489f2000f3de | yes |
| HUMANITY-AI-LOI.md | big-pickle, 12:40:21 | prt_12afa7eb10011beiRA1z8othAg | 03f3902f5c5fe5c4 | d545e40ffd8b4725 | yes |
| OTF-CONCEPT-NOTE.md | big-pickle, 12:41:36 | prt_12afba3b7001Gnj5d5SxxbcopV | c5d03c09376ac6f5 | 8219c7dba62fe8e7 | yes |
| CASE-STUDY.md | big-pickle, 12:43:27 | prt_12afd556f001kQ1q2VzhQ7il2a | bfb7845d7707eff9 | 21c600cf56bc4a8f | yes |
| PQC-AUDIT-SCOPE.md | deepseek-v4-pro-0813, 13:19:46 | prt_12b1e91e8001AAF6RhuITvUcMj | 20963a680649b2ff | efb84f7fd988703e | yes |
| HUMANITY-AI-AGENT-GOVERNANCE.md | deepseek-v4-pro-0813, 14:45:43 | prt_12b6d44bb001VM5mtSNbaSFJXd | e29bf75fa5392377 | ab152c6044b6aef3 | yes |
| RESEARCH-2026-10-11.md | deepseek-v4-pro-0813, 17:41:59 | prt_12c0ea3b8001hhY5AcACYTGvuC | 747ad6f0a0c2c082 | 7dd1cdde49205f65 | yes |
| prompt-provenance-log.md | deepseek-v4-pro-0813, 18:02:00 | prt_12c20f7830013Uqmf29w6qdLcg | 85fc30bd3b7a1c1e | (this edit) | yes |

Every file diverges from its first AI draft — the human-revision record
supports the human-authorship attestation in §3. Full unedited bytes are
retrievable by part id from `~/.local/share/opencode/opencode.db`.

---

## 3. Attestation

> I attest that the proposals referenced in this log are **human-authored** with
> GenAI used only as an assistant for drafting, structuring, and formatting. The
> design decisions, algorithm choices, security claims, budget figures, and
> funder-dates are human-made and reviewable in repository history. GenAI
> contributions are disclosed here in accordance with NLnet GenAI policy v1.1.
>
> — William R. Johnson, [date + signature on submit]

---

`Owner: will` · `Last verified: 2026-10-11 19:40 UTC — §2 rebuilt by Agent D from opencode.db + prompt-history.jsonl; human attestation pending on the marked rows` · Attach to the Restack submission
form's Generative AI section on submit (deadline 2026-11-03, 12:00 CET).