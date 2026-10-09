---
description: Deploy the workspace portal to Cloudflare Pages
agent: Gate Auditor
subtask: false
---

# /deploy-workspace — P31 Quantum Material Workspace

1. `pnpm typecheck && pnpm lint && pnpm test && pnpm build && node scripts/token-audit.mjs`
   (note: `pnpm gate`/`pnpm v:gate` fail in this portal — BUILD_SPEC GAP-07; use the green chain above).
2. `pnpm deploy` — stages dist/, injects `p31-ui.umd.js` + process shim, pushes to Cloudflare Pages
   `p31-portal-workspace` (domain `workspace.p31ca.org`).
3. `curl -I https://workspace.p31ca.org` — expect HTTP 200.
4. Record the deployment ID from the Pages dashboard.
5. If deploy fails → see `docs/AGENT_RUNBOOK.md` §5 S1 sequence (roll back to last known-good dist/).