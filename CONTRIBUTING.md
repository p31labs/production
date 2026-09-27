# Contributing

## Current status: not accepting external contributions

P31 is a controlled, family-first product with a narrow core team. The portals
serve real families, and every surface is reviewed against design-core
conventions (OKLCH tokens, zero hardcoded hex, progressive disclosure as a
security posture) before it reaches a person.

Right now the project is **not accepting external contributions** — no
pull-request-driven features, ports, or refactors from outside the core team.
This is deliberate and applies until further notice. The only exception is
security research, which is always welcome: see [SECURITY.md](SECURITY.md) and
report privately to security@p31ca.org.

## What is on the table

- **Security reports**: always encouraged, via the private channel.
- **Questions and context**: issues asking clarifying questions about how the
  platform works are read, though there is no SLA on responses.

## What is not

- Feature pull requests
- Dependency or toolchain changes proposed externally
- New portals or portals-to-convergence work
- Refactors of `p31-dispatch`, `p31-passport`, or the passport/PIN isolation
  paths

## When this changes

When contribution channels open — timelines, a proper CONTRIBUTING guide with
DCO/CLA expectations, and governance for the design system
(`@p31ca/design-core`) and substrate — it will be announced clearly in this
repository and on the project sites. Until that announcement, assume the
project remains closed to external contributions.

## License note

This repository is AGPL-3.0. External code that is eventually accepted will be
expected to remain compatible with AGPL-3.0 (see the LICENSE file at the repo
root).

## Note on the workspace README

The P31-local-workspace README displays an MIT license badge and MIT license
section, but the on-disk LICENSE file in that repository is the full GNU
AGPL-3.0 text. The workspace badge is a known inconsistency owned by a separate
team; it is flagged here rather than corrected here. Licenses in this
repository are AGPL-3.0 and match the LICENSE file.