# Enterprise Launch Plan — sequenced

**Date**: 2026-09-22. Goal: get P31 raised in engineering/board discussions at Google, Anthropic, Kilo.ai.
Every step below is verifiable and gated. Nothing is sent without human review.

## Phase 0 — Foundation (today, ~1 day)

1. **Publish `@p31ca/canon`** — workflow exists (`.github/workflows/publish-canon.yml`, tag `canon-v*` or dispatch). Trigger requires repo push (repo is private — publish from the monorepo). ✅ 1h. See `publish-prep.md` for exact commands + the compiled-dist decision.
2. **Publish `@p31ca/sovereign-primitives`** — **DONE this session** (private flipped, dist build clean, packable). ⚠️ `npm publish` requires human approval (public release). ✅ 2h
3. **Republish `@p31ca/agent-engine`** with `lumi-identity.js` in the tarball. ⚠️ **Blocked on `@p31ca/canon` compiled dist** (TS5097 on canon's `.ts` imports). Resolve that dependency first (see `publish-prep.md`). ⚠️ requires human approval. ✅ 4h
4. **Public Loom demo endpoint** — read-only or domain-gated (`@google.com`, `@anthropic.com`, `@kilo.ai`) Access policy; serve synthetic chain + a sample capability token + a refusal observation. Proves the claims without exposing family data. ✅ 1 day
5. **Fix claims** — DONE this session (PROOF-OF-BEHAVIOR, POSITIONING, README, GRANT-PIPELINE, MEATSPACE-RUNBOOK, both master prompts; deleted the fabricated PoB draft).

## Phase 1 — Kilo.ai (fastest path, week 1)

- Kilo is open-source-friendly (CLI on OpenCode), on AWS Marketplace, SOC 2 materials, agent sandboxing + audit logs (all Apr–Sep 2026).
- 1. Open a GitHub issue/discussion in `Kilo-Org/kilocode` proposing a Loom governance integration (hash-chained audit sidecar). ✅
- 2. Post the relay/chain proof in the Kilo community. ✅
- 3. Direct outreach to Kilo DevRel (draft in `outreach-google-anthropic-kilo.md`). Human sends.
- Best ROI: a working demo of Loom's chain inside a Kilo Cloud Agent session. 2–4 weeks realistic.

## Phase 2 — Anthropic (MCP path, weeks 2–4)

- Anthropic Enterprise-Managed Authorization for MCP is GA (Aug 2026); Connectors Directory requires a named-card UI, cross-surface support, and production-grade auth. ModelContextProtocol spec is open.
- 1. Implement Enterprise-Managed Authorization in **one** P31 MCP server (start with the simplest). ✅ 1–2 weeks
- 2. Apply to the Anthropic Connectors Directory.
- 3. Reference the Cloudflare × Anthropic partnership (Claude Managed Agents on Workers) — P31 runs on the same infrastructure.
- Realistic: 4–8 weeks to application.

## Phase 3 — Google Cloud (ISV path, weeks 5–8)

- Agent Gateway ISV ecosystem (May 2026) is actively recruiting identity-governance and runtime-AI-protection vendors. P31 fits "runtime AI protection / agent identity".
- 1. Join Google Cloud Partner Advantage. ✅
- 2. Publish an MCP server wrapping Loom's governance API to Google Cloud Marketplace (documented path: "Publishing AI Agents on Agentspace as SaaS").
- 3. Target Agent Gateway integration (service extension into the request path — architecturally matches `guardAgentEvent`).
- Realistic: 6–12 weeks.

## Ongoing — IETF WIMSE engagement (visibility compounding)

- Join the WIMSE mailing list; comment on the AI Agent Auditing draft; reference `ZeroID` (the open-source reference implementation, May 2026).
- Participation is how engineers at Google/Anthropic who implement these standards learn the work exists.

## Certifications (parallel, affordable order)

1. ISO 42001 readiness doc — the Loom's governance docs are the evidence base ($0; cert is $4–25K, fundable by grant).
2. MCP `iss` validation scan across the 19 MCP servers ($0).
3. Defer SOC 2 Type I ($12–40K) until revenue.

## After 14 days — repeatability

- Contra profile at $125/hr (0% fee). Upwork. Gun.io/Arc.dev (verify fees on-platform).
- Tracking: `docs/income-tracker.md` + `docs/outreach-queue.md`.

## Gating rules

- Never publish a package without human approval (public release).
- Never send outreach without human review. No metric without a link.
- Never ship COPPA surfaces in enterprise materials. (Spaceship Earth was UNFROZEN 2026-09-23 — it is now an enterprise-eligible flagship.)
- Human is final reviewer on every legal/financial step.