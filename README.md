# P31

Family-first, privacy-first web platform. Device-based data. No advertising, no
data selling.

_Last updated: 2026-09-14_

## What P31 is

P31 is a family-first, privacy-first web platform built around progressive
disclosure: a person's mode is their privacy boundary. Data lives on the
device and per-person passports are isolated — switching passport tears down
the mesh, clears session state, and never persists session state across
persons. The design system (`@p31ca/design-core`) is the canonical source of all
visual and component decisions, from OKLCH design tokens to compositions like
`ChatShell` and `Chameleon`.

## The seven production portals

| Portal | What it is |
| --- | --- |
| chat | Real-time family chat surface built on `ChatShell` |
| children | Willow, the child-facing portal (age-adapted themes, spoons, welcome flow) |
| teen | Sixseven, the teen-facing portal with age-gated modes and Web Speech |
| parent | Tetra, the caregiver portal with PIN elevation and sandboxed studio |
| meatspace | In-person/family rituals and connective prompts |
| design | Design token and component portal backed by the design system |
| qpj | Quantum Pickle Jar ("qpj", sub-brand Lantern) — the unified gateway portal converging the persona portals behind progressive-disclosure modes and `modeGate` PIN elevation |

Each portal is its own pnpm workspace and consumes `@p31/design-core` from a
vendored tarball. Deployments are orchestrated by `portals/deploy-unified.mjs`.

## Substrate status

The substrate — Cloudflare Workers `p31-dispatch` (hostname routing, custom
limits, verification) and `p31-passport` with the per-passport `PassportDO`
Durable Object (SQLite storage, hibernation) — is currently **dormant /
retired and awaiting a reactivation RFC**. Client code still carries the
feature-flag-gated bridge (`src/lib/substrate.ts` in QPJ), but no family data
flows through the workers until the reactivation RFC lands.

## WebMCP trial status

P31 participates in WebMCP, an origin trial for browser-native AI model context
and tool registration. The registered tools reference P31's client-side AI
surfaces and the WebMCP tool-registration path in each portal.

| Vendor | Status |
| --- | --- |
| Google | Active (origin trial). Tokens valid until **2026-11-16** |
| Edge | Deferred |

Plan around the 2026-11-16 expiry: the tool-registration code must degrade
gracefully when the trial concludes.

## Design system

`@p31/design-core` v2.3.0 — design tokens (OKLCH, 5 worlds x 3 ages x 2 sensory
modes), component compositions (`ChatShell`, `SectionStrip`, `CommandPalette`,
`Chameleon`, `PageHeader`), accessibility-first (WCAG 2.2 AA minimum), and an
MCP server for token discovery and spec-driven component generation. AGPL-3.0.

## Project documents

- [SECURITY.md](SECURITY.md) — private vulnerability reporting and the 90-day
  coordinated disclosure policy
- [CONTRIBUTING.md](CONTRIBUTING.md) — the project is not currently accepting
  external contributions (except security reports)
- [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) — Contributor Covenant 2.1
- [docs/MONITORING.md](docs/MONITORING.md) — post-launch monitoring plan (Path E)

## License

Copyright (c) P31 Labs, Inc.

This repository is licensed under the **GNU Affero General Public License,
version 3 (AGPL-3.0)**. See [LICENSE](LICENSE) for the full text.

Note: the P31-local-workspace README displays an MIT license badge even though
the on-disk LICENSE in that repository is the AGPL-3.0 text. That badge is a
known inconsistency owned by the workspace team and is not copied here. This
repository is AGPL-3.0 and the LICENSE file in this repository matches the
license stated here.