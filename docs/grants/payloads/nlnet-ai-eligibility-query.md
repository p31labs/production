# NLnet — AI Eligibility Query (draft for operator review)

**To:** NLnet Foundation (funding contact) · **Subject:** GenAI policy eligibility question — project using AI code assistants
**Status:** draft — operator reviews, sends before Tuesday 2026-09-29

---

## The question

We are preparing an application for the NLnet general open call (November 3, 2026) for an open-source project — a hash-chained agent audit infrastructure (the "Loom").

Development used AI code assistants extensively. We want to state our usage honestly and confirm eligibility before submitting, rather than discover a problem after the deadline.

**How the work breaks down:**

- **Architecture, bug findings, and verification strategy are human-directed.** The chain design, the pre-execution gate, the refusal sidecar, the Merkle anchoring, and three independent MCP-ecosystem bug discoveries (from running real clients against real servers) are the human's work.
- **Implementation code and prose were substantially AI-generated under human review.** The human directed what to build, reviewed every output, tested it, and owns and is accountable for every line.
- **Prompt-by-prompt logs were not kept.** Development sessions are recorded in public git history and session transcripts, but contemporaneous prompt logs were not maintained.

**Our reading of the current policy** is that this is "AI-assisted, not AI-generated" — a human exercised creative control over architecture and findings; AI assisted at the implementation level. We publish a GenAI use policy and an honest disclosure (no fabricated prompt log).

**Questions:**

1. Is this project eligible under the current GenAI policy, given the above?
2. What does the forthcoming policy revision require that we should prepare for now?
3. Is a prose + git-history disclosure acceptable when contemporaneous prompt logs were not kept, or is a prompt-provenance log a hard requirement?

---

*This query is sent in good faith before the public launch of the project, because the post will be public evidence either way.*