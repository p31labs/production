# Content Articles — P31 Capital Machine (Open Distribution)

Canonical cross-post playbook plus five ready-to-publish article drafts for the
zero-budget open-source distribution of the P31 Capital Machine.

---

## (a) Canonical Cross-Post Playbook

Publish on the P31 domain first, let Google index it, then cross-post. This
keeps page-rank and authority flowing to the owned surface instead of a rented
one.

1. **Publish on own domain first.** Ship the article to
   `https://p31-monetization.trimtab-signal.workers.dev/blog/<slug>` (or the
   production blog) and confirm the sitemap includes it.
2. **Wait 1–2 days for Google index.** Check via
   `site:p31-monetization.trimtab-signal.workers.dev/blog/<slug>` in search. Do
   not cross-post before the original is indexed, or the canonical link may be
   ignored.
3. **Cross-post to Dev.to** with `canonical_url` pointing at the original. Use
   at most **4 lowercase tags**. Keep it code-first: short, dense, copy-paste
   snippets, minimal fluff.
4. **Cross-post to Hashnode** with `originalArticleURL` set. Prefer Hashnode
   for long-form and multi-part series. Series backlinks build domain
   authority over time.
5. **Per-article metadata.** Record publish date, canonical URL, and the tags
   used on each platform in the article header below. Update the canonical
   anchor if the source moves.

Rules: never publish two platforms on the same day; never change the canonical
URL after cross-posting; refresh the cross-post only if the original is
materially updated.

---

## (b) Article Drafts

### Article 1 — How to build an x402-native MCP server on Cloudflare Workers

- **Title:** How to build an x402-native MCP server on Cloudflare Workers
- **Primary platform:** Dev.to
- **Target keyword:** x402 MCP server

The agent economy has a discovery layer (MCP) and a payment layer (x402), but
almost nobody ships them on the same edge. This post builds an MCP server on
Cloudflare Workers where every paid tool call is an HTTP 402 that settles in
USDC. The result: eleven tools with per-call pricing, an operator tier for
rebalancing, and zero payment infrastructure beyond the Worker itself.

Start with Hono and the `x402-hono` middleware. Each paid tool is a `GET
/resources/:tool` mirror plus a `POST /mcp` route. The mirror announces the
tool and its price; the MCP route runs the tool and returns the revenue receipt.

```ts
import { Hono } from "hono";
import { x402 } from "x402-hono";

const app = new Hono();

app.get("/resources/:tool", (c) => {
  return c.json({ tool: c.req.param("tool"), priceUsdc: 0.01, 402: true });
});

app.post(
  "/mcp",
  x402({ verify: { clientId: "p31-capital-machine" } }),
  async (c) => {
    const { method, params } = await c.req.json();
    if (method === "tools/list") return c.json({ tools: [/* ... */] });
    if (method === "tools/call") return c.json({ result: runTool(params) });
  }
);
```

Register `discoverable:true` and expose `.well-known/mcp` so any MCP client can
find the tool list without an API key. The 402 mirror also tells LLM agents the
exact price before they spend: an agent can decide a `$0.01` look-up is cheap
and a `$0.25` execution needs approval.

The server is an OAuth 2.1 / RFC 8707 resource server, so the payment itself is
the access grant. Public metadata lives at `.well-known/mcp-pricing`,
`.well-known/oauth-authorization-server`, and `.well-known/llms.txt`. No
fragile custom auth; just HTTP semantics agents already understand.

Live reference: `https://p31-capital-machine-mcp.trimtab-signal.workers.dev`
with `health` (free) and `revenue.getSummary` (`$0.02`) as the two easiest
tools to test first.

- **Tags:** `mcp`, `x402`, `cloudflare`, `ai` (Dev.to, all lowercase)

---

### Article 2 — Hash-chained revenue: why your agent payments need provenance

- **Title:** Hash-chained revenue: why your agent payments need provenance
- **Primary platform:** Hashnode
- **Target keyword:** x402 provenance

Every x402 settlement you have ever seen was, until recently, opaque. The
merchant told you what they earned and you either trusted them or did not.
For a capital-management tool that is not a trust model, it is a trust *crisis*:
drift and opacity are the two failure modes the ecosystem has not admitted.

Drift happens silently. A rounding change in a fee, a replayed request, a
transaction that settles twice — each one quietly breaks the ledger and nobody
can see where. Opacity is worse: even a perfectly accurate revenue number is
unfalsifiable if the reader cannot inspect the entries that produced it. The
fix is not a better dashboard. It is a data structure.

The P31 revenue ledger records every settlement with a SHA-256 prev-hash link,
so each row commits to the entire history before it. Any edit to an old entry
changes every subsequent hash. The chain is cheap, dependency-free, and
provable in a single HTTP round-trip.

```json
{
  "entry_id": "0x9f1a…",
  "settlement_usdc": 0.02,
  "prev_hash": "a31c…",
  "sha256": "5d2b…",
  "audit": "/audit/verify?hash=5d2b…"
}
```

The verify endpoint is public and unforgiving. `GET
/api/revenue/verify-chain` returns `{"valid":true}` only when every prev-hash
link matches and the chain is contiguous. Each revenue row carries an audit
link (`/audit/verify?hash=…`) so a single settlement can be checked on its own.

None of this needs a blockchain. A hash chain over Cloudflare Workers + D1 is
fast, free to operate, and gives agents the same provenance a block explorer
gives a ledger. That is the point: provenance should be a property of the
record, not a feature you pay for.

- **Tags:** `x402`, `hashchain`, `provenance`, `webdev`

---

### Article 3 — The spoon-dial: capacity-aware financial UI for neurodivergent users

- **Title:** The spoon-dial: capacity-aware financial UI for neurodivergent users
- **Primary platform:** Hashnode
- **Target keyword:** neuroinclusive fintech

