# Interledger Foundation Local Impact Mini-Grant — Proposal

**Project title:** x402-native agent payments — community workshop + open docs
**Applicant:** P31 Labs (open-source, community-owned capital machine)
**Amount requested:** ~$2,500 (Local Impact Mini-Grant, $500–$3,000)
**Timeline:** 6 months from award; rolling deadline through 2026-11-11
**Status:** DRAFT — ready for submission review

---

## 1. Problem

Local developers are being left behind by the agent-payment wave. The building
blocks exist — x402 for paid agent calls, MCP for tool discovery — but they are
documented as corporate SDK docs, not as hands-on patterns a local developer
can pick up in an afternoon. Three concrete gaps:

1. **No hands-on x402 experience.** Most local developers have never sent or
   received a payment through an agent call, because there is no friendly
   on-ramp that shows the pattern end to end.
2. **No reusable open documentation.** x402/MCP material is scattered across
   marketing pages and GitHub issues, so the entry cost is high.
3. **No local community for contributors.** The P31 Capital Machine is an
   open-source project, but its contributors are spread thin with no shared
   forum for newcomers.

## 2. Approach

Three activities, all delivered open source:

1. **Community workshop series.** A hands-on series teaching local developers
   to build x402-native agents that pay for capital-management tools. Each
   participant leaves with a working agent that calls a paid MCP tool and
   settles a real micro-payment. No prior payment or MCP experience required.
2. **Open tutorials + P31 MCP documentation.** The workshop material is
   published in the open as tutorials, alongside full P31 Capital Machine MCP
   documentation. Everything the community writes is contributed back under an
   open license.
3. **Monthly community call.** A recurring call for contributors to the P31
   capital machine — newcomers get onboarding, existing contributors coordinate,
   and the workshop cohort stays connected.

## 3. Deliverables + timeline

| Month | Deliverable |
|---|---|
| 1 | Curriculum outline; workshop infrastructure (sandboxed agent + test payments); publish docs skeleton |
| 2 | Workshop #1 (intro: x402 + MCP); publish tutorial #1 |
| 3 | Workshop #2 (paid tool calls + revenue verification); publish tutorial #2; first community call |
| 4 | Workshop #3 (build + ship a paid agent); publish tutorial #3; community call |
| 5 | Documentation review pass; translate core docs; community call |
| 6 | Final wrap: full docs published, workshop retrospective, contributor onboarding guide |

## 4. Budget (~$2,500)

| Item | Amount |
|---|---|
| Workshop materials + tools (test payments, sandboxes, licenses) | $800 |
| Documentation + translation (tutorials, P31 MCP docs) | $700 |
| Community calls + contributor stipends | $600 |
| Miscellaneous (transit, printing, incidentals) | $400 |

## 5. Impact (measurable)

- **N developers on-ramped** — count of workshop completions and tutorial
  downloads; target 40+ developers across the series.
- **N agents settled** — count of x402 agent payments made during workshops and
  community experiments; target 200+ settlements.
- **N contributors** — count of new contributors to the P31 capital machine
  repo who land their first merged change; target 10+.
- Open documentation published with a clear license and a public link to reuse.

## 6. Why it fits Interledger

- **Open payments.** The workshops and tutorials are built on open x402
  primitives, teaching local developers a public payment standard rather than a
  proprietary rail.
- **Digital financial access.** The P31 Capital Machine is a neuroinclusive,
  community-owned capital-management surface — the spoon-dial UI makes
  financial tooling usable by people who are excluded by density-first
  dashboards.
- **Open-source innovation.** Every deliverable — curriculum, tutorials, MCP
  docs, workshop code — is published in the open under an OSI-approved license.
- **Community-led.** The monthly community call and contributor onboarding make
  the project genuinely community-owned, with governance weighted by
  contribution, not capital.

**Links:** MCP server `https://p31-capital-machine-mcp.trimtab-signal.workers.dev`
(money, free `health` / `entitlement.check` tools to try); Trust Center
`https://p31-monetization.trimtab-signal.workers.dev/#/trust`; revenue integrity
`/api/revenue/verify-chain` → `{"valid":true}`.