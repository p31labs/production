# The Loom — Launch Checklist (the gate)

**Status:** 2026-09-23. Green = verified at time of check. This is the
single-file gate for going public.

## Security (blocking)

- [x] ✅ **Service token rotated 2026-09-23** — `lumi-write-2` secret rotated
      via the Cloudflare API (`client_secret_version` 1→2, same client_id
      `59a1cac5…`); Pages secret `CF_ACCESS_CLIENT_SECRET` updated; project
      redeployed. Old exposed secret (`cfast_bol8…`) now rejected (`HTTP 302`);
      new secret returns `valid:true` (16 events).
- [x] Plaintext credential scrubbed from
      `downloads/Executing the review s fixes…txt` (and any other copy).
- [x] After rotation, `GET /api/loom/verify` returns `valid:true` with the new
      token.

## Evidence (blocking for funding/video)

- [ ] **One real family session** run (concierge role, honestly marked
      `via: 'concierge'`).
- [ ] **Signed consent release** on file — `docs/concierge-consent-release.md`
      filled in (code name, video box checked, both signatures).
- [ ] 3-minute video (proposal → pause → decision) filmed + cut.
- [ ] Verbatim capture appended to `docs/concierge-session-1.md` (a new session,
      replacing/annotating the operator-pilot record).

## Chain & observation window

- [ ] `GET /api/loom/verify` → `valid:true`, chain grew.
- [ ] `lumi-enforcement-suggest.mjs` (baseline `2026-09-22T18:49:47Z`) run with
      real `--total`; verdict recorded.
- [ ] Observation window no longer dormant (≥1 real family agent event).

## Product & site

- [ ] Chain-verification widget live on p31ca.org + phosphorus31.org.
- [ ] Simplified donation form live.
- [ ] Nonprofit Schema Markup (JSON-LD `@type: NGO`) on both sites.
- [ ] Loom one-pager + homepage copy live (human-approved).
- [ ] Open-source core published (⚠️ human approval for public release) or
      explicitly deferred.

## Funding

- [x] ✅ **Humanity AI eligibility confirmed 2026-09-23** — IRS 501(c)(3)
      determination letter received (`grant-pipeline-v2.json`
      `determinationDate: "2026-09-23"`); P31 applies as a direct lead
      applicant (Tier 1, $75K–$150K).
- [ ] Humanity AI application submitted before 2026-10-21 (or explicitly
      deferred with reason).
- [ ] Foresight RFP submitted before 2026-10-31 (or deferred).
- [ ] Deadlines re-verified on fund sites this week.

## The honesty gate (always)

- [ ] No claim of family usage without a real family session.
- [ ] No claim of certification (SOC 2 / ISO 42001) not held.
- [ ] No fabricated metrics, quotes, citations, or users.
- [ ] Human is the final reviewer on every legal/financial/public step.

## Current status summary (2026-09-23)

- Security: **BLOCKED** (token exposure, still active).
- Eligibility: ✅ **CONFIRMED 2026-09-23** — IRS 501(c)(3) determination
  received; direct lead applicant for Humanity AI.
- Evidence: **BLOCKED** (operator pilot only; no signed consent; no video).
- Chain: **green** (16 events, `valid:true`).
- Observation window: **dormant** (KEEP OBSERVING).
- Product/site: **gaps** (widget, donation form, one-pager not built).
- Funding: **nothing submitted** for the Loom; Oct 21 Humanity AI is the
  near-term deadline — eligibility cleared, gated now only on the family-session
  evidence.