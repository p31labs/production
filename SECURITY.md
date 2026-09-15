# Security

P31 is a family-first, privacy-first web platform. Device-based data, no
advertising, no data selling. Security reports are taken seriously and are the
one thing this project will always engage with, even while the codebase is not
otherwise open to external contributions.

## Reporting a Vulnerability

Please do NOT open a public issue or pull request for a vulnerability.

Report privately to:

**security@p31ca.org**

Include as much of the following as you can:

- Affected subsystem and file path (see Scope below), with a short reproducible
  description
- Steps to reproduce, including browser/device and WebMCP trial status if
  relevant
- Impact you believe the issue has (data exposure, privilege boundary breach,
  denial of service, resource abuse, etc.)
- Any proof-of-concept code or request traces, sanitized of real family data
- Your preferred contact method if you want acknowledgement beyond email

If the issue involves sensitive user data, do not include the actual data in
the report. Sanitized, synthetic examples are preferred.

## Scope

The following subsystems are in scope:

- Client code for the seven production portals: chat, children, teen, parent,
  meatspace, design, and qpj (including QPJ's progressive-disclosure modes,
  `modeGate` PIN elevation, spoons floor, and LOVE ledger)
- Substrate workers: `p31-dispatch` (hostname routing, per-passport custom
  limits, verification) and `p31-passport` with the per-passport `PassportDO`
  Durable Object (SQLite storage, hibernation)
- WebMCP tool registration and the browser-native AI model context / tool
  registration paths used by the portals
- Passport and PIN isolation: `spark` reaching a `workshop` surface without
  caregiver PIN elevation, per-person session teardown, cross-passport state
  leakage
- LOVE ledger dual-currency logic (weights, 50/50 split, care-score decay) and
  any state persisted across persons
- Identity handling: routes, passwords/PINs, and the K4 trust mesh

Out of scope: the dormant design-system workspace at
`/home/p31/P31-local-workspace` (its own repository), third-party
dependencies unless the vulnerability is in how P31 uses them, and issues that
require a deliberate, local attacker with physical device access.

## Disclosure Timeline

We follow a 90-day coordinated disclosure policy from the date a report is
confirmed:

| Day | Action |
| --- | --- |
| Day 0 | Report received; acknowledgement sent within 3 business days |
| Day 0-14 | Triage, confirmation, and impact assessment |
| Day 14-90 | Fix developed and shipped to the affected portals/workers |
| Day 90 | Public disclosure if the issue is still unfixed, or coordinated notes once fixed |

If a public launch has not yet occurred, disclosure notes are shared privately
with the reporter and the findings are published at launch.

## Repository Visibility

This repository is public. The substrate (`p31-dispatch` and `p31-passport`) is
currently dormant and awaiting a reactivation RFC, so some in-scope subsystems
are not yet live in front of real families. Reports are still relevant: the
verification and PIN-isolation paths are the ones that must be right before
reactivation.

## Safe Harbor

Reports made in good faith, following the process above and without accessing
or exfiltrating real family data, are protected under a good-faith safe harbor.
We will not pursue legal action for research conducted within this policy.