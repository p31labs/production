# P31 Labs — AI-Use Disclosure (replaces the earlier prompt-log scaffold)

**Status:** corrected 2026-09-24 · **Why this file exists:** the earlier version of this file (`LOOM_PROMPT_PROVENANCE_LOG.md` scaffold) attempted to record prompt-by-prompt provenance. It did not. It contained no actual prompts, no unedited outputs, no timestamps beyond dates, and a model attribution that was not grounded in the development record. A document that asserts provenance it cannot demonstrate is worse than none. This file replaces it with an honest disclosure.

---

## The honest statement

P31 did **not** maintain contemporaneous prompt-by-prompt logs during development.

The development history is fully visible in the public git commits and the session transcripts in this repository. The human maintainer directed the architecture, made the design decisions, discovered the bug findings, and reviewed every output before it entered the repo. AI tools generated substantial portions of the **code** under human direction and review.

**This statement applies to the code corpus.** For the research corpus (the P31 Research Series, published with DOIs), the authorship claim is stronger: the ideas, synthesis, self-corrections, and lived substrate are human-authored in the strong sense — AI assisted with drafting and prose, but the author of record is the human. The two-corpus distinction is documented in `docs/GENAI_POLICY.md` §"The two corpora."

We disclose this plainly rather than construct a retrospective prompt log that would not represent the actual development process. A retroactively-assembled log would be a fiction; this statement is not.

---

## Where AI was used, per artifact

The honest position is **per-artifact**, not project-level:

| Artifact | Human-directed (creative control) | AI-assisted (generated, then human-reviewed) |
|---|---|---|
| Architecture | The K4 topology, the pre-execution gate, the refusal sidecar, the Merkle anchoring — human design decisions | The implementation code was substantially AI-generated, then human-reviewed and owned |
| Bug findings | The discovery (running real clients, interpreting failures, concluding the stdio-only / JSON-RPC / forked-chain findings) is human | The write-ups were AI-drafted |
| Verification strategy | The *what* — verify the chain, guard the canon, guard dead emails, check drift — is human | The scripts themselves were AI-written |
| Standards alignment | The scope calls (Art. 12 applies to high-risk systems, not P31; SCITT is Designed not certified) are human | The mapping tables were AI-structured |

**Design is human-directed. Implementation is AI-assisted.** Both statements are true, and this file says exactly that.

---

## Model attribution

The models used are recorded, not invented. The workspace canonically documents the agent-role model (the Triad of Cognition): **Opus (Architect)**, **Sonnet/CC (Mechanic)**, **Gemini (Narrator)**, and **DeepSeek (Firmware)** — see `packages/spaceship-earth/CONTRIBUTING.md` and `docs/AGENTIC-DESIGN-SYSTEM.md`. The development sessions for the work described in this disclosure ran through an orchestration layer (opencode); the running model for each session is recorded in that session's transcript, and the build output in each transcript names it. Where a transcript or commit records a specific model, that record is the source of truth. This file names the models rather than refusing to — the earlier draft's hesitation was a reaction to a fabricated attribution, not a real uncertainty about the model.

---

## What NLnet reviewers should know

- The full development history is in the public git history and transcripts.
- The human maintainer can explain any design decision, any bug fix, and any line of code.
- AI was used as a coding and writing assistant under human direction; the human holds accountability for the result.
- If NLnet requires a prompt-provenance log for this project, we will need to discuss what is actually available — because the honest answer is that contemporaneous prompt logs were not kept. We would rather state that than present a fabricated log.

---

*This disclosure supersedes the `LOOM_PROMPT_PROVENANCE_LOG.md` scaffold and is consistent with the NLnet GenAI policy's requirement for honest disclosure — the form of that disclosure is prose + git history, not a constructed prompt log.*