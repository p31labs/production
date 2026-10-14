<!-- P31-HEADER
id: p31_fix_plan_p31ca_sovereign_refresh_20261013_v1.0
type: fix-plan
component: apps/p31ca
status: resolved
retention: keep-forever
created: 2026-10-13T00:00:00Z
owner: will
-->

# fix-plan: p31ca /sovereign-vs-saas refresh — governance gap, DO Agent Droplets, Bedrock v2

**Discovered by:** agent:subagent:sovereign-refresh (task: /sovereign-vs-saas refresh, research-verified 2026-10-13)
**Discovered at:** 2026-10-13T00:00:00Z
**Severity:** low (content refresh) — one honesty-rail item (Bedrock v1 rate shown nowhere on the page; new row ships v2 committed baseline only, with v1/v2 footnote)

## The gaps

1. **Stacklok governance stat was absent.** The strongest 2026 MCP stat — 41% of
   software orgs report MCP in production, but only 5% is governed enterprise-wide
   production — had no place on the page. The positioning line ("the governance
   layer is the product") was unshipped.
2. **No DigitalOcean Agent Droplets row.** Launched 2026-10-01; Pro $50/mo (15%
   discount), Team $200/mo (20%), $5 free-trial credit. Missing from the table.
3. **No Bedrock AgentCore row.** The comparison had no metered agent runtime. The
   page must carry v2 committed baseline ($0.0997/vCPU-hr + $0.0132/GB-hr), not the
   v1 rate ($0.0895/$0.00945), with the idle-cost differentiator (NAT gateway
   ≈$33/mo while nothing runs).
4. **Registry counts** — already correct (44 registered / 22 live / 124 tools, matches
   ground-truth/content/registry-stats.json). No change needed; verified, not touched.

## Before / after

### `src/pages/sovereign-vs-saas.astro`

**Rows array (frontmatter) — appended two rows after the S3 row:**

```diff
   {
     capability: 'Object storage, 10 TB egress / month',
     ... (unchanged)
   },
+  {
+    capability: 'Agent runtime hosting',
+    theirs: 'Pro $50 / month · Team $200 / month',
+    theirsDetail: 'Agent Droplets (launched 2026-10-01). Pro is $50/mo with a 15% discount on agent usage — at the standard rate that covers ≈$58.82 of usage. Team is $200/mo with 20% off, covering $250.00. $5 free-trial credit for new customers; past the plan, usage keeps going at list price. Published pricing.',
+    theirsHref: 'https://www.digitalocean.com/pricing/agent-droplets',
+    theirsHref2: 'https://www.digitalocean.com/pricing/harness-runtime',
+    theirsLabel2: 'Harness Runtime pricing',
+    ours: 'Workers Paid, one flat account',
+    oursDetail: 'Harness, catalog, ledger, and queues all run on Workers Paid: 10 million requests and 30 million CPU-milliseconds included per month, no per-seat charge, no metered microVMs.',
+    cost: 'Within the $5 plan\u2019s included allowances at our scale.',
+  },
+  {
+    capability: 'Agent runtime, metered',
+    theirs: '$0.0997 / vCPU-hr + $0.0132 / GB-hr',
+    theirsDetail: 'Amazon Bedrock AgentCore v2, committed baseline (launching October 2026). v1 bills $0.0895/vCPU-hr + $0.00945/GB-hr; v2 consumption bills $0.1276/vCPU-hr + $0.0169/GB-hr. The metering never sleeps: a NAT gateway bills ≈$33/mo while nothing runs.',
+    theirsHref: 'https://aws.amazon.com/bedrock/agentcore/pricing/',
+    theirsHref2: 'https://builder.aws.com/content/3CdN6NRi4qP4sjhHPWC0pLG6HXu/cost-breakdown-for-sagemaker-unified-studio-domain-and-project',
+    theirsLabel2: 'AWS Builder Center idle-cost breakdown',
+    ours: 'Flat allowances, no idle meter',
+    oursDetail: 'Workers Paid is a flat $5 with included allowances. When the fleet is quiet, nothing meters. Predictable vs metered is the real axis of this comparison.',
+    cost: 'Within the $5 plan\u2019s included allowances at our scale.',
+  },
 ];
```

**New section between the H1 header and "The table":**

```diff
       <SectionHeader ... />
+
+      <section class="sod3-mb-16">
+        <h2 ...>The governance gap</h2>
+        <div class="glass-card sod3-p-8 ...">
+          <p>In July 2026, Stacklok and the Linux Foundation's AAIF asked 100 senior
+             software engineers at US and UK companies how they use MCP. The headline —
+             41% of software orgs say MCP is in production — hides the real story.</p>
+          <p><strong>86%</strong> of MCP use is still experimenting or local development.
+             <strong>9%</strong> runs in production with no governance. Only
+             <strong>5%</strong> is governed, enterprise-wide production.</p>
+          <p>Security and compliance are the top blocker (49%). Governance is second
+             (34%). So the scarce, expensive thing is not the protocol — it is the
+             governance layer. That layer is the product. We run it on the $5 plan.</p>
+          <p>Sources: Stacklok, State of MCP in Software 2026 ↗ · Forkast News, 2026-07-28 ↗</p>
+        </div>
+      </section>
```

**Table + Sources templates — optional second vendor link** (`theirsHref2`/`theirsLabel2`
rendered only when present; existing rows untouched). Sources list gained Stacklok +
Forkast `<li>`s. "The method" gained the survey-provenance sentence. Closing line
"We don't sell this page. We run on it." unchanged.

### `src/data/p31-mesh-constants.json`

Registered six new external URLs (verify-content-consistency requires every external
URL on a page to be in this file):

```diff
   "awsS3PricingUrl": "https://aws.amazon.com/s3/pricing/",
+  "awsBedrockAgentCorePricingUrl": "https://aws.amazon.com/bedrock/agentcore/pricing/",
+  "awsBuilderCenterIdleCostUrl": "https://builder.aws.com/content/3CdN6NRi4qP4sjhHPWC0pLG6HXu/cost-breakdown-for-sagemaker-unified-studio-domain-and-project",
+  "digitalOceanAgentDropletsPricingUrl": "https://www.digitalocean.com/pricing/agent-droplets",
+  "digitalOceanHarnessRuntimePricingUrl": "https://www.digitalocean.com/pricing/harness-runtime",
+  "stacklokStateOfMcpUrl": "https://stacklok.com/resources/state-of-mcp-in-software-2026/",
+  "forkastMcpGovernanceUrl": "https://forkast.news/mcp-locked-in-its-architecture-today-now-the-hard-part-enterprise-adoption-at-scale",
```

## Sources (all retrieved/verified 2026-10-13)

| Figure | Source |
|---|---|
| 41% production / 86% experimentation / 9% ungoverned / 5% governed; 49% security, 34% governance | Stacklok, State of MCP in Software 2026 (July 2026 survey, 100 senior software engineers US/UK, with the Linux Foundation's AAIF) — https://stacklok.com/resources/state-of-mcp-in-software-2026/ |
| Same figures, reported independently | Forkast News, "MCP Locked In Its Architecture Today. Now the Hard Part: Enterprise Adoption at Scale" (2026-07-28, Dana Ellison) — https://forkast.news/mcp-locked-in-its-architecture-today-now-the-hard-part-enterprise-adoption-at-scale |
| Agent Droplets Pro $50 (15% off) / Team $200 (20% off) / $5 trial credit; launched 2026-10-01 | https://www.digitalocean.com/pricing/agent-droplets (+ BusinessWire 2026-10-01 press release) |
| Harness Runtime CPU $0.044/vCPU-hr, memory $0.0095/GB-hr | https://www.digitalocean.com/pricing/harness-runtime |
| AgentCore v1 $0.0895/$0.00945; v2 consumption $0.1276/$0.0169; v2 committed baseline $0.0997/$0.0132 (launching Oct 2026) | https://aws.amazon.com/bedrock/agentcore/pricing/ |
| NAT gateway ≈$33/mo idle ($0.045/hr × 730) | AWS Builder Center, "Cost breakdown for Sagemaker Unified Studio Domain and Project" — https://builder.aws.com/content/3CdN6NRi4qP4sjhHPWC0pLG6HXu/cost-breakdown-for-sagemaker-unified-studio-domain-and-project |
| Registry 44 / 22 / 124 | ground-truth/content/registry-stats.json (live registry endpoint) — already correct, untouched |

**Arithmetic carried from the task brief:** $50 ÷ 0.85 ≈ $58.82; $200 ÷ 0.80 = $250.00.

**Honesty notes:** (1) The disputed "78% of enterprises" figure is NOT used anywhere.
(2) Forkast byline is 2026-07-28 UTC (not 07-27); page cites the verified date.
(3) The Builder Center idle-cost article is dated Apr 2026 (not Oct); page cites the
URL without a month claim. (4) Our costs are allowance math only.

## Verification

- `npm run prebuild` — green (all 7 gates + substack bridge).
- `npm run build` — green; postbuild `check-neurodivergent --dist` + `verify-wcag22 --runtime` green.
- `dist/sovereign-vs-saas/index.html` — new rows, governance section, and closing line present; no leaked comments beyond Astro's own `<!--astro:end-->` markers (identical on every page).
- Deploy: `npm run deploy` (wrangler pages deploy, ONE deploy) → https://59b0bd29.p31ca.pages.dev — complete.
- Live (2026-10-13): https://p31ca.org/sovereign-vs-saas/ → HTTP 200; "The governance gap", Agent Droplets row, "$0.0997 / vCPU-hr", and the closing line all present.
- Citations: all six new URLs return HTTP 200 (Stacklok, Forkast, DO Agent Droplets, DO Harness Runtime, AWS AgentCore pricing, AWS Builder Center).
- Console: `PLAYWRIGHT_BASE_URL=https://p31ca.org PLAYWRIGHT_SKIP_WEBSERVER=1 npx playwright test e2e/five-dollar-stack.spec.ts -g "sovereign-vs-saas"` → 1 passed, console sniffer clean (0 errors).