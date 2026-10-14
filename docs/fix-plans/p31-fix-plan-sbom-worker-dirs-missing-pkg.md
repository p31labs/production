# fix: 30 worker dirs ship without package.json — fleet SBOM marks them incomplete

<!-- P31-HEADER
id: p31_fix_plan_sbom_worker_dirs_missing_pkg_20261012_v1.0
type: fix-plan
component: scripts/gen-sbom.mjs
status: open
retention: keep-forever
created: 2026-10-12T00:00:00Z
owner: lane-e (bridge/cli/sbom subagent)
-->

## Symptom

The fleet SBOM (`scripts/gen-sbom.mjs` → `/home/p31/production/catalog-sbom.json`,
runbook E-3) walks `workers/*` + `packages/*`. 30 of 98 worker dirs have no
`package.json` (plus `packages/node-one-firmware`). Per the SBOM-honesty
rule the generator marks each as an incomplete component (comment +
annotations: `incomplete: missing package.json`) — correct behavior, never
a crash, never a silent omission. But 30 incomplete entries is a data gap,
not a design goal; the BOM cannot carry versions/licenses/deps for a third
of the worker estate.

Incomplete worker dirs (2026-10-12): arcade-room, artifact-registry,
capital-allocator, care-api, chat-sandbox, device-registry, docs,
forum-api, grant-pipeline, llm-proxy, membrane-coordinator,
mercury-balance-alert, mercury-cards, mercury-mcp, mercury-payments,
mercury-treasury-snapshot, mercury-webhook, meshy-bridge, p31-gateway,
p31-revenue-ledger, phos-backup, portal-worker, q-factor, scripts,
secret-rotator, signaling, standard-site-projection, taler-bridge-billing,
willow-safety (+ packages/node-one-firmware).

All 11 deployed workers ARE present and complete in the BOM (dads, bros,
design-mcp, justice-hub, crypto-mcp, phenix-wallet, capital-machine,
marketplace-mcp, component-registry, mcp-registry, oauth-relay).

## Resolution (needs a human/worker-owner decision)

1. Decide per dir whether it is a live worker (then add a real
   `package.json`) or scaffolding (then either add a minimal package.json
   or whitelist it as `incomplete: scaffold` so the honesty marker carries
   intent). The SBOM deliberately does NOT silently skip dirs — see
   `scripts/gen-sbom.mjs` `componentFor`/`loadPackage`.
2. Optionally annotate scaffold dirs in the BOM properties
   (`p31:scaffold: true`) once triaged.

Evidence: `gen-sbom` run 2026-10-12 →
`161 components (31 incomplete) → catalog-sbom.json`; negative control on a
broken package.json produces an incomplete entry with exit 0.