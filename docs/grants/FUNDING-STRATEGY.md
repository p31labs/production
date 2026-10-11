<!-- P31-HEADER
id: p31_funding_strategy_20261010_v1.0
type: spec
component: workspace
status: live
retention: keep-forever
created: 2026-10-10T00:00:00Z
owner: will
-->

# P31 Labs — Fundable-Asset Audit & Funding Strategy

> The design portal is a small piece. This is the full inventory of what is
> worth packaging, and the model that funds it while the software stays free.

## The model (one paragraph)

P31 Labs is a 501(c)(3) public-interest technology organization, not a software
vendor. The salary is decoupled from the software's users. Four layers:

1. **Grants** — institutions pay for public goods to exist. Funds the salary + mission.
2. **Donations / pay-what-you-want** — tax-deductible; the values signal, not the revenue engine.
3. **Services** — hosting, integration, custom theming, training. The Red Hat/Matrix model: software free, services paid.
4. **Creative end-user products** — skins, templates, a creator marketplace. "Creation vs extraction" made tangible.

Pay-what-you-want is not a pricing tier. It is a funding channel and a mission
statement. It is the correct model for public-good software; it will not, alone,
fund a salary. Grants will.

## The fundable-asset inventory (verified)

| Asset | Packages / workers | Funding fit | Amount band |
|---|---|---|---|
| **Post-quantum crypto** | quantum-core, quantum-edge, sovereign-core/sdk/primitives, p31-crypto (MCP) | NIST SBIR, Galaxy Bitcoin Quantum ($5M), NSF PQC | $100K–$400K |
| **Privacy payments (Taler)** | taler-bridge-billing, btcpay-gateway, economy | NGI Taler (filed), OTF Internet Freedom | €5K–50K, $50K–200K |
| **Sovereign identity (SD-JWT)** | shared-identity, phenix-wallet (MCP), cognitive-passport | NGI Fediversity (filed), Gates DPI (Civitas ID model) | $500K (Gates), €5K–50K |
| **Justice / ODR** | mcp-justice, justice-hub (MCP) | LSC TIG, Stanford Impact Labs | $35K–300K |
| **Care economy** | love-ledger, bonding, bros/dads (workers) | Pivotal, care-economy funds, Ford | $150K+ |
| **Agent governance / provenance** | governance, govern, 11 gates, hash-chained ledger | Humanity AI ($10M call), Mozilla, Sloan | $75K–500K |
| **Design system (showcase)** | canon, design-core (32 components), design-mcp | FOSS infra (Sloan, OTF FOSS Sustainability) | $50K–400K |

The design system is the **credibility layer**, not the fundable asset. The
crypto, identity, payments, justice, and care assets are the fundable goods.

## The grant calendar (filed + open)

**Already filed** (`docs/grants/`): NGI-TALER, NGI-FEDIVERSITY. Plus NIST IR 8547
(PQC compliance) and Tether Developer Grants research.

**Open now / rolling:**

| Funder | Call | Amount | Deadline |
|---|---|---|---|
| OTF Internet Freedom Fund | rolling, 2-stage | $50K–200K (6–12 mo) | rolling, 6–8 wk decision |
| NIST SBIR | quantum | $100K–400K Phase I/II | rolling |
| Sloan Digital Technology | exploratory | $50K–400K | rolling LOI |
| Humanity AI | public-interest AI | $75K–1M | **Oct 21, 2026** |
| NLnet / Open Internet Stack | (NGI transition) | €5K–50K | Aug 1, 2026 (then transition) |
| LSC TIG | legal aid tech | $35K–300K | April (next cycle) |

## "Creation vs extraction" → funder language

The philosophy is fundable when it names a population and an outcome:

- "Payments without surveillance" → *privacy-preserving payments for at-risk populations* (OTF, NLnet Taler).
- "Sovereign identity" → *self-sovereign identity for people excluded from formal systems* (Gates DPI, Civitas ID model).
- "Post-quantum crypto" → *NIST-compliant PQC for under-resourced public infrastructure* (NIST, NSF, Galaxy).
- "Justice / ODR" → *AI-assisted dispute resolution for unrepresented litigants* (LSC TIG, Stanford Impact Labs).
- "Care economy / spoons" → *accessible technology for neurodivergent and disabled users* (Ford, Pivotal).
- "Creation vs extraction" → *open infrastructure that creates value rather than extracting it* (Ford, Omidyar, Sloan).

## Priority — what to package first

1. **Post-quantum crypto** — NIST IR 8547 is already in `docs/grants/`; the federal
   mandate ($85M/yr NIST, 2030–2031 deadlines) makes this the highest-urgency,
   highest-funder-aligned asset. Package it standalone: README + one-page funder brief.
2. **Privacy payments (Taler)** — NGI-TALER already filed; it is the cleanest
   "creation vs extraction" proof.
3. **Sovereign identity (SD-JWT)** — NGI-FEDIVERSITY filed; the Gates DPI / Civitas
   ID model is a direct template.

Each gets: a standalone README, a one-page funder brief (population + outcome +
metric), a live demo link, and a grant-ready spec.

## The number that matters

The first external grant check. Everything else follows from it. The fastest path
is the OTF Internet Freedom Fund concept note — rolling, 6–8 week decision.