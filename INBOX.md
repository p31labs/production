<!-- P31-HEADER
id: p31_inbox_20261004_v1.2
type: inbox
component: workspace
status: live
retention: keep-forever
created: 2026-10-04T00:00:00Z
owner: will
-->

# INBOX.md — Open Loops

- [ ] **W9 remaining (needs Will):** disk at 97%, 5.6G free. Install rclone + Google Drive OAuth, then archive `p31-cortex` (6.9G) and `andromeda-archive-20260707` (6.8G) to gdrive and remove locally.
- [ ] **M1–M6 fleet layer:** worktrees, task ledger, file leases, merge coordinator, zellij/tmux dashboard.
- [ ] **W19:** full agent passport — Ed25519 session identity signed into every ledger entry (ledger has `actor` field; signing pending).
- [ ] **`workers (1)` vs `workers`:** the diff found `workers (1)` is the FULL 173-worker fleet and `workers/` is a stale 2-worker subset. Rename `workers (1)` → the canonical fleet path; remove the stale subset. Do NOT delete the fleet.
- [ ] **Legacy naming backlog:** ~40 docs + portal docs without P31-HEADERs — namecheck warns (W9 backlog), retrofit as time allows.