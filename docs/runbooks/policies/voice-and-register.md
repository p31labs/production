# P31 — Voice & Register Policy (the delivery system)

**Status:** adopted · **Effective:** 2026-09-24 · **Owner:** @p31-platform
**Source of truth:** `docs/COMBINED_COGNITION_LEXICON.md` (the vocabulary) +
`docs/GENAI_POLICY.md` (the authorship line) + `docs/runbooks/` (the
operational suite).

---

## The one rule that never changes

**The human is the author.** In every register, every surface, every artifact,
the authorship line is held constant: the human directs, decides, discovers,
reviews, and owns. What varies by register is *how much of the production
story the audience needs* — never *who is accountable.*

This is the "sharpening the pencil, not replacing the hand" frame: the pencil
is the instrument, the hand is the author.

---

## The three registers

| | Register 1 — Public | Register 2 — Professional | Register 3 — Internal |
|---|---|---|---|
| **Audience** | general public, HN, p31ca.org visitors | funders, grant reviewers, peer reviewers, enterprise buyers | the system itself, on-call, auditors who ask for the full truth |
| **Production story** | what the work does + how it verifies | the fused-expertise frame, named | full honesty: two corpora, no prompt logs, the audit chain |
| **AI-trigger word** | never | only as "fused expertise," framed as strength | always, required |
| **Trust anchor** | the reproducible verify command | the provenance log, on request | the hash chain, the gate |
| **Voice** | the system (unified) | the human as author of record, the system as instrument | the system's memory of itself |

---

## Register 1 — Public

**Surfaces:** `p31ca.org` public pages, the MCP marketplace, the Show HN post,
the blog.

**Rules:**
1. **No AI-trigger word.** "AI," "artificial intelligence," "LLM," "I used a
   model" — none of these appear in Register-1 narrative. The research is
   unambiguous: source disclosure reduces belief in true content. The word is
   a trust leak; the process is the trust anchor.
2. **Describe by what it does, not how it was made.** The work is the thing.
   The verify command is the proof.
3. **The voice is the system.** Never "I used AI," never "the AI and I."
   The work speaks as one thing.
4. **The trust anchor is the reproducible command.** The compliance page's
   `git clone … && pnpm verify` is the model. It demonstrates; it does not
   ask for trust.

**The honesty contract:** Register 1 does not lie. It is not "AI disguised as
human" — it is *the work described at the level the general public can act
on.* The full truth is one link away (the provenance log, Register 3). A
reader who wants the production story can get it; a reader who would dismiss
the work on the trigger word never has to see the trigger word.

---

## Register 2 — Professional

**Surfaces:** NLnet proposals, grant applications, peer-review responses, the
enterprise package, any audience that evaluates the work for funding or
procurement.

**Rules:**
1. **Name the fused-expertise frame.** The system is described as "an
   integrated cognitive system where human intuitive thinking and
   computational capability combine complementarily" — with the Centaur
   precedent (human-machine teams outperformed both alone, 2005–08). The
   frame is a strength, not a confession.
2. **The authorship line is explicit and unchanged.** "The human directs the
   architecture and owns the result." Combined cognition describes production;
   it never moves authorship. This is the same position as the GENAI policy,
   expressed in the professional register's vocabulary.
3. **The provenance log is available on request.** `docs/LOOM_PROMPT_
   PROVENANCE_LOG.md` — which honestly states the two-corpus distinction and
   that no contemporaneous prompt logs were kept.
4. **The AI-trigger word appears only as "fused expertise" or "combined
   cognition,"** never as a bare "AI did this."

**The boundary:** Register 2 must stay *within the fundable policy line.* The
GENAI policy's "tool, not collaborator" governs eligibility; the register's
"fused expertise" framing governs reception. The two are not in conflict
because they answer different questions (see the lexicon's "two axes").

---

## Register 3 — Internal

**Surfaces:** the GENAI policy, the provenance log, the runbook suite, the
agent-skills files, shift reports, anything the system writes to remember
itself.

**Rules:**
1. **Full honesty, always.** The two-corpus distinction (research
   human-authored; code human-directed, AI-assisted). The honest statement
   that no prompt logs were kept — rather than a fabricated log.
2. **The AI-trigger word is required here.** This register exists for the
   audience that needs the production truth: auditors, funders who ask, the
   system's own memory.
3. **"AI-assisted" is accurate in Register 3.** The lexicon governs Registers
   1–2; Register 3 uses the precise policy vocabulary.

---

## The guard

`verify-content-consistency.mjs` enforces the canon-language rule (no
submarine/naval/military metaphors) across public narrative surfaces. The same
mechanism extends to Register-1 surfaces for the AI-trigger word: a leaked
"AI" in a public page is a trust leak, caught at build time. The compliance
page, the provenance log, and the runbooks are exempt — they are Registers 2–3
and must name the production truth.

---

## The delivery proof

The trust anchor already exists and is already live:

- **The reproducible verify command** — `git clone … && pnpm verify` on the
  compliance page. Anyone can run it; it does not ask for trust, it
  demonstrates.
- **The hash chain** — every committed event is tamper-evident.
- **The audit trail** — every proxied call is logged and signed.
- **The provenance log** — honest, on request, in Register 3.

The delivery system is: **the work is verifiable independent of the category.**
That is the only answer to "pros don't trust it because they're pros" and "the
general public writes it off the moment there's any mention of AI." Neither
audience has to trust the author; both can verify the artifact.

---

## What this means operationally

- **Public surfaces (Register 1):** audited for the AI-trigger word at build
  time. The compliance page's verify command is the trust anchor.
- **Grant applications (Register 2):** lead with fused expertise + the Centaur
  precedent; the provenance log is the appendix.
- **Internal docs (Register 3):** unchanged — full honesty lives here.
- **The NLnet eligibility question** (the pending strategic-runbook action)
  must be resolved *before* the public surface's Register-1 framing is locked:
  the answer determines whether Register 2 can name the fused-expertise frame
  as strongly as this policy does.

**Owner:** @p31-platform. **Review cadence:** quarterly, with the runbook
suite. The lexicon and this policy are one system — a change to one is a
review of the other.