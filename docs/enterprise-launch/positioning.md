# P31 — Enterprise One-Pager

**Date**: 2026-09-22 · **Contact**: willyj1587@gmail.com · **All URLs verified live today.**

## What P31 provides

Verifiable agent governance and post-quantum identity for edge-native agent systems — a hash-chained audit trail, capability-bound agent identity, and ML-DSA-65 signatures, running on Cloudflare Workers today.

This is fused expertise: a single cognitive system where human direction and computational capability combine complementarily. The architecture, the bug discoveries, and the verification strategy are human-directed; the implementation is computationally assisted and human-owned. The strongest chess players of the era were teams, not either component alone — P31 is the same shape, for agent governance.

## Three proofs (live, inspectable)

1. **Governance chain** — `loom.p31ca.org`: hash-chained append-only event log (RFC 8785 JCS + SHA-256), pre-execution policy gate, refusal sidecar, independent verification endpoint `GET /api/loom/verify`. Architecturally aligned with the IETF Agent Audit Trail draft (`draft-sharif-agent-audit-trail-04`) and the EU AI Act Art. 12 high-risk logging requirement (applies 2 Dec 2027 / 2 Aug 2028 — staged by the Digital Omnibus, Reg (EU) 2026/1744).
2. **Post-quantum identity** — composite Ed25519 + ML-DSA-65 (FIPS 204) capability tokens in AIC-JWT format (`draft-wei-aic-jwt`), 15-minute expiry, fail-closed verification. The rare part: only ~7% of enterprises have deployed PQC (DigiCert, Jul 2026).
3. **Live relay** — `p31-doc-relay.trimtab-signal.workers.dev`: production y-websocket relay on Workers/Durable Objects with PQC tokens in the auth path. Health 200.

## Published toolchain (npm)

20 packages under `@p31ca/*`. Headliners: `@p31ca/cli` (3.0.0), `@p31ca/vibe-sdk`, `@p31ca/design-core` (2.1.0), `@p31ca/cognitive-passport-schema` (1.1.0), `@p31ca/forge-sdk`, `@p31ca/mcp-justice`, `@p31ca/mcp-vibe`, `@p31ca/ui`. CI/CD across 62 GitHub workflows.

## Market alignment (2026, cited)

- Agent observability & governance: $1.68B (2026) → $8.62B (2031), 38.69% CAGR (Research and Markets).
- 87% planning PQC, 7% deployed — execution gap (DigiCert).
- Google Agent Gateway ISV ecosystem, Anthropic Enterprise-Managed Authorization for MCP, Kilo KiloClaw for Organizations — all live in 2026, all need exactly this layer.

## The ask

Available for a pilot or 10–20hr contract this month. Happy to walk the chain, the tokens, or the relay with your engineers.

**willyj1587@gmail.com** · $125/hr contract · fixed-scope Worker builds $2,500–4,500 · Yjs/y-websocket integration $600–1,200