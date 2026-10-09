# Contributing to the P31 Capital Machine

Welcome. This project is **community-funded and community-owned** — every form of
contribution is recognized (capital, code, advocacy, expertise), and the system is
built to be verifiable end-to-end (hash-chained revenue, soulbound recognition).

We aim to reply to every issue and PR **within 48 hours**. If you don't hear back,
ping us — a late reply is a bug.

## What we value
- **Good first issues** — labelled `good-first-issue`; pick any and comment first.
- **Small, reviewable diffs** — one purpose per PR.
- **Accessibility & neuroinclusion** — the UI adapts to cognitive capacity; don't
  regress spoon-driven behavior.
- **No raw hex/rgba** in portal CSS outside `tokens.css` (the `token-audit` gate
  enforces this).

## Getting started
1. Fork and `pnpm install` in `production/monetization` (portal) or the relevant
   worker dir under `production/workers`.
2. Run the gate: `pnpm gate` (typecheck → lint → test → build → token-audit → v:gate).
3. Find a `good-first-issue` and comment `I'll take this`.
4. Open a PR with `Closes #<issue>` in the body.

## How to run / verify
- **Portal:** `cd production/monetization && pnpm dev`
- **Workers:** `cd production/workers/<name> && wrangler dev`
- **CI/DORA:** `node production/monetization/scripts/ci.mjs`
- **Evidence/SBOM:** `node production/monetization/scripts/evidence-collect.mjs`,
  `node production/monetization/scripts/sbom.mjs`

## Contribution types (all recognized)
| Kind | Examples | Recognition |
|---|---|---|
| Capital | BTC/USDC/LOVE donations, x402 tool payments | hash-chained ledger + proof-of-contribution SBT |
| Code | merged PRs, bug fixes, docs | `code-contributor` SBT |
| Advocacy | referrals, sharing impact receipts, writing | `impact-amplifier` / `community-builder` SBT |
| Expertise | reviews, security audits, design feedback | `care-keeper` SBT |

## Code of conduct
Be kind, be patient, assume good faith. Neurodiversity is a design input, not an
edge case. No harassment, no ranking-by-amount shaming.

## Governance
See `docs/GOVERNANCE.md` (community decisions weighted by contribution diversity;
funding allocation transparent and on-chain).

## Security
Report vulnerabilities privately (see `docs/SECURITY.md`); do not open a public
issue for them. All keys rotate after sessions; never commit secrets (`.env`,
`.admin_token`, `*.token` are gitignored).