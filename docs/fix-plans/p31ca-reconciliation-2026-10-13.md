<!-- P31-HEADER
id: p31_reconciliation_20261013_v1.0
type: fix-plan
component: workspace
status: resolved
retention: keep-forever
created: 2026-10-13T20:10:00Z
owner: will
-->

# p31ca-reconciliation-2026-10-13 — Step 0 reconciliation (RESOLVED)

Three flags conflicted between the pasted synthesis and the latest lane
reports. Verdicts against disk, 2026-10-13 ~20:10 EDT:

## Flag 1 — H4 sweep: DONE (plan track correct)

`scripts/style-alignment-exclude.json`: `exclude` = 43 entries (43 swept +
8 flagged-with-reason among them), schemaVersion 1, deterministic
inventory script. The sweep lane deployed `826be02d` with
candidatesRemaining 0 and the hero sha256-identical to the reference. The
synthesis's "queued, 57 candidates" is stale — retired.

## Flag 2 — Registry tool count: 124 (plan track correct)

Live `GET https://mcp-registry.trimtab-signal.workers.dev/servers`:
44 entries, 22 `status: live`, 18 `health: up`, 3 down, 23 unknown,
`count: 44`, **sum of toolCount over all entries = 124**
(121 over the 22 live). The hub's /about mermaid ("124 MCP tools as of
2026-10-13") is correct. The synthesis's "135" traces to a stale
build-time snapshot (`ground-truth/content/stats.json`) — retire 135.

## Flag 3 — Footer copy: CONFIRMED (plan track correct)

`packages/ui/src/chrome/Footer.tsx:22,57` both read "501(c)(3) confirmed
(IRS determination 2026-09-23)". The synthesis's open "pending" item is
stale — retired. (The IRS determination DATE conflict — 2026-04-03
effective / 2026-09-23 letter / May 4 outlier — remains an owner check.)

## Consequence

No corrective edits required. The reconciliation protocol (read the
manifest, read the live registry, grep the footer) is recorded for reuse.