Financial dashboards are built for peak attention. Dense grids, live tickers,
twenty widgets competing for one pair of eyes. For the roughly 1.3 billion
people living with significant disability — 16% of the global population —
that interface is not merely unfriendly, it is a barrier to managing their own
money. The P31 spoon-dial starts from the opposite assumption: the user knows
their capacity, and the interface should adapt to it.

The spoon model is a 0–5 cognitive-capacity dial. At 5 the user is fully
available; at 0 they are in crisis. Every surface maps three axes to that
number: motion, density, and disclosure. Motion scales by level — 4–5 at full
scale, 3 at 0.6, 1–2 at 0.2, 0 at zero. Density and disclosure follow the same
curve.

At spoons 1–2 the screen shows the top three widgets only, with progressive
disclosure; at 5 the full grid expands. At 0, motion is disabled entirely and a
CalmOverlay replaces the live dashboard with a single settling surface.
Feedback follows five states rather than binary good/bad, so a borderline
number does not read as catastrophe.

The research basis is the spoons construct from spoon theory plus established
WCAG and reduced-motion guidance — full citations live in
`SPOON_MODEL_RESEARCH.md`. The contrast with density-first fintech is
deliberate: one number drives the entire interface instead of every number
competing.

Implementing the dial is a few CSS custom properties and one state machine.
Motion scale and widget count key off the spoon value, so the interface is
declarative rather than branchy.

```css
:root { --spoons: 3; --motion-scale: 0.6; }
@media (prefers-reduced-motion: reduce) { --motion-scale: 0; }
.widget { transform: scale(var(--motion-scale)); }
```

- **Tags:** `fintech`, `accessibility`, `neurodiversity`, `uidesign`

---

### Article 4 — DORA metrics + SLOs without external infrastructure: a Cloudflare Workers approach

- **Title:** DORA metrics + SLOs without external infrastructure: a Cloudflare Workers approach
- **Primary platform:** Dev.to
- **Target keyword:** DORA Cloudflare Workers

You do not need Prometheus, a metrics SaaS, or a dedicated observability stack
to run DORA-style delivery metrics and service-level objectives. On Cloudflare
Workers you already own the two things SLOs need: an execution environment and
a durable store. This post shows the P31 approach: telemetry rows in D1, a
cron worker that rolls them up, and a burn-rate dashboard driven by plain SQL.

Every request appends a row to the `api_usage` table — method, route, status,
latency, timestamp. Nothing fancy, but it is the raw material for both
availability and latency percentiles, and it costs almost nothing to store.

```sql
-- error budget window: 30 days, target 99.9% availability
SELECT
  count(*) AS total,
  sum(status >= 500) AS errors,
  sum(status >= 500) * 1.0 / count(*) AS error_rate
FROM api_usage
WHERE ts > datetime('now', '-30 days');
```

The SLO is 99.9% availability, which yields roughly 43 minutes of allowed
downtime per month. From that budget the worker classifies burn as `fast`,
`slow`, or `ok`. Fast burn means the budget is being consumed at multiples of
the rate; it triggers the immediate channel. Slow burn is the quiet killer and
triggers a review. `ok` requires no action — and the p95/p99 latency numbers
ride along in the same rollup.

The cron runs on the platform via `p31-ci` (Cloudflare cron triggers), so the
whole pipeline is `api_usage` rows → SQL rollup → status page, with no external
infrastructure and no third-party dependencies. You can reproduce the entire
stack in a day and delete your observability vendor.

The three SLOs to start with: availability (99.9%), p95 latency, p99 latency.
Everything else is a refinement.

- **Tags:** `cloudflare`, `slo`, `observability`, `workers`

---

### Article 5 — SOC 2 readiness for open-source projects on a zero budget

- **Title:** SOC 2 readiness for open-source projects on a zero budget
- **Primary platform:** Dev.to
- **Target keyword:** SOC 2 open source

SOC 2 audits are sold as a spend: a compliance vendor, a policy consultant, a
surveillance stack. Small open-source projects conclude the trust signal is
unaffordable and quietly skip it. This post argues the opposite — readiness is
a paper trail plus evidence, and you can assemble both for zero dollars.

The P31 approach starts with an evidence collector. `scripts/evidence-collect.mjs`
walks the repo, pulls timestamps, test runs, deploy logs, and dependency data,
and emits a `controls-index.json` that maps every collected control to the
Security TSC. When an auditor asks "show me your access controls," the answer
is a file, not a scavenger hunt.

```bash
node scripts/evidence-collect.mjs --out controls-index.json
node scripts/sbom.mjs            # CycloneDX 1.5 SBOM
```

An SBOM is the second pillar. `scripts/sbom.mjs` emits a CycloneDX 1.5 SBOM
from the lockfiles, so the dependency surface is machine-readable and current.
Between the controls index and the SBOM you can answer the two questions
auditors ask first: what do you run, and how do you prove what you said?

The Trust Center is the third pillar: a public surface answering the ten
questions customers actually raise before procurement — data residency,
retention, encryption, access, incidents, compliance status. Ten pre-answered
questions is a documentation artifact, not a SaaS product.

The final pillar is signing. P31 signs artifacts with an in-house dual scheme —
ML-DSA-65 (FIPS 204) plus Ed25519 — via the p31-crypto module, giving releases
a post-quantum trust anchor without licensing a signing service.

The honest caveat: this gets you *ready*, not certified. Formal SOC 2
attestation still needs a licensed auditor. But you enter that process with
evidence, an SBOM, a Trust Center, and a signing story — which is a far better
position than a project that skipped the prep because it thought compliance
required a budget.

- **Tags:** `soc2`, `compliance`, `opensource`, `security`