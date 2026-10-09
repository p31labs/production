# NSF PESOSE — AI Agent Protocol Ecosystems

**Amount:** up to $300,000
**Track:** AI Agent Protocol Ecosystems (Pathways to Enable Secure Open-Source Ecosystems)
**Status:** DRAFT — track FY26 solicitation at nsf.gov

## Alignment
NSF PESOSE funds open protocols that improve the safety, security, and privacy
of AI agent ecosystems. P31 is a direct fit: an open-source agent-payment
protocol with cryptographic provenance, human-verifiable identity, and
capacity-aware operators.

## Research contribution
Three protocol-level contributions to agent-payment safety:
1. **Hash-chained revenue provenance** — every settlement commits to the entire
   prior history; tamper detection is a single HTTP round-trip, independent of
   the platform. Answers "how do you trust an agent's claimed revenue?"
2. **x402 + OAuth 2.1 / RFC 8707** — audience-bound bearer tokens scoped to a
   specific resource, preventing token replay across agent ecosystems.
3. **Capacity-aware operators (the spoon model)** — a formal interaction model
   where the human supervisor's declared cognitive capacity drives interface
   density, motion, and disclosure; the first known model of its kind.

## Three-year workplan
- Year 1 ($100K): Formalize the provenance contract; publish the spec;
  reference implementation on Cloudflare Workers + D1; security review.
- Year 2 ($100K): Extend to multi-rail settlement (x402 + Lightning +
  Interledger); evaluate the spoon model with human subjects; publish results.
- Year 3 ($100K): Standardization (IETF / W3C); industry integration;
  community governance; open-source release of the capital-routing take-rate
  mechanism.

## Deliverables
- Open-source protocol spec + reference implementation
- Peer-reviewed publications (2 papers: provenance + neuroinclusive design)
- Open datasets (settlement logs, spoon-model evaluation)
- Standards submission to IETF / W3C
- Workshop series for agent-ecosystem engineers

## Prior art & differentiation
- x402 Foundation (Linux Foundation) — payment rail; no provenance layer
- MCP specification (Anthropic) — tool discovery; no settlement standard
- OAuth 2.1 (IETF) — auth framework; no agent-native application

P31 is the first to unify all three with a cryptographic provenance chain and a
human-capacity model, at the protocol layer, in the open.

## Budget
Personnel $180K · Compute $30K · Research dissemination $20K · Community $30K ·
Equipment $40K.

## Evidence
- Live system: `https://p31-capital-machine-mcp.trimtab-signal.workers.dev`
- Revenue chain: `/api/revenue/verify-chain` → `valid:true`
- Neuroinclusive design spec: `NEUROINCLUSIVE_DESIGN.md`
- Repo: `/home/p31/production/monetization` (open source)
- Revenue mesh: `https://revenue-sink.trimtab-signal.workers.dev`