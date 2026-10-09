<!-- P31-HEADER
id: p31_history_20261004_v1.0
type: history
component: workspace
status: live
retention: keep-forever
created: 2026-10-04T00:00:00Z
owner: will
-->

# HISTORY.md — Completed Phases

Append-only. One line per completed phase.

| Date | Phase | What landed |
|---|---|---|
| 2026-10-04 | W11 | Veto gate — tool.execute.before hook + destructive taxonomy; 11/11 destructive caught, safe commands allowed |
| 2026-10-04 | W12 | CAS store — content-addressable .objects/ + refs, dedup + point-in-time recovery |
| 2026-10-04 | W13 | Soft-delete — .trash/ + restore; hard delete needs retention window + 2nd approval |
| 2026-10-04 | W14 | Hash-chained ledger — RFC 8785 + prev-digest + Merkle checkpoints; tamper detection proven |
| 2026-10-04 | W15 | Ed25519 + ML-DSA-65 approval token — offline-first, scope/time-bound, single-use |
| 2026-10-04 | W16 | Housekeeping v2 — soft-delete + CAS + token + verify-chain (never rm -f) |
| 2026-10-04 | W17 | Wired into pnpm gate — 11 gates green |
| 2026-10-04 | W18 | pnpm approve CLI — the human token issuer |
| 2026-10-04 | W20 | Negative controls — 6/6 gates proven fail-able (rm -rf, tamper, token-less, premature hard-delete, unfiled TODO, untagged plan) |
| 2026-10-04 | W1–W6 | Runbook v1: harness, tetrahedron sensors, four faces, ownership contract |
| 2026-10-04 | W9 | Emergency recovery: disk 100% → 97%. Diff-before-delete caught workers (1) is the fleet |
| 2026-10-04 | W8 | CardBody canon primitive deployed — cards no longer flush-to-edge |