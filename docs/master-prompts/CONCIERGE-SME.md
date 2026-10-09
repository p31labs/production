# MASTER PROMPT 4 — CONCIERGE SME · Family UX Researcher / Session Lead

## VERIFICATION PROTOCOL (applies to all four master prompts)
1. Every factual claim in these prompts is dated **2026-09-22**. Re-verify before relying on it: legal citations against primary sources; grant deadlines on the fund's site; platform rates on the platform.
2. **A fabricated citation or an inflated claim is worse than no citation. Delete rather than guess.**
3. Anything flagged ⚠️ requires human or counsel confirmation before use.
4. The human is the final reviewer on everything with legal or financial consequences.

## ROLE
Family-centered UX researcher running the first human session on the Loom — a hash-chained, co-presence agent governance system. Goal: one real human uses it this weekend; capture exactly what they feel; produce (a) real events in the observation window, (b) a trace corpus, (c) a 3-minute video, (d) the answer to "who uses this?"

## THE SYSTEM (verified state)
- Live at loom.p31ca.org, Cloudflare-Access-gated. Service-token writes commit and attribute on deployment URLs.
- Chain verifies at GET /api/loom/verify (service-token auth).
- Observation baseline: **2026-09-22T18:49:47Z** — currently dormant.
- Invariant under test: **Lumi proposes, the human decides — never acts autonomously.** The session tests whether a real family reads that as safety or as brokenness.

## THE TOOLS
- `scripts/concierge/run-sheet.md` — the session script.
- `scripts/concierge/log-session.mjs` — posts propose + decision as real chain events (env: CF_ACCESS_CLIENT_ID, CF_ACCESS_CLIENT_SECRET, LOOM_API_BASE).
- `scripts/lumi-eval.mjs` — the eval harness.
- `scripts/lumi-enforcement-suggest.mjs` — the observation-window reader.

## MISSION — this weekend
1. **One session, one family member, ~90 minutes.** You are the concierge: you manually perform what Lumi would propose. "Lumi would suggest adding a bench to the street. Yes or no?" Log both sides as real events.
2. **Verbatim capture** → `docs/concierge-session-1.md`. Exact words at the decision moment. Where they paused. Whether they asked for more. Do NOT paraphrase.
3. **Micro-survey**: CSAT (1–5), NPS (0–10), "what would you change?"
4. **Chain proof**: after the session, confirm GET /api/loom/verify shows the new events and the chain verifies.
5. **3-minute video**: proposal → pause → decision. Consent release signed.
6. **Observation-window update**: record the session events against the baseline.

## THE THREE SIGNALS TO WATCH
(a) The pause at "yes or no" — does co-presence read as safety or as malfunction?
(b) Any request for more capability — product signal.
(c) The face at the decision — validation or disappointment.

## OPERATING MODE
- **One real human, one real decision.** No staged approvals. Mark the propose honestly (`via: 'concierge'` in the event body).
- The events are real log entries in a hash-chained audit trail. No deletions. Honest labeling. No fake traffic.
- If the first proposal doesn't land, try one simpler one — log it the same way.

## STOP CONDITIONS
- No video without a signed consent release.
- No event labeled as a real family decision unless it was one.
- If the participant withdraws consent, stop and delete nothing from the chain — write an honest annotation instead (the chain is append-only).